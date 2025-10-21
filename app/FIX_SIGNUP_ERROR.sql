-- ⚠️ IMPORTANT: Run this SQL in your Supabase Dashboard
-- Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new
-- Paste this entire file and click "Run"

-- This fixes the "Database error saving new user" error

-- Step 1: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT CHECK (role IN ('seeker', 'provider', 'admin')),
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Step 4: Create RLS policies
-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow everyone to view basic profile info (username, avatar)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT
    USING (true);

-- Step 5: Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', NULL),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'role', 'seeker')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 7: Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ✅ SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Profiles table and trigger created successfully!';
    RAISE NOTICE '✅ New users will now automatically get a profile';
    RAISE NOTICE '✅ Try signing up again - it should work now!';
END $$;
