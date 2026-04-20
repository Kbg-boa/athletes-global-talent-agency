type LoginGuardEntry = {
  failures: number;
  lastFailureAt: number;
  lockUntil?: number;
};

type LoginGuardStore = Record<string, LoginGuardEntry>;

const LOGIN_GUARD_STORAGE_KEY = 'agta-login-guard-v1';
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

const ALLOWED_QUERY_PARAMS = new Set([
  'role',
  'code',
  'type',
  'token_hash',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'error',
  'error_code',
  'error_description',
]);

function normalizeIdentity(identity: string) {
  return identity.trim().toLowerCase();
}

function readGuardStore(): LoginGuardStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOGIN_GUARD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeGuardStore(store: LoginGuardStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOGIN_GUARD_STORAGE_KEY, JSON.stringify(store));
}

export function getLoginGuardState(identity: string) {
  const key = normalizeIdentity(identity);
  const store = readGuardStore();
  const entry = store[key];

  if (!entry) {
    return {
      blocked: false,
      remainingMs: 0,
      failures: 0,
      remainingAttempts: LOGIN_MAX_FAILURES,
    };
  }

  const now = Date.now();
  const lockUntil = Number(entry.lockUntil || 0);
  const blocked = lockUntil > now;
  const remainingMs = blocked ? lockUntil - now : 0;
  const failures = Math.max(0, Number(entry.failures || 0));

  return {
    blocked,
    remainingMs,
    failures,
    remainingAttempts: Math.max(0, LOGIN_MAX_FAILURES - failures),
  };
}

export function registerLoginFailure(identity: string) {
  const key = normalizeIdentity(identity);
  const store = readGuardStore();
  const prev = store[key] || { failures: 0, lastFailureAt: 0 };
  const now = Date.now();
  const failures = Number(prev.failures || 0) + 1;

  const next: LoginGuardEntry = {
    failures,
    lastFailureAt: now,
    lockUntil: failures >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCK_MS : prev.lockUntil,
  };

  store[key] = next;
  writeGuardStore(store);
  return getLoginGuardState(identity);
}

export function registerLoginSuccess(identity: string) {
  const key = normalizeIdentity(identity);
  const store = readGuardStore();
  if (store[key]) {
    delete store[key];
    writeGuardStore(store);
  }
}

export function randomAuthDelay() {
  const ms = 650 + Math.floor(Math.random() * 550);
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function sanitizeUrlAtBoot() {
  if (typeof window === 'undefined') return;

  try {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      window.top?.location.replace(window.location.href);
    }
  } catch {
    // If frame busting is blocked by browser policy, continue safely.
  }

  const hrefLower = window.location.href.toLowerCase();
  const suspicious = [
    'javascript:',
    '<script',
    '%3cscript',
    'data:text/html',
    'vbscript:',
  ];

  if (suspicious.some((token) => hrefLower.includes(token))) {
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (ALLOWED_QUERY_PARAMS.has(key)) {
      kept.set(key, value);
    }
  });

  const safeSearch = kept.toString();
  const safeUrl = `${window.location.pathname}${safeSearch ? `?${safeSearch}` : ''}${window.location.hash}`;
  if (safeUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState({}, '', safeUrl);
  }

  try {
    if (window.opener) {
      window.opener = null;
    }
  } catch {
    // Ignore browser restrictions.
  }
}

export function formatRemainingMinutes(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes}`;
}
