import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickAddAthletes() {
  try {
    console.log('🚀 Quick Athlete Addition Test...');

    // Test if we can insert now
    const testData = {
      name: 'Test Athlete',
      sport: 'Test Sport',
      position: 'Test Position',
      club: 'Test Club',
      value: 'Test Value',
      registration_type: 'bureau',
      location: 'Test Location',
      status: 'Actif'
    };

    console.log('📝 Testing athlete insertion...');
    const { data, error } = await supabase
      .from('athletes')
      .insert([testData])
      .select();

    if (error) {
      console.log('❌ Still cannot insert - SQL setup not completed');
      console.log('🔧 Error:', error.message);
      console.log('\n📋 ACTION REQUIRED:');
      console.log('1. Go to: https://supabase.com/dashboard/project/ddssfadzmfspnwcdiohh');
      console.log('2. Click "SQL Editor" in left menu');
      console.log('3. Copy entire SUPABASE_COMPLETE_SETUP.sql content');
      console.log('4. Click "Run"');
      console.log('5. Then run this script again');
      return;
    }

    console.log('✅ SQL setup completed! Can now add athletes.');

    // Delete test data
    if (data && data[0]) {
      await supabase.from('athletes').delete().eq('id', data[0].id);
    }

    // Add real athletes
    console.log('🏆 Adding real AGTA athletes...');

    const athletes = [
      {
        name: 'Exaucé Ikamba',
        sport: 'Basketball',
        position: 'Forward/Center',
        club: 'National Team DR Congo',
        value: 'High Potential Prospect',
        registration_type: 'bureau',
        location: 'DR Congo',
        status: 'Actif'
      },
      {
        name: 'Victorine Mbussa',
        sport: 'Athletics',
        position: '100m Sprinter',
        club: 'National Team DR Congo',
        value: 'Elite Sprinter',
        registration_type: 'bureau',
        location: 'DR Congo',
        status: 'Actif'
      }
    ];

    for (const athlete of athletes) {
      const { data: result, error: insertError } = await supabase
        .from('athletes')
        .insert([athlete])
        .select();

      if (insertError) {
        console.log(`❌ Error adding ${athlete.name}:`, insertError.message);
      } else {
        console.log(`✅ Added ${athlete.name} (ID: ${result[0].id})`);
      }
    }

    // Verify
    const { data: allAthletes, error: verifyError } = await supabase
      .from('athletes')
      .select('*');

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log(`\n📊 Total athletes in database: ${allAthletes.length}`);
      allAthletes.forEach(athlete => {
        console.log(`  - ${athlete.name} (${athlete.sport}) - ${athlete.status}`);
      });
    }

    console.log('\n🎉 AGTA athletes successfully added!');
    console.log('🌍 Ready to connect African talent to global opportunities!');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

quickAddAthletes();