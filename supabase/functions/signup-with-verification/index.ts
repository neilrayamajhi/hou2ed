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

    // Check if email/username already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email already registered',
          errorCode: 'EMAIL_EXISTS',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existingUsername) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Username already taken',
          errorCode: 'USERNAME_EXISTS',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user and sending verification email...')

    // Method 1: Try regular signUp first (this should trigger email with SMTP)
    let userData: any = null
    let userError: any = null

    // First attempt: Use regular auth.signUp which triggers SMTP email
    const { data: signupData, error: signupError } = await supabaseAdmin.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role,
        },
        emailRedirectTo: undefined, // Use OTP flow
      },
    })

    // Check if it worked or if we got the identities issue
    if (signupData?.user) {
      // Check for duplicate user (Supabase quirk)
      if (!signupData.user.identities || signupData.user.identities.length === 0) {
        console.log('User already exists, attempting to resend verification')

        // User exists but might not be verified - resend OTP
        const { error: resendError } = await supabaseAdmin.auth.resend({
          type: 'signup',
          email: email.toLowerCase(),
        })

        if (!resendError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Email already registered. Verification email has been resent.',
              errorCode: 'EMAIL_EXISTS_RESENT',
              needsVerification: true,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // New user created successfully
        userData = signupData
        console.log('User created via regular signup, email should be sent via SMTP')
      }
    } else if (signupError) {
      // If regular signup fails (not due to duplicate), try admin API
      if (signupError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Email already registered',
            errorCode: 'EMAIL_EXISTS',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Regular signup failed, using admin API as fallback')

      // Fallback: Use admin.createUser
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: false, // Require verification
        user_metadata: {
          full_name: fullName,
          username,
          role,
        },
      })

      if (adminError) {
        throw adminError
      }

      userData = adminData

      // Manually trigger verification email after admin creation
      if (userData?.user) {
        console.log('Triggering verification email manually')
        const { error: resendError } = await supabaseAdmin.auth.resend({
          type: 'signup',
          email: email.toLowerCase(),
        })

        if (resendError) {
          console.log('Note: Could not send verification email:', resendError.message)
        }
      }
    }

    if (!userData?.user) {
      throw new Error('User creation failed')
    }

    const userId = userData.user.id
    console.log(`User created with ID: ${userId}`)

    // Create profile (since trigger is broken)
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
      console.error('Profile creation error (non-critical):', profileError)
    }

    // Return success with verification needed
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          email_confirmed_at: userData.user.email_confirmed_at,
          created_at: userData.user.created_at,
          user_metadata: userData.user.user_metadata || {
            full_name: fullName,
            username,
            role,
          },
        },
        needsVerification: !userData.user.email_confirmed_at,
        message: userData.user.email_confirmed_at
          ? 'Account created and verified'
          : 'Account created. Please check your email for verification code.',
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