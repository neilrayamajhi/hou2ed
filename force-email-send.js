const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function forceEmailSend() {
  console.log('🔧 Force Email Send Test');
  console.log('========================\n');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });

  const timestamp = Date.now();
  const testEmail = `force${timestamp}@test.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('Step 1: Creating user with admin.createUser');
    console.log('--------------------------------------------');
    console.log('Email:', testEmail);

    // Create user with admin API (bypasses triggers)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: false, // Require verification
      user_metadata: {
        full_name: 'Force Email Test',
        username: `force${timestamp}`,
        role: 'seeker',
      }
    });

    if (createError) {
      console.error('❌ User creation failed:', createError);
      return;
    }

    console.log('✅ User created:', userData.user.id);
    console.log('   Email confirmed:', userData.user.email_confirmed_at ? 'Yes' : 'No');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\nStep 2: Manually triggering OTP email');
    console.log('--------------------------------------');

    // Try to generate and send OTP
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: testEmail,
      options: {
        data: userData.user.user_metadata
      }
    });

    if (otpError) {
      console.error('❌ Generate link failed:', otpError);
    } else {
      console.log('✅ Verification link generated');
      console.log('   Note: This generates a link, not an OTP email');
      console.log('   Link would be:', otpData.properties?.action_link?.substring(0, 50) + '...');
    }

    console.log('\nStep 3: Trying to invite user (triggers email)');
    console.log('----------------------------------------------');

    // Try inviting the user (this should trigger an email)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      testEmail,
      {
        data: {
          full_name: 'Force Email Test',
          username: `forceinvite${timestamp}`,
          role: 'seeker'
        }
      }
    );

    if (inviteError) {
      if (inviteError.message?.includes('already registered')) {
        console.log('⚠️  User already exists, trying different approach');

        // Try sending magic link
        console.log('\nStep 4: Sending magic link email');
        console.log('---------------------------------');

        const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: testEmail,
        });

        if (magicLinkError) {
          console.error('❌ Magic link failed:', magicLinkError);
        } else {
          console.log('✅ Magic link generated (but may not send email)');
        }
      } else {
        console.error('❌ Invite failed:', inviteError);
      }
    } else {
      console.log('✅ Invite sent!');
      console.log('   User ID:', inviteData.user.id);
      console.log('   📧 Check email for invitation');
    }

    console.log('\nStep 5: Testing with real email (neilrayamajhi2008@gmail.com)');
    console.log('--------------------------------------------------------------');

    // Update existing user to trigger re-verification
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      '9cc59bf5-2f97-41a5-b906-ce90bb32e2ea', // Neil's user ID
      {
        email_confirm: false, // Mark as unconfirmed to trigger verification
      }
    );

    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ User marked as unconfirmed');

      // Now try to send verification
      const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: 'neilrayamajhi2008@gmail.com',
      });

      if (verifyError) {
        console.error('❌ Verification link generation failed:', verifyError);
      } else {
        console.log('✅ Verification link generated for Neil');
        console.log('   This should trigger an email to neilrayamajhi2008@gmail.com');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL SENDING ANALYSIS');
    console.log('='.repeat(60));

    console.log('\n🔍 FINDINGS:');
    console.log('• Admin API can create users');
    console.log('• generateLink creates links but may not send emails');
    console.log('• inviteUserByEmail is the most likely to trigger SMTP');

    console.log('\n❓ POSSIBLE ISSUES:');
    console.log('1. SMTP settings not being used by Supabase');
    console.log('2. Email queue might be stuck');
    console.log('3. SendGrid API key might be incorrect');
    console.log('4. Sender email not verified in SendGrid');

    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('1. Run: node test-sendgrid-direct.js YOUR_SENDGRID_API_KEY');
    console.log('2. Check SendGrid dashboard for email activity');
    console.log('3. Try "Send test email" button in Supabase dashboard');
    console.log('4. Consider using Supabase\'s default email (disable custom SMTP)');

  } catch (error) {
    console.error('Error:', error);
  }
}

forceEmailSend();