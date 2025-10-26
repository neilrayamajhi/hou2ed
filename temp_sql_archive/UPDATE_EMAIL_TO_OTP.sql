-- This SQL updates the Supabase email templates to send OTP codes instead of magic links
-- Run this in the Supabase SQL editor

-- Update the confirmation (signup) email template to show OTP code
UPDATE auth.flow_state
SET auth_code_issued_at = now()
WHERE 1=0; -- This is just to check if we have access

-- Note: Email templates are actually configured in the Supabase Dashboard
-- Go to: Authentication > Email Templates

-- For the "Confirm signup" template, use:
-- Subject: Your verification code is {{ .Token }}
-- Body:
-- Hi,
--
-- Your verification code is: {{ .Token }}
--
-- Enter this 6-digit code in the app to verify your email.
-- This code expires in 60 minutes.
--
-- If you didn't sign up for {{ .SiteURL }}, please ignore this email.

-- For the "Magic Link" template, use:
-- Subject: Your login code is {{ .Token }}
-- Body:
-- Hi,
--
-- Your login code is: {{ .Token }}
--
-- Enter this 6-digit code in the app to log in.
-- This code expires in 60 minutes.
--
-- If you didn't request this, please ignore this email.

-- For the "Reset Password" template, use:
-- Subject: Reset your password with code {{ .Token }}
-- Body:
-- Hi,
--
-- Your password reset code is: {{ .Token }}
--
-- Enter this 6-digit code in the app to reset your password.
-- This code expires in 60 minutes.
--
-- If you didn't request a password reset, please ignore this email.