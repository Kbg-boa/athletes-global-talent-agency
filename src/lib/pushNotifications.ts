import type { SupabaseClient } from '@supabase/supabase-js';

type PushRole = 'staff' | 'dg';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export async function enableDevicePush(
  supabase: SupabaseClient,
  userEmail: string,
  role: PushRole
): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'not-browser' };
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'sw-unsupported' };
  if (!('PushManager' in window)) return { ok: false, reason: 'push-unsupported' };
  if (!('Notification' in window)) return { ok: false, reason: 'notification-unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'missing-vapid-public-key' };

  const pushEnabledPref = localStorage.getItem('agta_push_enabled');
  if (pushEnabledPref === '0') return { ok: false, reason: 'push-disabled-by-user' };

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const rawVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const vapidKey = new Uint8Array(rawVapidKey);
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    }));

  const locale = (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';

  const { error } = await supabase.functions.invoke('push-subscriptions', {
    body: {
      action: 'subscribe',
      role,
      userEmail,
      subscription,
      userAgent: navigator.userAgent,
      locale,
    },
  });

  if (error) {
    return { ok: false, reason: error.message || 'subscribe-failed' };
  }

  localStorage.setItem('agta_push_enabled', '1');
  return { ok: true };
}

export async function disableDevicePush(supabase: SupabaseClient): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await supabase.functions.invoke('push-subscriptions', {
    body: {
      action: 'unsubscribe',
      endpoint: subscription.endpoint,
    },
  });

  await subscription.unsubscribe();
  localStorage.setItem('agta_push_enabled', '0');
}
