-- SETUP_SOCIAL_RETRY_CRON.sql
-- Planification automatique des retries (toutes les 2 minutes)
-- Prérequis: extensions pg_cron et pg_net activées sur le projet.
-- IMPORTANT:
-- 1) Definir les settings suivants AVANT de lancer ce script:
--    ALTER DATABASE postgres SET app.settings.social_worker_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/social-publish-worker';
--    ALTER DATABASE postgres SET app.settings.social_worker_auth_token = 'YOUR_ANON_OR_SERVICE_TOKEN';
-- 2) Ne jamais commiter de token en clair dans ce fichier.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Nettoyer l'ancien job si présent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agta-social-publish-worker') THEN
    PERFORM cron.unschedule('agta-social-publish-worker');
  END IF;
END;
$$;

-- Planifier le worker Edge Function
-- Le token est lu depuis current_setting pour eviter toute fuite dans le repository.
SELECT cron.schedule(
  'agta-social-publish-worker',
  '*/2 * * * *',
  $$
  WITH cfg AS (
    SELECT
      nullif(current_setting('app.settings.social_worker_url', true), '') AS worker_url,
      nullif(current_setting('app.settings.social_worker_auth_token', true), '') AS auth_token
  )
  SELECT
    net.http_post(
      url := (SELECT worker_url FROM cfg),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT auth_token FROM cfg),
        'apikey', (SELECT auth_token FROM cfg)
      ),
      body := jsonb_build_object('limit', 30)
    )
  WHERE (SELECT worker_url FROM cfg) IS NOT NULL
    AND (SELECT auth_token FROM cfg) IS NOT NULL;
  $$
);
