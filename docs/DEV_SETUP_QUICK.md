# HOU2ED Development Quick Start

## ✅ Current Setup Status

### Services Running:
- **Supabase**: Running on `http://192.168.1.8:54321`
  - Database: PostgreSQL on port 54322
  - Studio UI: http://localhost:54323
  - Email testing: http://localhost:54324
- **Expo**: Running on `http://localhost:8081`

### Database Schema Applied:
- ✅ profiles table (user profiles)
- ✅ listings table (housing listings)
- ✅ applications table
- ✅ saved_listings table
- ✅ messages table
- ✅ All RLS policies configured

## 🚀 Quick Commands

### Start Everything:
```bash
# 1. Start Docker Desktop (if not running)
open -a Docker

# 2. Start Supabase
npm run supabase:start

# 3. Start Expo
npx expo start
```

### Access Points:
- **Expo Metro**: http://localhost:8081
- **Supabase Studio**: http://localhost:54323
- **Email Inbox**: http://localhost:54324

### Test on Devices:
- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Physical Device**: Scan QR code with Expo Go app

## 📱 Testing Authentication

The app is configured to use your local Supabase instance automatically.

### Create Test Users:
1. Open Supabase Studio: http://localhost:54323
2. Go to Authentication → Users
3. Click "Add User" and create:
   - **Seeker**: `seeker@test.com` / `TestPass123!`
   - **Provider**: `provider@test.com` / `TestPass123!`

### Test Sign Up Flow:
1. Open the app on simulator/device
2. Choose role (Seeker or Provider)
3. Sign up with new email
4. Check email inbox at http://localhost:54324
5. Enter verification code in app

## 🛠 Troubleshooting

### If Supabase won't start:
```bash
# Stop and restart
npm run supabase:stop
npm run supabase:start
```

### If Expo won't connect:
1. Check your IP address:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

2. Update `.env` with your machine's IP:
```env
EXPO_PUBLIC_SUPABASE_URL=http://YOUR_IP:54321
```

3. Restart Expo:
```bash
npx expo start --clear
```

### View Logs:
```bash
# Supabase logs
npx supabase status

# Check specific service
docker logs supabase_auth_app
```

## 📝 Environment Variables

Current configuration in `.env`:
- `EXPO_PUBLIC_SUPABASE_URL`: http://192.168.1.8:54321
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: (local development key)
- `EXPO_PUBLIC_APP_SCHEME`: hou2ed

## 🔄 Daily Workflow

1. **Morning Setup**:
   ```bash
   open -a Docker
   npm run supabase:start
   npx expo start
   ```

2. **Evening Shutdown**:
   ```bash
   npm run supabase:stop
   # Ctrl+C in Expo terminal
   ```

## 📚 Key Files

- **Supabase Config**: `supabase/config.toml`
- **Database Schema**: `supabase/migrations/*.sql`
- **Auth Logic**: `src/lib/supabase.ts`
- **Auth Screens**: `src/screens/Auth/*.tsx`

## 🎯 Next Steps

Now that everything is running, you can:
1. Test the authentication flow
2. Create listings as a provider
3. Browse and apply as a seeker
4. Test the messaging system

Happy coding! 🚀