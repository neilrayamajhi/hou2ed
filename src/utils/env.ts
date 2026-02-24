import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().min(1, 'VITE_SUPABASE_URL is required'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_SITE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.message).join('\n');
  if (import.meta.env.DEV) {
    throw new Error(
      `[env] Missing environment variables — copy .env.example to .env and fill in values:\n${missing}`,
    );
  }
  // In production, surface a console warning rather than crashing
  console.warn(`[env] Missing environment variables:\n${missing}`);
}

export const env = parsed.data ?? {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_SITE_URL: undefined,
};
