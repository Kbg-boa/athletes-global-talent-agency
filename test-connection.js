import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔗 Testing Supabase connection...');

    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('agta_activity')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message);
      return;
    }

    console.log('✅ Supabase connection successful!');

    // Test all tables
    const tables = ['agta_activity', 'athletes', 'recruitment', 'opportunities'];

    console.log('📊 Testing tables:');
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count || 0} records`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Test file upload capability
    console.log('📁 Testing storage bucket...');
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.log('❌ Storage check failed:', bucketError.message);
      } else {
        const agtaBucket = buckets.find(b => b.id === 'agta-files');
        if (agtaBucket) {
          console.log('✅ Storage bucket "agta-files" exists');
        } else {
          console.log('⚠️  Storage bucket "agta-files" not found - will be created when you run the SQL setup');
        }
      }
    } catch (err) {
      console.log('❌ Storage test failed:', err.message);
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project/ddssfadzmfspnwcdiohh');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of SUPABASE_COMPLETE_SETUP.sql');
    console.log('4. Click "Run" to complete the database setup');
    console.log('5. Test the application with: npm run dev');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testConnection();