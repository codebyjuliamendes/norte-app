import { LocalStore, isLocalId, newLocalId, type Row } from './localStore'
import type { SyncStatusStore } from './syncStatus'

/**
 * Offline-tolerant data client with a Supabase-like query API
 * (`from(table).select().eq().order()`, `insert().select()`, `update().eq()`, `delete().eq()`).
 *
 * - With a remote (Supabase) client, every call goes to the server first. Successful results
 *   refresh a per-user local cache. If the call fails (offline, missing table/column, RLS),
 *   the operation is applied to the local cache instead and the table is flagged as
 *   "degraded" so the UI can tell the user that some data only lives on this device.
 * - Rows created while degraded get a `loc-` id. On the next successful `select` of that
 *   table they are pushed to the server (best effort) and replaced by the server rows.
 * - Without a remote client (no env configured) the cache *is* the database.
 */

export interface QueryError {
  message: string
}

export interface QueryResult<T = Row> {
  data: T[] | null
  error: QueryError | null
}

interface RemoteResponse {
  data: unknown
  error: { message?: string } | null
}

/** Minimal surface of the Supabase PostgREST builder used here (eases testing). */
export interface RemoteLike {
  from(table: string): any
}

interface Filter {
  column: string
  value: unknown
}

type Action = 'select' | 'insert' | 'update' | 'delete'

/** Metadata kept on rows that exist only locally, so they can be pushed later. */
const LOCAL_META = '__local'

interface DataClientOptions {
  remote: RemoteLike | null
  store: LocalStore
  status: SyncStatusStore
  getUserId: () => string | null
}

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => row[f.column] === f.value)
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1 // nulls last
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function referencesLocalRow(payload: Row): boolean {
  return Object.values(payload).some(isLocalId)
}

function stripMeta(row: Row): Row {
  if (!(LOCAL_META in row)) return row
  const { [LOCAL_META]: _meta, ...rest } = row
  return rest
}

export class DataClient {
  readonly remote: RemoteLike | null
  readonly store: LocalStore
  readonly status: SyncStatusStore
  readonly getUserId: () => string | null
  private pushing = new Map<string, Promise<void>>()

  constructor(options: DataClientOptions) {
    this.remote = options.remote
    this.store = options.store
    this.status = options.status
    this.getUserId = options.getUserId
  }

  from(table: string) {
    return new TableQuery(this, table)
  }

  /** @internal */
  async run(table: string, action: Action, query: QueryState): Promise<QueryResult> {
    const userId = this.getUserId()
    if (!userId) return { data: null, error: { message: 'Sessão expirada. Entre novamente.' } }

    const rows =
      action === 'insert'
        ? (Array.isArray(query.payload) ? query.payload : [query.payload]).map((r) => ({
            ...(r as Row),
            user_id: (r as Row).user_id ?? userId,
          }))
        : []

    const touchesLocalRow = query.filters.some((f) => isLocalId(f.value))

    if (this.remote && !touchesLocalRow) {
      try {
        const response = await this.runRemote(table, action, query, rows, userId)
        if (!response.error) {
          const data = Array.isArray(response.data) ? (response.data as Row[]) : []
          this.status.markHealthy(table)
          const merged = this.refreshCache(userId, table, action, query, data)
          return { data: merged, error: null }
        }
        this.status.markDegraded(table, response.error.message || 'erro desconhecido')
        console.warn(`[norte] Supabase falhou em "${table}" (${action}); usando cache local.`, response.error)
      } catch (err) {
        this.status.markDegraded(table, err instanceof Error ? err.message : String(err))
        console.warn(`[norte] Supabase indisponível em "${table}" (${action}); usando cache local.`, err)
      }
    }

    return this.runLocal(userId, table, action, query, rows)
  }

  private runRemote(table: string, action: Action, query: QueryState, rows: Row[], userId: string): Promise<RemoteResponse> {
    let q = this.remote!.from(table)
    if (action === 'select') q = q.select(query.columns || '*').eq('user_id', userId)
    else if (action === 'insert') q = q.insert(rows)
    else if (action === 'update') q = q.update(query.payload)
    else q = q.delete()

    for (const f of query.filters) q = q.eq(f.column, f.value)
    if (action !== 'select') q = q.select()
    if (query.order) q = q.order(query.order.column, { ascending: query.order.ascending })
    return q
  }

  private refreshCache(userId: string, table: string, action: Action, query: QueryState, data: Row[]): Row[] {
    const cache = this.store.read(userId, table)

    if (action === 'select') {
      const unsynced = cache.filter((r) => isLocalId(r.id))
      const merged = this.sort([...data, ...unsynced], query)
      this.store.write(userId, table, merged)
      if (unsynced.length > 0) void this.pushUnsynced(userId, table)
      return merged.map(stripMeta)
    }

    const byId = new Map(data.map((r) => [r.id, r]))
    if (action === 'insert') {
      this.store.write(userId, table, [...cache.filter((r) => !byId.has(r.id)), ...data])
    } else if (action === 'update') {
      this.store.write(
        userId,
        table,
        cache.map((r) => (byId.has(r.id) ? { ...r, ...byId.get(r.id) } : r)),
      )
    } else {
      this.store.write(
        userId,
        table,
        cache.filter((r) => !byId.has(r.id) && !(query.filters.length > 0 && matches(r, query.filters))),
      )
    }
    return data
  }

  /** Best-effort upload of rows created while the table was unreachable. */
  pushUnsynced(userId: string, table: string): Promise<void> {
    const inFlight = this.pushing.get(table)
    if (inFlight) return inFlight

    const task = (async () => {
      if (!this.remote) return
      const pending = this.store.read(userId, table).filter((r) => isLocalId(r.id))
      for (const row of pending) {
        const meta = row[LOCAL_META] as { payload?: Row } | undefined
        const payload = meta?.payload
        if (!payload || referencesLocalRow(payload)) continue
        try {
          const { data, error } = (await this.remote.from(table).insert(payload).select()) as RemoteResponse
          if (error || !Array.isArray(data) || data.length === 0) break
          const latest = this.store.read(userId, table)
          this.store.write(
            userId,
            table,
            latest.map((r) => (r.id === row.id ? (data[0] as Row) : r)),
          )
        } catch {
          break
        }
      }
    })().finally(() => this.pushing.delete(table))

    this.pushing.set(table, task)
    return task
  }

  private runLocal(userId: string, table: string, action: Action, query: QueryState, rows: Row[]): QueryResult {
    const cache = this.store.read(userId, table)
    const now = new Date().toISOString()

    if (action === 'select') {
      return {
        data: this.sort(
          cache.filter((r) => matches(r, query.filters)),
          query,
        ).map(stripMeta),
        error: null,
      }
    }

    if (action === 'insert') {
      const created = rows.map((payload) => ({
        created_at: now,
        updated_at: now,
        ...payload,
        id: newLocalId(),
        [LOCAL_META]: { payload },
      }))
      if (!this.store.write(userId, table, [...cache, ...created])) {
        return { data: null, error: { message: 'Não foi possível salvar: armazenamento local indisponível.' } }
      }
      return { data: created.map(stripMeta), error: null }
    }

    if (query.filters.length === 0) {
      return { data: null, error: { message: 'Operação sem filtro bloqueada por segurança.' } }
    }

    if (action === 'update') {
      const patch = (query.payload ?? {}) as Row
      const affected: Row[] = []
      const next = cache.map((r) => {
        if (!matches(r, query.filters)) return r
        const meta = r[LOCAL_META] as { payload?: Row } | undefined
        const updated: Row = { ...r, ...patch }
        if (meta?.payload) updated[LOCAL_META] = { payload: { ...meta.payload, ...patch } }
        if ('updated_at' in r) updated.updated_at = now
        affected.push(updated)
        return updated
      })
      if (!this.store.write(userId, table, next)) {
        return { data: null, error: { message: 'Não foi possível salvar: armazenamento local indisponível.' } }
      }
      return { data: affected.map(stripMeta), error: null }
    }

    const removed = cache.filter((r) => matches(r, query.filters))
    if (
      !this.store.write(
        userId,
        table,
        cache.filter((r) => !matches(r, query.filters)),
      )
    ) {
      return { data: null, error: { message: 'Não foi possível excluir: armazenamento local indisponível.' } }
    }
    return { data: removed.map(stripMeta), error: null }
  }

  private sort(rows: Row[], query: QueryState): Row[] {
    if (!query.order) return rows
    const { column, ascending } = query.order
    return [...rows].sort((a, b) => compareValues(a[column], b[column]) * (ascending ? 1 : -1))
  }
}

interface QueryState {
  columns?: string
  payload?: unknown
  filters: Filter[]
  order?: { column: string; ascending: boolean }
}

class TableQuery {
  private readonly client: DataClient
  private readonly table: string

  constructor(client: DataClient, table: string) {
    this.client = client
    this.table = table
  }

  select(columns?: string) {
    return new QueryExec(this.client, this.table, 'select', { columns, filters: [] })
  }

  insert(payload: Row | Row[]) {
    return new QueryExec(this.client, this.table, 'insert', { payload, filters: [] })
  }

  update(payload: Row) {
    return new QueryExec(this.client, this.table, 'update', { payload, filters: [] })
  }

  delete() {
    return new QueryExec(this.client, this.table, 'delete', { filters: [] })
  }
}

class QueryExec implements PromiseLike<QueryResult<any>> {
  private readonly client: DataClient
  private readonly table: string
  private readonly action: Action
  private readonly state: QueryState

  constructor(client: DataClient, table: string, action: Action, state: QueryState) {
    this.client = client
    this.table = table
    this.action = action
    this.state = state
  }

  eq(column: string, value: unknown) {
    this.state.filters.push({ column, value })
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.state.order = { column, ascending: opts?.ascending ?? true }
    return this
  }

  /** Mutations always return the affected rows; kept for API compatibility. */
  select(_columns?: string) {
    return this
  }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.client.run(this.table, this.action, this.state).then(onfulfilled, onrejected)
  }
}
