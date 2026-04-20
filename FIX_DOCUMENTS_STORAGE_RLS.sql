-- FIX_DOCUMENTS_STORAGE_RLS.sql
-- Corrige l'erreur: "new row violates row-level security policy"
-- sur l'upload des documents dans le bucket agta_vault.

-- 1) S'assurer que le bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('agta_vault', 'agta_vault', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Supprimer d'anciennes policies potentiellement incompatibles
DROP POLICY IF EXISTS "Allow read AGTA message files" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload AGTA message files" ON storage.objects;
DROP POLICY IF EXISTS "Allow update AGTA message files" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete AGTA message files" ON storage.objects;

-- 3) Recréer des policies storage compatibles documents + messages
CREATE POLICY "Allow read AGTA message files" ON storage.objects
  FOR SELECT USING (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

CREATE POLICY "Allow upload AGTA message files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

CREATE POLICY "Allow update AGTA message files" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

CREATE POLICY "Allow delete AGTA message files" ON storage.objects
  FOR DELETE USING (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

-- 4) (Optionnel) Vérification rapide
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('agta-files', 'athlete-files', 'agta_vault');
