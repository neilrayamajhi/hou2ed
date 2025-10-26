-- HOU2ED Database Schema - Add Missing Objects Only
-- This migration only adds what doesn't exist yet

-- Enable necessary extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ===============================================
-- Add missing columns to profiles if needed
-- ===============================================

DO $$
BEGIN
  -- Add columns that might be missing
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_provider BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_documents JSONB;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seeker_profile JSONB DEFAULT '{}';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_profile JSONB DEFAULT '{}';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating profiles: %', SQLERRM;
END $$;

-- ===============================================
-- Create missing tables only
-- ===============================================

-- Create listings table if not exists
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  housing_type TEXT NOT NULL,
  unit_beds JSONB NOT NULL DEFAULT '{}',
  ada_beds INTEGER DEFAULT 0,
  gender_rooming TEXT,
  amenities JSONB DEFAULT '{}',
  accessibility JSONB DEFAULT '{}',
  eligibility JSONB DEFAULT '{}',
  services JSONB DEFAULT '{}',
  rules JSONB DEFAULT '{}',
  cost JSONB DEFAULT '{}',
  intake JSONB DEFAULT '{}',
  availability JSONB DEFAULT '{
    "beds_today": 0,
    "beds_week": 0,
    "waitlist": 0,
    "last_updated_at": null
  }',
  verified BOOLEAN DEFAULT false,
  certifications JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  responsiveness JSONB DEFAULT '{}',
  dv_sensitive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_location CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

-- Create applications table if not exists
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new',
  stage_timestamps JSONB DEFAULT '{
    "new": null,
    "docs_needed": null,
    "under_review": null,
    "approved": null,
    "move_in_pending": null,
    "active": null,
    "completed": null,
    "rejected": null,
    "waitlist": null
  }',
  application_data JSONB DEFAULT '{}',
  notes TEXT,
  decision_by UUID REFERENCES profiles(id),
  decision_note TEXT,
  decision_date TIMESTAMPTZ,
  consent_signature TEXT,
  consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, seeker_id)
);

-- Create documents table if not exists
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'uploaded',
  rejection_reason TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create threads table if not exists
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  participants UUID[] NOT NULL,
  subject TEXT,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT thread_reference CHECK (
    listing_id IS NOT NULL OR application_id IS NOT NULL
  )
);

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  read_at TIMESTAMPTZ,
  read_by UUID[] DEFAULT '{}',
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Create saved searches table if not exists
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  notification_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved listings table if not exists
CREATE TABLE IF NOT EXISTS saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ===============================================
-- FUNCTIONS (Create or Replace)
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_listing_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- TRIGGERS (Create if not exists)
-- ===============================================

DO $$
BEGIN
  -- Update triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_listings_updated_at') THEN
    CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_applications_updated_at') THEN
    CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
    CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_threads_updated_at') THEN
    CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_saved_searches_updated_at') THEN
    CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  -- Location trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_listing_location_trigger') THEN
    CREATE TRIGGER update_listing_location_trigger
      BEFORE INSERT OR UPDATE OF lat, lng ON listings
      FOR EACH ROW EXECUTE FUNCTION update_listing_location();
  END IF;
END $$;

-- ===============================================
-- INDEXES (Create if not exists)
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_listings_provider_id ON listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_availability ON listings USING GIN (availability);
CREATE INDEX IF NOT EXISTS idx_listings_updated_at ON listings(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_id ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);

CREATE INDEX IF NOT EXISTS idx_threads_participants ON threads USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_threads_listing_id ON threads(listing_id);
CREATE INDEX IF NOT EXISTS idx_threads_application_id ON threads(application_id);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ===============================================
-- ROW LEVEL SECURITY
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies if they don't exist
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'listings'
    AND policyname = 'Anyone can view active listings'
  ) THEN
    CREATE POLICY "Anyone can view active listings"
      ON listings FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'listings'
    AND policyname = 'Providers can create listings'
  ) THEN
    CREATE POLICY "Providers can create listings"
      ON listings FOR INSERT
      WITH CHECK (provider_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'listings'
    AND policyname = 'Providers can update own listings'
  ) THEN
    CREATE POLICY "Providers can update own listings"
      ON listings FOR UPDATE
      USING (provider_id = auth.uid());
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;-- HOU2ED Search Functions
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

COMMENT ON FUNCTION get_filter_aggregates IS 'Returns available filter options and counts for dynamic filter UI.';-- HOU2ED DV Safety Features
-- Phase B3.2 - DV Safety Guard (Edge Function or View)

-- ===============================================
-- DV SAFETY VIEW - Public facing listings
-- ===============================================

-- This view automatically obfuscates DV-sensitive listing locations
CREATE OR REPLACE VIEW public_listings AS
SELECT
  l.id,
  l.provider_id,
  l.title,
  l.description,
  -- Obfuscate address for DV-sensitive listings
  CASE
    WHEN l.dv_sensitive = true THEN
      l.city || ', ' || l.state -- Only show city and state
    ELSE
      l.address
  END AS address,
  l.city,
  l.state,
  -- Obfuscate zip code for DV listings
  CASE
    WHEN l.dv_sensitive = true THEN
      SUBSTRING(l.zip_code, 1, 3) || 'XX' -- Show only first 3 digits
    ELSE
      l.zip_code
  END AS zip_code,
  -- Round coordinates to city-level precision for DV listings
  CASE
    WHEN l.dv_sensitive = true THEN
      ROUND(l.lat::NUMERIC, 1)::DECIMAL -- ~7 miles precision
    ELSE
      l.lat
  END AS lat,
  CASE
    WHEN l.dv_sensitive = true THEN
      ROUND(l.lng::NUMERIC, 1)::DECIMAL -- ~7 miles precision
    ELSE
      l.lng
  END AS lng,
  l.housing_type,
  l.unit_beds,
  l.ada_beds,
  l.gender_rooming,
  l.amenities,
  l.accessibility,
  l.eligibility,
  l.services,
  l.rules,
  l.cost,
  l.intake,
  l.availability,
  l.verified,
  l.certifications,
  l.images,
  l.responsiveness,
  l.dv_sensitive,
  l.is_active,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.is_active = true;

-- Grant access to the view
GRANT SELECT ON public_listings TO anon, authenticated;

-- ===============================================
-- DV SAFETY FUNCTIONS
-- ===============================================

-- Function to check if user can see full DV details
CREATE OR REPLACE FUNCTION can_view_dv_details(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only providers and admins can see full DV details
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('provider', 'admin')
    AND verified_provider = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get listing with appropriate DV safety
CREATE OR REPLACE FUNCTION get_listing_safe(listing_id UUID)
RETURNS TABLE (
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
  contact_info JSONB
) AS $$
DECLARE
  listing_record listings%ROWTYPE;
  user_can_view_dv BOOLEAN;
  safe_contact JSONB;
BEGIN
  -- Get the listing
  SELECT * INTO listing_record FROM listings WHERE listings.id = listing_id;

  -- Check if user can view DV details
  user_can_view_dv := can_view_dv_details(auth.uid());

  -- Build safe contact info
  IF listing_record.dv_sensitive AND NOT user_can_view_dv THEN
    safe_contact := jsonb_build_object(
      'message', 'Contact information protected for safety',
      'intake_phone', 'Call 211 for referral',
      'requires_referral', true
    );
  ELSE
    safe_contact := listing_record.intake;
  END IF;

  RETURN QUERY SELECT
    listing_record.id,
    listing_record.provider_id,
    listing_record.title,
    listing_record.description,
    CASE
      WHEN listing_record.dv_sensitive AND NOT user_can_view_dv THEN
        listing_record.city || ', ' || listing_record.state
      ELSE
        listing_record.address
    END AS address,
    listing_record.city,
    listing_record.state,
    CASE
      WHEN listing_record.dv_sensitive AND NOT user_can_view_dv THEN
        SUBSTRING(listing_record.zip_code, 1, 3) || 'XX'
      ELSE
        listing_record.zip_code
    END AS zip_code,
    CASE
      WHEN listing_record.dv_sensitive AND NOT user_can_view_dv THEN
        ROUND(listing_record.lat::NUMERIC, 1)::DECIMAL
      ELSE
        listing_record.lat
    END AS lat,
    CASE
      WHEN listing_record.dv_sensitive AND NOT user_can_view_dv THEN
        ROUND(listing_record.lng::NUMERIC, 1)::DECIMAL
      ELSE
        listing_record.lng
    END AS lng,
    listing_record.housing_type,
    listing_record.unit_beds,
    listing_record.ada_beds,
    listing_record.gender_rooming,
    listing_record.amenities,
    listing_record.accessibility,
    listing_record.eligibility,
    listing_record.services,
    listing_record.rules,
    listing_record.cost,
    safe_contact AS intake,
    listing_record.availability,
    listing_record.verified,
    listing_record.certifications,
    listing_record.images,
    listing_record.responsiveness,
    listing_record.dv_sensitive,
    listing_record.is_active,
    listing_record.created_at,
    listing_record.updated_at,
    safe_contact AS contact_info;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===============================================
-- AUDIT LOGGING FOR DV ACCESS
-- ===============================================

-- Create audit table for DV listing access
CREATE TABLE IF NOT EXISTS dv_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  access_type TEXT, -- 'search', 'view', 'contact'
  user_role TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_dv_access_log_user ON dv_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_dv_access_log_listing ON dv_access_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_dv_access_log_time ON dv_access_log(accessed_at DESC);

-- Function to log DV access
CREATE OR REPLACE FUNCTION log_dv_access(
  listing_id UUID,
  access_type TEXT,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  listing_is_dv BOOLEAN;
  user_role_val TEXT;
BEGIN
  -- Check if listing is DV sensitive
  SELECT dv_sensitive INTO listing_is_dv
  FROM listings
  WHERE id = listing_id;

  -- Only log if it's a DV listing
  IF listing_is_dv THEN
    -- Get user role
    SELECT role::TEXT INTO user_role_val
    FROM profiles
    WHERE id = auth.uid();

    INSERT INTO dv_access_log (
      user_id,
      listing_id,
      access_type,
      user_role,
      ip_address,
      user_agent
    ) VALUES (
      auth.uid(),
      listing_id,
      access_type,
      user_role_val,
      ip_address,
      user_agent
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- ENHANCED RLS POLICIES FOR DV SAFETY
-- ===============================================

-- Drop and recreate listing policies with DV considerations
DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;

CREATE POLICY "View listings with DV safety"
  ON listings FOR SELECT
  USING (
    is_active = true AND (
      -- Non-DV listings are public
      dv_sensitive = false OR
      -- DV listings require authentication
      (dv_sensitive = true AND auth.uid() IS NOT NULL)
    )
  );

-- Policy for DV access log (admin only)
ALTER TABLE dv_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view DV access logs"
  ON dv_access_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ===============================================
-- DV SAFETY EDGE FUNCTION (Alternative approach)
-- ===============================================

-- Note: This SQL creates the database side.
-- The actual Edge Function would be deployed separately via Supabase CLI:
-- File: supabase/functions/dv-safe-listing/index.ts

COMMENT ON VIEW public_listings IS 'Public-facing view of listings with automatic DV location obfuscation';
COMMENT ON FUNCTION get_listing_safe IS 'Returns a single listing with appropriate DV safety measures based on user role';
COMMENT ON TABLE dv_access_log IS 'Audit log for tracking access to DV-sensitive listings for safety monitoring';

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION can_view_dv_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_safe(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_dv_access(UUID, TEXT, INET, TEXT) TO authenticated;-- Create RPC function for updating provider availability
-- Allows providers to update bed counts with a "confirm no change" option

CREATE OR REPLACE FUNCTION fn_update_availability(
    p_listing_id UUID,
    p_beds_today INTEGER DEFAULT NULL,
    p_beds_week INTEGER DEFAULT NULL,
    p_waitlist_days INTEGER DEFAULT NULL,
    p_confirm_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_provider_id UUID;
    v_listing RECORD;
    v_result JSONB;
    v_changes JSONB = '[]'::JSONB;
BEGIN
    -- Get the current user's provider ID
    SELECT id INTO v_provider_id
    FROM providers
    WHERE user_id = auth.uid();

    IF v_provider_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authorized as a provider'
        );
    END IF;

    -- Lock the listing row for update and verify ownership
    SELECT * INTO v_listing
    FROM listings
    WHERE id = p_listing_id
      AND provider_id = v_provider_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Listing not found or not owned by provider'
        );
    END IF;

    -- If confirm_only is true, just update the last_confirmed timestamp
    IF p_confirm_only THEN
        UPDATE listings
        SET
            last_confirmed = NOW(),
            updated_at = NOW()
        WHERE id = p_listing_id;

        -- Record the confirmation in availability history
        INSERT INTO availability_history (
            listing_id,
            provider_id,
            beds_available_today,
            beds_available_this_week,
            waitlist_days,
            change_type,
            notes
        ) VALUES (
            p_listing_id,
            v_provider_id,
            v_listing.beds_available_today,
            v_listing.beds_available_this_week,
            v_listing.waitlist_days,
            'confirmed',
            'Provider confirmed no changes to availability'
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Availability confirmed',
            'data', jsonb_build_object(
                'listing_id', p_listing_id,
                'confirmed_at', NOW(),
                'beds_today', v_listing.beds_available_today,
                'beds_week', v_listing.beds_available_this_week,
                'waitlist_days', v_listing.waitlist_days
            )
        );
    END IF;

    -- Build changes array for tracking what changed
    IF p_beds_today IS NOT NULL AND p_beds_today != v_listing.beds_available_today THEN
        v_changes = v_changes || jsonb_build_object(
            'field', 'beds_today',
            'from', v_listing.beds_available_today,
            'to', p_beds_today
        );
    END IF;

    IF p_beds_week IS NOT NULL AND p_beds_week != v_listing.beds_available_this_week THEN
        v_changes = v_changes || jsonb_build_object(
            'field', 'beds_week',
            'from', v_listing.beds_available_this_week,
            'to', p_beds_week
        );
    END IF;

    IF p_waitlist_days IS NOT NULL AND p_waitlist_days != v_listing.waitlist_days THEN
        v_changes = v_changes || jsonb_build_object(
            'field', 'waitlist_days',
            'from', v_listing.waitlist_days,
            'to', p_waitlist_days
        );
    END IF;

    -- If no changes provided, return error
    IF jsonb_array_length(v_changes) = 0 AND NOT p_confirm_only THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No changes provided. Use confirm_only=true to confirm current values.'
        );
    END IF;

    -- Update the listing with new values
    UPDATE listings
    SET
        beds_available_today = COALESCE(p_beds_today, beds_available_today),
        beds_available_this_week = COALESCE(p_beds_week, beds_available_this_week),
        waitlist_days = COALESCE(p_waitlist_days, waitlist_days),
        last_confirmed = NOW(),
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Record the changes in availability history
    INSERT INTO availability_history (
        listing_id,
        provider_id,
        beds_available_today,
        beds_available_this_week,
        waitlist_days,
        change_type,
        changes,
        notes
    ) VALUES (
        p_listing_id,
        v_provider_id,
        COALESCE(p_beds_today, v_listing.beds_available_today),
        COALESCE(p_beds_week, v_listing.beds_available_this_week),
        COALESCE(p_waitlist_days, v_listing.waitlist_days),
        'updated',
        v_changes,
        'Provider updated availability'
    );

    -- Check if this update affects any saved search alerts
    -- Alert users who have saved searches matching this listing
    PERFORM fn_check_saved_search_alerts(p_listing_id);

    -- Return success with updated values
    SELECT
        beds_available_today,
        beds_available_this_week,
        waitlist_days,
        last_confirmed
    INTO v_listing
    FROM listings
    WHERE id = p_listing_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Availability updated successfully',
        'data', jsonb_build_object(
            'listing_id', p_listing_id,
            'beds_today', v_listing.beds_available_today,
            'beds_week', v_listing.beds_available_this_week,
            'waitlist_days', v_listing.waitlist_days,
            'last_confirmed', v_listing.last_confirmed,
            'changes', v_changes
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'An error occurred: ' || SQLERRM
        );
END;
$$;

-- Create availability history table to track changes
CREATE TABLE IF NOT EXISTS availability_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id),
    beds_available_today INTEGER,
    beds_available_this_week INTEGER,
    waitlist_days INTEGER,
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'confirmed')),
    changes JSONB DEFAULT '[]'::JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_availability_history_listing ON availability_history(listing_id, created_at DESC);
CREATE INDEX idx_availability_history_provider ON availability_history(provider_id, created_at DESC);

-- RLS policies for availability history
ALTER TABLE availability_history ENABLE ROW LEVEL SECURITY;

-- Providers can see their own availability history
CREATE POLICY "Providers can view own availability history"
    ON availability_history
    FOR SELECT
    USING (provider_id IN (
        SELECT id FROM providers WHERE user_id = auth.uid()
    ));

-- Function to check and create alerts for saved searches when availability changes
CREATE OR REPLACE FUNCTION fn_check_saved_search_alerts(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing RECORD;
    v_search RECORD;
BEGIN
    -- Get the updated listing details
    SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Find all saved searches that might match this listing
    FOR v_search IN
        SELECT ss.*
        FROM saved_searches ss
        WHERE ss.notification_enabled = TRUE
          AND (
            -- Check if the search filters match the listing
            (ss.filters->>'housingType' IS NULL OR ss.filters->>'housingType' = v_listing.housing_type::TEXT)
            AND (ss.filters->>'unitBedType' IS NULL OR ss.filters->>'unitBedType' = v_listing.unit_beds::TEXT)
            AND (ss.filters->>'minPrice' IS NULL OR (ss.filters->>'minPrice')::INTEGER <= v_listing.monthly_rent)
            AND (ss.filters->>'maxPrice' IS NULL OR (ss.filters->>'maxPrice')::INTEGER >= v_listing.monthly_rent)
            -- Add more filter checks as needed
          )
    LOOP
        -- Check if we already created an alert for this listing recently
        IF NOT EXISTS (
            SELECT 1
            FROM saved_search_alerts
            WHERE search_id = v_search.id
              AND listing_id = p_listing_id
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            -- Create a new alert
            INSERT INTO saved_search_alerts (
                search_id,
                user_id,
                listing_id,
                alert_type,
                message
            ) VALUES (
                v_search.id,
                v_search.user_id,
                p_listing_id,
                'availability_update',
                format('Availability updated for %s: %s beds available today',
                    v_listing.name,
                    v_listing.beds_available_today)
            );
        END IF;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users (providers)
GRANT EXECUTE ON FUNCTION fn_update_availability TO authenticated;
GRANT EXECUTE ON FUNCTION fn_check_saved_search_alerts TO authenticated;

-- Add last_confirmed column to listings if it doesn't exist
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_confirmed TIMESTAMPTZ DEFAULT NOW();-- Phase B5.1: RLS Refinement for Security
-- Comprehensive Row Level Security policies for all tables
-- Implements least-privilege access with DV protection

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- PROVIDERS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Providers can view own record" ON providers;
DROP POLICY IF EXISTS "Providers can update own record" ON providers;
DROP POLICY IF EXISTS "Public can view provider info" ON providers;
DROP POLICY IF EXISTS "Admins can manage providers" ON providers;

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Providers can view their own record
CREATE POLICY "Providers can view own record"
    ON providers FOR SELECT
    USING (auth.uid() = user_id);

-- Providers can update their own record
CREATE POLICY "Providers can update own record"
    ON providers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Public can view basic provider info (not sensitive data)
CREATE POLICY "Public can view provider info"
    ON providers FOR SELECT
    USING (verified = true);

-- Admins can manage all providers
CREATE POLICY "Admins can manage providers"
    ON providers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- LISTINGS TABLE POLICIES (WITH DV PROTECTION)
-- ============================================

DROP POLICY IF EXISTS "Public can view non-DV listings" ON listings;
DROP POLICY IF EXISTS "Providers can manage own listings" ON listings;
DROP POLICY IF EXISTS "Admins can manage all listings" ON listings;
DROP POLICY IF EXISTS "DV coordinates protected" ON listings;

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public can view listings but DV coordinates are protected
CREATE POLICY "Public can view listings with DV protection"
    ON listings FOR SELECT
    USING (
        active = true
        AND (
            -- Non-DV listings: show everything
            domestic_violence_focus = false
            OR
            -- DV listings: only show to authorized users
            (
                domestic_violence_focus = true
                AND (
                    -- Provider owns the listing
                    provider_id IN (
                        SELECT id FROM providers WHERE user_id = auth.uid()
                    )
                    OR
                    -- User is an admin
                    EXISTS (
                        SELECT 1 FROM profiles
                        WHERE user_id = auth.uid()
                        AND role = 'admin'
                    )
                    OR
                    -- User has an approved application for this listing
                    EXISTS (
                        SELECT 1 FROM applications
                        WHERE listing_id = listings.id
                        AND seeker_id = auth.uid()
                        AND status = 'approved'
                    )
                )
            )
        )
    );

-- Providers can manage their own listings
CREATE POLICY "Providers can manage own listings"
    ON listings FOR ALL
    USING (
        provider_id IN (
            SELECT id FROM providers WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        provider_id IN (
            SELECT id FROM providers WHERE user_id = auth.uid()
        )
    );

-- Admins can manage all listings
CREATE POLICY "Admins can manage all listings"
    ON listings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create a secure view for public listing access with DV redaction
CREATE OR REPLACE VIEW public_listings AS
SELECT
    id,
    provider_id,
    name,
    description,
    housing_type,
    unit_beds,
    beds_available_today,
    beds_available_this_week,
    waitlist_days,
    monthly_rent,
    security_deposit,
    utilities_included,
    pets_allowed,
    accessibility_features,
    amenities,
    requirements,
    application_process,
    -- Conditionally show coordinates
    CASE
        WHEN domestic_violence_focus = false THEN coordinates
        ELSE NULL
    END as coordinates,
    -- Show address only for non-DV
    CASE
        WHEN domestic_violence_focus = false THEN address
        ELSE district || ' area' -- Show only general area for DV
    END as address,
    district,
    island,
    -- Hide exact DV status from public
    CASE
        WHEN domestic_violence_focus = true THEN 'Confidential Location'
        ELSE NULL
    END as location_note,
    contact_phone,
    contact_email,
    active,
    created_at,
    updated_at,
    last_confirmed
FROM listings
WHERE active = true;

-- Grant access to the view
GRANT SELECT ON public_listings TO anon, authenticated;

-- ============================================
-- APPLICATIONS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Seekers can view own applications" ON applications;
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;
DROP POLICY IF EXISTS "Seekers can update own draft applications" ON applications;
DROP POLICY IF EXISTS "Providers can view applications for their listings" ON applications;
DROP POLICY IF EXISTS "Providers can update application status" ON applications;
DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Seekers can view their own applications
CREATE POLICY "Seekers can view own applications"
    ON applications FOR SELECT
    USING (seeker_id = auth.uid());

-- Seekers can create new applications
CREATE POLICY "Seekers can create applications"
    ON applications FOR INSERT
    WITH CHECK (seeker_id = auth.uid());

-- Seekers can update their own draft applications
CREATE POLICY "Seekers can update own draft applications"
    ON applications FOR UPDATE
    USING (
        seeker_id = auth.uid()
        AND status = 'draft'
    )
    WITH CHECK (
        seeker_id = auth.uid()
        AND status IN ('draft', 'submitted')
    );

-- Providers can view applications for their listings
CREATE POLICY "Providers can view applications for their listings"
    ON applications FOR SELECT
    USING (
        listing_id IN (
            SELECT id FROM listings
            WHERE provider_id IN (
                SELECT id FROM providers WHERE user_id = auth.uid()
            )
        )
    );

-- Providers can update application status for their listings
CREATE POLICY "Providers can update application status"
    ON applications FOR UPDATE
    USING (
        listing_id IN (
            SELECT id FROM listings
            WHERE provider_id IN (
                SELECT id FROM providers WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        -- Can only update status and provider_notes
        listing_id IN (
            SELECT id FROM listings
            WHERE provider_id IN (
                SELECT id FROM providers WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications"
    ON applications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- APPLICATION DOCUMENTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own documents" ON application_documents;
DROP POLICY IF EXISTS "Users can upload own documents" ON application_documents;
DROP POLICY IF EXISTS "Providers can view documents for their applications" ON application_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON application_documents;

ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
    ON application_documents FOR SELECT
    USING (
        application_id IN (
            SELECT id FROM applications WHERE seeker_id = auth.uid()
        )
    );

-- Users can upload documents for their applications
CREATE POLICY "Users can upload own documents"
    ON application_documents FOR INSERT
    WITH CHECK (
        application_id IN (
            SELECT id FROM applications WHERE seeker_id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Users can delete their own documents (before submission)
CREATE POLICY "Users can delete own draft documents"
    ON application_documents FOR DELETE
    USING (
        uploaded_by = auth.uid()
        AND application_id IN (
            SELECT id FROM applications
            WHERE seeker_id = auth.uid()
            AND status = 'draft'
        )
    );

-- Providers can view documents for applications to their listings
CREATE POLICY "Providers can view documents for their applications"
    ON application_documents FOR SELECT
    USING (
        application_id IN (
            SELECT a.id FROM applications a
            JOIN listings l ON a.listing_id = l.id
            WHERE l.provider_id IN (
                SELECT id FROM providers WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can manage all documents
CREATE POLICY "Admins can manage all documents"
    ON application_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- MESSAGE THREADS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Participants can view threads" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Participants can update threads" ON message_threads;

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Participants can view their threads
CREATE POLICY "Participants can view threads"
    ON message_threads FOR SELECT
    USING (
        auth.uid() = ANY(participant_ids)
    );

-- Users can create new threads
CREATE POLICY "Users can create threads"
    ON message_threads FOR INSERT
    WITH CHECK (
        auth.uid() = ANY(participant_ids)
    );

-- Participants can update thread metadata
CREATE POLICY "Participants can update threads"
    ON message_threads FOR UPDATE
    USING (
        auth.uid() = ANY(participant_ids)
    )
    WITH CHECK (
        auth.uid() = ANY(participant_ids)
    );

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Senders can edit own messages" ON messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Thread participants can view messages
CREATE POLICY "Participants can view messages"
    ON messages FOR SELECT
    USING (
        thread_id IN (
            SELECT id FROM message_threads
            WHERE auth.uid() = ANY(participant_ids)
        )
    );

-- Thread participants can send messages
CREATE POLICY "Participants can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND thread_id IN (
            SELECT id FROM message_threads
            WHERE auth.uid() = ANY(participant_ids)
        )
    );

-- Senders can edit their own recent messages (within 24 hours)
CREATE POLICY "Senders can edit own recent messages"
    ON messages FOR UPDATE
    USING (
        sender_id = auth.uid()
        AND created_at > NOW() - INTERVAL '24 hours'
    )
    WITH CHECK (
        sender_id = auth.uid()
    );

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete own messages"
    ON messages FOR UPDATE
    USING (
        sender_id = auth.uid()
    )
    WITH CHECK (
        sender_id = auth.uid()
        AND deleted_at IS NOT NULL -- Only allow setting deleted_at
    );

-- ============================================
-- SAVED ITEMS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own saved items" ON saved_listings;
DROP POLICY IF EXISTS "Users can save items" ON saved_listings;
DROP POLICY IF EXISTS "Users can delete own saved items" ON saved_listings;

ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved items
CREATE POLICY "Users can view own saved items"
    ON saved_listings FOR SELECT
    USING (user_id = auth.uid());

-- Users can save new items
CREATE POLICY "Users can save items"
    ON saved_listings FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own saved items (notes)
CREATE POLICY "Users can update own saved items"
    ON saved_listings FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own saved items
CREATE POLICY "Users can delete own saved items"
    ON saved_listings FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- SAVED SEARCHES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can create saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can update own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can delete own saved searches" ON saved_searches;

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved searches
CREATE POLICY "Users can view own saved searches"
    ON saved_searches FOR SELECT
    USING (user_id = auth.uid());

-- Users can create saved searches
CREATE POLICY "Users can create saved searches"
    ON saved_searches FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own saved searches
CREATE POLICY "Users can update own saved searches"
    ON saved_searches FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own saved searches
CREATE POLICY "Users can delete own saved searches"
    ON saved_searches FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- SAVED SEARCH ALERTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own alerts" ON saved_search_alerts;
DROP POLICY IF EXISTS "System can create alerts" ON saved_search_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON saved_search_alerts;

ALTER TABLE saved_search_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view their own alerts
CREATE POLICY "Users can view own alerts"
    ON saved_search_alerts FOR SELECT
    USING (user_id = auth.uid());

-- System can create alerts (via service role)
-- This will be handled by RPC functions with SECURITY DEFINER

-- Users can update their own alerts (mark as seen)
CREATE POLICY "Users can update own alerts"
    ON saved_search_alerts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- AVAILABILITY HISTORY TABLE POLICIES
-- ============================================

-- Already defined in previous migration, but let's ensure it's comprehensive

DROP POLICY IF EXISTS "Providers can view own availability history" ON availability_history;
DROP POLICY IF EXISTS "Admins can view all availability history" ON availability_history;

-- Providers can view their own availability history
CREATE POLICY "Providers can view own availability history"
    ON availability_history FOR SELECT
    USING (
        provider_id IN (
            SELECT id FROM providers WHERE user_id = auth.uid()
        )
    );

-- Admins can view all availability history
CREATE POLICY "Admins can view all availability history"
    ON availability_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- STORAGE POLICIES FOR BUCKETS
-- ============================================

-- Application documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
) ON CONFLICT (id) DO UPDATE
SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Profile avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Listing images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listing-images',
    'listing-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for application documents
CREATE POLICY "Users can upload own application documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own application documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own application documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for avatars
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for listing images (providers only)
CREATE POLICY "Providers can upload listing images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM providers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view listing images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'listing-images');

CREATE POLICY "Providers can update listing images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM providers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Providers can delete listing images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM providers WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- HELPER FUNCTIONS FOR SECURE ACCESS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is provider
CREATE OR REPLACE FUNCTION is_provider()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM providers
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's provider ID
CREATE OR REPLACE FUNCTION get_provider_id()
RETURNS UUID AS $$
DECLARE
    provider_id UUID;
BEGIN
    SELECT id INTO provider_id
    FROM providers
    WHERE user_id = auth.uid();

    RETURN provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view DV listing details
CREATE OR REPLACE FUNCTION can_view_dv_listing(listing_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = listing_id
        AND (
            -- Not a DV listing
            l.domestic_violence_focus = false
            OR
            -- User is the provider
            l.provider_id IN (
                SELECT id FROM providers WHERE user_id = auth.uid()
            )
            OR
            -- User is admin
            is_admin()
            OR
            -- User has approved application
            EXISTS (
                SELECT 1 FROM applications
                WHERE listing_id = l.id
                AND seeker_id = auth.uid()
                AND status = 'approved'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_id TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_dv_listing TO authenticated;