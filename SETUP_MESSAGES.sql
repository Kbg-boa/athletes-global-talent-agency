-- ============================================
-- AGTA MESSAGES SYSTEM - Table Setup
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Créer la table messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  sender_name text NOT NULL,
  sender_role text DEFAULT 'staff',
  channel text DEFAULT 'Direction Générale',
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  message_type text DEFAULT 'text',
  attachment_url text,
  attachment_name text,
  reply_to_id text,
  reactions jsonb DEFAULT '{}'::jsonb,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 1.b Migration sure for existing projects
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role text DEFAULT 'staff';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Direction Générale';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS important boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS view_once boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS played_once_by jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'general';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS context_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS context_label text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS priority text DEFAULT 'low';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS translated_content jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Normaliser status si la contrainte n'existe pas encore
DO $$
BEGIN
  -- Corriger les lignes legacy qui cassent la contrainte
  UPDATE public.messages
  SET status = 'sent'
  WHERE status IS NULL
     OR status NOT IN ('sent', 'delivered', 'read');

  ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_status_check;

  ALTER TABLE public.messages
  ADD CONSTRAINT messages_status_check
  CHECK (status IN ('sent', 'delivered', 'read'));
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END;
$$;

-- reply_to_id: compatible with existing schemas where messages.id can be bigint or uuid
DO $$
BEGIN
  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_id text;
  ELSE
    ALTER TABLE public.messages
    ALTER COLUMN reply_to_id TYPE text USING reply_to_id::text;
  END IF;
END;
$$;

-- Optionnel: normaliser les types message, incluant sticker
DO $$
BEGIN
  ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

  ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'sticker'));
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END;
$$;

-- Optionnel: normaliser la priorite (high/low)
DO $$
BEGIN
  UPDATE public.messages
  SET priority = 'low'
  WHERE priority IS NULL
     OR priority NOT IN ('low', 'high');

  ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_priority_check;

  ALTER TABLE public.messages
  ADD CONSTRAINT messages_priority_check
  CHECK (priority IN ('low', 'high'));
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END;
$$;

-- 1.c Signaling WebRTC (offres/reponses/candidats ICE)
CREATE TABLE IF NOT EXISTS public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text DEFAULT 'Direction Générale',
  from_user text NOT NULL,
  to_user text,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice', 'end', 'reject')),
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.call_signals ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Direction Générale';
ALTER TABLE public.call_signals ADD COLUMN IF NOT EXISTS from_user text;
ALTER TABLE public.call_signals ADD COLUMN IF NOT EXISTS to_user text;
ALTER TABLE public.call_signals ADD COLUMN IF NOT EXISTS signal_type text;
ALTER TABLE public.call_signals ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.call_signals ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read call_signals" ON public.call_signals;
CREATE POLICY "Allow read call_signals" ON public.call_signals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert call_signals" ON public.call_signals;
CREATE POLICY "Allow insert call_signals" ON public.call_signals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete call_signals" ON public.call_signals;
CREATE POLICY "Allow delete call_signals" ON public.call_signals
  FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_call_signals_channel ON public.call_signals(channel);
CREATE INDEX IF NOT EXISTS idx_call_signals_created ON public.call_signals(created_at DESC);

-- Purge manuelle des signaux WebRTC expirés (2 min)
CREATE OR REPLACE FUNCTION public.delete_old_call_signals()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.call_signals
  WHERE created_at < now() - interval '2 minutes';
$$;

-- 1.d Historique des appels (manques/refuses/termines + duree)
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text DEFAULT 'Direction Générale',
  from_user text NOT NULL,
  to_user text,
  call_type text NOT NULL CHECK (call_type IN ('audio', 'video')),
  status text NOT NULL CHECK (status IN ('missed', 'rejected', 'completed', 'cancelled')),
  duration_seconds integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Direction Générale';
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS from_user text;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS to_user text;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS call_type text;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read call_history" ON public.call_history;
CREATE POLICY "Allow read call_history" ON public.call_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert call_history" ON public.call_history;
CREATE POLICY "Allow insert call_history" ON public.call_history
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_call_history_channel ON public.call_history(channel);
CREATE INDEX IF NOT EXISTS idx_call_history_created ON public.call_history(created_at DESC);

-- 1.e Recu de lecture audio unique (renforcement serveur view-once)
CREATE TABLE IF NOT EXISTS public.message_audio_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  user_key text NOT NULL,
  played_at timestamp with time zone DEFAULT now(),
  UNIQUE (message_id, user_key)
);

ALTER TABLE public.message_audio_receipts ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE public.message_audio_receipts ADD COLUMN IF NOT EXISTS user_key text;
ALTER TABLE public.message_audio_receipts ADD COLUMN IF NOT EXISTS played_at timestamp with time zone DEFAULT now();

ALTER TABLE public.message_audio_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read message_audio_receipts" ON public.message_audio_receipts;
CREATE POLICY "Allow read message_audio_receipts" ON public.message_audio_receipts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert message_audio_receipts" ON public.message_audio_receipts;
CREATE POLICY "Allow insert message_audio_receipts" ON public.message_audio_receipts
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_message_audio_receipts_message ON public.message_audio_receipts(message_id);

-- 1.f Presence utilisateur sur messagerie (en ligne / vu a)
CREATE TABLE IF NOT EXISTS public.chat_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  channel text DEFAULT 'Direction Générale',
  is_online boolean DEFAULT true,
  last_seen timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_name, channel)
);

ALTER TABLE public.chat_presence ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE public.chat_presence ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Direction Générale';
ALTER TABLE public.chat_presence ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT true;
ALTER TABLE public.chat_presence ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();
ALTER TABLE public.chat_presence ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read chat_presence" ON public.chat_presence;
CREATE POLICY "Allow read chat_presence" ON public.chat_presence
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow upsert chat_presence" ON public.chat_presence;
CREATE POLICY "Allow upsert chat_presence" ON public.chat_presence
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update chat_presence" ON public.chat_presence;
CREATE POLICY "Allow update chat_presence" ON public.chat_presence
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_presence_channel ON public.chat_presence(channel);
CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen ON public.chat_presence(last_seen DESC);

-- 1.f.b Répertoire partagé des profils de chat (nom + photo)
CREATE TABLE IF NOT EXISTS public.chat_user_profiles (
  user_id uuid PRIMARY KEY,
  user_email text UNIQUE,
  user_name text UNIQUE NOT NULL,
  display_name text,
  profile_picture_url text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS profile_picture_url text;
ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.chat_user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.chat_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read chat_user_profiles" ON public.chat_user_profiles;
CREATE POLICY "Allow read chat_user_profiles" ON public.chat_user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert chat_user_profiles" ON public.chat_user_profiles;
CREATE POLICY "Allow insert chat_user_profiles" ON public.chat_user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update chat_user_profiles" ON public.chat_user_profiles;
CREATE POLICY "Allow update chat_user_profiles" ON public.chat_user_profiles
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_user_profiles_user_name ON public.chat_user_profiles(user_name);
CREATE INDEX IF NOT EXISTS idx_chat_user_profiles_updated ON public.chat_user_profiles(updated_at DESC);

-- 1.g Notifications intelligentes (priorite, mention, relance)
CREATE TABLE IF NOT EXISTS public.message_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  channel text DEFAULT 'Direction Générale',
  recipient text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('mention', 'priority', 'reminder')),
  title text,
  body text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Direction Générale';
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS recipient text;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS notification_type text;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read message_notifications" ON public.message_notifications;
CREATE POLICY "Allow read message_notifications" ON public.message_notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert message_notifications" ON public.message_notifications;
CREATE POLICY "Allow insert message_notifications" ON public.message_notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update message_notifications" ON public.message_notifications;
CREATE POLICY "Allow update message_notifications" ON public.message_notifications
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_message_notifications_recipient ON public.message_notifications(recipient);
CREATE INDEX IF NOT EXISTS idx_message_notifications_channel ON public.message_notifications(channel);
CREATE INDEX IF NOT EXISTS idx_message_notifications_created ON public.message_notifications(created_at DESC);

-- 1.h Timeline actionnable (tache / rappel / evenement)
CREATE TABLE IF NOT EXISTS public.message_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  channel text DEFAULT 'Direction Générale',
  action_type text NOT NULL CHECK (action_type IN ('task', 'reminder', 'calendar')),
  title text NOT NULL,
  notes text,
  due_at timestamp with time zone,
  status text DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_by text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Direction Générale';
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS due_at timestamp with time zone;
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.message_actions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.message_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read message_actions" ON public.message_actions;
CREATE POLICY "Allow read message_actions" ON public.message_actions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert message_actions" ON public.message_actions;
CREATE POLICY "Allow insert message_actions" ON public.message_actions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update message_actions" ON public.message_actions;
CREATE POLICY "Allow update message_actions" ON public.message_actions
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_message_actions_channel ON public.message_actions(channel);
CREATE INDEX IF NOT EXISTS idx_message_actions_due ON public.message_actions(due_at);

-- 1.i Tables de liaison cross-module (si absentes)
CREATE TABLE IF NOT EXISTS public.work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text,
  action text,
  target_athlete text,
  type text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text,
  scout text,
  task text,
  status text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents_agta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  type text,
  size text,
  storage_path text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_agta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read work_logs" ON public.work_logs;
CREATE POLICY "Allow read work_logs" ON public.work_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert work_logs" ON public.work_logs;
CREATE POLICY "Allow insert work_logs" ON public.work_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read operations_log" ON public.operations_log;
CREATE POLICY "Allow read operations_log" ON public.operations_log
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert operations_log" ON public.operations_log;
CREATE POLICY "Allow insert operations_log" ON public.operations_log
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read documents_agta" ON public.documents_agta;
CREATE POLICY "Allow read documents_agta" ON public.documents_agta
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert documents_agta" ON public.documents_agta;
CREATE POLICY "Allow insert documents_agta" ON public.documents_agta
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_work_logs_created ON public.work_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_log_created ON public.operations_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_agta_created ON public.documents_agta(created_at DESC);

-- 1.j Audit traduction (provider + quota)
CREATE TABLE IF NOT EXISTS public.translation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text,
  source_lang text,
  target_lang text,
  chars_count integer DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.translation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read translation_audit" ON public.translation_audit;
CREATE POLICY "Allow read translation_audit" ON public.translation_audit
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert translation_audit" ON public.translation_audit;
CREATE POLICY "Allow insert translation_audit" ON public.translation_audit
  FOR INSERT WITH CHECK (true);

-- 1.k Audit et rate limit des appels IA (Gemini proxy)
CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  route text DEFAULT 'gemini-proxy',
  model text,
  prompt_chars integer DEFAULT 0,
  context_label text,
  channel_id text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS route text DEFAULT 'gemini-proxy';
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS prompt_chars integer DEFAULT 0;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS context_label text;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS channel_id text;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users read own ai_request_logs" ON public.ai_request_logs;
CREATE POLICY "Allow users read own ai_request_logs" ON public.ai_request_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deny direct insert ai_request_logs" ON public.ai_request_logs;
CREATE POLICY "Deny direct insert ai_request_logs" ON public.ai_request_logs
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct update ai_request_logs" ON public.ai_request_logs;
CREATE POLICY "Deny direct update ai_request_logs" ON public.ai_request_logs
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny direct delete ai_request_logs" ON public.ai_request_logs;
CREATE POLICY "Deny direct delete ai_request_logs" ON public.ai_request_logs
  FOR DELETE USING (false);

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_user_created ON public.ai_request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_route_created ON public.ai_request_logs(route, created_at DESC);

-- Realtime: s'assurer que les tables de chat/appel sont publiées
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
        AND c.relname = 'messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'call_signals'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'call_history'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'chat_presence'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'chat_user_profiles'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_user_profiles';
    END IF;
  END IF;
END;
$$;

-- 2. Activer RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Politique pour permettre les lectures
DROP POLICY IF EXISTS "Allow read messages" ON public.messages;
CREATE POLICY "Allow read messages" ON public.messages
  FOR SELECT USING (true);

-- 4. Politique pour permettre les insertions
DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;
CREATE POLICY "Allow insert messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- 5. Politique pour permettre les mises à jour
DROP POLICY IF EXISTS "Allow update messages" ON public.messages;
CREATE POLICY "Allow update messages" ON public.messages
  FOR UPDATE USING (true);

-- 6. Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_context_type ON public.messages(context_type);
CREATE INDEX IF NOT EXISTS idx_messages_context_id ON public.messages(context_id);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON public.messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_sender_name ON public.messages(sender_name);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);

-- 6.b Buckets storage pour pieces jointes/messages vocaux
INSERT INTO storage.buckets (id, name, public)
VALUES ('agta-files', 'agta-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-files', 'athlete-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('agta_vault', 'agta_vault', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow read AGTA message files" ON storage.objects;
CREATE POLICY "Allow read AGTA message files" ON storage.objects
  FOR SELECT USING (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

DROP POLICY IF EXISTS "Allow upload AGTA message files" ON storage.objects;
CREATE POLICY "Allow upload AGTA message files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

DROP POLICY IF EXISTS "Allow update AGTA message files" ON storage.objects;
CREATE POLICY "Allow update AGTA message files" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

DROP POLICY IF EXISTS "Allow delete AGTA message files" ON storage.objects;
CREATE POLICY "Allow delete AGTA message files" ON storage.objects
  FOR DELETE USING (bucket_id IN ('agta-files', 'athlete-files', 'agta_vault'));

-- 7. Vérifier la structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;