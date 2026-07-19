import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupRequest {
  email: string
  password: string
  fullName: string
  username: string
  role: 'seeker' | 'provider'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limit: 5 signup attempts per IP per hour (shared key with other signup functions)
    const supabaseForRateLimit = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const ip = getClientIp(req)
    const rl = await checkRateLimit(supabaseForRateLimit, `signup:${ip}`, 60, 5)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds, corsHeaders)

    // Parse request body
    const body: SignupRequest = await req.json()
    const { email, password, fullName, username, role } = body

    // Validate inputs
    if (!email || !password || !fullName || !username || !role) {
      throw new Error('Missing required fields')
    }

    console.log(`Processing signup for: ${email}`)

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check for existing email/username
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email already registered',
          errorCode: 'EMAIL_EXISTS',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user AND send verification email in one step
    // We use the regular auth.signUp which DOES send verification emails
    const { data: signupData, error: signupError } = await supabaseAdmin.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role,
        },
        emailRedirectTo: undefined, // Use OTP instead of magic link
      },
    })

    if (signupError) {
      console.error('Signup error:', signupError)
      throw signupError
    }

    if (!signupData?.user) {
      throw new Error('Signup failed - no user returned')
    }

    const userId = signupData.user.id
    console.log(`User created: ${userId}, verification email sent`)

    // Create profile (trigger might be broken)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        username,
        role,
        phone: null,
        avatar_url: null,
        verified_provider: false,
        verification_status: null,
        verification_documents: null,
        seeker_profile: {},
        provider_profile: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (profileError && !profileError.message?.includes('duplicate')) {
      console.error('Profile creation error:', profileError)
    }

    // Return the user data in the format the app expects
    return new Response(
      JSON.stringify({
        success: true,
        user: signupData.user,
        session: signupData.session,
        needsVerification: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: any) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Signup failed',
        errorCode: 'SERVER_ERROR',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})