# HOU2ED Database Setup Guide

## Overview
This directory contains the database schema and configuration for the HOU2ED application, designed to run on Supabase.

## Migration Files

### 001_core_schema.sql
- **Enums**: User roles, housing types, application statuses, document types
- **Tables**:
  - `profiles` - User profiles extending auth.users
  - `listings` - Housing listings with full details
  - `applications` - Applications from seekers to listings
  - `documents` - Application documents
  - `threads` - Message threads
  - `messages` - Individual messages
  - `saved_searches` - User saved searches
  - `saved_listings` - User saved listings
- **RLS Policies**: Row-level security for all tables
- **Indexes**: Performance optimization indexes
- **Triggers**: Auto-update timestamps, geographic data

### 002_storage_buckets.sql
- **Storage Buckets**:
  - `listing-images` - Public images for listings
  - `application-docs` - Private application documents
  - `profile-avatars` - Public user avatars
  - `message-attachments` - Private message files
- **Storage Policies**: Secure access control for each bucket

## Setup Instructions

### Prerequisites
1. Create a Supabase project at https://app.supabase.com
2. Note your project URL and anon key

### Applying Migrations

#### Option 1: Supabase Dashboard (Recommended for beginners)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `001_core_schema.sql`
4. Paste and run in SQL Editor
5. Repeat for `002_storage_buckets.sql`

#### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### Environment Configuration
Update your app's `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Database Schema Overview

### User Roles
- **seeker**: Can search and apply for housing
- **provider**: Can list housing and manage applications
- **admin**: System administrator

### Housing Types
Includes traditional housing plus medical facilities:
- Emergency shelters
- Transitional housing
- Permanent supportive housing
- Medical respite
- Detox facilities
- Hospitals with 5150 capacity

### Key Features

#### Geographic Search
- PostGIS extension for location-based queries
- Automatic location indexing
- Distance-based search capabilities

#### DV Safety
- `dv_sensitive` flag on listings
- Location obfuscation for DV shelters
- Restricted visibility policies

#### Application Pipeline
- Multi-stage application tracking
- Document verification workflow
- Consent recording

#### Real-time Messaging
- Thread-based conversations
- Attachment support
- Read receipts

### Security Features

#### Row Level Security (RLS)
- All tables have RLS enabled
- Policies based on user roles and ownership
- Special handling for DV-sensitive data

#### Storage Security
- Signed URLs for uploads
- File type and size restrictions
- Automatic cleanup of orphaned files

## Testing the Schema

### Create Test Data
```sql
-- Create a test provider profile
UPDATE profiles
SET role = 'provider', verified_provider = true
WHERE id = auth.uid();

-- Create a test listing
INSERT INTO listings (
  provider_id, title, description,
  address, city, state, zip_code,
  lat, lng, housing_type,
  availability
) VALUES (
  auth.uid(),
  'Test Shelter',
  'A safe place to stay',
  '123 Main St',
  'Los Angeles',
  'CA',
  '90001',
  34.0522,
  -118.2437,
  'emergency_shelter',
  '{"beds_today": 5, "beds_week": 10}'
);
```

### Verify RLS Policies
```sql
-- Test as authenticated user
SELECT * FROM listings WHERE is_active = true;

-- Test application creation
INSERT INTO applications (listing_id, seeker_id, status)
VALUES ('listing-uuid', auth.uid(), 'new');
```

## Troubleshooting

### Common Issues

1. **"permission denied for schema public"**
   - Ensure you're running migrations as the postgres user
   - Check RLS policies are correctly configured

2. **"type does not exist"**
   - Run migrations in order (001 before 002)
   - Ensure PostGIS extension is enabled

3. **Storage bucket errors**
   - Check that storage is enabled in your Supabase project
   - Verify bucket names match exactly

### Debug Queries
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename IN ('listings', 'applications');

-- Check storage buckets
SELECT * FROM storage.buckets;
```

## Next Steps

After setting up the database:

1. **Test Authentication**: Sign up a test user and verify profile creation
2. **Create Test Data**: Add sample listings and applications
3. **Verify Storage**: Upload test images and documents
4. **Test Search**: Implement and test the search RPC function (Phase B3.1)

## Support

For issues or questions:
- Check Supabase docs: https://supabase.com/docs
- Review the PRD for business logic
- Check error logs in Supabase dashboard