-- ============================================
-- AGTA Management Portal - Complete Database Setup
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. Create missing tables
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

-- 3. Create RLS policies (public access for development - adjust for production)
CREATE POLICY "Allow all operations on agta_activity" ON public.agta_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on athletes" ON public.athletes FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruitment" ON public.recruitment FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruiters" ON public.recruiters FOR ALL USING (true);
CREATE POLICY "Allow all operations on opportunities" ON public.opportunities FOR ALL USING (true);
CREATE POLICY "Allow all operations on documents" ON public.documents FOR ALL USING (true);

-- 4. Create storage bucket for file uploads (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agta-files', 'agta-files', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create storage policies for file uploads
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agta-files');
CREATE POLICY "Allow public downloads" ON storage.objects FOR SELECT USING (bucket_id = 'agta-files');

-- 6. Test data (optional - remove in production)
INSERT INTO public.athletes (name, sport, position, club, value, registration_type, location, status)
VALUES
  ('John Doe', 'Football', 'Forward', 'FC Barcelona', '$5M', 'bureau', 'Spain', 'Actif'),
  ('Jane Smith', 'Basketball', 'Guard', 'LA Lakers', '$3M', 'online', 'USA', 'Actif')
ON CONFLICT DO NOTHING;

INSERT INTO public.recruitment (full_name, age, sport, position, nationality, email, phone, height, weight, experience, status)
VALUES
  ('Test Athlete', '25', 'Football', 'Midfielder', 'French', 'test@agta.com', '+33123456789', '180', '75', '5 years professional experience', 'pending')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'AGTA Database setup completed successfully!' as status;