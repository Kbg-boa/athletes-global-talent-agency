-- Setup recruiter email logs for AGTA dashboard

CREATE TABLE IF NOT EXISTS public.recruiter_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id bigint REFERENCES public.recruiters(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  template text NOT NULL CHECK (template IN ('onboarding', 'followup', 'renewal')),
  subject text,
  body text,
  provider text DEFAULT 'resend',
  provider_message_id text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message text,
  sent_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read recruiter email logs" ON public.recruiter_email_logs;
CREATE POLICY "Authenticated can read recruiter email logs"
  ON public.recruiter_email_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert recruiter email logs" ON public.recruiter_email_logs;
CREATE POLICY "Authenticated can insert recruiter email logs"
  ON public.recruiter_email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_recruiter_email_logs_created_at
  ON public.recruiter_email_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruiter_email_logs_recruiter_id
  ON public.recruiter_email_logs (recruiter_id);
