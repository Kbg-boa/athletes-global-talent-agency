import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const dgEmail = process.env.DG_EMAIL || '';
const staffEmail = process.env.STAFF_EMAIL || '';
const initialPassword = process.env.AGTA_INITIAL_PASSWORD || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

if (!dgEmail || !staffEmail || !initialPassword) {
  console.error('Missing DG_EMAIL, STAFF_EMAIL or AGTA_INITIAL_PASSWORD environment variables.');
  process.exit(1);
}

if (initialPassword.length < 12) {
  console.error('AGTA_INITIAL_PASSWORD is too short. Use at least 12 characters.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const accounts = [
  { email: dgEmail, password: initialPassword, role: 'DG' },
  { email: staffEmail, password: initialPassword, role: 'Staff Secretary' },
];

for (const account of accounts) {
  console.log(`\nCreating account ${account.role}: ${account.email}`);

  const { data, error } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('User already registered')) {
      console.log('  Account already exists. Use password reset from Supabase Auth dashboard if needed.');
    } else {
      console.error(`  Error: ${error.message}`);
    }
  } else {
    console.log(`  Account creation requested: ${data.user?.id || 'pending confirmation'}`);
    if (!data.session) {
      console.log('  Email confirmation may be required depending on your Supabase Auth settings.');
    }
  }

  await supabase.auth.signOut();
}

console.log('\nDone.');
