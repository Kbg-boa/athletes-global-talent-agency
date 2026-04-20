-- ============================================
-- AGTA Database Fix - Simple Version
-- Execute this in Supabase SQL Editor
-- ============================================

-- Fix RLS policies (remove IF NOT EXISTS which causes syntax error)
DROP POLICY IF EXISTS "Allow all operations on agta_activity" ON public.agta_activity;
DROP POLICY IF EXISTS "Allow all operations on athletes" ON public.athletes;
DROP POLICY IF EXISTS "Allow all operations on recruitment" ON public.recruitment;
DROP POLICY IF EXISTS "Allow all operations on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all operations on recruiters" ON public.recruiters;
DROP POLICY IF EXISTS "Allow all operations on opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Allow all operations on documents" ON public.documents;

-- Create RLS policies without IF NOT EXISTS
CREATE POLICY "Allow all operations on agta_activity" ON public.agta_activity FOR ALL USING (true);
CREATE POLICY "Allow all operations on athletes" ON public.athletes FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruitment" ON public.recruitment FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on recruiters" ON public.recruiters FOR ALL USING (true);
CREATE POLICY "Allow all operations on opportunities" ON public.opportunities FOR ALL USING (true);
CREATE POLICY "Allow all operations on documents" ON public.documents FOR ALL USING (true);

-- Success message
SELECT 'AGTA Database RLS policies fixed successfully!' as status;