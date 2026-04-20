import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type IncomingPayload = {
  event_id?: string;
  table?: string;
  event?: string;
  target_roles?: Array<'staff' | 'dg'>;
  record?: Record<string, any>;
};

type NotificationTemplate = {
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  tag: string;
  url: string;
};

const dedupeEvent = async (
  adminClient: ReturnType<typeof createClient>,
  eventId: string,
  tableName: string,
  eventType: string
): Promise<'new' | 'duplicate'> => {
  try {
    const { error } = await adminClient
      .from('push_delivery_events')
      .insert([{ event_id: eventId, table_name: tableName, event_type: eventType, created_at: new Date().toISOString() }]);

    if (!error) return 'new';
    if (String((error as any)?.code || '') === '23505') return 'duplicate';
    return 'new';
  } catch {
    // If table is not installed yet, do not block pushes.
    return 'new';
  }
};

const buildNotificationTemplate = (payload: IncomingPayload): NotificationTemplate => {
  const table = String(payload.table || 'activity');
  const event = String(payload.event || 'INSERT').toUpperCase();
  const record = payload.record || {};
  const targetRoles = Array.isArray(payload.target_roles) ? payload.target_roles : ['staff', 'dg'];
  const isDGOnly = targetRoles.length === 1 && targetRoles[0] === 'dg';
  const isStaffOnly = targetRoles.length === 1 && targetRoles[0] === 'staff';

  // ── messages ───────────────────────────────────────────────────────────────
  if (table === 'messages' && event === 'INSERT') {
    const sender = String(record.sender_name || 'AGTA');
    const content = String(record.content || record.attachment_name || 'New message').slice(0, 120);
    const audioFr = content.startsWith('voice_') ? '🎙 Message vocal' : content;
    const audioEn = content.startsWith('voice_') ? '🎙 Voice message' : content;
    return {
      titleFr: isDGOnly ? 'AGTA • Message du staff' : isStaffOnly ? 'AGTA • Message DG' : 'AGTA • Nouveau message',
      titleEn: isDGOnly ? 'AGTA • Message from staff' : isStaffOnly ? 'AGTA • Message from DG' : 'AGTA • New message',
      bodyFr: `${sender}: ${audioFr}`,
      bodyEn: `${sender}: ${audioEn}`,
      tag: 'agta-msg',
      url: '/login',
    };
  }

  // ── recruitment ────────────────────────────────────────────────────────────
  if (table === 'recruitment') {
    const candidate = String(record.full_name || record.name || 'Candidat');
    const sport = String(record.sport || '');
    const status = String(record.status || '').toLowerCase();

    if (event === 'INSERT') {
      const sportSuffix = sport ? ` (${sport})` : '';
      return {
        titleFr: 'AGTA • Nouvelle candidature',
        titleEn: 'AGTA • New application',
        bodyFr: `${candidate}${sportSuffix} vient de s'inscrire. En attente de validation.`,
        bodyEn: `${candidate}${sportSuffix} just applied. Awaiting review.`,
        tag: 'agta-recruit-new',
        url: '/admin-dashboard',
      };
    }
    if (status === 'accepted') {
      return {
        titleFr: 'AGTA • Candidature validée ✅',
        titleEn: 'AGTA • Application approved ✅',
        bodyFr: `${candidate} a été accepté(e) par la DG.`,
        bodyEn: `${candidate} has been approved by the DG.`,
        tag: 'agta-recruit-accepted',
        url: '/staff-dashboard',
      };
    }
    if (status === 'rejected') {
      return {
        titleFr: 'AGTA • Candidature rejetée ❌',
        titleEn: 'AGTA • Application rejected ❌',
        bodyFr: `${candidate} a été refusé(e) par la DG.`,
        bodyEn: `${candidate} has been rejected by the DG.`,
        tag: 'agta-recruit-rejected',
        url: '/staff-dashboard',
      };
    }
    if (status === 'pending') {
      return {
        titleFr: 'AGTA • Candidature mise en attente',
        titleEn: 'AGTA • Application set to pending',
        bodyFr: `${candidate} est de nouveau en attente de décision.`,
        bodyEn: `${candidate} is back in pending review.`,
        tag: 'agta-recruit-pending',
        url: '/admin-dashboard',
      };
    }
  }

  // ── agta_activity ──────────────────────────────────────────────────────────
  if (table === 'agta_activity' && event === 'INSERT') {
    const description = String(record.description || record.activity_type || '').slice(0, 140);
    const actType = String(record.activity_type || '').toLowerCase();
    const actor = String(record.user_email || '').split('@')[0] || 'AGTA';

    if (actType.includes('athlete') || actType.includes('profil')) {
      return {
        titleFr: 'AGTA • Nouvel athlète ajouté',
        titleEn: 'AGTA • New athlete added',
        bodyFr: `${actor}: ${description || 'Profil athlète mis à jour.'}`,
        bodyEn: `${actor}: ${description || 'Athlete profile updated.'}`,
        tag: 'agta-activity-athlete',
        url: isDGOnly ? '/admin-dashboard' : '/staff-dashboard',
      };
    }
    if (actType.includes('document')) {
      return {
        titleFr: 'AGTA • Document uploadé',
        titleEn: 'AGTA • Document uploaded',
        bodyFr: `${actor}: ${description || 'Nouveau document disponible.'}`,
        bodyEn: `${actor}: ${description || 'New document available.'}`,
        tag: 'agta-activity-doc',
        url: isDGOnly ? '/admin-dashboard' : '/staff-dashboard',
      };
    }
    if (actType.includes('report') || actType.includes('rapport')) {
      return {
        titleFr: 'AGTA • Rapport soumis',
        titleEn: 'AGTA • Report submitted',
        bodyFr: `${actor}: ${description || 'Nouveau rapport journalier.'}`,
        bodyEn: `${actor}: ${description || 'New daily report submitted.'}`,
        tag: 'agta-activity-report',
        url: isDGOnly ? '/admin-dashboard' : '/staff-dashboard',
      };
    }
    return {
      titleFr: isDGOnly ? 'AGTA • Activité staff' : isStaffOnly ? 'AGTA • Activité DG' : 'AGTA • Mise à jour',
      titleEn: isDGOnly ? 'AGTA • Staff activity' : isStaffOnly ? 'AGTA • DG activity' : 'AGTA • Update',
      bodyFr: description || 'Nouvelle activité enregistrée.',
      bodyEn: description || 'New activity logged.',
      tag: 'agta-activity',
      url: isDGOnly ? '/admin-dashboard' : '/staff-dashboard',
    };
  }

  return {
    titleFr: 'AGTA • Notification',
    titleEn: 'AGTA • Notification',
    bodyFr: 'Nouvelle mise à jour disponible.',
    bodyEn: 'A new update is available.',
    tag: 'agta-generic',
    url: '/login',
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

  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') || '';
  const incomingSecret = req.headers.get('x-push-secret') || '';
  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:agta.management@gmail.com';

  if (!supabaseUrl || !serviceRole || !vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'Missing env for push delivery' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const body = (await req.json().catch(() => ({}))) as IncomingPayload;
    const tableName = String(body.table || 'unknown');
    const eventType = String(body.event || 'INSERT').toUpperCase();
    const record = body.record || {};
    const eventId =
      String(body.event_id || '') ||
      `${tableName}:${eventType}:${String(record.id || 'na')}:${String(record.updated_at || record.created_at || Date.now())}`;

    const adminClient = createClient(supabaseUrl, serviceRole);
    const dedupe = await dedupeEvent(adminClient, eventId, tableName, eventType);
    if (dedupe === 'duplicate') {
      return new Response(JSON.stringify({ ok: true, skipped: 'duplicate-event', eventId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetRoles = Array.isArray(body.target_roles) && body.target_roles.length > 0
      ? body.target_roles
      : ['staff', 'dg'];

    const template = buildNotificationTemplate(body);

    const { data: subscriptions, error } = await adminClient
      .from('device_push_subscriptions')
      .select('id, endpoint, p256dh, auth, is_active, role, locale')
      .eq('is_active', true)
      .not('endpoint', 'is', null)
      .not('p256dh', 'is', null)
      .not('auth', 'is', null)
      .limit(1000);

    if (error) throw error;

    const filteredSubscriptions = (subscriptions || []).filter((sub: any) => {
      const role = String(sub.role || '').toLowerCase();
      if (!role) return true;
      return targetRoles.includes(role as 'staff' | 'dg');
    });

    let sent = 0;
    let failed = 0;

    for (const sub of filteredSubscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const isFr = String(sub.locale || 'fr').toLowerCase().startsWith('fr');
      const notification = {
        title: isFr ? template.titleFr : template.titleEn,
        body: isFr ? template.bodyFr : template.bodyEn,
        tag: `${template.tag}:${eventId}`,
        url: template.url,
      };

      try {
        await webpush.sendNotification(pushSubscription as any, JSON.stringify(notification));
        sent += 1;
      } catch (sendError: any) {
        failed += 1;
        const statusCode = Number(sendError?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from('device_push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    try {
      await adminClient
        .from('push_delivery_events')
        .update({ delivered_count: sent, failed_count: failed, updated_at: new Date().toISOString() })
        .eq('event_id', eventId);
    } catch {
      // ignore update if table not installed yet
    }

    return new Response(JSON.stringify({ ok: true, eventId, sent, failed, targetedRoles: targetRoles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: String(error?.message || error || 'Unknown error') }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
