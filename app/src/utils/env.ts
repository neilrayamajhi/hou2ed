import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Supabase config - REQUIRED for production
  // If not set, app will show a helpful error message
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  // Optional configs with sensible defaults
  MAPS_PROVIDER: z.enum(['google', 'apple']).optional().default('google'),
  MAPS_IOS_API_KEY: z.string().optional(),
  MAPS_ANDROID_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_KEY: z.string().optional(),
});

// Parse and validate environment variables
const rawEnv = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  MAPS_PROVIDER: process.env.EXPO_PUBLIC_MAPS_PROVIDER as 'google' | 'apple' | undefined,
  MAPS_IOS_API_KEY: process.env.EXPO_PUBLIC_MAPS_IOS_API_KEY,
  MAPS_ANDROID_API_KEY: process.env.EXPO_PUBLIC_MAPS_ANDROID_API_KEY,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
};

// Validate and export
export const env = (() => {
  try {
    const parsed = envSchema.parse(rawEnv);

    // Log environment info in development
    if (__DEV__) {
      console.log('=== Environment Configuration ===');
      console.log('  Supabase URL:', parsed.SUPABASE_URL);
      console.log('  Maps Provider:', parsed.MAPS_PROVIDER);
      console.log('  Sentry:', parsed.SENTRY_DSN ? 'Configured' : 'Not configured');
      console.log('  PostHog:', parsed.POSTHOG_KEY ? 'Configured' : 'Not configured');
      console.log('================================');
    }

    return parsed;
  } catch (error) {
    // Show helpful error message if Supabase is not configured
    console.error('\n❌ ENVIRONMENT CONFIGURATION ERROR ❌\n');
    console.error('Your app is not properly configured!');
    console.error('\nMissing required environment variables:');

    if (error instanceof z.ZodError) {
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }

    console.error('\n📝 To fix this:');
    console.error('1. Create a .env.local file in the app/ folder');
    console.error('2. Add these lines (with your real values):');
    console.error('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
    console.error('3. Restart the app with: npm start -- --clear\n');
    console.error('📖 See SWITCH_TO_CLOUD_SUPABASE.md for detailed instructions\n');

    // Throw error to prevent app from starting with wrong config
    throw new Error('Missing required environment variables. Check console for details.');
  }
})();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;