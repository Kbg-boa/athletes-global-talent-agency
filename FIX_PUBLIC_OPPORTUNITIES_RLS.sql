-- FIX_PUBLIC_OPPORTUNITIES_RLS.sql
-- Allow public website to read only published opportunities (status = 'active').

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Keep DG full management policy untouched (if it exists).
-- Add public read policy restricted to active opportunities.
DROP POLICY IF EXISTS "Public can read active opportunities" ON public.opportunities;
CREATE POLICY "Public can read active opportunities"
  ON public.opportunities
  FOR SELECT
  TO anon, authenticated
  USING (lower(coalesce(status, '')) = 'active');
