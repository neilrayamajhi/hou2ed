import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// This project migrated from legacy anon/service_role JWTs to the new
// publishable/secret key system. Supabase auto-injects BOTH the old (now
// disabled) SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY and the new
// SUPABASE_PUBLISHABLE_KEYS/SUPABASE_SECRET_KEYS (JSON arrays) as env vars —
// the old ones no longer work post-rotation, so the new ones must be used.
function resolveKey(newKeysEnvVar: string, legacyEnvVar: string): string {
  const raw = Deno.env.get(newKeysEnvVar)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const first = Array.isArray(parsed) ? parsed[0] : parsed
      const key = typeof first === 'string' ? first : first?.api_key ?? first?.apiKey
      if (key) return key
    } catch {
      return raw
    }
  }
  return Deno.env.get(legacyEnvVar) ?? ''
}

// Self-service account deletion. Deliberately has no targetUserId parameter
// at all — it only ever deletes the caller's own account, identified from
// their own JWT. That design (rather than reusing admin-user-action) means
// there's no permission-check bug class possible here: there is nothing to
// authorize beyond "is this a real, currently logged-in user."
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const publishableKey = req.headers.get('apikey') || resolveKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')

    const callerClient = createClient(
      supabaseUrl,
      publishableKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const callerJwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(callerJwt)
    if (callerError || !caller) {
      return jsonResponse({ success: false, error: 'Invalid or expired session' }, 401)
    }

    const adminClient = createClient(
      supabaseUrl,
      resolveKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(caller.id)
    if (deleteError) throw deleteError

    return jsonResponse({ success: true }, 200)
  } catch (error) {
    console.error('delete-own-account error:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      500
    )
  }
})
