-- SETUP_SOCIAL_PUBLISHING.sql
-- Configuration des plateformes et journal des diffusions multi-reseaux

CREATE TABLE IF NOT EXISTS public.social_platforms (
  id text PRIMARY KEY,
  label text NOT NULL,
  profile_url text NOT NULL,
  enabled boolean DEFAULT true,
  api_mode text DEFAULT 'api', -- api | unsupported | custom
  token_env_hint text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.social_platforms
  ADD COLUMN IF NOT EXISTS api_mode text DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS token_env_hint text;

INSERT INTO public.social_platforms (id, label, profile_url, enabled, api_mode, token_env_hint)
VALUES
  ('facebook', 'Facebook', 'https://facebook.com', true, 'api', 'FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN'),
  ('instagram', 'Instagram', 'https://instagram.com/agta.global', true, 'api', 'INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_ACCESS_TOKEN'),
  ('tiktok', 'TikTok', 'https://tiktok.com/@agta.global', true, 'api', 'TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID'),
  ('x', 'X', 'https://x.com/AGTA_Global', true, 'api', 'X_ACCESS_TOKEN_BEARER'),
  ('linkedin', 'LinkedIn', 'https://linkedin.com/company/athletes-global-talent-agency-agta', true, 'api', 'LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORGANIZATION_URN'),
  ('pinterest', 'Pinterest', 'https://pinterest.com', true, 'api', 'PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID'),
  ('discord', 'Discord', 'https://discord.gg/75jWSnTHj3', true, 'api', 'DISCORD_WEBHOOK_URL'),
  ('youtube', 'YouTube', 'https://youtube.com/@AthletesGlobalTalentAgencyAGTA', true, 'custom', 'YOUTUBE_ACCESS_TOKEN (+ resumable upload flow)'),
  ('snapchat', 'Snapchat', 'https://snapchat.com/t/X7zTx817', true, 'unsupported', 'No public organic posting API'),
  ('site', 'Site', '/', true, 'custom', null)
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  profile_url = EXCLUDED.profile_url,
  enabled = EXCLUDED.enabled,
  api_mode = EXCLUDED.api_mode,
  token_env_hint = EXCLUDED.token_env_hint;

UPDATE public.social_platforms
SET
  api_mode = CASE id
    WHEN 'snapchat' THEN 'unsupported'
    WHEN 'youtube' THEN 'custom'
    ELSE 'api'
  END,
  token_env_hint = CASE id
    WHEN 'facebook' THEN 'FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN'
    WHEN 'instagram' THEN 'INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_ACCESS_TOKEN'
    WHEN 'tiktok' THEN 'TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID'
    WHEN 'x' THEN 'X_ACCESS_TOKEN_BEARER'
    WHEN 'linkedin' THEN 'LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORGANIZATION_URN'
    WHEN 'youtube' THEN 'YOUTUBE_ACCESS_TOKEN (+ resumable upload flow)'
    WHEN 'pinterest' THEN 'PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID'
    WHEN 'discord' THEN 'DISCORD_WEBHOOK_URL'
    WHEN 'snapchat' THEN 'No public organic posting API'
    ELSE null
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_platforms_api_mode_check'
      AND conrelid = 'public.social_platforms'::regclass
  ) THEN
    ALTER TABLE public.social_platforms
      ADD CONSTRAINT social_platforms_api_mode_check
      CHECK (api_mode IN ('api', 'unsupported', 'custom'));
  END IF;
END;
$$;

ALTER TABLE public.social_platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on social_platforms" ON public.social_platforms;
CREATE POLICY "Allow all operations on social_platforms"
  ON public.social_platforms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.post_publications (
  id bigserial PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES public.social_platforms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | ok | failed
  external_url text,
  remote_id text,
  attempt_count integer DEFAULT 1,
  max_attempts integer DEFAULT 5,
  next_retry_at timestamp with time zone,
  error_message text,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.post_publications
  ADD COLUMN IF NOT EXISTS remote_id text,
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'post_publications_status_check'
      AND conrelid = 'public.post_publications'::regclass
  ) THEN
    ALTER TABLE public.post_publications
      ADD CONSTRAINT post_publications_status_check
      CHECK (status IN ('pending', 'ok', 'failed'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_post_publications_post
  ON public.post_publications(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_publications_retry
  ON public.post_publications(status, next_retry_at);

CREATE TABLE IF NOT EXISTS public.publication_jobs (
  id bigserial PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES public.social_platforms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued', -- queued | processing | ok | failed | dead
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamp with time zone DEFAULT now(),
  last_attempt_at timestamp with time zone,
  last_error text,
  last_external_url text,
  last_payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, platform_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'publication_jobs_status_check'
      AND conrelid = 'public.publication_jobs'::regclass
  ) THEN
    ALTER TABLE public.publication_jobs
      ADD CONSTRAINT publication_jobs_status_check
      CHECK (status IN ('queued', 'processing', 'ok', 'failed', 'dead'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_publication_jobs_retry
  ON public.publication_jobs(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_publication_jobs_post
  ON public.publication_jobs(post_id, updated_at DESC);

ALTER TABLE public.publication_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on publication_jobs" ON public.publication_jobs;
CREATE POLICY "Allow all operations on publication_jobs"
  ON public.publication_jobs
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.post_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on post_publications" ON public.post_publications;
CREATE POLICY "Allow all operations on post_publications"
  ON public.post_publications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_publications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_publications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'publication_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publication_jobs;
  END IF;
END;
$$;
