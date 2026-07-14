import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PERMANENT_BAN_DURATION = '876000h' // 100 years — this app only supports permanent ban/unban

type AdminAction = 'ban' | 'unban' | 'delete'

interface AdminActionRequest {
  action: AdminAction
  targetUserId: string
  reason?: string
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
      // raw wasn't JSON — treat it as the key itself
      return raw
    }
  }
  return Deno.env.get(legacyEnvVar) ?? ''
}

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

    const { action, targetUserId, reason }: AdminActionRequest = await req.json()

    if (!action || !targetUserId) {
      return jsonResponse({ success: false, error: 'Missing action or targetUserId' }, 400)
    }
    if (!['ban', 'unban', 'delete'].includes(action)) {
      return jsonResponse({ success: false, error: 'Invalid action' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    // Identify the caller using their own JWT against the publishable key —
    // this client has no elevated privileges, it only tells us who's asking.
    // The incoming request's own "apikey" header is the most reliable source
    // (it's what the client actually used to reach this function), falling
    // back to the injected env vars if that's absent for some reason.
    const publishableKey = req.headers.get('apikey') || resolveKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
    const callerClient = createClient(
      supabaseUrl,
      publishableKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    // auth.getUser() does NOT automatically use the client's global headers —
    // it needs the caller's JWT passed explicitly (or it looks for an
    // internal persisted session, which a fresh server-side client never has).
    const callerJwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(callerJwt)
    if (callerError || !caller) {
      return jsonResponse({ success: false, error: 'Invalid or expired session' }, 401)
    }

    // is_admin() is GRANTed to `authenticated`, so this runs fine under the
    // caller's own scoped client — no service role needed for the check.
    const { data: isAdmin, error: adminCheckError } = await callerClient.rpc('is_admin', { uid: caller.id })
    if (adminCheckError || !isAdmin) {
      return jsonResponse({ success: false, error: 'Admin access required' }, 403)
    }

    if (targetUserId === caller.id) {
      return jsonResponse({ success: false, error: 'Cannot perform this action on your own account' }, 400)
    }

    // Only past this point do we touch the service role.
    const adminClient = createClient(
      supabaseUrl,
      resolveKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (action === 'ban') {
      const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: PERMANENT_BAN_DURATION,
      })
      if (authError) throw authError

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_reason: reason ?? null,
          banned_by: caller.id,
        })
        .eq('id', targetUserId)
      if (profileError) throw profileError

      return jsonResponse({ success: true }, 200)
    }

    if (action === 'unban') {
      const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none',
      })
      if (authError) throw authError

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          is_banned: false,
          banned_at: null,
          banned_reason: null,
          banned_by: null,
        })
        .eq('id', targetUserId)
      if (profileError) throw profileError

      return jsonResponse({ success: true }, 200)
    }

    // action === 'delete'
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteError) throw deleteError

    return jsonResponse({ success: true }, 200)
  } catch (error) {
    console.error('admin-user-action error:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      500
    )
  }
})
