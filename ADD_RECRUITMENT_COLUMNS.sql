-- Ajouter les colonnes manquantes à la table recruitment
-- Exécuter ce SQL dans Supabase SQL Editor

-- Ajouter club et value si elles n'existent pas
ALTER TABLE public.recruitment 
ADD COLUMN IF NOT EXISTS club text,
ADD COLUMN IF NOT EXISTS value text,
ADD COLUMN IF NOT EXISTS submitted_by text,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Vérifier la structure finale
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recruitment' 
ORDER BY ordinal_position;