-- ============================================
-- AGTA Complete Database Setup - One Click Solution
-- Execute this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. Create missing tables FIRST
CREATE TABLE IF NOT EXISTS public.payments (
  id bigserial PRIMARY KEY,
  user_email text,
  amount decimal(10,2),
  currency text DEFAULT 'USD',
  type text CHECK (type IN ('subscription', 'service', 'commission')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruiters (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  company text,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
  subscription_type text,
  access_level text DEFAULT 'basic' CHECK (access_level IN ('basic', 'premium', 'enterprise')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id bigserial PRIMARY KEY,
  athlete_id bigint REFERENCES athletes(id),
  document_type text CHECK (document_type IN ('contract', 'cv', 'passport', 'photo', 'video', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable Row Level Security on all tables
ALTER TABLE public.agta_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (if any) and create new ones
DROP POLICY IF EXISTS "Allow all operations on agta_activity" ON public.agta_activity;
DROP POLICY IF EXISTS "Allow all operations on athletes" ON public.athletes;
DROP POLICY IF EXISTS "Allow all operations on recruitment" ON public.recruitment;
DROP POLICY IF EXISTS "Allow all operations on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all operations on recruiters" ON public.recruiters;
DROP POLICY IF EXISTS "Allow all operations on opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Allow all operations on documents" ON public.documents;

-- Create RLS policies
CREATE POLICY "Allow all operations on agta_activity" ON public.agta_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on athletes" ON public.athletes FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruitment" ON public.recruitment FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruiters" ON public.recruiters FOR ALL USING (true);
CREATE POLICY "Allow all operations on opportunities" ON public.opportunities FOR ALL USING (true);
CREATE POLICY "Allow all operations on documents" ON public.documents FOR ALL USING (true);

-- 4. Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('agta-files', 'agta-files', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create storage policies
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;

CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agta-files');
CREATE POLICY "Allow public downloads" ON storage.objects FOR SELECT USING (bucket_id = 'agta-files');

-- 6. Add AGTA athletes
INSERT INTO public.athletes (name, sport, position, club, value, registration_type, location, status)
VALUES
  ('Exaucé Ikamba', 'Basketball', 'Forward/Center', 'National Team DR Congo', 'High Potential Prospect', 'bureau', 'DR Congo', 'Actif'),
  ('Victorine Mbussa', 'Athletics', '100m Sprinter', 'National Team DR Congo', 'Elite Sprinter', 'bureau', 'DR Congo', 'Actif')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'AGTA Database setup completed successfully! Athletes added!' as status;