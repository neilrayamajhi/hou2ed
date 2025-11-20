#!/bin/bash

# Migration SQL
SQL="-- Add source column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'hou2ed' CHECK (source IN ('hou2ed', 'osm', 'google_places', 'imported'));

CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);

-- Insert system provider profile
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
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001',
  'openstreetmap@hou2ed.app',
  'OpenStreetMap Community',
  'openstreetmap',
  'provider',
  true,
  NOW(),
  NOW(),
  false,
  false
)
ON CONFLICT (id) DO NOTHING;"

echo "🔧 Applying migration..."
echo ""
echo "⚠️  This requires service role key access."
echo "Please run this SQL manually in your Supabase dashboard:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new"
echo "2. Paste the SQL below:"
echo "3. Click 'Run'"
echo ""
echo "================================ SQL ================================"
echo "$SQL"
echo "=================================================================="
