import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Parse request body
    const body: SignupRequest = await req.json()
    const { email, password, fullName, username, role } = body

    // Validate inputs
    if (!email || !password || !fullName || !username || !role) {
      throw new Error('Missing required fields')
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Create Supabase admin client using service role key from environment
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

    // Check if email already exists in profiles
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
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if username already exists
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
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Creating user with email: ${email}`)

    // Create user using admin API (bypasses trigger)
    // First, try regular signup to trigger email
    console.log('Attempting regular signup to trigger email...')
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

    let userData = signupData
    let userError = signupError

    // If regular signup times out or fails, use admin API
    if (signupError && signupError.status !== 400) {
      console.log('Regular signup failed, using admin API...')
      const adminResult = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: false, // Require email verification
        user_metadata: {
          full_name: fullName,
          username,
          role,
        },
        app_metadata: {
          provider: 'email',
        },
      })
      userData = adminResult.data
      userError = adminResult.error
    }

    // Send verification email if user was created
    if (userData?.user && !userData.user.email_confirmed_at) {
      console.log(`Sending verification email to: ${email}`)

      // Try to trigger verification email
      try {
        await supabaseAdmin.auth.resend({
          type: 'signup',
          email: email.toLowerCase(),
        })
        console.log('Verification email sent successfully')
      } catch (emailError) {
        console.log('Note: Email sending might be rate limited:', emailError)
      }
    }

    if (userError) {
      console.error('User creation error:', userError)

      // Check for duplicate email error
      if (userError.message?.includes('already registered') ||
          userError.message?.includes('duplicate')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Email already registered',
            errorCode: 'EMAIL_EXISTS',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      throw userError
    }

    if (!userData?.user) {
      throw new Error('User creation failed - no user returned')
    }

    const userId = userData.user.id
    console.log(`User created with ID: ${userId}`)

    // Create profile
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

    if (profileError) {
      // Log error but don't fail if profile already exists
      if (!profileError.message?.includes('duplicate')) {
        console.error('Profile creation error:', profileError)
      }
    } else {
      console.log('Profile created successfully')
    }

    // Return success with user data formatted for the app
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          email_confirmed_at: userData.user.email_confirmed_at,
          created_at: userData.user.created_at,
          updated_at: userData.user.updated_at,
          user_metadata: {
            full_name: fullName,
            username,
            role,
          },
          app_metadata: userData.user.app_metadata,
          identities: userData.user.identities,
        },
        needsVerification: !userData.user.email_confirmed_at, // Check if email is confirmed
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
        error: error.message || 'An error occurred during signup',
        errorCode: 'SERVER_ERROR',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})