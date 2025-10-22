-- HOU2ED Seed Data
-- Test data for development and testing

-- ===============================================
-- TEST USERS
-- ===============================================

-- Note: These users need to be created through Supabase Auth
-- Password for all test users: TestPass123!

-- Test Provider User (already exists if you signed up)
-- Email: provider@hou2ed.test
-- Role: provider

-- Test Seeker User
-- Email: seeker@hou2ed.test
-- Role: seeker

-- Update profiles for test users (run after creating auth users)
DO $$
DECLARE
  provider_id UUID;
  seeker_id UUID;
BEGIN
  -- Get or create provider profile
  SELECT id INTO provider_id FROM auth.users WHERE email = 'provider@hou2ed.test';
  IF provider_id IS NOT NULL THEN
    UPDATE profiles SET
      role = 'provider',
      full_name = 'Test Provider',
      username = 'testprovider',
      phone = '555-0100',
      verified_provider = true
    WHERE id = provider_id;
  END IF;

  -- Get or create seeker profile
  SELECT id INTO seeker_id FROM auth.users WHERE email = 'seeker@hou2ed.test';
  IF seeker_id IS NOT NULL THEN
    UPDATE profiles SET
      role = 'seeker',
      full_name = 'Test Seeker',
      username = 'testseeker',
      phone = '555-0200'
    WHERE id = seeker_id;
  END IF;
END $$;

-- ===============================================
-- SAMPLE LISTINGS
-- ===============================================

-- Function to create sample listings
CREATE OR REPLACE FUNCTION create_sample_listings()
RETURNS void AS $$
DECLARE
  provider_id UUID;
BEGIN
  -- Get a provider ID (use the first provider found)
  SELECT id INTO provider_id FROM profiles WHERE role = 'provider' LIMIT 1;

  IF provider_id IS NULL THEN
    RAISE NOTICE 'No provider found. Please create a provider account first.';
    RETURN;
  END IF;

  -- 1. Emergency Shelter - Available Today
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Hope Haven Emergency Shelter',
    'Safe emergency shelter with 24/7 intake. We provide hot meals, showers, and case management services. Pet-friendly with designated areas.',
    '123 Main Street',
    'Los Angeles',
    'CA',
    '90001',
    34.0522,
    -118.2437,
    'emergency_shelter',
    '{"shared_dorm": 20, "private_room": 2}',
    2,
    'co_ed',
    '{"kitchen": "staff_prepared", "wifi": "basic", "laundry": "onsite", "parking": "street", "storage": true, "common_room": true}',
    '{"ada_unit": true, "ada_bathroom": true, "wheelchair_ramp": true, "elevator": false}',
    '{"age_groups": ["adults", "seniors"], "genders": ["male", "female", "non_binary"], "populations": ["veterans", "general"]}',
    '{"mental_health": ["counseling"], "medical": ["nurse"], "skills": ["job_training", "resume_help"]}',
    '{"sobriety_required": false, "curfew": "10pm", "visitors": "day_only", "pets": "service_and_esa"}',
    '{"is_free": true, "vouchers": ["emergency_voucher"]}',
    '{"method": "walk_in", "hours": "24/7", "phone": "555-0111", "waitlist": false}',
    '{"beds_today": 5, "beds_week": 12, "waitlist": 0, "last_updated_at": "' || NOW() || '"}',
    true,
    false,
    true
  );

  -- 2. Transitional Housing - Some Availability
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'New Beginnings Transitional Housing',
    'Supportive transitional housing program with comprehensive services. 6-month to 2-year program focused on achieving permanent housing.',
    '456 Oak Avenue',
    'Los Angeles',
    'CA',
    '90012',
    34.0536,
    -118.2428,
    'transitional_housing',
    '{"private_room": 10, "semi_shared": 5}',
    1,
    'co_ed',
    '{"kitchen": "shared", "wifi": "high_speed", "laundry": "onsite", "parking": "onsite", "storage": true}',
    '{"ada_unit": true, "ada_bathroom": true, "wheelchair_ramp": true}',
    '{"age_groups": ["adults"], "genders": ["male", "female"], "populations": ["general", "justice_involved"]}',
    '{"mental_health": ["counseling", "therapy"], "skills": ["job_training", "financial_literacy"]}',
    '{"sobriety_required": true, "sobriety_days": 30, "curfew": "11pm", "mandatory_meetings": true}',
    '{"monthly": 500, "sliding_scale": true, "deposit": 250}',
    '{"method": "referral", "hours": "9am-5pm", "phone": "555-0122", "email": "intake@newbeginnings.org"}',
    '{"beds_today": 0, "beds_week": 2, "waitlist": 5, "last_updated_at": "' || NOW() || '"}',
    true,
    false,
    true
  );

  -- 3. DV Shelter - Location Protected
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Safe Harbor DV Shelter',
    'Confidential emergency shelter for survivors of domestic violence. Comprehensive safety planning and support services available.',
    'Confidential Address',
    'Los Angeles',
    'CA',
    '90015',
    34.0400,  -- Intentionally obfuscated
    -118.2600, -- Intentionally obfuscated
    'domestic_violence_shelter',
    '{"private_room": 8, "family_unit": 4}',
    2,
    'women_only',
    '{"kitchen": "shared", "wifi": "basic", "laundry": "onsite", "childcare": true, "playground": true}',
    '{"ada_unit": true, "ada_bathroom": true, "wheelchair_ramp": true}',
    '{"age_groups": ["adults", "youth"], "genders": ["female", "non_binary"], "populations": ["dv_survivors"], "families": true}',
    '{"mental_health": ["counseling", "therapy", "crisis_support"], "legal": ["legal_aid", "court_support"], "childcare": true}',
    '{"confidential": true, "no_contact_orders": "enforced", "visitors": "restricted"}',
    '{"is_free": true}',
    '{"method": "hotline", "hours": "24/7", "phone": "Call 211 for referral", "confidential": true}',
    '{"beds_today": 3, "beds_week": 3, "waitlist": 0, "last_updated_at": "' || NOW() || '"}',
    true,
    true,  -- DV sensitive flag
    true
  );

  -- 4. Sober Living Home
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Serenity Sober Living',
    'Structured sober living environment with strong peer support. Active 12-step community and regular house meetings.',
    '789 Pine Street',
    'Santa Monica',
    'CA',
    '90401',
    34.0195,
    -118.4912,
    'sober_living',
    '{"shared_dorm": 6, "semi_shared": 4}',
    0,
    'male',
    '{"kitchen": "shared", "wifi": "high_speed", "laundry": "onsite", "parking": "street", "gym": true}',
    '{"wheelchair_ramp": false}',
    '{"age_groups": ["adults"], "genders": ["male"], "populations": ["recovery"]}',
    '{"recovery": ["12_step", "peer_support"], "skills": ["job_placement"]}',
    '{"sobriety_required": true, "sobriety_days": 30, "testing": "random", "mandatory_meetings": "daily", "curfew": "10pm"}',
    '{"monthly": 800, "deposit": 800, "utilities_included": true}',
    '{"method": "interview", "hours": "9am-7pm", "phone": "555-0133", "requirements": "30_days_clean"}',
    '{"beds_today": 1, "beds_week": 1, "waitlist": 2, "last_updated_at": "' || NOW() || '"}',
    false,
    false,
    true
  );

  -- 5. Veteran Housing
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Veterans Village',
    'Dedicated housing for military veterans with comprehensive VA services on-site. HUD-VASH vouchers accepted.',
    '321 Victory Blvd',
    'Long Beach',
    'CA',
    '90802',
    33.7701,
    -118.1937,
    'veteran_housing',
    '{"private_room": 15, "apartment_style": 5}',
    3,
    'co_ed',
    '{"kitchen": "private", "wifi": "high_speed", "laundry": "in_unit", "parking": "onsite", "fitness_center": true}',
    '{"ada_unit": true, "ada_bathroom": true, "elevator": true, "grab_bars": true}',
    '{"age_groups": ["adults", "seniors"], "populations": ["veterans"], "proof": "dd214_required"}',
    '{"medical": ["va_clinic", "medication_management"], "mental_health": ["ptsd_support", "counseling"], "benefits": ["va_benefits_help"]}',
    '{"pets": "allowed", "visitors": "allowed", "quiet_hours": "10pm-7am"}',
    '{"vouchers": ["hud_vash"], "va_benefits": true, "monthly": 0}',
    '{"method": "va_referral", "hours": "8am-5pm", "phone": "555-0144", "coordinator": "va_case_manager"}',
    '{"beds_today": 2, "beds_week": 3, "waitlist": 1, "last_updated_at": "' || NOW() || '"}',
    true,
    false,
    true
  );

  -- 6. Family Shelter
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Family First Shelter',
    'Family-focused emergency shelter with private family rooms. On-site childcare and school enrollment assistance.',
    '555 Family Way',
    'Pasadena',
    'CA',
    '91101',
    34.1478,
    -118.1445,
    'family_housing',
    '{"family_unit": 10}',
    2,
    'co_ed',
    '{"kitchen": "shared", "wifi": "high_speed", "laundry": "onsite", "playground": true, "childcare": true, "study_room": true}',
    '{"ada_unit": true, "ada_bathroom": true, "wheelchair_ramp": true}',
    '{"families": true, "children": true, "age_groups": ["adults", "youth"], "populations": ["families_with_children"]}',
    '{"childcare": ["daycare", "after_school"], "education": ["school_enrollment", "tutoring"], "family": ["parenting_classes"]}',
    '{"children_supervised": true, "school_attendance": "required", "curfew": "9pm_children_7pm"}',
    '{"is_free": true, "cal_works": true}',
    '{"method": "walk_in", "hours": "24/7", "phone": "555-0155", "priority": "families_with_young_children"}',
    '{"beds_today": 2, "beds_week": 4, "waitlist": 3, "last_updated_at": "' || NOW() || '"}',
    true,
    false,
    true
  );

  -- 7. Youth Housing (18-24)
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Youth Empowerment Housing',
    'Transitional living program for youth aging out of foster care and experiencing homelessness. Life skills and education focus.',
    '888 Youth Street',
    'Hollywood',
    'CA',
    '90028',
    34.1016,
    -118.3267,
    'youth_housing',
    '{"shared_dorm": 8, "semi_shared": 6}',
    1,
    'co_ed',
    '{"kitchen": "shared", "wifi": "high_speed", "laundry": "onsite", "computer_lab": true, "music_room": true}',
    '{"ada_unit": false, "wheelchair_ramp": true}',
    '{"age_groups": ["youth_18_24"], "populations": ["foster_youth", "lgbtq_youth"], "lgbtq_affirming": true}',
    '{"education": ["ged", "college_prep"], "skills": ["life_skills", "job_training", "financial_literacy"], "mental_health": ["counseling"]}',
    '{"program_participation": "required", "curfew": "11pm_weekdays_1am_weekends"}',
    '{"is_free": true, "stipends": "available_for_program_participation"}',
    '{"method": "referral", "hours": "9am-9pm", "phone": "555-0166", "age_verification": "required"}',
    '{"beds_today": 3, "beds_week": 3, "waitlist": 5, "last_updated_at": "' || NOW() || '"}',
    true,
    false,
    true
  );

  -- 8. Medical Respite
  INSERT INTO listings (
    provider_id, title, description, address, city, state, zip_code,
    lat, lng, housing_type, unit_beds, ada_beds, gender_rooming,
    amenities, accessibility, eligibility, services, rules, cost, intake,
    availability, verified, dv_sensitive, is_active
  ) VALUES (
    provider_id,
    'Healing Bridge Medical Respite',
    'Post-hospitalization recuperative care for individuals experiencing homelessness. 24/7 nursing care and medication management.',
    '999 Health Center Dr',
    'Downtown LA',
    'CA',
    '90017',
    34.0522,
    -118.2653,
    'medical_respite',
    '{"private_room": 12, "semi_shared": 8}',
    4,
    'co_ed',
    '{"meals": "3_daily_plus_snacks", "wifi": "high_speed", "laundry": "provided", "wheelchair_accessible": true}',
    '{"ada_unit": true, "ada_bathroom": true, "elevator": true, "hospital_beds": true, "grab_bars": true}',
    '{"medical_clearance": "required", "populations": ["medical_recovery"], "insurance": ["medi_cal", "medicare"]}',
    '{"medical": ["24_7_nursing", "medication_management", "wound_care", "physical_therapy"], "case_management": true}',
    '{"medical_compliance": "required", "visitor_hours": "10am-8pm", "no_drugs_alcohol": true}',
    '{"insurance": ["medi_cal", "medicare"], "is_free": true}',
    '{"method": "hospital_referral", "hours": "24/7", "phone": "555-0177", "discharge_planning": "required"}',
    '{"beds_today": 4, "beds_week": 6, "waitlist": 2, "last_updated_at": "' || NOW() || '"}',
    true,
    false,
    true
  );

  RAISE NOTICE 'Sample listings created successfully!';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create sample listings
SELECT create_sample_listings();

-- ===============================================
-- TEST SEARCH QUERIES
-- ===============================================

-- Test search with location (Los Angeles center)
/*
SELECT * FROM search_listings(
  jsonb_build_object(
    'lat', 34.0522,
    'lng', -118.2437,
    'radius_miles', 10,
    'filters', jsonb_build_object(
      'available_only', true
    ),
    'limit', 10
  )
);
*/

-- Test quick search
/*
SELECT * FROM quick_search_listings('shelter', 'Los Angeles', 5);
*/

-- Test nearby listings for map
/*
SELECT * FROM get_nearby_listings(34.0522, -118.2437, 10, 20);
*/

-- Test DV-safe view
/*
SELECT * FROM public_listings WHERE dv_sensitive = true;
*/