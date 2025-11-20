const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBlocks() {
  console.log('\n🔍 Checking blocks table...\n');

  const seekerId = '31c57c00-777e-4e29-b6e9-4a8c2ef6698c';
  const providerId = 'c5019ab8-dba5-41b7-89fa-c7b23da81af6';

  // Check all blocks
  const { data: allBlocks, error: allError } = await supabase
    .from('blocks')
    .select('*');

  if (allError) {
    console.error('❌ Error fetching all blocks:', allError);
  } else {
    console.log('📊 All blocks in database:', allBlocks?.length || 0);
    allBlocks?.forEach(block => {
      console.log(`  - Blocker: ${block.blocker_id}, Blocked: ${block.blocked_id}, Created: ${block.created_at}`);
    });
  }

  // Check specific block
  console.log(`\n🎯 Checking specific block:`);
  console.log(`  Provider (blocker): ${providerId}`);
  console.log(`  Seeker (blocked): ${seekerId}`);

  const { data: specificBlock } = await supabase
    .from('blocks')
    .select('*')
    .eq('blocker_id', providerId)
    .eq('blocked_id', seekerId)
    .maybeSingle();

  if (specificBlock) {
    console.log('✅ BLOCK EXISTS:', specificBlock);
  } else {
    console.log('❌ NO BLOCK FOUND for this provider-seeker pair');
  }

  // Check blocks where seeker is blocked
  const { data: seekerBlocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('blocked_id', seekerId);

  console.log(`\n📋 All blocks where seeker ${seekerId} is blocked:`, seekerBlocks?.length || 0);
  seekerBlocks?.forEach(block => {
    console.log(`  - Blocker: ${block.blocker_id}, Created: ${block.created_at}`);
  });

  // Check blocks where provider is blocker
  const { data: providerBlocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('blocker_id', providerId);

  console.log(`\n📋 All blocks where provider ${providerId} is blocker:`, providerBlocks?.length || 0);
  providerBlocks?.forEach(block => {
    console.log(`  - Blocked: ${block.blocked_id}, Created: ${block.created_at}`);
  });
}

checkBlocks();
