import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional().default('http://192.168.1.8:54321'),
  SUPABASE_ANON_KEY: z.string().optional().default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'),
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
      console.log('=== Environment Configuration:');
      console.log('  Supabase URL:', parsed.SUPABASE_URL);
      console.log('  Maps Provider:', parsed.MAPS_PROVIDER);
      console.log('  Sentry:', parsed.SENTRY_DSN ? 'Configured' : 'Not configured');
      console.log('  PostHog:', parsed.POSTHOG_KEY ? 'Configured' : 'Not configured');
    }

    return parsed;
  } catch (error) {
    if (__DEV__) {
      console.error('L Environment validation failed:', error);
      if (error instanceof z.ZodError) {
        console.error('Issues:', error.issues);
      }
    }

    // Return defaults in production to prevent crashes
    return envSchema.parse({});
  }
})();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;