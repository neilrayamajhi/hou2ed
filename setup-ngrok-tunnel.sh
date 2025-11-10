#!/bin/bash

echo "🚀 Setting up ngrok for Expo tunnel..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Installing with Homebrew..."
    brew install ngrok
else
    echo "✅ ngrok is installed (version: $(ngrok version))"
fi

# Check if ngrok is configured
if ngrok config check &> /dev/null; then
    echo "✅ ngrok is already configured"
else
    echo "⚠️  ngrok needs to be configured with an auth token"
    echo ""
    echo "Please follow these steps:"
    echo "1. Sign up at: https://dashboard.ngrok.com/signup"
    echo "2. Get your auth token at: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok config add-authtoken YOUR_TOKEN_HERE"
    echo ""
    read -p "Do you have your auth token? (y/n): " has_token

    if [ "$has_token" = "y" ]; then
        read -p "Enter your ngrok auth token: " auth_token
        ngrok config add-authtoken "$auth_token"
        echo "✅ ngrok configured successfully!"
    else
        echo "Please get your auth token first, then run this script again."
        exit 1
    fi
fi

echo ""
echo "Testing ngrok connection..."
# Test ngrok by starting a temporary tunnel
timeout 5 ngrok http 8080 > /dev/null 2>&1 &
sleep 2
if pgrep -x "ngrok" > /dev/null; then
    echo "✅ ngrok is working!"
    pkill -x ngrok
else
    echo "⚠️  ngrok test failed, but it might still work with Expo"
fi

echo ""
echo "Installing Expo ngrok package..."
cd app
npm install -D @expo/ngrok@^4.1.0

echo ""
echo "✅ Setup complete! Now you can run:"
echo "   cd app"
echo "   npx expo start --tunnel"
echo ""
echo "Note: The first tunnel connection might take 30-60 seconds to establish."