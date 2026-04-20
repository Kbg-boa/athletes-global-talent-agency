-- SETUP_POSTS_TABLE.sql
-- Tables principales pour Publication / Actualites

CREATE TABLE IF NOT EXISTS public.posts (
	id bigserial PRIMARY KEY,
	title text NOT NULL,
	caption text,
	image_url text,
	video_url text,
	category text DEFAULT 'general',
	status text DEFAULT 'draft', -- draft | active | archived
	targets text[] DEFAULT ARRAY['site']::text[],
	published_at timestamp with time zone,
	created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_status_created_at
	ON public.posts(status, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on posts" ON public.posts;
CREATE POLICY "Allow all operations on posts"
	ON public.posts
	FOR ALL
	TO anon, authenticated
	USING (true)
	WITH CHECK (true);

-- Social interactions for public Actualites
CREATE TABLE IF NOT EXISTS public.post_likes (
	id bigserial PRIMARY KEY,
	post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
	visitor_id text NOT NULL,
	created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_unique
	ON public.post_likes(post_id, visitor_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post
	ON public.post_likes(post_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read post likes" ON public.post_likes;
CREATE POLICY "Public can read post likes"
	ON public.post_likes
	FOR SELECT
	TO anon, authenticated
	USING (true);

DROP POLICY IF EXISTS "Public can insert post likes" ON public.post_likes;
CREATE POLICY "Public can insert post likes"
	ON public.post_likes
	FOR INSERT
	TO anon, authenticated
	WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete post likes" ON public.post_likes;
CREATE POLICY "Public can delete post likes"
	ON public.post_likes
	FOR DELETE
	TO anon, authenticated
	USING (true);

CREATE TABLE IF NOT EXISTS public.post_comments (
	id bigserial PRIMARY KEY,
	post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
	visitor_id text NOT NULL,
	author_label text DEFAULT 'fan',
	content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 180),
	created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post
	ON public.post_comments(post_id, created_at DESC);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read post comments" ON public.post_comments;
CREATE POLICY "Public can read post comments"
	ON public.post_comments
	FOR SELECT
	TO anon, authenticated
	USING (true);

DROP POLICY IF EXISTS "Public can insert post comments" ON public.post_comments;
CREATE POLICY "Public can insert post comments"
	ON public.post_comments
	FOR INSERT
	TO anon, authenticated
	WITH CHECK (true);

-- Realtime publication
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_likes'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_comments'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
	END IF;
END;
$$;
