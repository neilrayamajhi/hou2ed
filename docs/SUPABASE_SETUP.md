# Supabase Setup Guide for HOU2ED

## Prerequisites
- Supabase account (create at https://supabase.com)
- Supabase CLI (optional, for local development)

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - Project name: `hou2ed`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
   - Pricing Plan: Free tier is fine for development

## Step 2: Configure Authentication

### Email Authentication
1. Go to Authentication → Settings
2. Under "Email Auth", ensure these are enabled:
   - Enable email signup
   - Enable email confirmations (recommended)
   - Confirm email = ON

### Email Templates
1. Go to Authentication → Email Templates
2. Customize the verification email:
   ```html
   <h2>Welcome to HOU2ED!</h2>
   <p>Please verify your email by entering this code:</p>
   <h1 style="color: #D4AF37;">{{ .Token }}</h1>
   <p>This code expires in 60 minutes.</p>
   ```

## Step 3: Set Up Database Tables

Run these SQL commands in the SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
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

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'role',
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Listings table
CREATE TABLE public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provider_id UUID REFERENCES public.profiles(id) NOT NULL,
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

-- Applications table
CREATE TABLE public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  seeker_id UUID REFERENCES public.profiles(id) NOT NULL,
  listing_id UUID REFERENCES public.listings(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted'))
    DEFAULT 'pending',
  notes TEXT,
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
```

## Step 4: Get Your API Keys

1. Go to Settings → API
2. Copy these values:
   - **Project URL**: `https://[YOUR_PROJECT_ID].supabase.co`
   - **Anon/Public Key**: `eyJ...` (safe to use in client-side code)

## Step 5: Configure Your App

1. Create a `.env` file in your app directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
EXPO_PUBLIC_APP_SCHEME=hou2ed
```

2. Never commit `.env` to git! Add it to `.gitignore`:
```gitignore
.env
.env.local
```

## Step 6: Configure Deep Linking (for password reset)

### For iOS (app.json):
```json
{
  "expo": {
    "scheme": "hou2ed",
    "ios": {
      "bundleIdentifier": "com.yourcompany.hou2ed",
      "associatedDomains": ["applinks:YOUR_PROJECT_ID.supabase.co"]
    }
  }
}
```

### For Android (app.json):
```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.hou2ed",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{
            "scheme": "hou2ed"
          }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Step 7: Test Your Setup

1. Start your app: `npx expo start`
2. Try creating an account
3. Check your email for verification code
4. Log in with your credentials

## Troubleshooting

### Email not sending?
- Check Authentication → Settings → SMTP Settings
- For production, configure a custom SMTP provider

### OTP not working?
- Ensure email confirmations are enabled
- Check spam folder
- Verify SMTP configuration

### Session not persisting?
- Check SecureStore permissions in your app
- Ensure AuthProvider is wrapping your app

## Production Considerations

1. **Enable Rate Limiting**: Authentication → Settings → Rate Limits
2. **Configure Custom SMTP**: For reliable email delivery
3. **Set up Database Backups**: Database → Backups
4. **Enable SSL Enforcement**: Database → Settings
5. **Configure Row Level Security**: Review and tighten policies
6. **Set up Monitoring**: Integrate with logging service

## Support

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: For app-specific issues