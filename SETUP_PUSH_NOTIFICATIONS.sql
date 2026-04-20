-- SETUP_PUSH_NOTIFICATIONS.sql
-- Configure Web Push pour AGTA (service worker + edge function + triggers Supabase)

-- 1) Table des abonnements appareil
CREATE TABLE IF NOT EXISTS public.device_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  role text,
  locale text DEFAULT 'fr',
  endpoint text UNIQUE NOT NULL,
  p256dh text,
  auth text,
  expiration_time bigint,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.device_push_subscriptions ADD COLUMN IF NOT EXISTS locale text DEFAULT 'fr';

CREATE TABLE IF NOT EXISTS public.push_delivery_events (
  event_id text PRIMARY KEY,
  table_name text,
  event_type text,
  delivered_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.device_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct read device_push_subscriptions" ON public.device_push_subscriptions;
CREATE POLICY "Deny direct read device_push_subscriptions" ON public.device_push_subscriptions
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "Deny direct insert device_push_subscriptions" ON public.device_push_subscriptions;
CREATE POLICY "Deny direct insert device_push_subscriptions" ON public.device_push_subscriptions
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct update device_push_subscriptions" ON public.device_push_subscriptions;
CREATE POLICY "Deny direct update device_push_subscriptions" ON public.device_push_subscriptions
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny direct delete device_push_subscriptions" ON public.device_push_subscriptions;
CREATE POLICY "Deny direct delete device_push_subscriptions" ON public.device_push_subscriptions
  FOR DELETE USING (false);

CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_user ON public.device_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_active ON public.device_push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_role ON public.device_push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_locale ON public.device_push_subscriptions(locale);

-- 2) Extension pg_net pour appeler l'edge function depuis triggers SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) Trigger function d'envoi webhook vers /functions/v1/push-notify
-- IMPORTANT:
--   - Remplacer YOUR_PROJECT_REF par votre ref Supabase
--   - Remplacer YOUR_PUSH_WEBHOOK_SECRET par la même valeur que le secret edge function PUSH_WEBHOOK_SECRET
CREATE OR REPLACE FUNCTION public.dispatch_push_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  row_json jsonb;
  target_roles text[];
  sender_role text;
  sender_email text;
  status_value text;
  activity_type_val text;
  audience_override text;
  event_id text;
  endpoint text := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify';
  secret text := 'YOUR_PUSH_WEBHOOK_SECRET';
  DG_EMAIL constant text := 'kbgmathieu@gmail.com';
BEGIN
  row_json := CASE
    WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
    ELSE to_jsonb(NEW)
  END;

  sender_role    := lower(coalesce(row_json->>'sender_role', row_json->>'role', ''));
  sender_email   := lower(coalesce(row_json->>'sender_email', row_json->>'user_email', ''));
  status_value   := lower(coalesce(row_json->>'status', ''));
  activity_type_val := lower(coalesce(row_json->>'activity_type', ''));
  audience_override := lower(coalesce(
    row_json->>'audience_role',
    row_json->'metadata'->>'audience_role',
    ''
  ));

  -- ── messages ────────────────────────────────────────────────────────────────
  IF TG_TABLE_NAME = 'messages' THEN
    IF sender_role = 'staff' THEN
      target_roles := ARRAY['dg'];
    ELSIF sender_role IN ('dg', 'admin') THEN
      target_roles := ARRAY['staff'];
    ELSE
      -- Déduire depuis l'email de l'expéditeur
      IF sender_email = DG_EMAIL THEN
        target_roles := ARRAY['staff'];
      ELSE
        target_roles := ARRAY['dg'];
      END IF;
    END IF;

  -- ── recruitment ─────────────────────────────────────────────────────────────
  ELSIF TG_TABLE_NAME = 'recruitment' THEN
    IF TG_OP = 'INSERT' THEN
      -- Nouvelle candidature publique → la DG doit valider
      target_roles := ARRAY['dg'];
    ELSIF TG_OP = 'UPDATE' AND status_value IN ('accepted', 'rejected') THEN
      -- Décision de la DG → notifier le staff
      target_roles := ARRAY['staff'];
    ELSIF TG_OP = 'UPDATE' AND status_value = 'pending' THEN
      -- Retour en attente (rare) → DG uniquement
      target_roles := ARRAY['dg'];
    ELSE
      target_roles := ARRAY['dg', 'staff'];
    END IF;

  -- ── agta_activity ────────────────────────────────────────────────────────────
  ELSIF TG_TABLE_NAME = 'agta_activity' THEN
    -- Audience explicite dans les métadonnées → prioritaire
    IF audience_override IN ('staff', 'dg') THEN
      target_roles := ARRAY[audience_override];

    -- Actions de la DG (par email) → notifier le staff
    ELSIF sender_email = DG_EMAIL THEN
      target_roles := ARRAY['staff'];

    -- Actions du staff → notifier la DG
    ELSIF sender_email != '' THEN
      target_roles := ARRAY['dg'];

    -- Fallback par type d'activité
    ELSIF activity_type_val IN ('athlete_added', 'athlete_updated', 'document_uploaded',
                                 'report_submitted', 'candidate_submitted') THEN
      target_roles := ARRAY['dg'];
    ELSIF activity_type_val IN ('candidate_accepted', 'candidate_rejected',
                                 'opportunity_posted', 'decision_made') THEN
      target_roles := ARRAY['staff'];
    ELSE
      target_roles := ARRAY['dg', 'staff'];
    END IF;

  -- ── autres tables ────────────────────────────────────────────────────────────
  ELSE
    target_roles := ARRAY['dg', 'staff'];
  END IF;

  event_id := concat_ws(
    ':',
    TG_TABLE_NAME,
    TG_OP,
    coalesce(row_json->>'id', 'na'),
    coalesce(row_json->>'updated_at', row_json->>'created_at', txid_current()::text)
  );

  payload := jsonb_build_object(
    'event_id',     event_id,
    'table',        TG_TABLE_NAME,
    'event',        TG_OP,
    'target_roles', to_jsonb(target_roles),
    'record',       row_json
  );

  PERFORM net.http_post(
    url     := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', secret
    ),
    body    := payload
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 4) Triggers sur événements métier
DROP TRIGGER IF EXISTS tr_push_messages_insert ON public.messages;
CREATE TRIGGER tr_push_messages_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_webhook();

DROP TRIGGER IF EXISTS tr_push_recruitment_change ON public.recruitment;
CREATE TRIGGER tr_push_recruitment_change
AFTER INSERT OR UPDATE ON public.recruitment
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_webhook();

DROP TRIGGER IF EXISTS tr_push_activity_insert ON public.agta_activity;
CREATE TRIGGER tr_push_activity_insert
AFTER INSERT ON public.agta_activity
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_webhook();
