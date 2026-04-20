import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-social-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Target = 'facebook' | 'instagram' | 'tiktok' | 'x' | 'linkedin' | 'pinterest' | 'discord' | 'youtube' | 'snapchat';
type Action = 'publish' | 'retry_due' | 'retry_post';

type IncomingBody = {
  action?: Action;
  post?: {
    id?: string | number;
    title?: string;
    caption?: string;
    image_url?: string | null;
    video_url?: string | null;
    published_at?: string | null;
  };
  post_id?: string | number;
  targets?: Target[];
  limit?: number;
  force?: boolean;
};

type NormalizedPost = {
  id: string | number;
  title: string;
  caption: string;
  image_url: string | null;
  video_url: string | null;
  published_at: string;
};

type PublishResult = {
  target: Target;
  status: 'ok' | 'failed';
  external_url: string | null;
  remote_id: string | null;
  error_message: string | null;
  payload: Record<string, any>;
};

const PROFILE_URLS: Record<Target, string> = {
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com/agta.global',
  tiktok: 'https://tiktok.com/@agta.global',
  x: 'https://x.com/AGTA_Global',
  linkedin: 'https://linkedin.com/company/athletes-global-talent-agency-agta',
  pinterest: 'https://pinterest.com',
  discord: 'https://discord.gg/75jWSnTHj3',
  youtube: 'https://youtube.com/@AthletesGlobalTalentAgencyAGTA',
  snapchat: 'https://snapchat.com/t/X7zTx817',
};

const required = (name: string): string => {
  const v = Deno.env.get(name) || '';
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

const maxAttemptsFromEnv = () => {
  const raw = Number(Deno.env.get('SOCIAL_PUBLISH_MAX_ATTEMPTS') || 5);
  if (!Number.isFinite(raw)) return 5;
  return Math.max(1, Math.min(Math.trunc(raw), 10));
};

const truncate = (text: string, max = 2500) => (text.length > max ? `${text.slice(0, max)}...` : text);
const postText = (post: NormalizedPost) => truncate(`${post.title}\n\n${post.caption}`.trim(), 2600);

const jsonHeaders = (token?: string) => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

const asFailed = (target: Target, error: unknown, payload: Record<string, any> = {}): PublishResult => ({
  target,
  status: 'failed',
  external_url: PROFILE_URLS[target],
  remote_id: null,
  error_message: error instanceof Error ? error.message : String(error || 'Unknown error'),
  payload,
});

const normalizePost = (input: IncomingBody['post']): NormalizedPost => {
  const p = input || {};
  return {
    id: String(p.id || '0'),
    title: String(p.title || 'AGTA update').trim(),
    caption: String(p.caption || '').trim(),
    image_url: p.image_url ? String(p.image_url) : null,
    video_url: p.video_url ? String(p.video_url) : null,
    published_at: String(p.published_at || new Date().toISOString()),
  };
};

const toIsoRetry = (attemptCount: number) => {
  const delaySeconds = Math.min(3600, Math.pow(2, Math.max(0, attemptCount - 1)) * 60);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
};

const publishFacebook = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'facebook';
  try {
    const pageId = required('FACEBOOK_PAGE_ID');
    const token = required('FACEBOOK_PAGE_ACCESS_TOKEN');
    const message = postText(post);

    if (post.video_url) {
      const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/videos`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ file_url: post.video_url, description: message, access_token: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Facebook video publish failed: ${JSON.stringify(data)}`);
      return {
        target,
        status: 'ok',
        external_url: `https://facebook.com/${String((data as any).id || '')}`,
        remote_id: String((data as any).id || ''),
        error_message: null,
        payload: data as any,
      };
    }

    if (post.image_url) {
      const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ url: post.image_url, caption: message, access_token: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Facebook image publish failed: ${JSON.stringify(data)}`);
      return {
        target,
        status: 'ok',
        external_url: `https://facebook.com/${String((data as any).post_id || (data as any).id || '')}`,
        remote_id: String((data as any).post_id || (data as any).id || ''),
        error_message: null,
        payload: data as any,
      };
    }

    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ message, access_token: token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Facebook text publish failed: ${JSON.stringify(data)}`);
    return {
      target,
      status: 'ok',
      external_url: `https://facebook.com/${String((data as any).id || '')}`,
      remote_id: String((data as any).id || ''),
      error_message: null,
      payload: data as any,
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishInstagram = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'instagram';
  try {
    const igAccountId = required('INSTAGRAM_BUSINESS_ACCOUNT_ID');
    const token = required('INSTAGRAM_ACCESS_TOKEN');
    const caption = postText(post);

    if (!post.image_url && !post.video_url) {
      throw new Error('Instagram API requires image_url or video_url.');
    }

    const createPayload: Record<string, any> = { caption, access_token: token };
    if (post.video_url) {
      createPayload.media_type = 'VIDEO';
      createPayload.video_url = post.video_url;
    } else {
      createPayload.image_url = post.image_url;
    }

    const createRes = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(createPayload),
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !(createData as any).id) {
      throw new Error(`Instagram media create failed: ${JSON.stringify(createData)}`);
    }

    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ creation_id: (createData as any).id, access_token: token }),
    });
    const publishData = await publishRes.json().catch(() => ({}));
    if (!publishRes.ok) {
      throw new Error(`Instagram media publish failed: ${JSON.stringify(publishData)}`);
    }

    const mediaId = String((publishData as any).id || (createData as any).id || '');
    return {
      target,
      status: 'ok',
      external_url: PROFILE_URLS[target],
      remote_id: mediaId,
      error_message: null,
      payload: { create: createData, publish: publishData },
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishTikTok = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'tiktok';
  try {
    const token = required('TIKTOK_ACCESS_TOKEN');
    const openId = required('TIKTOK_OPEN_ID');

    if (!post.video_url && !post.image_url) {
      throw new Error('TikTok requires video_url or image_url for publishing APIs.');
    }

    const sourceUrl = post.video_url || post.image_url;
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { ...jsonHeaders(token), 'TikTok-OpenId': openId },
      body: JSON.stringify({
        post_info: { title: truncate(postText(post), 150) },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: sourceUrl,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`TikTok publish init failed: ${JSON.stringify(data)}`);

    const publishId = String((data as any)?.data?.publish_id || (data as any)?.publish_id || '');
    return {
      target,
      status: 'ok',
      external_url: PROFILE_URLS[target],
      remote_id: publishId,
      error_message: null,
      payload: data as any,
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishX = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'x';
  try {
    const token = required('X_ACCESS_TOKEN_BEARER');
    const res = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ text: truncate(postText(post), 280) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`X publish failed: ${JSON.stringify(data)}`);
    const id = String((data as any)?.data?.id || '');
    return {
      target,
      status: 'ok',
      external_url: id ? `https://x.com/AGTA_Global/status/${id}` : PROFILE_URLS[target],
      remote_id: id,
      error_message: null,
      payload: data as any,
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishLinkedIn = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'linkedin';
  try {
    const token = required('LINKEDIN_ACCESS_TOKEN');
    const organizationUrn = required('LINKEDIN_ORGANIZATION_URN');

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        author: organizationUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: postText(post) },
            shareMediaCategory: post.image_url || post.video_url ? 'ARTICLE' : 'NONE',
            media: post.image_url || post.video_url
              ? [{ status: 'READY', originalUrl: post.video_url || post.image_url, title: { text: post.title } }]
              : undefined,
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`LinkedIn publish failed: ${text}`);
    return {
      target,
      status: 'ok',
      external_url: PROFILE_URLS[target],
      remote_id: text || '',
      error_message: null,
      payload: { raw: text },
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishYouTube = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'youtube';
  try {
    const token = required('YOUTUBE_ACCESS_TOKEN');
    if (!post.video_url) {
      throw new Error('YouTube API requires resumable upload (videos.insert) with file stream.');
    }

    const meRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json().catch(() => ({}));
    if (!meRes.ok) throw new Error(`YouTube token validation failed: ${JSON.stringify(meData)}`);

    throw new Error('YouTube auto-upload requires a dedicated upload worker (resumable session + binary upload).');
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishSnapchat = async (_post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'snapchat';
  return asFailed(target, 'Snapchat does not expose a standard public organic posting API for this direct flow.');
};

const publishPinterest = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'pinterest';
  try {
    const token = required('PINTEREST_ACCESS_TOKEN');
    const boardId = required('PINTEREST_BOARD_ID');
    if (!post.image_url) throw new Error('Pinterest API requires image_url.');

    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        board_id: boardId,
        title: truncate(post.title, 100),
        description: truncate(post.caption || post.title, 500),
        media_source: {
          source_type: 'image_url',
          url: post.image_url,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Pinterest publish failed: ${JSON.stringify(data)}`);

    return {
      target,
      status: 'ok',
      external_url: PROFILE_URLS[target],
      remote_id: String((data as any).id || ''),
      error_message: null,
      payload: data as any,
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishDiscord = async (post: NormalizedPost): Promise<PublishResult> => {
  const target: Target = 'discord';
  try {
    const webhook = required('DISCORD_WEBHOOK_URL');
    const res = await fetch(webhook, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        content: postText(post),
        embeds: [
          {
            title: post.title,
            description: truncate(post.caption || '', 2048),
            url: post.video_url || post.image_url || undefined,
            image: post.image_url ? { url: post.image_url } : undefined,
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord publish failed: ${text}`);
    }
    return {
      target,
      status: 'ok',
      external_url: PROFILE_URLS[target],
      remote_id: null,
      error_message: null,
      payload: { webhook_status: res.status },
    };
  } catch (error) {
    return asFailed(target, error);
  }
};

const publishers: Record<Target, (post: NormalizedPost) => Promise<PublishResult>> = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  tiktok: publishTikTok,
  x: publishX,
  linkedin: publishLinkedIn,
  youtube: publishYouTube,
  snapchat: publishSnapchat,
  pinterest: publishPinterest,
  discord: publishDiscord,
};

const getPostById = async (adminClient: ReturnType<typeof createClient>, postId: string | number) => {
  const { data, error } = await adminClient
    .from('posts')
    .select('id,title,caption,image_url,video_url,published_at')
    .eq('id', postId)
    .maybeSingle();
  if (error || !data) return null;
  return normalizePost(data as any);
};

const ensureJob = async (
  adminClient: ReturnType<typeof createClient>,
  postId: string | number,
  target: Target,
  maxAttempts = maxAttemptsFromEnv()
) => {
  const nowIso = new Date().toISOString();
  await adminClient.from('publication_jobs').upsert(
    {
      post_id: postId,
      platform_id: target,
      status: 'queued',
      max_attempts: maxAttempts,
      next_retry_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'post_id,platform_id' }
  );

  const { data } = await adminClient
    .from('publication_jobs')
    .select('*')
    .eq('post_id', postId)
    .eq('platform_id', target)
    .single();
  return data as any;
};

const logPublicationAttempt = async (
  adminClient: ReturnType<typeof createClient>,
  postId: string | number,
  target: Target,
  result: PublishResult,
  attemptCount: number,
  maxAttempts: number,
  nextRetryAt: string | null
) => {
  await adminClient.from('post_publications').insert([
    {
      post_id: postId,
      platform_id: target,
      status: result.status,
      external_url: result.external_url,
      remote_id: result.remote_id,
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
      next_retry_at: nextRetryAt,
      error_message: result.error_message,
      payload: result.payload,
      created_at: new Date().toISOString(),
    },
  ]);
};

const runAttempt = async (
  adminClient: ReturnType<typeof createClient>,
  post: NormalizedPost,
  target: Target,
  force = false
): Promise<PublishResult> => {
  const job = await ensureJob(adminClient, post.id, target);
  const nowIso = new Date().toISOString();
  const nextAllowed = job?.next_retry_at ? new Date(job.next_retry_at).getTime() : 0;
  const nowTs = Date.now();

  if (!force && nextAllowed > nowTs) {
    return {
      target,
      status: 'failed',
      external_url: PROFILE_URLS[target],
      remote_id: null,
      error_message: `Retry not due yet. Next attempt at ${job.next_retry_at}.`,
      payload: { skipped: true },
    };
  }

  const attemptCount = Number(job?.attempt_count || 0) + 1;
  const maxAttempts = Number(job?.max_attempts || maxAttemptsFromEnv());

  await adminClient
    .from('publication_jobs')
    .update({
      status: 'processing',
      attempt_count: attemptCount,
      last_attempt_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', job.id);

  const result = await publishers[target](post);

  if (result.status === 'ok') {
    await adminClient
      .from('publication_jobs')
      .update({
        status: 'ok',
        next_retry_at: null,
        last_error: null,
        last_external_url: result.external_url,
        last_payload: result.payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    await logPublicationAttempt(adminClient, post.id, target, result, attemptCount, maxAttempts, null);
    return result;
  }

  const hasMoreRetry = attemptCount < maxAttempts;
  const nextRetryAt = hasMoreRetry ? toIsoRetry(attemptCount) : null;
  const nextStatus = hasMoreRetry ? 'failed' : 'dead';

  await adminClient
    .from('publication_jobs')
    .update({
      status: nextStatus,
      next_retry_at: nextRetryAt,
      last_error: result.error_message,
      last_external_url: result.external_url,
      last_payload: result.payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  await logPublicationAttempt(adminClient, post.id, target, result, attemptCount, maxAttempts, nextRetryAt);
  return result;
};

const filterEnabledTargets = async (
  adminClient: ReturnType<typeof createClient>,
  targets: Target[]
): Promise<Target[]> => {
  if (targets.length === 0) return [];
  const { data: enabledPlatforms } = await adminClient
    .from('social_platforms')
    .select('id, enabled')
    .in('id', targets as string[]);

  const enabledSet = new Set(
    (enabledPlatforms || [])
      .filter((row: any) => row.enabled)
      .map((row: any) => String(row.id))
  );

  if (enabledSet.size === 0) return targets;
  return targets.filter((t) => enabledSet.has(t));
};

const processPublish = async (
  adminClient: ReturnType<typeof createClient>,
  post: NormalizedPost,
  targets: Target[],
  force = true
) => {
  const dedupedTargets = Array.from(new Set(targets)).filter((t) => t in publishers);
  const enabledTargets = await filterEnabledTargets(adminClient, dedupedTargets);
  const results: PublishResult[] = [];

  for (const target of enabledTargets) {
    const result = await runAttempt(adminClient, post, target, force);
    results.push(result);
  }

  return results;
};

const processRetryDue = async (
  adminClient: ReturnType<typeof createClient>,
  limit: number
): Promise<PublishResult[]> => {
  const nowIso = new Date().toISOString();
  const { data: jobs } = await adminClient
    .from('publication_jobs')
    .select('id, post_id, platform_id, status, next_retry_at, attempt_count, max_attempts')
    .in('status', ['queued', 'failed'])
    .lte('next_retry_at', nowIso)
    .lt('attempt_count', maxAttemptsFromEnv())
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  const rows = (jobs || []) as any[];
  if (rows.length === 0) return [];

  const results: PublishResult[] = [];
  for (const row of rows) {
    const post = await getPostById(adminClient, row.post_id);
    if (!post) continue;
    const target = String(row.platform_id) as Target;
    if (!(target in publishers)) continue;
    const result = await runAttempt(adminClient, post, target, true);
    results.push(result);
  }
  return results;
};

const processRetryPost = async (
  adminClient: ReturnType<typeof createClient>,
  postId: string | number,
  force: boolean
): Promise<PublishResult[]> => {
  const post = await getPostById(adminClient, postId);
  if (!post) return [];

  const { data: jobs } = await adminClient
    .from('publication_jobs')
    .select('platform_id, status')
    .eq('post_id', postId)
    .in('status', ['failed', 'dead', 'queued']);

  const targets = (jobs || [])
    .map((j: any) => String(j.platform_id) as Target)
    .filter((t: Target) => t in publishers);

  return processPublish(adminClient, post, targets, force);
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

  const expectedSecret = Deno.env.get('SOCIAL_PUBLISH_WEBHOOK_SECRET') || '';
  const incomingSecret = req.headers.get('x-social-secret') || '';
  if (expectedSecret && expectedSecret !== incomingSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized webhook' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = required('SUPABASE_URL');
    const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY');
    const adminClient = createClient(supabaseUrl, serviceRole);

    const body = (await req.json().catch(() => ({}))) as IncomingBody;
    const action = (body.action || 'publish') as Action;

    let results: PublishResult[] = [];

    if (action === 'retry_due') {
      const limit = Math.max(1, Math.min(Number(body.limit || 25), 100));
      results = await processRetryDue(adminClient, limit);
    } else if (action === 'retry_post') {
      const postId = String(body.post_id || body.post?.id || '');
      if (!postId) throw new Error('post_id is required for retry_post');
      results = await processRetryPost(adminClient, postId, Boolean(body.force ?? true));
    } else {
      const post = normalizePost(body.post);
      const targets = Array.isArray(body.targets) ? body.targets : [];
      results = await processPublish(adminClient, post, targets, true);
    }

    const okCount = results.filter((r) => r.status === 'ok').length;
    const failedCount = results.length - okCount;

    return new Response(JSON.stringify({ ok: failedCount === 0, results, okCount, failedCount, total: results.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
