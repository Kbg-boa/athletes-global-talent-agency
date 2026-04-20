-- ============================================
-- AGTA Storage Bucket Fix
-- Execute this in Supabase SQL Editor
-- ============================================

-- Create the correct storage bucket for athlete files
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-files', 'athlete-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for athlete file uploads
DROP POLICY IF EXISTS "Allow public uploads to athlete-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads from athlete-files" ON storage.objects;

CREATE POLICY "Allow public uploads to athlete-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'athlete-files');
CREATE POLICY "Allow public downloads from athlete-files" ON storage.objects FOR SELECT USING (bucket_id = 'athlete-files');

-- Success message
SELECT 'Storage bucket athlete-files created successfully!' as status;