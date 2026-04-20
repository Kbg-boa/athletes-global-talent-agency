import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const rateLimitPerMinute = Number(Deno.env.get('GEMINI_RATE_LIMIT_PER_MINUTE') || 12);
const rateLimitPerDay = Number(Deno.env.get('GEMINI_RATE_LIMIT_PER_DAY') || 120);

type RequestPayload = {
  prompt?: string;
  ctxLabel?: string;
  channelId?: string;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY') || '';
    const apiBase = Deno.env.get('GEMINI_API_URL') || 'https://generativelanguage.googleapis.com/v1beta';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth is optional — try to resolve the user for logging/rate-limiting but do not block
    let user: { id: string; email?: string } | null = null;
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ') && supabaseUrl && supabaseAnonKey) {
      try {
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await authClient.auth.getUser();
        if (data?.user) user = { id: data.user.id, email: data.user.email };
      } catch (_) { /* ignore auth errors — bot still works */ }
    }

    const body = (await req.json().catch(() => ({}))) as RequestPayload;
    const prompt = String(body.prompt || '').trim();
    const ctxLabel = String(body.ctxLabel || 'Contexte general').trim();
    const channelId = String(body.channelId || 'Direction Générale').trim();
    const temperature = Number.isFinite(body.temperature) ? Number(body.temperature) : 0.4;
    const maxOutputTokens = Number.isFinite(body.maxOutputTokens) ? Number(body.maxOutputTokens) : 280;
    const model = body.model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash';

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting + logging — only when user is authenticated AND service role key is available
    if (user && supabaseServiceRoleKey) {
      try {
        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
        const minuteAgo = new Date(Date.now() - 60_000).toISOString();
        const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

        const [{ count: minuteCount }, { count: dayCount }] = await Promise.all([
          adminClient
            .from('ai_request_logs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('route', 'gemini-proxy')
            .gte('created_at', minuteAgo),
          adminClient
            .from('ai_request_logs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('route', 'gemini-proxy')
            .gte('created_at', dayAgo),
        ]);

        if ((minuteCount || 0) >= rateLimitPerMinute || (dayCount || 0) >= rateLimitPerDay) {
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            limits: { perMinute: rateLimitPerMinute, perDay: rateLimitPerDay },
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Best-effort log — ignore if table doesn't exist yet
        await adminClient.from('ai_request_logs').insert([{
          user_id: user.id,
          user_email: user.email || null,
          route: 'gemini-proxy',
          model,
          prompt_chars: prompt.length,
          context_label: ctxLabel,
          channel_id: channelId,
        }]).catch(() => { /* table may not exist yet */ });
      } catch (_) { /* rate limit storage unavailable — continue anyway */ }
    }

    const systemPrompt = [
      'Tu es AGTA BOT, assistant operationnel pour un staff sportif.',
      'Objectif: fournir des reponses concretes, actionnables et fiables, sans blabla.',
      'Style: direct, professionnel, francais simple.',
      'Interdit: preambules du type "Bonjour, ici AGTA BOT" ou formulations administratives.',
      'Si l utilisateur demande un nombre de points (ex: 5 points), respecte exactement ce format.',
      'Quand pertinent, proposer une structure claire en puces avec actions, responsables et delais.',
      'Ne pas inventer des faits non presents dans la demande.',
      'Terminer par une mini section "Prochaine action" en 1 ligne si utile.',
    ].join(' ');

    const userPrompt = [
      `Contexte: ${ctxLabel}`,
      `Canal: ${channelId}`,
      `Demande: ${prompt}`,
    ].join('\n');

    const endpoint = `${apiBase}/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data || `HTTP ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = (data?.candidates || [])
      .flatMap((candidate: any) => candidate?.content?.parts || [])
      .map((part: any) => String(part?.text || '').trim())
      .filter(Boolean)
      .join('\n')
      .trim();

    return new Response(JSON.stringify({ text, provider: 'gemini-proxy' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    const message = error?.name === 'AbortError' ? 'Gemini request timeout' : String(error?.message || error || 'Unknown error');
    return new Response(JSON.stringify({ error: message }), {
      status: error?.name === 'AbortError' ? 504 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
