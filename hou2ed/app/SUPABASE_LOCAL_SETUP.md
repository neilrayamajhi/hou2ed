# Supabase Local Development Setup

This guide helps you set up Supabase locally for HOU2ED development.

## Prerequisites

1. **Docker Desktop** (Required)
   - Download from: https://www.docker.com/products/docker-desktop
   - Make sure Docker is running before proceeding

2. **Node.js** (Already installed)
   - Version 16+ required

## Quick Start

### 1. Start Docker Desktop
Make sure Docker Desktop is running on your machine.

### 2. Start Supabase Local Environment
```bash
npm run supabase:start
```

This will start all Supabase services locally:
- Database (PostgreSQL) on port 54322
- Auth service on port 54321
- Storage service on port 54323
- Studio (UI) on port 54323

### 3. Access Supabase Studio
Open http://localhost:54323 in your browser to access Supabase Studio.

Default credentials:
- Username: `supabase`
- Password: Check the output from `npm run supabase:start`

### 4. Apply Database Migrations
```bash
npm run supabase:push
```

This creates all the tables and policies defined in our migrations.

### 5. Create Test Users

#### Via Supabase Studio:
1. Go to http://localhost:54323
2. Navigate to Authentication → Users
3. Click "Add User"
4. Create a provider account:
   - Email: `provider@test.com`
   - Password: `TestPass123!`
5. Create a seeker account:
   - Email: `seeker@test.com`
   - Password: `TestPass123!`

#### Via SQL (After creating users):
```sql
-- Update user metadata to set roles
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"provider"'
)
WHERE email = 'provider@test.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"seeker"'
)
WHERE email = 'seeker@test.com';
```

### 6. Seed Sample Data (Optional)
After creating users, update the seed file with actual user IDs and run:
```bash
npm run supabase:seed
```

## Environment Configuration

Create a `.env.local` file for local development:

```env
# Local Supabase URLs
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
EXPO_PUBLIC_APP_SCHEME=hou2ed
```

Note: The anon key above is the default for local development. It's safe to use locally.

## Common Commands

### Start Supabase
```bash
npm run supabase:start
```

### Stop Supabase
```bash
npm run supabase:stop
```

### Reset Database
```bash
npm run supabase:reset
```

### Create New Migration
```bash
npm run supabase:migration:new migration_name
```

### Apply Migrations
```bash
npm run supabase:push
```

## Project Structure

```
app/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── migrations/              # Database migrations
│   │   └── 20240320000001_initial_schema.sql
│   └── seed.sql                 # Seed data for development
├── src/
│   └── lib/
│       └── supabase.ts         # Supabase client configuration
└── .env.local                  # Local environment variables
```

## Switching Between Local and Production

### For Local Development:
Use `.env.local` with local Supabase URLs

### For Production/Remote:
Use `.env` with your production Supabase project URLs

The app automatically uses the correct environment based on the presence of these files.

## Troubleshooting

### Docker not running?
- Make sure Docker Desktop is installed and running
- Check Docker status: `docker ps`

### Port conflicts?
If ports are already in use:
```bash
npm run supabase:stop
# Then check what's using the ports:
lsof -i :54321
lsof -i :54322
lsof -i :54323
```

### Database connection issues?
1. Stop and restart Supabase:
```bash
npm run supabase:stop
npm run supabase:start
```

2. Reset the database:
```bash
npm run supabase:reset
```

### View Supabase Logs
```bash
npx supabase status
```

## Testing Authentication Flow

1. Start the app:
```bash
npm start
```

2. Use the test credentials:
   - Provider: `provider@test.com` / `TestPass123!`
   - Seeker: `seeker@test.com` / `TestPass123!`

3. The app will connect to your local Supabase instance automatically.

## Next Steps

1. Create test data through the app
2. Test all authentication flows
3. Verify database operations work correctly
4. Check RLS policies are working as expected

## Production Deployment

When ready to deploy to production:

1. Create a Supabase project at https://supabase.com
2. Run migrations on production:
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```
3. Update `.env` with production URLs
4. Deploy your app