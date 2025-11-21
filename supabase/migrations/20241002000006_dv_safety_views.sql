-- HOU2ED DV Safety Features
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
GRANT EXECUTE ON FUNCTION log_dv_access(UUID, TEXT, INET, TEXT) TO authenticated;