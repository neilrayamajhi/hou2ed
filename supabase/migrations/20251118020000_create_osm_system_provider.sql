-- Create system provider for OSM-imported listings
-- This provider will own all listings imported from OpenStreetMap

-- Fixed UUID for the system provider (generated once, reused across environments)
-- UUID: '00000000-0000-0000-0000-000000000001'

-- Add source column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'hou2ed' CHECK (source IN ('hou2ed', 'osm', 'google_places', 'imported'));

-- Add index on source for filtering
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);

-- Add comment to explain the column
COMMENT ON COLUMN listings.source IS 'Source of the listing: hou2ed (created by verified providers), osm (imported from OpenStreetMap), google_places (from Google Places API), or imported (other external sources)';

-- Insert system provider profile
-- Note: This uses a fixed UUID so it's consistent across environments
-- We use user_id as a fixed value since there's no real auth user for this system account
INSERT INTO profiles (
  id,
  user_id,
  email,
  full_name,
  username,
  role,
  is_verified,
  created_at,
  updated_at,
  push_notifications_enabled,
  email_notifications_enabled
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,  -- Fixed system provider ID
  '00000000-0000-0000-0000-000000000001',         -- Same as ID for system accounts
  'openstreetmap@hou2ed.app',                     -- System email
  'OpenStreetMap Community',                       -- Display name
  'openstreetmap',                                 -- Username
  'provider',                                      -- Role
  true,                                            -- Verified by default
  NOW(),                                           -- Created now
  NOW(),                                           -- Updated now
  false,                                           -- No push notifications
  false                                            -- No email notifications
)
ON CONFLICT (id) DO NOTHING;  -- Don't fail if already exists

-- Add comment to identify this as a system account
COMMENT ON TABLE profiles IS 'User profiles. Special system accounts use fixed UUIDs starting with 00000000-...';
