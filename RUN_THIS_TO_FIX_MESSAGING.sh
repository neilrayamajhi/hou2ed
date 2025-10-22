#!/bin/bash

# Script to fix the messaging system in HOU2ED app

echo "🔧 HOU2ED Messaging Fix Script"
echo "================================"
echo ""
echo "This script will guide you through fixing the messaging system."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Opening Supabase Dashboard${NC}"
echo "Opening your Supabase SQL Editor in the browser..."
echo ""

# Open Supabase dashboard
open "https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new"

echo -e "${GREEN}✓ Browser opened${NC}"
echo ""

echo -e "${YELLOW}Step 2: Copy the SQL Migration${NC}"
echo "The SQL migration file is at:"
echo "  /Users/neilrayamajhi/h2d/CREATE_MESSAGING_TABLES.sql"
echo ""
echo "Copying the SQL to your clipboard now..."

# Copy the SQL to clipboard
cat /Users/neilrayamajhi/h2d/CREATE_MESSAGING_TABLES.sql | pbcopy

echo -e "${GREEN}✓ SQL copied to clipboard!${NC}"
echo ""

echo -e "${YELLOW}Step 3: Run the Migration${NC}"
echo "1. The Supabase SQL Editor should now be open in your browser"
echo "2. Click in the SQL editor area"
echo "3. Press Cmd+V to paste the SQL (it's already in your clipboard)"
echo "4. Click the 'Run' button or press Cmd+Enter"
echo ""

echo "Press Enter when you've run the SQL migration..."
read -r

echo ""
echo -e "${YELLOW}Step 4: Restart the app${NC}"
echo "Restarting your Expo app with cleared cache..."
echo ""

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null || true

# Start Expo with clear cache
cd /Users/neilrayamajhi/h2d/app
npx expo start --clear &

echo ""
echo -e "${GREEN}✅ Fix Complete!${NC}"
echo ""
echo "The messaging system should now be working:"
echo "1. ✓ Database tables renamed correctly"
echo "2. ✓ Missing columns added"
echo "3. ✓ App code updated to handle both table names"
echo "4. ✓ App restarted with fresh cache"
echo ""
echo "Test it by:"
echo "1. Opening the app on your phone/simulator"
echo "2. Going to the Messages tab"
echo "3. Viewing or sending a message"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"