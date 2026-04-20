-- ALIGN_OPPORTUNITIES_MEDIA_COLUMNS.sql
-- Ajoute les colonnes media pour les opportunites si elles n'existent pas.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text;
