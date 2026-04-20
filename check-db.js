import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 Checking AGTA Database Status...\n');

  const tables = ['athletes', 'recruitment', 'agta_activity', 'opportunities', 'payments', 'recruiters', 'documents'];

  let allGood = true;

  for (const table of tables) {
    try {
      // Try to insert a test record
      const testData = { name: 'test', sport: 'test', position: 'test', club: 'test', value: 'test', registration_type: 'bureau', location: 'test', status: 'Actif' };

      if (table === 'athletes') {
        const { error } = await supabase.from(table).insert([testData]);
        if (error) {
          console.log(`❌ ${table}: RLS not configured - ${error.message}`);
          allGood = false;
        } else {
          // Delete test record
          await supabase.from(table).delete().eq('name', 'test');
          console.log(`✅ ${table}: OK`);
        }
      } else {
        // For other tables, just check if they exist
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && error.message.includes('does not exist')) {
          console.log(`❌ ${table}: Table missing`);
          allGood = false;
        } else {
          console.log(`✅ ${table}: OK`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: Error - ${err.message}`);
      allGood = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allGood) {
    console.log('🎉 DATABASE READY! You can now add athletes.');
    console.log('Run: node quick-add.js');
  } else {
    console.log('❌ DATABASE NEEDS SETUP!');
    console.log('📋 Follow instructions in: FIX_DATABASE.md');
    console.log('🔗 Or go to: https://supabase.com/dashboard/project/ddssfadzmfspnwcdiohh');
    console.log('📝 Then run SQL from: SUPABASE_COMPLETE_SETUP.sql');
  }

  console.log('='.repeat(50));
}

checkDatabaseStatus();