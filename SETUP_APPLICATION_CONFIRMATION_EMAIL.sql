-- SETUP_APPLICATION_CONFIRMATION_EMAIL.sql
-- Envoi auto d'un email de confirmation de candidature (statut en attente)
-- pour chaque INSERT sur public.recruitment
-- et pour les INSERT directs sur public.athletes (DG/Staff).

-- 1) Extensions necessaires
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Table de deduplication des evenements email
CREATE TABLE IF NOT EXISTS public.application_email_events (
  event_id text PRIMARY KEY,
  table_name text,
  event_type text,
  recipient text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3) Trigger function vers edge function /functions/v1/application-confirmation
-- IMPORTANT:
--   - Project ref deja renseignee: ddssfadzmfspnwcdiohh
--   - Configurer le secret webhook cote DB (exemple):
--       ALTER DATABASE postgres
--       SET app.settings.app_email_webhook_secret = 'VOTRE_SECRET_ICI';
--   - Optionnel: surcharger l'endpoint (sinon fallback sur l'URL ci-dessous):
--       ALTER DATABASE postgres
--       SET app.settings.app_email_endpoint = 'https://ddssfadzmfspnwcdiohh.supabase.co/functions/v1/application-confirmation';
CREATE OR REPLACE FUNCTION public.dispatch_application_confirmation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  row_json jsonb;
  event_id text;
  endpoint text := coalesce(
    nullif(current_setting('app.settings.app_email_endpoint', true), ''),
    'https://ddssfadzmfspnwcdiohh.supabase.co/functions/v1/application-confirmation'
  );
  secret text := nullif(current_setting('app.settings.app_email_webhook_secret', true), '');
  email_value text;
  inserted_count integer := 0;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME NOT IN ('recruitment', 'athletes') THEN
    RETURN NEW;
  END IF;

  row_json := to_jsonb(NEW);
  email_value := lower(coalesce(row_json->>'email', ''));

  -- Pas d'email candidat -> rien a envoyer
  IF email_value = '' THEN
    RETURN NEW;
  END IF;

  -- Secret absent: on saute proprement (pas d'echec d'INSERT metier)
  IF secret IS NULL THEN
    RAISE WARNING 'dispatch_application_confirmation_email: secret webhook non configure (app.settings.app_email_webhook_secret)';
    RETURN NEW;
  END IF;

  -- Eviter un second email "en attente" quand un candidat accepte en recrutement
  -- est copie dans athletes avec registration_type='online'.
  IF TG_TABLE_NAME = 'athletes' AND lower(coalesce(row_json->>'registration_type', '')) = 'online' THEN
    RETURN NEW;
  END IF;

  -- Normaliser le payload pour l'edge function: meme shape que recruitment.
  IF TG_TABLE_NAME = 'athletes' THEN
    row_json := row_json
      || jsonb_build_object('full_name', coalesce(row_json->>'name', row_json->>'full_name', ''))
      || jsonb_build_object('status', 'pending');
  END IF;

  event_id := concat_ws(
    ':',
    TG_TABLE_NAME,
    TG_OP,
    coalesce(row_json->>'id', 'na'),
    coalesce(row_json->>'created_at', txid_current()::text)
  );

  -- Dedup guard
  INSERT INTO public.application_email_events (event_id, table_name, event_type, recipient)
  VALUES (event_id, TG_TABLE_NAME, TG_OP, email_value)
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-email-secret', secret
    ),
    body := jsonb_build_object(
      'event_id', event_id,
      'table', TG_TABLE_NAME,
      'event', TG_OP,
      'record', row_json
    )
  );

  RETURN NEW;
END;
$$;

-- Restriction explicite de l'execution directe: la fonction est appelee via trigger.
REVOKE ALL ON FUNCTION public.dispatch_application_confirmation_email() FROM PUBLIC;

-- 4) Trigger sur INSERT recrutement
DROP TRIGGER IF EXISTS tr_application_confirmation_email_on_recruitment_insert ON public.recruitment;
CREATE TRIGGER tr_application_confirmation_email_on_recruitment_insert
AFTER INSERT ON public.recruitment
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_application_confirmation_email();

DROP TRIGGER IF EXISTS tr_application_confirmation_email_on_athletes_insert ON public.athletes;
CREATE TRIGGER tr_application_confirmation_email_on_athletes_insert
AFTER INSERT ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_application_confirmation_email();
