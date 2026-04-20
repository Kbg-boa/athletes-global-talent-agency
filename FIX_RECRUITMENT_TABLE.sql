-- ============================================
-- AGTA Recruitment Table Fix
-- Execute this in Supabase SQL Editor
-- ============================================

-- Drop and recreate recruitment table with correct structure
DROP TABLE IF EXISTS public.recruitment;

CREATE TABLE public.recruitment (
  id bigserial PRIMARY KEY,
  full_name text NOT NULL,
  age text,
  sport text NOT NULL,
  position text NOT NULL,
  nationality text,
  email text NOT NULL,
  phone text,
  height text,
  weight text,
  experience text,
  video_url text,
  cv_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all operations on recruitment" ON public.recruitment;
CREATE POLICY "Allow all operations on recruitment" ON public.recruitment FOR ALL USING (true);

-- Success message
SELECT 'Recruitment table fixed successfully!' as status;