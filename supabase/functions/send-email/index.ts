import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get SendGrid API key from environment variable
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, type, otp } = await req.json()

    let subject = ''
    let html = ''

    if (type === 'otp') {
      subject = 'Verify Your Email - Hou2ed'
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Hou2ed!</h1>
          <p>Your verification code is:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>Enter this code in the app to verify your email.</p>
          <p>This code expires in 10 minutes.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    } else if (type === 'reset') {
      subject = 'Reset Your Password - Hou2ed'
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${otp}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    }

    // Send via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: 'hou2eddirectory@gmail.com',
          name: 'Hou2ed'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    })

    if (response.status === 202) {
      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const error = await response.text()
      console.error('SendGrid error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})