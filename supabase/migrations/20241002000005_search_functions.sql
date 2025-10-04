-- HOU2ED Search Functions
-- Phase B3.1 - Search RPC with Ranking and Scoring

-- ===============================================
-- SEARCH SCORING FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION calculate_listing_score(
  listing listings,
  user_lat DECIMAL,
  user_lng DECIMAL,
  search_radius_miles INTEGER,
  filters JSONB
) RETURNS TABLE (
  score INTEGER,
  distance_score INTEGER,
  availability_score INTEGER,
  eligibility_score INTEGER,
  services_score INTEGER,
  cost_score INTEGER,
  quality_score INTEGER,
  distance_miles DECIMAL
) AS $$
DECLARE
  distance_miles DECIMAL;
  dist_score INTEGER := 0;
  avail_score INTEGER := 0;
  elig_score INTEGER := 0;
  serv_score INTEGER := 0;
  cost_score_val INTEGER := 0;
  qual_score INTEGER := 0;
  total_score INTEGER := 0;
BEGIN
  -- Calculate distance in miles using Haversine formula
  IF user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
    distance_miles := (
      3959 * acos(
        cos(radians(user_lat)) * cos(radians(listing.lat)) *
        cos(radians(listing.lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(listing.lat))
      )
    );

    -- Distance score (0-20 points)
    IF distance_miles <= search_radius_miles THEN
      dist_score := GREATEST(0, 20 - FLOOR(distance_miles * 20 / search_radius_miles));
    END IF;
  ELSE
    distance_miles := 0;
    dist_score := 10; -- Default score when no location provided
  END IF;

  -- Availability score (0-20 points)
  IF (listing.availability->>'beds_today')::INTEGER > 0 THEN
    avail_score := 20;
  ELSIF (listing.availability->>'beds_week')::INTEGER > 0 THEN
    avail_score := 15;
  ELSIF (listing.availability->>'waitlist')::INTEGER > 0 THEN
    avail_score := 5;
  END IF;

  -- Eligibility fit score (0-20 points)
  -- Check age, gender, families, and population tags
  IF filters ? 'age_group' AND listing.eligibility ? 'age_groups' THEN
    IF listing.eligibility->'age_groups' ? (filters->>'age_group') THEN
      elig_score := elig_score + 5;
    END IF;
  END IF;

  IF filters ? 'gender' AND listing.eligibility ? 'genders' THEN
    IF listing.eligibility->'genders' ? (filters->>'gender') THEN
      elig_score := elig_score + 5;
    END IF;
  END IF;

  IF filters ? 'populations' AND listing.eligibility ? 'populations' THEN
    -- Check if any population tags match
    IF listing.eligibility->'populations' ?| ARRAY(SELECT jsonb_array_elements_text(filters->'populations')) THEN
      elig_score := elig_score + 10;
    END IF;
  ELSE
    elig_score := 10; -- Default score when no specific eligibility filters
  END IF;

  -- Services fit score (0-10 points)
  IF filters ? 'services' AND listing.services IS NOT NULL THEN
    -- Count matching services
    serv_score := LEAST(10, (
      SELECT COUNT(*)::INTEGER * 2
      FROM jsonb_array_elements_text(filters->'services') AS requested
      WHERE listing.services ? requested
    ));
  ELSE
    serv_score := 5; -- Default score
  END IF;

  -- Cost fit score (0-10 points)
  IF filters ? 'max_cost' AND listing.cost ? 'monthly' THEN
    IF (listing.cost->>'monthly')::INTEGER <= (filters->>'max_cost')::INTEGER THEN
      cost_score_val := 10;
    END IF;
  ELSIF listing.cost->>'is_free' = 'true' THEN
    cost_score_val := 10;
  ELSE
    cost_score_val := 5; -- Default score
  END IF;

  -- Quality and freshness score (0-20 points)
  -- Verified status
  IF listing.verified THEN
    qual_score := qual_score + 5;
  END IF;

  -- Recent update (within 7 days = 10 points, within 30 days = 5 points)
  IF listing.updated_at > NOW() - INTERVAL '7 days' THEN
    qual_score := qual_score + 10;
  ELSIF listing.updated_at > NOW() - INTERVAL '30 days' THEN
    qual_score := qual_score + 5;
  END IF;

  -- Responsiveness (if tracked)
  IF listing.responsiveness ? 'avg_response_hours' THEN
    IF (listing.responsiveness->>'avg_response_hours')::INTEGER < 24 THEN
      qual_score := qual_score + 5;
    END IF;
  END IF;

  -- Calculate total score
  total_score := dist_score + avail_score + elig_score + serv_score + cost_score_val + qual_score;

  RETURN QUERY SELECT
    total_score,
    dist_score,
    avail_score,
    elig_score,
    serv_score,
    cost_score_val,
    qual_score,
    distance_miles;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===============================================
-- MAIN SEARCH FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION search_listings(
  search_params JSONB
) RETURNS TABLE (
  id UUID,
  provider_id UUID,
  title TEXT,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  lat DECIMAL,
  lng DECIMAL,
  housing_type TEXT,
  unit_beds JSONB,
  ada_beds INTEGER,
  gender_rooming TEXT,
  amenities JSONB,
  accessibility JSONB,
  eligibility JSONB,
  services JSONB,
  rules JSONB,
  cost JSONB,
  intake JSONB,
  availability JSONB,
  verified BOOLEAN,
  certifications JSONB,
  images TEXT[],
  responsiveness JSONB,
  dv_sensitive BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Scoring fields
  total_score INTEGER,
  distance_miles DECIMAL,
  distance_score INTEGER,
  availability_score INTEGER,
  eligibility_score INTEGER,
  services_score INTEGER,
  cost_score INTEGER,
  quality_score INTEGER,
  score_reasons TEXT[]
) AS $$
DECLARE
  user_lat DECIMAL;
  user_lng DECIMAL;
  search_radius INTEGER;
  filters JSONB;
  show_stale BOOLEAN;
  page_size INTEGER;
  page_offset INTEGER;
BEGIN
  -- Extract search parameters
  user_lat := (search_params->>'lat')::DECIMAL;
  user_lng := (search_params->>'lng')::DECIMAL;
  search_radius := COALESCE((search_params->>'radius_miles')::INTEGER, 25);
  filters := COALESCE(search_params->'filters', '{}'::JSONB);
  show_stale := COALESCE((search_params->>'show_stale')::BOOLEAN, false);
  page_size := COALESCE((search_params->>'limit')::INTEGER, 20);
  page_offset := COALESCE((search_params->>'offset')::INTEGER, 0);

  RETURN QUERY
  WITH scored_listings AS (
    SELECT
      l.*,
      scores.*,
      ARRAY[]::TEXT[] AS score_reasons_arr
    FROM listings l
    CROSS JOIN LATERAL calculate_listing_score(
      l,
      user_lat,
      user_lng,
      search_radius,
      filters
    ) AS scores
    WHERE
      l.is_active = true
      -- Filter by housing type if specified
      AND (
        NOT filters ? 'housing_types' OR
        l.housing_type = ANY(ARRAY(SELECT jsonb_array_elements_text(filters->'housing_types')))
      )
      -- Filter by city if specified
      AND (
        NOT filters ? 'city' OR
        LOWER(l.city) = LOWER(filters->>'city')
      )
      -- Filter by availability
      AND (
        NOT filters ? 'available_only' OR
        (filters->>'available_only')::BOOLEAN = false OR
        (l.availability->>'beds_today')::INTEGER > 0 OR
        (l.availability->>'beds_week')::INTEGER > 0
      )
      -- Filter out stale listings unless requested
      AND (
        show_stale = true OR
        l.updated_at > NOW() - INTERVAL '14 days'
      )
      -- Distance filter (if location provided)
      AND (
        user_lat IS NULL OR
        user_lng IS NULL OR
        scores.distance_miles <= search_radius
      )
  )
  SELECT
    sl.id,
    sl.provider_id,
    sl.title,
    sl.description,
    -- Obfuscate address for DV-sensitive listings
    CASE
      WHEN sl.dv_sensitive AND NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (p.role = 'provider' OR p.role = 'admin')
      )
      THEN 'Address Hidden for Safety'
      ELSE sl.address
    END AS address,
    sl.city,
    sl.state,
    sl.zip_code,
    -- Obfuscate exact coordinates for DV-sensitive listings
    CASE
      WHEN sl.dv_sensitive AND NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (p.role = 'provider' OR p.role = 'admin')
      )
      THEN ROUND(sl.lat::NUMERIC, 2)::DECIMAL
      ELSE sl.lat
    END AS lat,
    CASE
      WHEN sl.dv_sensitive AND NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (p.role = 'provider' OR p.role = 'admin')
      )
      THEN ROUND(sl.lng::NUMERIC, 2)::DECIMAL
      ELSE sl.lng
    END AS lng,
    sl.housing_type,
    sl.unit_beds,
    sl.ada_beds,
    sl.gender_rooming,
    sl.amenities,
    sl.accessibility,
    sl.eligibility,
    sl.services,
    sl.rules,
    sl.cost,
    sl.intake,
    sl.availability,
    sl.verified,
    sl.certifications,
    sl.images,
    sl.responsiveness,
    sl.dv_sensitive,
    sl.is_active,
    sl.created_at,
    sl.updated_at,
    sl.score AS total_score,
    sl.distance_miles,
    sl.distance_score,
    sl.availability_score,
    sl.eligibility_score,
    sl.services_score,
    sl.cost_score,
    sl.quality_score,
    -- Build score reasons array
    ARRAY_REMOVE(ARRAY[
      CASE WHEN sl.distance_score > 15 THEN 'Very close to you' END,
      CASE WHEN sl.availability_score = 20 THEN 'Available today' END,
      CASE WHEN sl.eligibility_score >= 15 THEN 'Great match for your needs' END,
      CASE WHEN sl.verified THEN 'Verified provider' END,
      CASE WHEN sl.cost_score = 10 AND sl.cost->>'is_free' = 'true' THEN 'Free' END
    ], NULL) AS score_reasons
  FROM scored_listings sl
  ORDER BY
    sl.score DESC,
    sl.distance_miles ASC NULLS LAST,
    sl.updated_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===============================================
-- QUICK SEARCH FUNCTION (Simplified)
-- ===============================================

CREATE OR REPLACE FUNCTION quick_search_listings(
  search_text TEXT,
  user_city TEXT DEFAULT NULL,
  limit_results INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  city TEXT,
  housing_type TEXT,
  availability JSONB,
  cost JSONB,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    LEFT(l.description, 200) AS description,
    l.city,
    l.housing_type,
    l.availability,
    l.cost,
    l.verified
  FROM listings l
  WHERE
    l.is_active = true
    AND (
      search_text IS NULL OR
      search_text = '' OR
      l.title ILIKE '%' || search_text || '%' OR
      l.description ILIKE '%' || search_text || '%' OR
      l.city ILIKE '%' || search_text || '%' OR
      l.housing_type::TEXT ILIKE '%' || search_text || '%'
    )
    AND (
      user_city IS NULL OR
      l.city ILIKE '%' || user_city || '%'
    )
  ORDER BY
    CASE WHEN l.verified THEN 0 ELSE 1 END,
    (l.availability->>'beds_today')::INTEGER DESC NULLS LAST,
    l.updated_at DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===============================================
-- GET NEARBY LISTINGS (For Map View)
-- ===============================================

CREATE OR REPLACE FUNCTION get_nearby_listings(
  center_lat DECIMAL,
  center_lng DECIMAL,
  radius_miles INTEGER DEFAULT 10,
  max_results INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  title TEXT,
  lat DECIMAL,
  lng DECIMAL,
  housing_type TEXT,
  availability JSONB,
  cost JSONB,
  verified BOOLEAN,
  distance_miles DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    -- Obfuscate DV locations
    CASE
      WHEN l.dv_sensitive THEN ROUND(l.lat::NUMERIC, 2)::DECIMAL
      ELSE l.lat
    END AS lat,
    CASE
      WHEN l.dv_sensitive THEN ROUND(l.lng::NUMERIC, 2)::DECIMAL
      ELSE l.lng
    END AS lng,
    l.housing_type,
    l.availability,
    l.cost,
    l.verified,
    (
      3959 * acos(
        cos(radians(center_lat)) * cos(radians(l.lat)) *
        cos(radians(l.lng) - radians(center_lng)) +
        sin(radians(center_lat)) * sin(radians(l.lat))
      )
    ) AS distance_miles
  FROM listings l
  WHERE
    l.is_active = true
    AND (
      3959 * acos(
        cos(radians(center_lat)) * cos(radians(l.lat)) *
        cos(radians(l.lng) - radians(center_lng)) +
        sin(radians(center_lat)) * sin(radians(l.lat))
      )
    ) <= radius_miles
  ORDER BY distance_miles ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===============================================
-- AGGREGATE FILTERS (Get available filter options)
-- ===============================================

CREATE OR REPLACE FUNCTION get_filter_aggregates(
  base_filters JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  result := jsonb_build_object(
    'housing_types', (
      SELECT jsonb_agg(DISTINCT housing_type ORDER BY housing_type)
      FROM listings
      WHERE is_active = true
    ),
    'cities', (
      SELECT jsonb_agg(DISTINCT city ORDER BY city)
      FROM listings
      WHERE is_active = true
    ),
    'total_listings', (
      SELECT COUNT(*)
      FROM listings
      WHERE is_active = true
    ),
    'available_today', (
      SELECT COUNT(*)
      FROM listings
      WHERE is_active = true
      AND (availability->>'beds_today')::INTEGER > 0
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION search_listings(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION quick_search_listings(TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_listings(DECIMAL, DECIMAL, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_filter_aggregates(JSONB) TO anon, authenticated;

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON FUNCTION search_listings IS 'Main search function with comprehensive scoring algorithm. Returns ranked results based on distance, availability, eligibility, services, cost, and quality.';

COMMENT ON FUNCTION quick_search_listings IS 'Simple text-based search for quick results. Useful for autocomplete and simple searches.';

COMMENT ON FUNCTION get_nearby_listings IS 'Geographic search for map view. Returns listings within a radius with DV location obfuscation.';

COMMENT ON FUNCTION get_filter_aggregates IS 'Returns available filter options and counts for dynamic filter UI.';