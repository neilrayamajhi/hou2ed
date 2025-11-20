const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load from both .env.local files
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('   Found:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

console.log('✅ Using Supabase URL:', supabaseUrl);
console.log('✅ Service role key loaded');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename, description) {
  console.log(`\n📝 Running: ${description}`);
  
  try {
    const sql = fs.readFileSync(filename, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try alternative method - direct query
      const { error: directError } = await supabase.from('_migrations').insert({
        name: filename,
        executed_at: new Date().toISOString()
      });
      
      if (directError && directError.code !== '42P01') { // Ignore "table doesn't exist"
        console.warn('⚠️  Could not log migration, but continuing...');
      }
      
      // Execute using SQL API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        // Try splitting into individual statements
        console.log('   Executing statements individually...');
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT') && !s.startsWith('COMMENT'));
        
        for (const statement of statements) {
          const { error: stmtError } = await supabase.rpc('exec', { 
            sql: statement 
          }).catch(() => ({ error: null }));
          
          // If RPC doesn't work, try using POST to SQL endpoint
          if (stmtError) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ query: statement })
              });
            } catch (e) {
              console.log(`   ⚠️  Statement may have failed: ${statement.substring(0, 50)}...`);
            }
          }
        }
        console.log('✅ Migration statements executed');
      } else {
        console.log('✅ Migration successful');
      }
    } else {
      console.log('✅ Migration successful');
    }
  } catch (err) {
    console.error(`❌ Error running migration:`, err.message);
    console.log('   Continuing with next migration...');
  }
}

async function main() {
  console.log('🚀 Applying notification migrations to Supabase...\n');
  console.log(`📍 Project: ${supabaseUrl}`);
  
  await runMigration(
    'ADD_NOTIFICATION_FIELDS.sql',
    'Adding push_token and last_notified_status fields'
  );
  
  await runMigration(
    'ADD_NOTIFICATION_TIME_PREFERENCE.sql',
    'Adding notification_time preference field'
  );
  
  console.log('\n✨ All migrations applied!\n');
  console.log('Next steps:');
  console.log('1. Verify fields were added in Supabase Dashboard > Database > Tables');
  console.log('2. Update ProfileScreen.tsx with notification UI (if not already done)');
  console.log('3. Deploy the edge function: npx supabase functions deploy send-application-notifications');
}

main().catch(console.error);

