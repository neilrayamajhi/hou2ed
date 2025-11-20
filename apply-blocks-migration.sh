#!/bin/bash

# Get the Supabase project reference from .env
cd app
source .env

echo "🔧 Applying blocks RLS policies migration..."
echo "Project: $EXPO_PUBLIC_SUPABASE_URL"

# Apply the migration using Supabase CLI
cd ..
supabase db push --db-url "$EXPO_PUBLIC_SUPABASE_URL" --password "$SUPABASE_DB_PASSWORD" --include-all

echo "✅ Migration applied!"
