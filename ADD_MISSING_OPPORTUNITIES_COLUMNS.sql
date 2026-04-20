-- ADD_MISSING_OPPORTUNITIES_COLUMNS.sql
-- Complete schema fix for opportunities table
-- Adds all missing columns required by Opportunities component and AdminDashboard

BEGIN;

-- 1. Add 'position' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'position'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN position text;
    COMMENT ON COLUMN public.opportunities.position IS 'Job position or role';
  END IF; 
END $$;

-- 2. Add 'club' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'club'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN club text;
    COMMENT ON COLUMN public.opportunities.club IS 'Club or organization name';
  END IF; 
END $$;

-- 3. Add 'location' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'location'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN location text;
    COMMENT ON COLUMN public.opportunities.location IS 'Job location';
  END IF; 
END $$;

-- 4. Add 'salary_range' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'salary_range'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN salary_range text;
    COMMENT ON COLUMN public.opportunities.salary_range IS 'Salary range for the position';
  END IF; 
END $$;

-- 5. Add 'description' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'description'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN description text;
    COMMENT ON COLUMN public.opportunities.description IS 'Opportunity description';
  END IF; 
END $$;

-- 6. Add 'requirements' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'requirements'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN requirements text;
    COMMENT ON COLUMN public.opportunities.requirements IS 'Job requirements';
  END IF; 
END $$;

-- 7. Add 'image_url' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'image_url'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN image_url text;
    COMMENT ON COLUMN public.opportunities.image_url IS 'URL to opportunity image';
  END IF; 
END $$;

-- 8. Add 'video_url' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'video_url'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN video_url text;
    COMMENT ON COLUMN public.opportunities.video_url IS 'URL to opportunity video';
  END IF; 
END $$;

-- 9. Add 'created_by' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'created_by'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN created_by text;
    COMMENT ON COLUMN public.opportunities.created_by IS 'User who created this opportunity';
  END IF; 
END $$;

-- 10. Add 'updated_at' column if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'updated_at'
  ) THEN 
    ALTER TABLE public.opportunities ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    COMMENT ON COLUMN public.opportunities.updated_at IS 'Last updated timestamp';
  END IF; 
END $$;

-- 11. Ensure RLS is enabled
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- 12. Drop old restrictive policy if exists
DROP POLICY IF EXISTS "DG can manage opportunities" ON public.opportunities;

-- 13. Create comprehensive RLS policies

-- Policy 1: DG/Staff can manage (full CRUD)
CREATE POLICY "DG can manage opportunities"
  ON public.opportunities
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'kbgmathieu@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'kbgmathieu@gmail.com');

-- Policy 2: Public can read active/published opportunities
DROP POLICY IF EXISTS "Public can read active opportunities" ON public.opportunities;
CREATE POLICY "Public can read active opportunities"
  ON public.opportunities
  FOR SELECT
  TO anon, authenticated
  USING (lower(coalesce(status, '')) IN ('active', 'actif', 'published', 'publie'));

COMMIT;

-- Verification query: check opportunities table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
ORDER BY ordinal_position;
