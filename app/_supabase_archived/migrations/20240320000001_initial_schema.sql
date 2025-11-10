-- Enable UUID extension (using gen_random_uuid which is built-in for Supabase cloud)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Not needed on Supabase cloud

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('seeker', 'provider')) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  phone TEXT,
  avatar_url TEXT
);

-- Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker'),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create listings table
CREATE TABLE public.listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  beds_available INTEGER NOT NULL DEFAULT 0,
  beds_total INTEGER NOT NULL,
  housing_type TEXT NOT NULL,
  cost_per_month DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  amenities TEXT[] DEFAULT '{}',
  rules TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8)
);

-- Enable RLS for listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Listings policies
CREATE POLICY "Anyone can view active listings" ON public.listings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Providers can create listings" ON public.listings
  FOR INSERT WITH CHECK (
    auth.uid() = provider_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'provider'
    )
  );

CREATE POLICY "Providers can update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = provider_id);

-- Create applications table
CREATE TABLE public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  seeker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted'))
    DEFAULT 'pending',
  notes TEXT,
  message TEXT,
  UNIQUE(seeker_id, listing_id)
);

-- Enable RLS for applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Applications policies
CREATE POLICY "Seekers can view own applications" ON public.applications
  FOR SELECT USING (auth.uid() = seeker_id);

CREATE POLICY "Providers can view applications for their listings" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = applications.listing_id
      AND listings.provider_id = auth.uid()
    )
  );

CREATE POLICY "Seekers can create applications" ON public.applications
  FOR INSERT WITH CHECK (
    auth.uid() = seeker_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'seeker'
    )
  );

CREATE POLICY "Providers can update application status" ON public.applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = applications.listing_id
      AND listings.provider_id = auth.uid()
    )
  );

-- Create saved_listings table for bookmarks
CREATE TABLE public.saved_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, listing_id)
);

-- Enable RLS for saved_listings
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

-- Saved listings policies
CREATE POLICY "Users can view own saved listings" ON public.saved_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save listings" ON public.saved_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved listings" ON public.saved_listings
  FOR DELETE USING (auth.uid() = user_id);

-- Create messages table for communication
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages for their applications" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = messages.application_id
      AND (applications.seeker_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.listings
          WHERE listings.id = applications.listing_id
          AND listings.provider_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can send messages for their applications" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = messages.application_id
      AND (applications.seeker_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.listings
          WHERE listings.id = applications.listing_id
          AND listings.provider_id = auth.uid()
        )
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_listings_provider_id ON public.listings(provider_id);
CREATE INDEX idx_listings_is_active ON public.listings(is_active);
CREATE INDEX idx_listings_city ON public.listings(city);
CREATE INDEX idx_applications_seeker_id ON public.applications(seeker_id);
CREATE INDEX idx_applications_listing_id ON public.applications(listing_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_saved_listings_user_id ON public.saved_listings(user_id);
CREATE INDEX idx_messages_application_id ON public.messages(application_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_role ON public.profiles(role);
-- [ARCHIVED] Legacy migration. Not used. Use root `supabase/migrations`.
