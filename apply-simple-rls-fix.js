// Apply RLS fix using the Supabase client from the app
import('file:///Users/neilrayamajhi/h2d/app/src/lib/supabase.js').then(async ({ supabase }) => {
  const fs = require('fs');
  const sql = fs.readFileSync('apply-rls-fix.sql', 'utf8');
  
  // Try to execute via the client
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}).catch(err => {
  console.error('Failed:', err.message);
  console.log('\n\nThe fix is ready in apply-rls-fix.sql');
  console.log('Please copy and paste it into Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
});
