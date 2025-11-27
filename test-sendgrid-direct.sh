#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "   Testing SendGrid Configuration"
echo "════════════════════════════════════════════════════════════"
echo ""

# Read SendGrid key from .env
if [ -f .env ]; then
  KEY=$(grep -i sendgrid .env | head -1 | cut -d '=' -f2- | tr -d ' "'"'"'')
  
  if [ -z "$KEY" ]; then
    echo "❌ No SENDGRID key found in .env file"
    echo ""
    echo "Please add to .env:"
    echo "SENDGRID_API_KEY=SG.your-key-here"
    exit 1
  fi
  
  echo "✅ Found SendGrid key in .env"
  echo "   Key prefix: ${KEY:0:15}..."
  echo ""
else
  echo "❌ .env file not found"
  exit 1
fi

# Test the key with SendGrid API
echo "Testing SendGrid API access..."
echo ""

response=$(curl -s -w "\n%{http_code}" --request GET \
  --url https://api.sendgrid.com/v3/scopes \
  --header "Authorization: Bearer $KEY")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ SendGrid API key is VALID!"
  echo ""
  echo "Key permissions:"
  echo "$body" | grep -o '"[^"]*"' | head -10
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "   Your SendGrid key works!"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "Copy this configuration to Supabase:"
  echo ""
  echo "1. Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings"
  echo "2. Scroll to 'SMTP Settings'"
  echo "3. Enter:"
  echo ""
  echo "   SMTP Host: smtp.sendgrid.net"
  echo "   SMTP Port: 587"
  echo "   SMTP User: apikey"
  echo "   SMTP Pass: $KEY"
  echo "   Sender: noreply@yourdomain.com"
  echo ""
  echo "4. Click Save"
  echo "5. Click 'Send Test Email'"
  echo ""
  
elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
  echo "❌ SendGrid API key is INVALID or REVOKED"
  echo ""
  echo "This key doesn't work. You need to:"
  echo ""
  echo "1. Go to: https://app.sendgrid.com/settings/api_keys"
  echo "2. Delete this old key (if it exists)"
  echo "3. Create a NEW API key:"
  echo "   - Name: hou2ed-production"
  echo "   - Permissions: Mail Send → Full Access"
  echo "4. Copy the new key"
  echo "5. Update .env file:"
  echo "   SENDGRID_API_KEY=your-new-key"
  echo "6. Update Supabase SMTP settings with new key"
  echo ""
  
else
  echo "❌ Unexpected error: $http_code"
  echo ""
  echo "Response:"
  echo "$body"
  echo ""
  echo "Check your internet connection or SendGrid status"
fi

echo "════════════════════════════════════════════════════════════"

