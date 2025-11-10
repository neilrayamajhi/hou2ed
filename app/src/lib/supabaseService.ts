import { createClient } from "@supabase/supabase-js";
import { env } from "../utils/env";
import type { Database } from "./supabase-types";

// Service role client for operations that need to bypass RLS
// This should only be used for specific operations like storage bucket management
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

// Create a service client that bypasses RLS
export const supabaseService = createClient<Database>(
  env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Export a specific client for storage operations
export const supabaseStorageService = {
  storage: supabaseService.storage
};