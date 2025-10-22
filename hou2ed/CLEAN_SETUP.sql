-- HOU2ED Clean Database Setup
-- Run this in Supabase SQL Editor for a fresh database

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ===============================================
-- Create profiles table
-- ===============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'seeker',
  phone TEXT,
  verified_provider BOOLEAN DEFAULT false,
  verification_status TEXT,
  verification_documents JSONB,
  seeker_profile JSONB DEFAULT '{}',
  provider_profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- Create listings table
-- ===============================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Los Angeles',
  state TEXT NOT NULL DEFAULT 'CA',
  zip_code TEXT NOT NULL DEFAULT '90001',
  lat DECIMAL(10, 8) NOT NULL DEFAULT 34.0522,
  lng DECIMAL(11, 8) NOT NULL DEFAULT -118.2437,
  location GEOGRAPHY(POINT, 4326),
  housing_type TEXT NOT NULL DEFAULT 'emergency_shelter',
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
  availability JSONB DEFAULT '{"beds_today": 0, "beds_week": 0, "waitlist": 0}',
  verified BOOLEAN DEFAULT false,
  certifications JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  responsiveness JSONB DEFAULT '{}',
  dv_sensitive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- Create other tables
-- ===============================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new',
  stage_timestamps JSONB DEFAULT '{}',
  application_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, seeker_id)
);

CREATE TABLE IF NOT EXISTS saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ===============================================
-- Create functions
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
-- Create triggers
-- ===============================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at 
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_listing_location_trigger ON listings;
CREATE TRIGGER update_listing_location_trigger
  BEFORE INSERT OR UPDATE OF lat, lng ON listings
  FOR EACH ROW EXECUTE FUNCTION update_listing_location();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at 
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===============================================
-- Create indexes
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_listings_provider_id ON listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_id ON applications(seeker_id);

-- ===============================================
-- Enable Row Level Security
-- ===============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- Create RLS policies
-- ===============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;
CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Providers can create listings" ON listings;
CREATE POLICY "Providers can create listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Providers can update own listings" ON listings;
CREATE POLICY "Providers can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Providers can delete own listings" ON listings;
CREATE POLICY "Providers can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = provider_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
