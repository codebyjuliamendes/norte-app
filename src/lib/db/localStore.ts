/**
 * Per-user table cache in Web Storage.
 *
 * Keys are scoped by user id (`norte_db_<userId>_<table>`) so that two accounts on the same
 * browser never see each other's cached rows. Older versions used a shared key
 * (`norte_db_<table>`); rows from it are migrated lazily, keeping only the current user's.
 */
export type Row = Record<string, unknown> & { id?: string }

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const LOCAL_ID_PREFIX = 'loc-'

export function isLocalId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX)
}

export function newLocalId(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return LOCAL_ID_PREFIX + random
}

function safeParse(raw: string | null): Row[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed.filter((r) => r && typeof r === 'object') as Row[]) : null
  } catch {
    return null
  }
}

export class LocalStore {
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
  }

  private key(userId: string, table: string) {
    return `norte_db_${userId}_${table}`
  }

  read(userId: string, table: string): Row[] {
    if (!this.storage) return []
    try {
      const scoped = safeParse(this.storage.getItem(this.key(userId, table)))
      if (scoped) return scoped

      // Lazy migration from the legacy, non-scoped cache.
      const legacy = safeParse(this.storage.getItem(`norte_db_${table}`))
      if (!legacy) return []
      const mine = legacy.filter((row) => row.user_id === userId)
      const others = legacy.filter((row) => row.user_id !== userId)
      this.write(userId, table, mine)
      if (others.length > 0) {
        this.storage.setItem(`norte_db_${table}`, JSON.stringify(others))
      } else {
        this.storage.removeItem(`norte_db_${table}`)
      }
      return mine
    } catch {
      return []
    }
  }

  write(userId: string, table: string, rows: Row[]): boolean {
    if (!this.storage) return false
    try {
      this.storage.setItem(this.key(userId, table), JSON.stringify(rows))
      return true
    } catch (err) {
      console.error('[norte] falha ao gravar no armazenamento local', err)
      return false
    }
  }
}

export function browserStorage(): KeyValueStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__norte_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}
