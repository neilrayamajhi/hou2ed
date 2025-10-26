-- CREATE TEST SEEKER USER
-- Run this in Supabase SQL Editor to create a test seeker account

-- First, create the auth user
-- NOTE: You'll need to run this part in the Supabase Dashboard > Authentication > Add User
-- OR use the auth.users table directly (if you have admin privileges)

-- For now, let's create a seeker profile that you can link to an auth user
-- You'll need to get the user ID from Supabase Auth after creating the account there

-- STEP 1: Create auth user in Supabase Dashboard first
-- Go to: Authentication > Users > Add User
-- Email: seeker@test.com
-- Password: TestSeeker123!
-- Copy the user ID that gets generated

-- STEP 2: Then run this SQL (replace 'YOUR_USER_ID_HERE' with the actual ID)

INSERT INTO profiles (
  id,
  email,
  full_name,
  username,
  role,
  created_at,
  updated_at
) VALUES (
  'YOUR_USER_ID_HERE', -- Replace with the actual user ID from Step 1
  'seeker@test.com',
  'Test Seeker',
  'testseeker',
  'seeker',
  now(),
  now()
);

-- ALTERNATIVE: If you have admin access to auth.users table, run this all-in-one script:

-- Create a seeker user with a known ID
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generate a new UUID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users (requires admin privileges)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'seeker@test.com',
    crypt('TestSeeker123!', gen_salt('bf')), -- Password: TestSeeker123!
    now(),
    now(),
    now(),
    '{"full_name": "Test Seeker", "role": "seeker"}'::jsonb,
    false,
    '',
    '',
    '',
    ''
  );

  -- Insert into profiles
  INSERT INTO profiles (
    id,
    email,
    full_name,
    username,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'seeker@test.com',
    'Test Seeker',
    'testseeker',
    'seeker',
    now(),
    now()
  );

  RAISE NOTICE 'Created seeker user with ID: %', new_user_id;
END $$;


-- ============================================
-- EASIER METHOD: Use Supabase Dashboard UI
-- ============================================
-- This is the recommended approach:
--
-- 1. Go to Supabase Dashboard
-- 2. Click "Authentication" in left sidebar
-- 3. Click "Users" tab
-- 4. Click "Add User" button
-- 5. Fill in:
--    - Email: seeker@test.com
--    - Password: TestSeeker123!
--    - Auto Confirm User: ✓ (check this)
-- 6. Click "Create User"
-- 7. Copy the User ID shown
-- 8. Run this SQL (replace the ID):

/*
INSERT INTO profiles (
  id,
  email,
  full_name,
  username,
  role,
  created_at,
  updated_at
) VALUES (
  'PASTE_USER_ID_HERE',
  'seeker@test.com',
  'Test Seeker',
  'testseeker',
  'seeker',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'seeker',
  full_name = 'Test Seeker',
  username = 'testseeker';
*/

-- ============================================
-- VERIFY THE USER WAS CREATED
-- ============================================

SELECT
  p.id,
  p.email,
  p.full_name,
  p.username,
  p.role,
  p.created_at
FROM profiles p
WHERE p.email = 'seeker@test.com';
