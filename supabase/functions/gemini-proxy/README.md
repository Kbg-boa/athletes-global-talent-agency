# Gemini Proxy (Supabase Edge Function)

This function calls Google Gemini from the server side so the API key is not exposed in the browser.

## 1) Set Supabase secrets

Use Supabase CLI (logged in and linked to your project):

```bash
supabase secrets set GEMINI_API_KEY=your_new_gemini_key
supabase secrets set GEMINI_MODEL=gemini-flash-latest
supabase secrets set GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set GEMINI_RATE_LIMIT_PER_MINUTE=12
supabase secrets set GEMINI_RATE_LIMIT_PER_DAY=120
```

The function requires a valid Supabase user session.
Requests without Authorization Bearer token are rejected.
Rate limiting is enforced per authenticated user via public.ai_request_logs.

## 2) Deploy the function

```bash
supabase functions deploy gemini-proxy
```

Before deploy, run the SQL setup so public.ai_request_logs exists.

## 3) Frontend env

Set in your local `.env`:

```env
VITE_BOT_PROVIDER=gemini-proxy
VITE_BOT_PROXY_FUNCTION=gemini-proxy
```

## 4) Optional local serve

```bash
supabase functions serve gemini-proxy
```

Then point the frontend to your local Supabase project as usual.
