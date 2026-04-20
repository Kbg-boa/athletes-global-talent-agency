const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-email-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type IncomingPayload = {
  event_id?: string;
  table?: string;
  event?: string;
  record?: Record<string, any>;
};

const toText = (v: unknown) => String(v ?? '').trim();

const renderHtml = (name: string, sport: string) => {
  const safeName = name || 'Athlete';
  const safeSport = sport ? ` (${sport})` : '';

  return `
  <div style="font-family:Arial,sans-serif;background:#0a0a0a;padding:24px;color:#f4f4f5;">
    <div style="max-width:620px;margin:0 auto;background:#111214;border:1px solid rgba(199,255,0,.28);border-radius:16px;overflow:hidden;">
      <div style="padding:18px 22px;border-bottom:1px solid rgba(199,255,0,.18);">
        <h1 style="margin:0;font-size:20px;line-height:1.2;font-weight:800;letter-spacing:.3px;">
          AGTA <span style="color:#C7FF00;">Confirmation de candidature</span>
        </h1>
      </div>

      <div style="padding:22px;line-height:1.65;color:#e4e4e7;font-size:14px;">
        <p style="margin:0 0 14px;">Bonjour <strong>${safeName}</strong>,</p>
        <p style="margin:0 0 14px;">
          Nous confirmons la reception de votre candidature${safeSport} chez AGTA.
        </p>
        <p style="margin:0 0 14px;">
          Votre dossier est actuellement <strong style="color:#C7FF00;">en attente d'evaluation</strong> par notre equipe.
        </p>
        <p style="margin:0 0 18px;">
          Vous recevrez une mise a jour des que votre profil sera traite.
        </p>

        <div style="padding:12px 14px;border-radius:10px;background:rgba(199,255,0,.08);border:1px solid rgba(199,255,0,.24);color:#d9f99d;">
          Statut actuel: En attente
        </div>

        <p style="margin:18px 0 0;color:#a1a1aa;">Equipe AGTA</p>
      </div>
    </div>
  </div>
  `;
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

  const expectedSecret = Deno.env.get('APP_EMAIL_WEBHOOK_SECRET') || '';
  const incomingSecret = req.headers.get('x-email-secret') || '';
  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const fromEmail = Deno.env.get('CONFIRMATION_EMAIL_FROM') || 'AGTA <noreply@agta.global>';

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as IncomingPayload;
    const table = toText(body.table).toLowerCase();
    const event = toText(body.event).toUpperCase();
    const record = body.record || {};

    // We confirm new applications from recruitment and direct athlete registrations.
    if ((table !== 'recruitment' && table !== 'athletes') || event !== 'INSERT') {
      return new Response(JSON.stringify({ ok: true, skipped: 'not-supported-insert' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const to = toText(record.email).toLowerCase();
    const fullName = toText(record.full_name || record.name);
    const sport = toText(record.sport);

    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ ok: true, skipped: 'missing-applicant-email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = 'AGTA - Confirmation de candidature (en attente)';
    const html = renderHtml(fullName, sport);

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (!resendResp.ok) {
      const text = await resendResp.text();
      return new Response(JSON.stringify({ error: 'Resend request failed', details: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendData = await resendResp.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: true, provider: 'resend', result: resendData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: String(error?.message || error || 'Unknown error') }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
