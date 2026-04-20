import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFormSubmission() {
  try {
    console.log('🧪 Testing form submission like the actual application...\n');

    // Test data matching the form submission
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
      video_url: 'IMG_5326.MOV',
      cv_url: 'AGTA_Portfolio.pdf',
      status: 'pending'
    };

    console.log('📝 Submitting application data...');
    console.log('Data:', formData);

    const { data, error } = await supabase
      .from('recruitment')
      .insert([formData])
      .select();

    if (error) {
      console.log('❌ Submission failed:', error.message);
      console.log('🔧 Error details:', error);

      // Try with minimal data
      console.log('\n🔄 Trying with minimal data...');
      const minimalData = {
        full_name: 'Test User',
        sport: 'Football',
        position: 'Test',
        email: 'test@test.com',
        status: 'pending'
      };

      const { data: minimalResult, error: minimalError } = await supabase
        .from('recruitment')
        .insert([minimalData])
        .select();

      if (minimalError) {
        console.log('❌ Minimal insert also failed:', minimalError.message);
      } else {
        console.log('✅ Minimal insert successful - table structure is OK');
        // Clean up
        await supabase.from('recruitment').delete().eq('id', minimalResult[0].id);
      }
    } else {
      console.log('✅ Application submitted successfully!');
      console.log('ID:', data[0].id);
      console.log('Status:', data[0].status);

      // Clean up test data
      await supabase.from('recruitment').delete().eq('id', data[0].id);
      console.log('🧹 Test data cleaned up');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testFormSubmission();