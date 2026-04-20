import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure your .env file before starting AGTA.')
}

type SupabaseClientPair = {
  dg: any
  staff: any
}

const globalSupabase = globalThis as typeof globalThis & {
  __agtaSupabaseClients?: SupabaseClientPair
}

/**
 * Simple in-memory mutex to replace navigator.locks for each client.
 * Avoids the "lock not released within 5000ms" warnings that occur when
 * two Supabase auth clients compete for Web Locks on visibility changes.
 */
function makeLock() {
  let queue: Array<() => void> = []
  let locked = false

  return async function lock<T>(
    _name: string,
    timeoutOrFn: number | (() => Promise<T>),
    maybeFn?: () => Promise<T>
  ): Promise<T> {
    const fn = typeof timeoutOrFn === 'function' ? timeoutOrFn : maybeFn
    if (typeof fn !== 'function') {
      throw new TypeError('Supabase auth lock callback is missing')
    }

    if (locked) {
      await new Promise<void>((resolve) => queue.push(resolve))
    }
    locked = true
    try {
      return await fn()
    } finally {
      const next = queue.shift()
      if (next) {
        next()
      } else {
        locked = false
      }
    }
  }
}

const createAuthClient = (storageKey: string) => {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey,
      persistSession: true,
      autoRefreshToken: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
      lock: makeLock(),
    },
  })

  // Auto-refresh: when token is about to expire or has expired, force refresh
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange(async (event) => {
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'SIGNED_OUT') return
      // For other events where session might be stale, attempt silent refresh
    })
  }

  return client
}

const clients: SupabaseClientPair = globalSupabase.__agtaSupabaseClients || {
  dg: createAuthClient('agta-dg-auth'),
  staff: createAuthClient('agta-staff-auth'),
}

if (!globalSupabase.__agtaSupabaseClients) {
  globalSupabase.__agtaSupabaseClients = clients
}

/**
 * Client DG — session isolée dans localStorage sous 'agta-dg-auth'
 * Utilisé exclusivement par AdminLogin, AdminDashboard, ProtectedDGRoute
 */
export const supabaseDG = clients.dg

/**
 * Client Staff — session isolée dans localStorage sous 'agta-staff-auth'
 * Utilisé exclusivement par Login, StaffDashboard, ProtectedStaffRoute
 */
export const supabaseStaff = clients.staff

/**
 * Client générique — garde la compatibilité pour les composants partagés
 * qui détectent eux-mêmes quel client utiliser via getActiveSupabaseClient()
 */
export const supabase = supabaseDG

/**
 * Exécute un callback Supabase en gérant le JWT expiré :
 * si l'erreur code est PGRST303 (JWT expired) ou status 401/403,
 * tente un refresh de session puis renouvelle l'appel une seule fois.
 *
 * Usage: const data = await withSessionRefresh(supabaseStaff, () => supabaseStaff.from('athletes').select('*'))
 */
export async function withSessionRefresh<T>(
  client: any,
  fn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  const result = await fn()
  if (!result.error) return result

  const code = String(result.error?.code || '')
  const status = Number(result.error?.status || 0)
  const isExpired = code === 'PGRST303' || status === 401 || status === 403

  if (isExpired) {
    const { error: refreshError } = await client.auth.refreshSession()
    if (refreshError) return result // refresh failed, return original error
    return fn() // retry once after refresh
  }

  return result
}

/**
 * Retourne le bon client selon la page active
 */
export function getActiveSupabaseClient() {
  if (typeof window === 'undefined') return supabaseDG
  const path = window.location.pathname
  if (
    path.startsWith('/staff') ||
    path.startsWith('/admin/staff') ||
    path.startsWith('/login/staff')
  ) {
    return supabaseStaff
  }
  return supabaseDG
}