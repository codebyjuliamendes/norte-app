import type { KeyValueStorage } from './localStore'

/**
 * Browser-only "account" used when Supabase is not configured. It mimics the small part of
 * the `supabase.auth` API the app relies on, so the rest of the UI does not need to branch.
 */
export interface LocalUser {
  id: string
  email: string | null
  phone: string | null
  user_metadata: Record<string, unknown>
  is_local: true
}

export interface LocalSession {
  user: LocalUser
  access_token: 'local'
}

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED'
type Listener = (event: AuthEvent, session: LocalSession | null) => void

const SESSION_KEY = 'norte_local_session'
export const LOCAL_USER_ID = 'local-user'

const notConfigured = {
  message: 'Sincronização em nuvem não configurada neste ambiente. Use o modo local.',
}

export class LocalAuth {
  private readonly storage: KeyValueStorage | null
  private listeners = new Set<Listener>()

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
  }

  private readSession(): LocalSession | null {
    try {
      const raw = this.storage?.getItem(SESSION_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as LocalSession
      return parsed?.user?.id ? parsed : null
    } catch {
      return null
    }
  }

  private writeSession(session: LocalSession | null) {
    try {
      if (session) this.storage?.setItem(SESSION_KEY, JSON.stringify(session))
      else this.storage?.removeItem(SESSION_KEY)
    } catch {
      /* storage unavailable: session lives only in memory for this tab */
    }
  }

  private emit(event: AuthEvent, session: LocalSession | null) {
    for (const l of this.listeners) l(event, session)
  }

  async getSession() {
    return { data: { session: this.readSession() }, error: null }
  }

  onAuthStateChange(callback: Listener) {
    this.listeners.add(callback)
    return { data: { subscription: { unsubscribe: () => this.listeners.delete(callback) } } }
  }

  async signInLocal() {
    const session: LocalSession = this.readSession() ?? {
      access_token: 'local',
      user: { id: LOCAL_USER_ID, email: null, phone: null, user_metadata: {}, is_local: true },
    }
    this.writeSession(session)
    this.emit('SIGNED_IN', session)
    return { data: { session }, error: null }
  }

  async signOut() {
    this.writeSession(null)
    this.emit('SIGNED_OUT', null)
    return { error: null }
  }

  async updateUser({ data }: { data: Record<string, unknown> }) {
    const session = this.readSession()
    if (!session) return { data: { user: null }, error: { message: 'Sessão local não encontrada.' } }
    const next: LocalSession = {
      ...session,
      user: { ...session.user, user_metadata: { ...session.user.user_metadata, ...data } },
    }
    this.writeSession(next)
    this.emit('USER_UPDATED', next)
    return { data: { user: next.user }, error: null }
  }

  async signInWithPassword(_: unknown) {
    return { data: { session: null, user: null }, error: notConfigured }
  }

  async signUp(_: unknown) {
    return { data: { session: null, user: null }, error: notConfigured }
  }

  async signInWithOtp(_: unknown) {
    return { data: { session: null, user: null }, error: notConfigured }
  }

  async verifyOtp(_: unknown) {
    return { data: { session: null, user: null }, error: notConfigured }
  }
}
