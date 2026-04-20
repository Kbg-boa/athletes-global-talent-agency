-- SETUP_OPPORTUNITY_SOCIAL.sql
-- Tables de persistance des interactions publiques Opportunities (likes + commentaires)
-- avec RLS + realtime.

CREATE TABLE IF NOT EXISTS public.opportunity_likes (
  id bigserial PRIMARY KEY,
  opportunity_id bigint NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_likes_unique
  ON public.opportunity_likes(opportunity_id, visitor_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_likes_opportunity
  ON public.opportunity_likes(opportunity_id);

CREATE TABLE IF NOT EXISTS public.opportunity_comments (
  id bigserial PRIMARY KEY,
  opportunity_id bigint NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  author_label text DEFAULT 'fan',
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 180),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_comments_opportunity
  ON public.opportunity_comments(opportunity_id, created_at DESC);

ALTER TABLE public.opportunity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_comments ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public can read opportunity likes" ON public.opportunity_likes;
CREATE POLICY "Public can read opportunity likes"
  ON public.opportunity_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can insert opportunity likes" ON public.opportunity_likes;
CREATE POLICY "Public can insert opportunity likes"
  ON public.opportunity_likes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete opportunity likes" ON public.opportunity_likes;
CREATE POLICY "Public can delete opportunity likes"
  ON public.opportunity_likes
  FOR DELETE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can read opportunity comments" ON public.opportunity_comments;
CREATE POLICY "Public can read opportunity comments"
  ON public.opportunity_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can insert opportunity comments" ON public.opportunity_comments;
CREATE POLICY "Public can insert opportunity comments"
  ON public.opportunity_comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Realtime publication (idempotent best effort)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'opportunity_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_likes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'opportunity_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_comments;
  END IF;
END;
$$;
