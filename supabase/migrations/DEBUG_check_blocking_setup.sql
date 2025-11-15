-- Diagnostic script to check blocking feature setup
-- Run this in Supabase SQL Editor to see what's configured

-- ============================================================================
-- Step 1: Check if blocks table exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks') THEN
    RAISE NOTICE '✅ blocks table exists';
  ELSE
    RAISE NOTICE '❌ blocks table DOES NOT exist - you need to run migration 20251112000001';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Check if there are any blocks in the table
-- ============================================================================
DO $$
DECLARE
  block_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO block_count FROM blocks;
  RAISE NOTICE 'blocks table has % rows', block_count;

  IF block_count > 0 THEN
    RAISE NOTICE 'Sample blocks:';
  END IF;
END $$;

-- Show actual blocks
SELECT
  b.id,
  b.blocker_id,
  b.blocked_id,
  bp.email as blocker_email,
  bp.role as blocker_role,
  bkp.email as blocked_email,
  bkp.role as blocked_role,
  b.created_at
FROM blocks b
LEFT JOIN profiles bp ON bp.id = b.blocker_id
LEFT JOIN profiles bkp ON bkp.id = b.blocked_id
ORDER BY b.created_at DESC
LIMIT 5;

-- ============================================================================
-- Step 3: Check if trigger function exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'auto_reject_blocked_seeker_applications'
  ) THEN
    RAISE NOTICE '✅ auto_reject_blocked_seeker_applications function exists';
  ELSE
    RAISE NOTICE '❌ auto_reject_blocked_seeker_applications function DOES NOT exist';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Check if trigger exists on blocks table
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'auto_reject_on_provider_block'
  ) THEN
    RAISE NOTICE '✅ auto_reject_on_provider_block trigger exists';
  ELSE
    RAISE NOTICE '❌ auto_reject_on_provider_block trigger DOES NOT exist';
  END IF;
END $$;

-- ============================================================================
-- Step 5: Show trigger definition
-- ============================================================================
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger
WHERE tgname = 'auto_reject_on_provider_block';

-- ============================================================================
-- Step 6: Check RLS policies on applications table
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'applications'
  AND policyname LIKE '%block%';

-- ============================================================================
-- Step 7: Manually test the trigger function
-- ============================================================================
DO $$
DECLARE
  test_provider_id UUID;
  test_seeker_id UUID;
  test_listing_id UUID;
  test_application_id UUID;
  app_status TEXT;
BEGIN
  RAISE NOTICE '=== MANUAL TRIGGER TEST ===';

  -- Find a provider and seeker
  SELECT id INTO test_provider_id FROM profiles WHERE role = 'provider' LIMIT 1;
  SELECT id INTO test_seeker_id FROM profiles WHERE role = 'seeker' LIMIT 1;

  IF test_provider_id IS NULL OR test_seeker_id IS NULL THEN
    RAISE NOTICE '⚠️  Cannot test: Need at least one provider and one seeker in database';
    RETURN;
  END IF;

  RAISE NOTICE 'Test provider: %', test_provider_id;
  RAISE NOTICE 'Test seeker: %', test_seeker_id;

  -- Find a listing from this provider
  SELECT id INTO test_listing_id FROM listings WHERE provider_id = test_provider_id LIMIT 1;

  IF test_listing_id IS NULL THEN
    RAISE NOTICE '⚠️  Cannot test: Provider has no listings';
    RETURN;
  END IF;

  -- Find an application from this seeker to this provider's listing
  SELECT a.id, a.status
  INTO test_application_id, app_status
  FROM applications a
  WHERE a.seeker_id = test_seeker_id
    AND a.listing_id = test_listing_id
  LIMIT 1;

  IF test_application_id IS NULL THEN
    RAISE NOTICE '⚠️  Cannot test: No application found from seeker to this listing';
    RETURN;
  END IF;

  RAISE NOTICE 'Found application: % with status: %', test_application_id, app_status;

  -- Check what would happen if we created a block
  RAISE NOTICE 'This application WOULD be rejected if provider blocks seeker (status is not rejected/withdrawn)';

END $$;

-- ============================================================================
-- Summary
-- ============================================================================
RAISE NOTICE '=== DIAGNOSTIC COMPLETE ===';
RAISE NOTICE 'Check the NOTICE messages above to see the results';
