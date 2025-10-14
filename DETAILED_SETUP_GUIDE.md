# HOU2ED App - Complete Developer Setup Guide (Foolproof Edition)

This guide assumes you have NOTHING installed except VS Code. We'll go through every single step in detail.

## Table of Contents
1. [Terminal Basics](#terminal-basics)
2. [Install Homebrew](#install-homebrew)
3. [Install Node.js](#install-nodejs)
4. [Install Git](#install-git)
5. [Install Expo Tools](#install-expo-tools)
6. [Install Supabase CLI](#install-supabase-cli)
7. [Clone the Project](#clone-the-project)
8. [Environment Setup](#environment-setup)
9. [Install Dependencies](#install-dependencies)
10. [Phone Setup (Expo Go)](#phone-setup)
11. [Run the App](#run-the-app)
12. [VS Code Setup](#vs-code-setup)
13. [Troubleshooting](#troubleshooting)

---

## Terminal Basics

First, you need to know how to open and use Terminal (command line):

### Opening Terminal on Mac:
1. Press `Command + Space` to open Spotlight Search
2. Type "Terminal"
3. Press `Enter` to open Terminal app
4. You'll see a window with text like: `YourName@YourComputer ~ %`

### Basic Terminal Commands You'll Use:
- `pwd` = "Print Working Directory" - shows where you are
- `ls` = "List" - shows files in current folder
- `cd foldername` = "Change Directory" - move into a folder
- `cd ..` = go back one folder
- `cd ~` = go to home directory
- `mkdir foldername` = "Make Directory" - create a new folder
- `clear` = clear the terminal screen

### Copy-Paste in Terminal:
- **Copy**: `Command + C`
- **Paste**: `Command + V`
- **Stop a running process**: `Control + C` (not Command!)

---

## Install Homebrew

Homebrew is a package manager - it installs other software for you.

### Step 1: Check if Homebrew is already installed
```bash
# In Terminal, type this and press Enter:
which brew

# If you see something like "/opt/homebrew/bin/brew", skip to Step 4
# If you see "brew not found" or nothing, continue to Step 2
```

### Step 2: Install Homebrew
```bash
# Copy and paste this entire command into Terminal and press Enter:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# You'll see text scrolling. This takes 2-5 minutes.
# It will ask for your password - type it (you won't see dots) and press Enter
```

### Step 3: Add Homebrew to PATH

After installation, you'll see instructions like "Run these two commands in your terminal to add Homebrew to your PATH"

**For Apple Silicon Macs (M1/M2/M3):**
```bash
# Run these commands ONE AT A TIME:
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

**For Intel Macs:**
```bash
# Run these commands ONE AT A TIME:
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

### Step 4: Verify Homebrew works
```bash
# Type this and press Enter:
brew --version

# You should see something like: "Homebrew 4.1.0"
# If you see "command not found", close Terminal completely and open it again, then retry
```

---

## Install Node.js

Node.js lets you run JavaScript outside a web browser.

### Step 1: Install Node.js using Homebrew
```bash
# This installs Node.js and npm (Node Package Manager)
brew install node

# This takes 2-3 minutes
# You'll see lots of text - that's normal
```

### Step 2: Verify Node.js installation
```bash
# Check Node version:
node --version

# Should show something like: v20.11.0 or v22.x.x
# Any version 18 or higher is fine
```

### Step 3: Verify npm installation
```bash
# Check npm version:
npm --version

# Should show something like: 10.2.4
# Any version 8 or higher is fine
```

### Step 4: Set npm registry (just in case)
```bash
# This ensures npm downloads from the correct place:
npm config set registry https://registry.npmjs.org/
```

---

## Install Git

Git is for version control - it tracks changes to code.

### Step 1: Install Git
```bash
# Install using Homebrew:
brew install git

# Takes about 1 minute
```

### Step 2: Verify Git installation
```bash
# Check Git version:
git --version

# Should show something like: git version 2.43.0
```

### Step 3: Configure Git with your information
```bash
# Set your name (replace with your actual name):
git config --global user.name "Your Full Name"

# Set your email (replace with your actual email):
git config --global user.email "youremail@example.com"

# Verify your settings:
git config --global --list
```

---

## Install Expo Tools

Expo is the framework for building React Native apps.

### Step 1: Install Expo CLI globally
```bash
# Install Expo command line tools:
npm install -g expo-cli

# The -g means "global" - available everywhere
# This takes 1-2 minutes
```

### Step 2: Verify Expo installation
```bash
# Check Expo version:
expo --version

# Should show something like: 6.3.10
```

### Step 3: Install EAS CLI (Expo Application Services)
```bash
# This is for building and deploying:
npm install -g eas-cli

# Takes about 1 minute
```

### Step 4: Install Watchman (optional but recommended for macOS)
```bash
# Watchman watches files and triggers rebuilds:
brew install watchman

# Takes 2-3 minutes
```

---

## Install Supabase CLI

Supabase is our database and authentication service.

### Step 1: Install Supabase CLI using Homebrew
```bash
# Install Supabase command line interface:
brew install supabase/tap/supabase

# This takes 1-2 minutes
```

### Step 2: Verify Supabase installation
```bash
# Check Supabase version:
supabase --version

# Should show something like: 1.142.0
```

### Step 3: Update Supabase to latest version
```bash
# Make sure you have the latest version:
brew upgrade supabase
```

---

## Clone the Project

Now we'll get the actual code onto your computer.

### Step 1: Create a folder for your projects
```bash
# Go to your home directory:
cd ~

# Create a folder called "projects" (if it doesn't exist):
mkdir -p ~/projects

# Go into the projects folder:
cd ~/projects

# Verify you're in the right place:
pwd
# Should show: /Users/YourName/projects
```

### Step 2: Clone the repository
```bash
# Clone the project (replace with actual URL):
git clone https://github.com/[username]/h2d.git

# OR if using SSH:
git clone git@github.com:[username]/h2d.git

# You'll see "Cloning into 'h2d'..." and progress
```

### Step 3: Navigate into the project
```bash
# Go into the project folder:
cd h2d

# List what's in there:
ls
# You should see: app, supabase, docs, etc.

# Go into the app folder:
cd app

# Verify you're in the right place:
pwd
# Should show: /Users/YourName/projects/h2d/app
```

---

## Environment Setup

Environment variables are secret keys the app needs to run.

### Step 1: Check for example environment file
```bash
# Make sure you're in the app directory:
cd ~/projects/h2d/app

# List all files including hidden ones:
ls -la

# Look for .env.example or .env.local
```

### Step 2: Create your local environment file
```bash
# If .env.example exists, copy it:
cp .env.example .env.local

# If it doesn't exist, create it:
touch .env.local
```

### Step 3: Open the file in VS Code
```bash
# Open VS Code in current directory:
code .

# If "code" command doesn't work, do this first:
# 1. Open VS Code manually
# 2. Press Cmd+Shift+P
# 3. Type "Shell Command: Install 'code' command in PATH"
# 4. Press Enter
# 5. Try "code ." again
```

### Step 4: Add environment variables
In VS Code, open `.env.local` and add these (get actual values from team lead):

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# App Configuration
EXPO_PUBLIC_APP_SCHEME=hou2ed
EXPO_PUBLIC_APP_NAME="HOU2ED"

# Optional - Maps (if using)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=[your-google-maps-key]

# Optional - Analytics
EXPO_PUBLIC_POSTHOG_KEY=[your-posthog-key]
EXPO_PUBLIC_SENTRY_DSN=[your-sentry-dsn]
```

### Step 5: Save the file
- Press `Command + S` to save in VS Code

---

## Install Dependencies

Now we install all the packages the app needs.

### Step 1: Make sure you're in the app directory
```bash
# Check where you are:
pwd
# Should show: /Users/YourName/projects/h2d/app

# If not, navigate there:
cd ~/projects/h2d/app
```

### Step 2: Clean install (recommended for first time)
```bash
# Remove any existing installations:
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache:
npm cache clean --force
```

### Step 3: Install all dependencies
```bash
# Install everything the project needs:
npm install

# This takes 3-5 minutes
# You'll see a progress bar and lots of text
# Warnings are usually OK, errors are not
```

### Step 4: Verify installation worked
```bash
# Check node_modules was created:
ls -la | grep node_modules
# Should show: drwxr-xr-x ... node_modules

# Check for common issues:
npm list --depth=0
# Should list all packages without errors
```

---

## Phone Setup

### Step 1: Install Expo Go on your phone

**For iPhone:**
1. Open App Store
2. Search for "Expo Go" (by Expo Project)
3. Download and install (it's free)
4. Open the app once to set it up

**For Android:**
1. Open Google Play Store
2. Search for "Expo Go"
3. Download and install
4. Open the app once to set it up

### Step 2: Create an Expo account (optional but recommended)
1. In Expo Go app, tap "Sign Up"
2. Create an account with email
3. Verify your email

### Step 3: Connect phone to same WiFi as computer
1. On your phone, go to Settings → WiFi
2. Note which network you're connected to
3. Make sure your computer is on the same network

---

## Run the App

### Step 1: Start the Metro bundler
```bash
# Make sure you're in app directory:
cd ~/projects/h2d/app

# Start the development server:
npm start

# You'll see:
# "Starting project at /Users/..."
# "Starting Metro Bundler"
# Then a QR code will appear
```

### Step 2: Understanding the Metro interface
After running `npm start`, you'll see:
- A QR code
- Options like:
  - `› Press a │ open Android`
  - `› Press i │ open iOS simulator`
  - `› Press w │ open web`
  - `› Press r │ reload app`
  - `› Press m │ toggle menu`

### Step 3: Open on your phone using Expo Go

**For iPhone:**
1. Open Camera app (not Expo Go)
2. Point at the QR code in Terminal
3. Tap the notification that appears
4. It will open in Expo Go

**For Android:**
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Scan the QR code from Terminal

### Step 4: Wait for the app to build
- First time takes 2-5 minutes
- You'll see "Building JavaScript bundle" on phone
- Progress bar will show in Terminal

### Step 5: App should open!
- You should see the login screen
- If you see errors, check Troubleshooting section

---

## VS Code Setup

### Step 1: Install essential extensions

1. Open VS Code
2. Click Extensions icon (squares icon) on left sidebar
3. Search and install each of these:

**MUST HAVE Extensions:**

**1. ES7+ React/Redux/React-Native snippets**
- Search: "ES7+ React"
- Publisher: dsznajder
- Install the one with millions of downloads

**2. Prettier - Code formatter**
- Search: "Prettier"
- Publisher: Prettier
- Install the official one

**3. ESLint**
- Search: "ESLint"
- Publisher: Microsoft
- Integrates ESLint into VS Code

**4. React Native Tools**
- Search: "React Native Tools"
- Publisher: Microsoft
- For debugging React Native

**5. GitLens**
- Search: "GitLens"
- Publisher: GitKraken
- Shows git blame inline

**6. Path Intellisense**
- Search: "Path Intellisense"
- Publisher: Christian Kohler
- Autocompletes filenames

### Step 2: Configure VS Code settings

1. Press `Command + ,` to open Settings
2. Click the `{}` icon (top right) for JSON settings
3. Add these settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.tabSize": 2,
  "files.autoSave": "onFocusChange",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.snippetSuggestions": "top",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

### Step 3: Configure Prettier

Create `.prettierrc` in the app folder:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## Supabase Local Development

### Step 1: Initialize Supabase locally
```bash
# In the project root (not app folder):
cd ~/projects/h2d

# Initialize Supabase:
supabase init

# This creates a supabase folder with config
```

### Step 2: Start Supabase locally (optional)
```bash
# Start local Supabase instance:

supabase start

# This downloads Docker images (first time takes 5-10 minutes)
# You'll get local URLs for:
# - API URL
# - GraphQL URL
# - DB URL
# - Studio URL (visual database editor)
```

### Step 3: Access Supabase Studio
```bash
# After supabase start, you'll see:
# Studio URL: http://localhost:54323

# Open this in your browser to see your database
```

### Step 4: Link to remote Supabase (if you have a project)
```bash
# Login to Supabase:
supabase login

# Link to remote project:
supabase link --project-ref [your-project-ref]

# Pull remote schema:
supabase db pull
```

### Step 5: Stop Supabase when done
```bash
# Stop local Supabase:
supabase stop
```

---

## Common Development Workflow

### Daily Startup Routine:
```bash
# 1. Open Terminal
# 2. Navigate to project:
cd ~/projects/h2d/app

# 3. Pull latest changes:
git pull origin main

# 4. Install any new dependencies:
npm install

# 5. Start the app:
npm start

# 6. Scan QR code with phone
```

### Making Changes:
```bash
# 1. Create a new branch:
git checkout -b feature/your-feature-name

# 2. Make your changes in VS Code

# 3. Test on phone (shake phone for developer menu)

# 4. Add changes:
git add .

# 5. Commit changes:
git commit -m "Description of what you did"

# 6. Push changes:
git push origin feature/your-feature-name
```

---

## Troubleshooting

### Problem: "command not found: brew"
**Solution:**
```bash
# Re-run the Homebrew PATH setup:
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
# Close and reopen Terminal
```

### Problem: "command not found: node"
**Solution:**
```bash
# Reinstall Node:
brew uninstall node
brew install node
# Close and reopen Terminal
```

### Problem: "Module not found" errors
**Solution:**
```bash
# Clear everything and reinstall:
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force
npm install
```

### Problem: Expo Go can't connect
**Solution 1: Check WiFi**
```bash
# Make sure computer and phone are on same network
# On Mac, hold Option and click WiFi icon to see network details
```

**Solution 2: Use Tunnel**
```bash
# Stop current server (Control + C)
# Start with tunnel:
npx expo start --tunnel
# This works even on different networks
```

**Solution 3: Clear Expo cache**
```bash
# Stop server (Control + C)
# Clear cache:
npx expo start --clear
```

### Problem: "Unable to resolve module"
**Solution:**
```bash
# Reset Metro bundler:
npx react-native start --reset-cache
```

### Problem: Port 8081 already in use
**Solution:**
```bash
# Find what's using port 8081:
lsof -i :8081

# Kill the process (replace PID with number from above):
kill -9 [PID]

# Or kill all Metro processes:
killall -9 node
```

### Problem: Build failing on phone
**Solution:**
```bash
# 1. Force quit Expo Go on phone
# 2. Stop server (Control + C)
# 3. Clear everything:
rm -rf .expo
rm -rf node_modules
npm install
npx expo start --clear
```

### Problem: "Invalid regular expression" or Babel errors
**Solution:**
```bash
# Clear all caches:
npm start -- --reset-cache
cd ios && pod install && cd ..  # If on Mac
```

### Problem: Environment variables not working
**Solution:**
```bash
# Make sure file is named .env.local (with the dot)
# Restart server after changing env vars:
# Control + C to stop
npm start
```

### Problem: Git merge conflicts
**Solution:**
```bash
# See conflicted files:
git status

# Open in VS Code and resolve conflicts
# Then:
git add .
git commit -m "Resolved merge conflicts"
```

---

## Getting Help

### In Terminal:
- `man [command]` - see manual for any command
- `[command] --help` - see help for specific command

### Project-specific help:
1. Check error messages carefully - they usually tell you what's wrong
2. Google the exact error message
3. Check if anyone else had this issue:
   - Search in project's GitHub Issues
   - Search on Stack Overflow
   - Check Expo forums: forums.expo.dev

### Useful commands to remember:
```bash
# Where am I?
pwd

# What's in this folder?
ls -la

# Go back to app folder:
cd ~/projects/h2d/app

# See running processes:
ps aux | grep node

# Check network ports:
netstat -an | grep 8081

# See command history:
history

# Search command history:
history | grep "npm"
```

---

## Final Checklist

Before saying "it doesn't work", check:

- [ ] Are you in the right directory? (`pwd` should show `.../h2d/app`)
- [ ] Did you run `npm install`?
- [ ] Is your `.env.local` file properly configured?
- [ ] Are your phone and computer on the same WiFi?
- [ ] Did you try turning it off and on again? (seriously, restart Terminal)
- [ ] Did you try `npm start --clear`?
- [ ] Is Expo Go app up to date on your phone?
- [ ] Did you check for typos in commands?

---

## Congratulations! 🎉

If you made it this far and everything is working, you're ready to start developing!

Remember:
- Save your work often (`Command + S`)
- Commit your changes regularly
- Ask questions when stuck
- Read error messages carefully
- Take breaks when frustrated

Welcome to the development team!