#!/bin/bash

echo "🧪 Testing ngrok tunnel setup for Expo..."
echo ""

# Check ngrok config
if ngrok config check &> /dev/null; then
    echo "✅ ngrok is configured"
else
    echo "❌ ngrok is NOT configured yet"
    echo ""
    echo "Please run: ngrok config add-authtoken YOUR_TOKEN"
    echo "Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
fi

# Kill any existing Expo processes
echo "Cleaning up any existing Expo processes..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true
lsof -ti:19001 | xargs kill -9 2>/dev/null || true

echo ""
echo "✅ Ready to start Expo with tunnel!"
echo ""
echo "Starting Expo with tunnel mode..."
echo "NOTE: The first tunnel connection can take 30-60 seconds..."
echo ""

npx expo start --tunnel --clear