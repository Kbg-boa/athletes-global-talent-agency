import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = {
  action?: 'subscribe' | 'unsubscribe';
  role?: 'staff' | 'dg';
  userEmail?: string;
  userAgent?: string;
  locale?: 'fr' | 'en' | string;
  endpoint?: string;
  subscription?: {
    endpoint: string;
    expirationTime?: number | null;
    keys?: { p256dh?: string; auth?: string };
  };
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRole);

    const { data: authData } = await authClient.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const action = body.action || 'subscribe';

    if (action === 'unsubscribe') {
      const endpoint = String(body.endpoint || '').trim();
      if (!endpoint) {
        return new Response(JSON.stringify({ error: 'Missing endpoint' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await adminClient
        .from('device_push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ ok: true, action: 'unsubscribed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscription = body.subscription;
    if (!subscription?.endpoint) {
      return new Response(JSON.stringify({ error: 'Missing subscription endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const locale = String(body.locale || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';

    const upsertPayload = {
      user_id: user.id,
      user_email: body.userEmail || user.email || null,
      role: body.role || 'staff',
      locale,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || null,
      auth: subscription.keys?.auth || null,
      expiration_time: subscription.expirationTime || null,
      user_agent: body.userAgent || null,
      updated_at: new Date().toISOString(),
      is_active: true,
    };

    const { error } = await adminClient
      .from('device_push_subscriptions')
      .upsert(upsertPayload, { onConflict: 'endpoint' });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, action: 'subscribed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: String(error?.message || error || 'Unknown error') }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
