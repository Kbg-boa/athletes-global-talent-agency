# AGTA Security Hardening Checklist (Priority)

## 0. Immediate incident response (today)
- Rotate all leaked keys now:
  - Supabase anon key
  - Supabase service role key
  - Resend API key
  - Gemini API key
  - Any webhook secrets (`PUSH_WEBHOOK_SECRET`, `APP_EMAIL_WEBHOOK_SECRET`, `SOCIAL_PUBLISH_WEBHOOK_SECRET`)
- Revoke all test passwords and force password reset for DG/Staff accounts.
- Remove exposed secrets from git history if the repository is shared publicly.

## 1. Frontend and environment secrets
- Never put private secrets in `VITE_*` variables (they are public in browser bundles).
- Keep only public values in frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Store private secrets only in Supabase Edge Function secrets or server env.

## 2. Supabase Auth
- Enable MFA for DG and staff accounts.
- Enforce strong password policy (length and complexity).
- Disable public signups if not needed.
- Enable email confirmations if your flow allows it.
- Regularly review active sessions and revoke suspicious sessions.

## 3. Row Level Security (RLS)
- Ensure every sensitive table has RLS enabled.
- Replace permissive policies like `USING (true)` on sensitive tables.
- Restrict write operations to authenticated users with explicit role/email checks.
- Restrict read operations for recruitment, documents, payments, reports to trusted roles only.

## 4. Storage protection
- Ensure private buckets for sensitive documents.
- Deny anonymous list/read for private buckets.
- Allow upload/read/delete only to authenticated roles with strict policies.
- Consider signed URLs for temporary document access.

## 5. Edge Functions and webhooks
- Require shared secret header checks for all incoming webhook-triggered functions.
- Validate `Authorization` and reject missing/invalid tokens.
- Add rate-limiting where possible.
- Do not log secrets or full tokens in function logs.

## 6. Email security
- Keep Resend API key only in secure server/edge secrets.
- Configure and monitor SPF, DKIM, DMARC.
- Use domain lock and monitor suspicious outbound spikes.

## 7. Monitoring and alerting
- Enable Supabase audit logs and review weekly.
- Track failed logins, repeated 401/403, and anomalous write bursts.
- Create alert thresholds for unusual uploads/downloads and mass exports.

## 8. Backup and recovery
- Keep automated backups and verify restore procedures.
- Encrypt backup exports and restrict who can download.
- Test restore at least monthly.

## 9. Deployment hygiene
- Never commit `.env` to git.
- Keep `dist/` and local debug files out of source control.
- Run secret scans before deployment.

## 10. Security regression routine
- Run this checklist before each production release.
- Re-test critical auth, RLS, storage, and webhook protections.