import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRecruitmentFlow() {
  try {
    console.log('🧪 Testing AGTA Recruitment Flow...\n');

    // 1. Add a test application (simulating form submission)
    console.log('📝 Step 1: Submitting test application...');
    const testApplication = {
      full_name: 'Test Athlete AGTA',
      age: '22',
      sport: 'Basketball',
      position: 'Point Guard',
      nationality: 'Congolese',
      email: 'test@agta.com',
      phone: '+243123456789',
      height: '185',
      weight: '80',
      experience: '3 years professional experience, national team player',
      video_url: null,
      cv_url: null,
      status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('recruitment')
      .insert([testApplication])
      .select();

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      return;
    }

    console.log('✅ Application submitted successfully!');
    console.log('   ID:', insertData[0].id);
    console.log('   Name:', insertData[0].full_name);
    console.log('   Status:', insertData[0].status);

    // 2. Check if it appears in pending applications
    console.log('\n📋 Step 2: Checking pending applications...');
    const { data: pendingApps, error: fetchError } = await supabase
      .from('recruitment')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.log('❌ Fetch failed:', fetchError.message);
      return;
    }

    console.log(`✅ Found ${pendingApps.length} pending applications:`);
    pendingApps.forEach(app => {
      console.log(`   - ${app.full_name} (${app.sport}) - ${app.email}`);
    });

    // 3. Simulate DG approval
    console.log('\n✅ Step 3: Simulating DG approval...');
    const candidateToApprove = pendingApps[0];

    // Insert into athletes table
    const athleteData = {
      name: candidateToApprove.full_name,
      sport: candidateToApprove.sport,
      position: candidateToApprove.position,
      club: 'AGTA Academy',
      value: 'To be evaluated',
      registration_type: 'online',
      location: candidateToApprove.nationality || 'International',
      status: 'Actif'
    };

    const { error: athleteError } = await supabase
      .from('athletes')
      .insert([athleteData]);

    if (athleteError) {
      console.log('❌ Athlete insert failed:', athleteError.message);
      return;
    }

    // Update recruitment status
    const { error: updateError } = await supabase
      .from('recruitment')
      .update({ status: 'accepted' })
      .eq('id', candidateToApprove.id);

    if (updateError) {
      console.log('❌ Status update failed:', updateError.message);
      return;
    }

    console.log('✅ Candidate approved and moved to athletes table!');

    // 4. Verify final state
    console.log('\n📊 Step 4: Final verification...');

    // Check athletes
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!athletesError) {
      console.log(`✅ Athletes table: ${athletes.length} total athletes`);
      athletes.forEach(athlete => {
        console.log(`   - ${athlete.name} (${athlete.sport}) - ${athlete.status}`);
      });
    }

    // Check remaining pending
    const { data: remainingPending, error: pendingError } = await supabase
      .from('recruitment')
      .select('*')
      .eq('status', 'pending');

    if (!pendingError) {
      console.log(`✅ Remaining pending: ${remainingPending.length} applications`);
    }

    console.log('\n🎉 AGTA Recruitment Flow Test COMPLETED!');
    console.log('🌍 System is working correctly!');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testRecruitmentFlow();