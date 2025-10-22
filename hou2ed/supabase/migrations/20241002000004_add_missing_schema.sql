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
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;