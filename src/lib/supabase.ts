import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from './config'
import { DataClient } from './db/dataClient'
import { LocalAuth } from './db/localAuth'
import { LocalStore, browserStorage } from './db/localStore'
import { SyncStatusStore } from './db/syncStatus'

export type * from './types'

export const isSupabaseConfigured = config.isSupabaseConfigured

if (!isSupabaseConfigured && import.meta.env.PROD) {
  console.warn(
    `[norte] Supabase não configurado (${config.problems.join('; ')}). O app está em modo local: os dados ficam apenas neste navegador.`,
  )
}

/** The real Supabase client, or null in local mode. */
export const realSupabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(config.supabaseUrl!, config.supabaseAnonKey!)
  : null

const storage = browserStorage()
export const localAuth = new LocalAuth(storage)
export const syncStatus = new SyncStatusStore(isSupabaseConfigured ? 'cloud' : 'local')

let activeUserId: string | null = null
/** Called by `useAuth` whenever the session changes; scopes all data access to that user. */
export function setActiveUserId(id: string | null) {
  activeUserId = id
}

export const db = new DataClient({
  remote: realSupabase,
  store: new LocalStore(storage),
  status: syncStatus,
  getUserId: () => activeUserId,
})

/**
 * Facade used across the app: `supabase.auth` (real or local) and `supabase.from(table)`.
 * Typed loosely on `auth` because the local implementation only covers what the UI uses.
 */
export const supabase = {
  auth: (realSupabase?.auth ?? localAuth) as any,
  from: (table: string) => db.from(table),
}
