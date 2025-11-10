const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying message attachments bucket migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251109000001_message_attachments_bucket.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    // Remove comments and empty lines
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))
      .map(s => s + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip if empty
      if (!statement.trim() || statement.trim() === ';') continue;

      // Get a preview of the statement
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      console.log(`Executing statement ${i + 1}: ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try direct execution if RPC doesn't work
          console.log('RPC failed, trying alternative method...');

          // For bucket creation, we can use the storage API
          if (statement.includes('INSERT INTO storage.buckets')) {
            console.log('Creating bucket via Storage API...');

            // Check if bucket exists
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();

            if (listError) {
              console.error('Error listing buckets:', listError);
            } else {
              const bucketExists = buckets?.some(b => b.name === 'message-attachments');

              if (!bucketExists) {
                const { error: createError } = await supabase.storage.createBucket(
                  'message-attachments',
                  {
                    public: false,
                    fileSizeLimit: 10485760,
                    allowedMimeTypes: [
                      'image/jpeg',
                      'image/png',
                      'image/gif',
                      'image/webp',
                      'application/pdf',
                      'text/plain',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ]
                  }
                );

                if (createError) {
                  console.error('Error creating bucket:', createError);
                } else {
                  console.log('✅ Bucket created successfully');
                }
              } else {
                console.log('✅ Bucket already exists');
              }
            }
          } else {
            console.error('Statement failed:', error);
          }
        } else {
          console.log('✅ Success');
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err.message);

        // For policies, we might need to handle them differently
        if (statement.includes('CREATE POLICY') || statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log('Note: This statement may need to be applied manually via Supabase dashboard');
        }
      }
    }

    console.log('\n✅ Migration process completed!');
    console.log('\n📌 Note: Some RLS policies may need to be applied manually via the Supabase dashboard.');
    console.log('Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor');

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();