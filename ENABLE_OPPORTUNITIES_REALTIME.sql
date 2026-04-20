-- ENABLE_OPPORTUNITIES_REALTIME.sql
-- Ensure public.opportunities, public.athletes, public.posts and public.work_logs
-- are included in Supabase realtime publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'opportunities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'athletes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athletes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'work_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_logs;
  END IF;
END $$;

-- Verify tables are in realtime publication
SELECT p.pubname, n.nspname AS schema_name, c.relname AS table_name
FROM pg_publication_rel pr
JOIN pg_class c ON c.oid = pr.prrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_publication p ON p.oid = pr.prpubid
WHERE p.pubname = 'supabase_realtime'
  AND n.nspname = 'public'
  AND c.relname IN ('opportunities', 'athletes', 'posts', 'work_logs')
ORDER BY c.relname;
