import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAthletes() {
  try {
    console.log('🏆 Adding AGTA Athletes to Database...');

    // Athlete 1: Exaucé Ikamba
    const exauceData = {
      name: 'Exaucé Ikamba',
      sport: 'Basketball',
      position: 'Forward/Center',
      club: 'National Team DR Congo',
      value: 'High Potential Prospect',
      registration_type: 'bureau',
      location: 'DR Congo',
      status: 'Actif'
    };

    // Athlete 2: Victorine Mbussa
    const victorineData = {
      name: 'Victorine Mbussa',
      sport: 'Athletics',
      position: '100m Sprinter',
      club: 'National Team DR Congo',
      value: 'Elite Sprinter',
      registration_type: 'bureau',
      location: 'DR Congo',
      status: 'Actif'
    };

    console.log('📝 Inserting Exaucé Ikamba...');
    const { data: exauceResult, error: exauceError } = await supabase
      .from('athletes')
      .insert([exauceData])
      .select();

    if (exauceError) {
      console.log('❌ Error inserting Exaucé:', exauceError.message);
    } else {
      console.log('✅ Exaucé Ikamba added successfully:', exauceResult[0]?.id);
    }

    console.log('📝 Inserting Victorine Mbussa...');
    const { data: victorineResult, error: victorineError } = await supabase
      .from('athletes')
      .insert([victorineData])
      .select();

    if (victorineError) {
      console.log('❌ Error inserting Victorine:', victorineError.message);
    } else {
      console.log('✅ Victorine Mbussa added successfully:', victorineResult[0]?.id);
    }

    // Log activities
    console.log('📊 Logging activities...');
    const activities = [
      {
        user_email: 'system@agta.com',
        activity_type: 'athlete_added',
        description: 'Added elite basketball prospect Exaucé Ikamba to AGTA roster',
        metadata: {
          athlete_name: 'Exaucé Ikamba',
          sport: 'Basketball',
          nationality: 'DR Congo'
        }
      },
      {
        user_email: 'system@agta.com',
        activity_type: 'athlete_added',
        description: 'Added elite sprinter Victorine Mbussa to AGTA roster',
        metadata: {
          athlete_name: 'Victorine Mbussa',
          sport: 'Athletics',
          nationality: 'DR Congo'
        }
      }
    ];

    for (const activity of activities) {
      const { error: activityError } = await supabase
        .from('agta_activity')
        .insert([activity]);

      if (activityError) {
        console.log('⚠️  Activity logging failed:', activityError.message);
      }
    }

    // Verify the data
    console.log('🔍 Verifying athletes in database...');
    const { data: athletes, error: verifyError } = await supabase
      .from('athletes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log('✅ Current athletes in database:');
      athletes.forEach(athlete => {
        console.log(`  - ${athlete.name} (${athlete.sport}) - ${athlete.status}`);
      });
    }

    console.log('🎉 Athlete registration completed successfully!');
    console.log('🌍 AGTA now represents elite Congolese talent globally!');

  } catch (error) {
    console.error('💥 Registration failed:', error);
  }
}

addAthletes();