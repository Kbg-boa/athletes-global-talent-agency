-- ============================================
-- AGTA Stories Realtime Setup
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1) Stories table (24h status)
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key text NOT NULL,
  owner_name text NOT NULL,
  avatar_url text,
  type text NOT NULL CHECK (type IN ('text', 'image')),
  content text,
  url text,
  bg_color text,
  privacy text NOT NULL DEFAULT 'all' CHECK (privacy IN ('all', 'only', 'exclude')),
  allowed_keys text[] NOT NULL DEFAULT '{}'::text[],
  excluded_keys text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 2) Story views table ("seen by")
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_key text NOT NULL,
  viewer_name text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_key)
);

-- 2b) Story reactions table (likes/emojis)
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  reactor_key text NOT NULL,
  reactor_name text NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (story_id, reactor_key)
);

-- 2c) Story comments table (replies)
CREATE TABLE IF NOT EXISTS public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  commenter_key text NOT NULL,
  commenter_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (char_length(trim(content)) > 0)
);

-- 3) Indexes for fast fetches
CREATE INDEX IF NOT EXISTS idx_stories_owner_key ON public.stories(owner_key);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_key ON public.story_views(viewer_key);
CREATE INDEX IF NOT EXISTS idx_story_views_viewed_at ON public.story_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_reactor_key ON public.story_reactions(reactor_key);
CREATE INDEX IF NOT EXISTS idx_story_reactions_created_at ON public.story_reactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_commenter_key ON public.story_comments(commenter_key);
CREATE INDEX IF NOT EXISTS idx_story_comments_created_at ON public.story_comments(created_at DESC);

-- 4) Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- 5) Simple permissive policies (consistent with existing chat setup)
DROP POLICY IF EXISTS "Allow read stories" ON public.stories;
CREATE POLICY "Allow read stories" ON public.stories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert stories" ON public.stories;
CREATE POLICY "Allow insert stories" ON public.stories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update stories" ON public.stories;
CREATE POLICY "Allow update stories" ON public.stories
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete stories" ON public.stories;
CREATE POLICY "Allow delete stories" ON public.stories
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read story_views" ON public.story_views;
CREATE POLICY "Allow read story_views" ON public.story_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert story_views" ON public.story_views;
CREATE POLICY "Allow insert story_views" ON public.story_views
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update story_views" ON public.story_views;
CREATE POLICY "Allow update story_views" ON public.story_views
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete story_views" ON public.story_views;
CREATE POLICY "Allow delete story_views" ON public.story_views
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read story_reactions" ON public.story_reactions;
CREATE POLICY "Allow read story_reactions" ON public.story_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert story_reactions" ON public.story_reactions;
CREATE POLICY "Allow insert story_reactions" ON public.story_reactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update story_reactions" ON public.story_reactions;
CREATE POLICY "Allow update story_reactions" ON public.story_reactions
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete story_reactions" ON public.story_reactions;
CREATE POLICY "Allow delete story_reactions" ON public.story_reactions
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read story_comments" ON public.story_comments;
CREATE POLICY "Allow read story_comments" ON public.story_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert story_comments" ON public.story_comments;
CREATE POLICY "Allow insert story_comments" ON public.story_comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update story_comments" ON public.story_comments;
CREATE POLICY "Allow update story_comments" ON public.story_comments
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete story_comments" ON public.story_comments;
CREATE POLICY "Allow delete story_comments" ON public.story_comments
  FOR DELETE USING (true);

-- 6) Add tables to Supabase Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'stories'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.stories';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'story_views'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'story_reactions'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'story_comments'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comments';
    END IF;
  END IF;
END;
$$;

-- 7) Optional housekeeping helper (manual call if needed)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.stories WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

SELECT 'Stories realtime setup complete' AS status;
