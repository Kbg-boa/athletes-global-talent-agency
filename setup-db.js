import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTableIfNotExists(tableName, createSql) {
  try {
    console.log(`🔧 Creating table: ${tableName}...`);

    // Try to select from the table to see if it exists
    const { error: selectError } = await supabase.from(tableName).select('*').limit(1);

    if (selectError && selectError.message.includes('does not exist')) {
      console.log(`📝 Table ${tableName} doesn't exist, creating...`);

      // Since we can't execute raw SQL with the anon key, we'll create a simple test
      // In a real scenario, you'd use the service role key or SQL editor
      console.log(`⚠️  Cannot create table ${tableName} via API. Please run this SQL in Supabase SQL Editor:`);
      console.log(createSql);
      console.log('---');
    } else {
      console.log(`✅ Table ${tableName} already exists`);
    }
  } catch (err) {
    console.log(`❌ Error checking table ${tableName}:`, err.message);
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Setting up AGTA Database...');

    // Read the SQL file
    const sqlContent = fs.readFileSync('./SUPABASE_SETUP.sql', 'utf8');

    // Extract table creation statements
    const tableStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.includes('CREATE TABLE'))
      .map(stmt => stmt + ';');

    console.log(`📋 Found ${tableStatements.length} table creation statements`);

    // Tables we need to create
    const tablesToCreate = [
      {
        name: 'payments',
        sql: `CREATE TABLE public.payments (
          id bigserial PRIMARY KEY,
          user_email text,
          amount decimal(10,2),
          currency text DEFAULT 'USD',
          type text CHECK (type IN ('subscription', 'service', 'commission')),
          status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
          description text,
          created_at timestamp with time zone DEFAULT now()
        );`
      },
      {
        name: 'recruiters',
        sql: `CREATE TABLE public.recruiters (
          id bigserial PRIMARY KEY,
          email text UNIQUE NOT NULL,
          name text,
          company text,
          subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
          subscription_type text,
          access_level text DEFAULT 'basic' CHECK (access_level IN ('basic', 'premium', 'enterprise')),
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );`
      },
      {
        name: 'documents',
        sql: `CREATE TABLE public.documents (
          id bigserial PRIMARY KEY,
          athlete_id bigint REFERENCES athletes(id),
          document_type text CHECK (document_type IN ('contract', 'cv', 'passport', 'photo', 'video', 'other')),
          file_name text NOT NULL,
          file_url text NOT NULL,
          uploaded_by text,
          created_at timestamp with time zone DEFAULT now()
        );`
      }
    ];

    // Check and create missing tables
    for (const table of tablesToCreate) {
      await createTableIfNotExists(table.name, table.sql);
    }

    console.log('🎉 Database check completed!');

    // Test all tables
    console.log('🔍 Testing all tables...');
    const allTables = ['agta_activity', 'athletes', 'recruitment', 'payments', 'recruiters', 'opportunities', 'documents'];

    for (const table of allTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }

    // Set up RLS policies
    console.log('🔒 Setting up Row Level Security...');
    console.log('⚠️  Please run the following RLS policies in Supabase SQL Editor:');

    const rlsPolicies = `
-- Enable RLS
ALTER TABLE public.agta_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on agta_activity" ON public.agta_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on athletes" ON public.athletes FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruitment" ON public.recruitment FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruiters" ON public.recruiters FOR ALL USING (true);
CREATE POLICY "Allow all operations on opportunities" ON public.opportunities FOR ALL USING (true);
CREATE POLICY "Allow all operations on documents" ON public.documents FOR ALL USING (true);
`;

    console.log(rlsPolicies);

  } catch (error) {
    console.error('💥 Setup failed:', error);
  }
}

setupDatabase();