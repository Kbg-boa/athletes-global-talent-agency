import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('🔍 Checking table structures...\n');

    // Check recruitment table
    console.log('📋 Recruitment table:');
    const { data: recruitmentData, error: recruitmentError } = await supabase
      .from('recruitment')
      .select('*')
      .limit(1);

    if (recruitmentError) {
      console.log('❌ Recruitment table error:', recruitmentError.message);
    } else if (recruitmentData && recruitmentData.length > 0) {
      console.log('✅ Columns:', Object.keys(recruitmentData[0]));
    } else {
      // Try to get column info differently
      console.log('📝 Table exists but no data. Expected columns:');
      console.log('   - id, full_name, age, sport, position, nationality, email, phone, height, weight, experience, video_url, cv_url, status, created_at, updated_at');
    }

    // Check athletes table
    console.log('\n📋 Athletes table:');
    const { data: athletesData, error: athletesError } = await supabase
      .from('athletes')
      .select('*')
      .limit(1);

    if (athletesError) {
      console.log('❌ Athletes table error:', athletesError.message);
    } else if (athletesData && athletesData.length > 0) {
      console.log('✅ Columns:', Object.keys(athletesData[0]));
    } else {
      console.log('📝 Table exists but no data. Expected columns:');
      console.log('   - id, name, sport, position, club, value, registration_type, location, status, created_at, updated_at');
    }

    console.log('\n🔧 If tables are missing columns, run this SQL in Supabase:');
    console.log('   Go to: https://supabase.com/dashboard/project/ddssfadzmfspnwcdiohh');
    console.log('   SQL Editor -> Copy AGTA_ONE_CLICK_SETUP.sql -> Run');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkTableStructure();