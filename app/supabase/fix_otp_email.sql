-- Update the email template to use OTP instead of magic link
-- This updates the auth.config table which controls Supabase Auth settings

-- First, let's check current email template settings
SELECT * FROM auth.config WHERE key LIKE '%email%';

-- Update the confirmation email template to show OTP code
UPDATE auth.config
SET value = jsonb_set(
    value,
    '{email_template}',
    '{
        "subject": "Your verification code for HOU2ED",
        "body": "<h2>Your verification code</h2><p>Enter this code in the app:</p><h1 style=\"font-family: monospace; font-size: 36px; letter-spacing: 5px;\">{{ .Token }}</h1><p>Code expires in 1 hour</p>",
        "type": "otp"
    }'::jsonb
)
WHERE key = 'email';

-- Ensure OTP is enabled for email confirmations
UPDATE auth.config
SET value = jsonb_set(value, '{enable_otp}', 'true')
WHERE key = 'email';

-- Set OTP length to 6 digits
UPDATE auth.config
SET value = jsonb_set(value, '{otp_length}', '6')
WHERE key = 'email';

-- Disable magic link mode
UPDATE auth.config
SET value = jsonb_set(value, '{enable_magic_link}', 'false')
WHERE key = 'email';

-- Verify the changes
SELECT * FROM auth.config WHERE key = 'email';