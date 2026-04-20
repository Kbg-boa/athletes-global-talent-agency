import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFileUploadAndSubmission() {
  try {
    console.log('🧪 Testing file upload and form submission...\n');

    // 1. Test storage bucket
    console.log('📁 Step 1: Checking storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('❌ Storage check failed:', bucketError.message);
      return;
    }

    const athleteBucket = buckets.find(b => b.id === 'athlete-files');
    if (!athleteBucket) {
      console.log('❌ athlete-files bucket not found!');
      console.log('🔧 Run FIX_STORAGE_BUCKET.sql in Supabase first');
      return;
    }

    console.log('✅ athlete-files bucket exists');

    // 2. Test file upload (simulate)
    console.log('\n📤 Step 2: Testing file upload...');
    // Create a dummy file for testing
    const dummyFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    const testFileName = `test_${Date.now()}_test.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('athlete-files')
      .upload(testFileName, dummyFile);

    if (uploadError) {
      console.log('❌ File upload failed:', uploadError.message);
      console.log('🔧 Storage policies may not be configured correctly');
      return;
    }

    console.log('✅ File upload successful:', uploadData?.path);

    // 3. Test form submission
    console.log('\n📝 Step 3: Testing form submission...');
    const formData = {
      full_name: 'MATHIEU KABANGU',
      age: '40',
      sport: 'Football',
      position: 'BON',
      nationality: 'CONGO',
      email: 'kbgmathieu@gmail.com',
      phone: '+243812119488',
      height: '234',
      weight: '90',
      experience: 'tnsffzkjfiekef, fzkozko kozjkozk',
      video_url: uploadData?.path || 'test_video_path',
      cv_url: 'test_cv_path',
      status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('recruitment')
      .insert([formData])
      .select();

    if (insertError) {
      console.log('❌ Form submission failed:', insertError.message);
      return;
    }

    console.log('✅ Form submission successful!');
    console.log('Application ID:', insertData[0].id);

    // 4. Verify in database
    console.log('\n📋 Step 4: Verifying in database...');
    const { data: applications, error: fetchError } = await supabase
      .from('recruitment')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    if (fetchError) {
      console.log('❌ Database verification failed:', fetchError.message);
    } else {
      console.log(`✅ Found ${applications.length} pending applications`);
      const latest = applications[0];
      if (latest && latest.full_name === 'MATHIEU KABANGU') {
        console.log('✅ Latest application matches submitted data');
        console.log('   Name:', latest.full_name);
        console.log('   Email:', latest.email);
        console.log('   Status:', latest.status);
      }
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    if (insertData && insertData[0]) {
      await supabase.from('recruitment').delete().eq('id', insertData[0].id);
    }
    if (uploadData) {
      await supabase.storage.from('athlete-files').remove([testFileName]);
    }

    console.log('🎉 Complete flow test successful!');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testFileUploadAndSubmission();