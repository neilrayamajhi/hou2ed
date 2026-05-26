# HOU2ED App - Developer Setup Guide

This guide will help you set up your development environment from scratch to work on the HOU2ED app.

## Prerequisites
- macOS (for iOS development) or Windows/Linux (for Android/web only)
- VS Code installed
- About 30-60 minutes for initial setup

## Step 1: Install Homebrew (macOS only)
Homebrew is a package manager for macOS that makes installing developer tools easy.

```bash
# Open Terminal and run:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# After installation, follow the instructions to add Homebrew to your PATH
# Usually involves running these commands:
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## Step 2: Install Node.js and npm
Node.js is required to run JavaScript on your computer, and npm is the package manager.

### Option A: Using Homebrew (macOS)
```bash
brew install node
```

### Option B: Direct Download (All platforms)
1. Go to https://nodejs.org/
2. Download the LTS version (currently 20.x)
3. Run the installer

### Verify Installation
```bash
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
```

## Step 3: Install Git
Git is needed for version control.

### macOS with Homebrew:
```bash
brew install git
```

### All platforms:
Download from https://git-scm.com/downloads

### Configure Git
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 4: Install Expo CLI
Expo is the framework we use for React Native development.

```bash
npm install -g expo-cli
```

## Step 5: Install Watchman (macOS only, optional but recommended)
Watchman watches files for changes and triggers rebuilds.

```bash
brew install watchman
```

## Step 6: Clone the Repository
```bash
# Navigate to where you want to store the project
cd ~/Documents  # or wherever you prefer

# Clone the repository
git clone [repository-url]  # Replace with actual repo URL
cd h2d/app
```

## Step 7: Set Up Environment Variables
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your credentials
# You'll need to get these from the team lead:
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - Other API keys as needed
```

## Step 8: Install Project Dependencies
```bash
# Make sure you're in the app directory
cd ~/Documents/h2d/app  # Adjust path as needed

# Install all npm packages
npm install
```

## Step 9: Install Expo Go on Your Phone
For testing on a physical device:

1. **iOS**: Download "Expo Go" from the App Store
2. **Android**: Download "Expo Go" from Google Play Store

## Step 10: Start the Development Server
```bash
# In the app directory
npm start

# This will open Expo Dev Tools in your browser
# You'll see a QR code
```

## Step 11: Run the App

### On Your Phone:
1. Open Expo Go app
2. **iOS**: Use Camera app to scan the QR code
3. **Android**: Use the "Scan QR Code" option in Expo Go

### On Simulator/Emulator:
- Press `i` for iOS simulator (macOS only, requires Xcode)
- Press `a` for Android emulator (requires Android Studio)
- Press `w` for web browser

## Additional Setup (Optional but Recommended)

### Install iOS Development Tools (macOS only)
```bash
# Install Xcode from App Store (this takes a while, ~10GB)
# Then install Xcode Command Line Tools:
xcode-select --install

# Install CocoaPods (iOS dependency manager)
brew install cocoapods
```

### Install Android Development Tools (All platforms)
1. Download Android Studio from https://developer.android.com/studio
2. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### VS Code Extensions
Install these helpful extensions in VS Code:
1. **ES7+ React/Redux/React-Native snippets** - Shortcuts for React Native
2. **Prettier - Code formatter** - Auto-format code
3. **ESLint** - Catch errors early
4. **React Native Tools** - Debugging support
5. **GitLens** - Better Git integration

To install extensions:
1. Open VS Code
2. Click the Extensions icon (square icon on left sidebar)
3. Search for each extension name
4. Click "Install"

## Common Commands

```bash
# Start the development server
npm start

# Run on iOS (macOS only)
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Run tests
npm test

# Check for linting errors
npm run lint

# Format code with Prettier
npm run format
```

## Troubleshooting

### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --clear
```

### Expo Go app won't connect
1. Make sure your phone and computer are on the same WiFi network
2. If using VPN, try disconnecting
3. Try using tunnel mode: `npm start -- --tunnel`

### Port 8081 already in use
```bash
# Find and kill the process
lsof -i :8081
kill -9 [PID]  # Replace [PID] with the process ID
```

### General reset
```bash
# Nuclear option - clear everything
watchman watch-del-all
rm -rf node_modules
rm -rf .expo
npm cache clean --force
npm install
npm start -- --clear
```

## Project Structure
```
h2d/
├── app/                    # React Native app
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── screens/       # Screen components
│   │   ├── navigation/    # Navigation setup
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom React hooks
│   │   ├── state/         # State management (Zustand)
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── assets/            # Images, fonts, etc.
│   ├── app.json          # Expo configuration
│   ├── package.json      # Dependencies
│   └── tsconfig.json     # TypeScript config
├── supabase/             # Database setup
└── docs/                 # Documentation
```

## Getting Help

1. **Team Lead**: Ask for environment variables and API keys
2. **Expo Docs**: https://docs.expo.dev
3. **React Native Docs**: https://reactnative.dev/docs/getting-started
4. **Supabase Docs**: https://supabase.io/docs

## Next Steps

Once everything is running:
1. Create a new branch for your work: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test on both iOS and Android if possible
4. Commit your changes: `git add . && git commit -m "Description of changes"`
5. Push to the repository: `git push origin feature/your-feature-name`
6. Create a pull request for review

Welcome to the team! 🎉