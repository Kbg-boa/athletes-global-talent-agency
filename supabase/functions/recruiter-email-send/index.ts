import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type EmailTemplate = 'onboarding' | 'followup' | 'renewal';

type IncomingPayload = {
  recruiter_id?: number;
  to?: string;
  company?: string;
  contact_name?: string;
  template?: EmailTemplate;
};

const toText = (v: unknown) => String(v ?? '').trim();

const buildEmail = (
  template: EmailTemplate,
  company: string,
  contactName: string
): { subject: string; html: string; text: string } => {
  const safeCompany = company || 'votre structure';
  const safeContact = contactName || 'equipe';

  if (template === 'followup') {
    return {
      subject: `Relance AGTA - ${safeCompany}`,
      text: `Bonjour ${safeContact},\n\nNous revenons vers vous concernant notre collaboration AGTA.\nSouhaitez-vous planifier un point rapide cette semaine ?\n\nCordialement,\nAGTA Management`,
      html: `<div style="font-family:Arial,sans-serif;padding:18px;color:#18181b;line-height:1.6"><p>Bonjour <strong>${safeContact}</strong>,</p><p>Nous revenons vers vous concernant notre collaboration AGTA.</p><p>Souhaitez-vous planifier un point rapide cette semaine ?</p><p>Cordialement,<br/>AGTA Management</p></div>`,
    };
  }

  if (template === 'renewal') {
    return {
      subject: `Renouvellement partenariat - ${safeCompany}`,
      text: `Bonjour ${safeContact},\n\nVotre partenariat arrive a echeance.\nNous pouvons vous proposer un renouvellement adapte a vos besoins (Basic/Premium/Enterprise).\n\nCordialement,\nAGTA Management`,
      html: `<div style="font-family:Arial,sans-serif;padding:18px;color:#18181b;line-height:1.6"><p>Bonjour <strong>${safeContact}</strong>,</p><p>Votre partenariat arrive a echeance.</p><p>Nous pouvons vous proposer un renouvellement adapte a vos besoins (Basic/Premium/Enterprise).</p><p>Cordialement,<br/>AGTA Management</p></div>`,
    };
  }

  return {
    subject: `Bienvenue chez AGTA - ${safeCompany}`,
    text: `Bonjour ${safeContact},\n\nMerci pour votre confiance.\nBienvenue dans l'ecosysteme AGTA.\nNous restons disponibles pour l'activation complete de votre espace recruteur.\n\nCordialement,\nAGTA Management`,
    html: `<div style="font-family:Arial,sans-serif;padding:18px;color:#18181b;line-height:1.6"><p>Bonjour <strong>${safeContact}</strong>,</p><p>Merci pour votre confiance.</p><p>Bienvenue dans l'ecosysteme AGTA. Nous restons disponibles pour l'activation complete de votre espace recruteur.</p><p>Cordialement,<br/>AGTA Management</p></div>`,
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

  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const fromEmail = Deno.env.get('RECRUITER_EMAIL_FROM') || 'AGTA Management <noreply@athletesglobaltalentagency.com>';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as IncomingPayload;
    const to = toText(body.to).toLowerCase();
    const company = toText(body.company);
    const contactName = toText(body.contact_name);
    const template = (toText(body.template) || 'onboarding') as EmailTemplate;
    const recruiterId = Number(body.recruiter_id || 0) || null;

    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['onboarding', 'followup', 'renewal'].includes(template)) {
      return new Response(JSON.stringify({ error: 'Invalid template' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = buildEmail(template, company, contactName);

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    const resendPayload = await resendResp.json().catch(() => ({}));

    const canLog = Boolean(supabaseUrl && serviceRole);
    const admin = canLog ? createClient(supabaseUrl, serviceRole) : null;
    const sentBy = req.headers.get('x-client-info') || 'dashboard';

    if (!resendResp.ok) {
      if (admin) {
        await admin.from('recruiter_email_logs').insert({
          recruiter_id: recruiterId,
          recipient_email: to,
          template,
          subject: email.subject,
          body: email.text,
          provider: 'resend',
          status: 'failed',
          error_message: JSON.stringify(resendPayload || {}),
          sent_by: sentBy,
        });
      }

      return new Response(JSON.stringify({ error: 'Resend request failed', details: resendPayload }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (admin) {
      await admin.from('recruiter_email_logs').insert({
        recruiter_id: recruiterId,
        recipient_email: to,
        template,
        subject: email.subject,
        body: email.text,
        provider: 'resend',
        provider_message_id: toText((resendPayload as any)?.id),
        status: 'sent',
        sent_by: sentBy,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, provider: 'resend', template, messageId: toText((resendPayload as any)?.id) || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: String(error?.message || error || 'Unknown error') }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
