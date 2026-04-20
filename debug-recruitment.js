import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecruitmentTable() {
  try {
    console.log('🔍 Checking recruitment table structure...\n');

    // Try to insert with minimal data first
    const minimalData = {
      full_name: 'Test User',
      sport: 'Test Sport',
      position: 'Test Position',
      email: 'test@test.com',
      status: 'pending'
    };

    console.log('📝 Testing minimal insert...');
    const { data, error } = await supabase
      .from('recruitment')
      .insert([minimalData])
      .select();

    if (error) {
      console.log('❌ Minimal insert failed:', error.message);
      console.log('🔧 This suggests the table structure is wrong or RLS is blocking.');

      // Try to read existing data
      console.log('\n📋 Checking existing recruitment data...');
      const { data: existing, error: readError } = await supabase
        .from('recruitment')
        .select('*')
        .limit(5);

      if (readError) {
        console.log('❌ Read failed:', readError.message);
      } else {
        console.log(`✅ Found ${existing.length} existing records`);
        if (existing.length > 0) {
          console.log('📊 Sample record columns:', Object.keys(existing[0]));
        }
      }
    } else {
      console.log('✅ Minimal insert successful!');
      console.log('   ID:', data[0].id);
      console.log('   Columns available:', Object.keys(data[0]));

      // Clean up test data
      await supabase.from('recruitment').delete().eq('id', data[0].id);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkRecruitmentTable();