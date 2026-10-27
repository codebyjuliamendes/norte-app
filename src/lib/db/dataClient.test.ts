import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataClient, type RemoteLike } from './dataClient'
import { LocalStore, isLocalId, type KeyValueStorage } from './localStore'
import { SyncStatusStore } from './syncStatus'
import { LocalAuth } from './localAuth'

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>()
  getItem = (k: string) => this.map.get(k) ?? null
  setItem = (k: string, v: string) => void this.map.set(k, v)
  removeItem = (k: string) => void this.map.delete(k)
}

type Handler = (call: { table: string; ops: [string, unknown[]][] }) => { data: unknown; error: { message: string } | null }

/** Chainable fake of the PostgREST builder that records every call. */
function fakeRemote(handler: Handler) {
  const calls: { table: string; ops: [string, unknown[]][] }[] = []
  const remote: RemoteLike = {
    from(table: string) {
      const call = { table, ops: [] as [string, unknown[]][] }
      calls.push(call)
      const builder: Record<string, unknown> = {}
      for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
        builder[op] = (...args: unknown[]) => {
          call.ops.push([op, args])
          return builder
        }
      }
      builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        try {
          return Promise.resolve(handler(call)).then(resolve, reject)
        } catch (err) {
          return Promise.reject(err).then(resolve, reject)
        }
      }
      return builder
    },
  }
  return { remote, calls }
}

function setup(remote: RemoteLike | null, userId: string | null = 'user-a') {
  const storage = new MemoryStorage()
  const status = new SyncStatusStore(remote ? 'cloud' : 'local')
  let current = userId
  const client = new DataClient({ remote, store: new LocalStore(storage), status, getUserId: () => current })
  return { client, storage, status, setUser: (id: string | null) => (current = id) }
}

describe('DataClient — local mode', () => {
  it('supports insert/select/update/delete with filters and ordering', async () => {
    const { client } = setup(null)
    const { data: inserted } = await client.from('tasks').insert({ title: 'B', due_date: '2026-01-02' }).select()
    await client.from('tasks').insert({ title: 'A', due_date: '2026-01-01' })
    expect(inserted?.[0].id).toMatch(/^loc-/)
    expect(inserted?.[0].user_id).toBe('user-a') // user_id filled in automatically

    const { data: ordered } = await client.from('tasks').select('*').order('due_date', { ascending: true })
    expect(ordered?.map((t) => t.title)).toEqual(['A', 'B'])
    expect(ordered?.[0]).not.toHaveProperty('__local')

    await client.from('tasks').update({ done: true }).eq('id', inserted![0].id)
    const { data: done } = await client.from('tasks').select().eq('done', true)
    expect(done?.map((t) => t.title)).toEqual(['B'])

    await client.from('tasks').delete().eq('id', inserted![0].id)
    expect((await client.from('tasks').select()).data).toHaveLength(1)
  })

  it('applies every .eq() filter (not only the last one)', async () => {
    const { client } = setup(null)
    await client.from('rag').insert([
      { source_id: 's1', kind: 'a' },
      { source_id: 's1', kind: 'b' },
    ])
    await client.from('rag').delete().eq('source_id', 's1').eq('kind', 'a')
    expect((await client.from('rag').select()).data?.map((r) => r.kind)).toEqual(['b'])
  })

  it('refuses unfiltered update/delete', async () => {
    const { client } = setup(null)
    await client.from('tasks').insert({ title: 'x' })
    const { error } = await client.from('tasks').delete()
    expect(error?.message).toMatch(/sem filtro/)
    expect((await client.from('tasks').select()).data).toHaveLength(1)
  })

  it('isolates cached data per user', async () => {
    const { client, setUser } = setup(null)
    await client.from('notes').insert({ title: 'Segredo da A' })
    setUser('user-b')
    expect((await client.from('notes').select()).data).toEqual([])
  })

  it('migrates only the current user rows from the legacy shared cache', async () => {
    const { client, storage } = setup(null)
    storage.setItem(
      'norte_db_tasks',
      JSON.stringify([
        { id: 'loc-1', user_id: 'user-a', title: 'minha' },
        { id: 'loc-2', user_id: 'user-b', title: 'de outra pessoa' },
      ]),
    )
    const { data } = await client.from('tasks').select()
    expect(data?.map((r) => r.title)).toEqual(['minha'])
    expect(JSON.parse(storage.getItem('norte_db_tasks')!)).toHaveLength(1)
  })

  it('requires a session', async () => {
    const { client } = setup(null, null)
    expect((await client.from('tasks').select()).error?.message).toMatch(/Sessão/)
  })
})

describe('DataClient — with Supabase', () => {
  let serverRows: Record<string, unknown>[]

  beforeEach(() => {
    serverRows = [{ id: 'srv-1', user_id: 'user-a', title: 'do servidor' }]
  })

  it('reads from the server, scopes by user and caches the result', async () => {
    const { remote, calls } = fakeRemote(() => ({ data: serverRows, error: null }))
    const { client, storage } = setup(remote)
    const { data } = await client.from('tasks').select('*').order('created_at', { ascending: true })
    expect(data).toEqual(serverRows)
    expect(calls[0].ops).toContainEqual(['eq', ['user_id', 'user-a']])
    expect(JSON.parse(storage.getItem('norte_db_user-a_tasks')!)).toHaveLength(1)
  })

  it('treats a successful mutation with no returned rows as success (no silent local write)', async () => {
    const { remote } = fakeRemote(() => ({ data: null, error: null }))
    const { client, status } = setup(remote)
    const res = await client.from('tasks').update({ done: true }).eq('id', 'srv-1')
    expect(res.error).toBeNull()
    expect(status.get().degraded).toEqual({})
  })

  it('falls back to the local cache when the server fails and flags the table', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { remote } = fakeRemote(() => ({ data: null, error: { message: 'Failed to fetch' } }))
    const { client, status } = setup(remote)
    const { data, error } = await client.from('tasks').insert({ title: 'offline' }).select()
    expect(error).toBeNull()
    expect(isLocalId(data?.[0].id)).toBe(true)
    expect(status.get().degraded.tasks).toBe('Failed to fetch')
    expect(warn).toHaveBeenCalled()
  })

  it('keeps unsynced rows after a successful refresh and pushes them to the server', async () => {
    let online = false
    const inserted: unknown[] = []
    const { remote } = fakeRemote((call) => {
      if (!online) return { data: null, error: { message: 'offline' } }
      const op = call.ops[0][0]
      if (op === 'insert') {
        inserted.push(call.ops[0][1][0])
        return { data: [{ id: 'srv-2', user_id: 'user-a', title: 'offline' }], error: null }
      }
      return { data: serverRows, error: null }
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client, status } = setup(remote)

    await client.from('tasks').insert({ title: 'offline' })
    online = true
    const { data } = await client.from('tasks').select()
    // Regression: a refresh used to overwrite the cache and lose rows created offline.
    expect(data?.map((r) => r.title).sort()).toEqual(['do servidor', 'offline'])
    expect(status.get().degraded).toEqual({})

    await client.pushUnsynced('user-a', 'tasks')
    expect(inserted).toEqual([{ title: 'offline', user_id: 'user-a' }]) // original payload only
    serverRows.push({ id: 'srv-2', user_id: 'user-a', title: 'offline' })
    const after = await client.from('tasks').select()
    expect(after.data?.map((r) => r.id).sort()).toEqual(['srv-1', 'srv-2'])
  })

  it('never sends local ids to the server', async () => {
    const { remote, calls } = fakeRemote(() => ({ data: [], error: null }))
    const { client } = setup(remote)
    await client.from('tasks').update({ done: true }).eq('id', 'loc-abc')
    expect(calls).toHaveLength(0)
  })
})

describe('LocalAuth', () => {
  it('creates, persists, updates and clears a local session', async () => {
    const storage = new MemoryStorage()
    const auth = new LocalAuth(storage)
    const events: string[] = []
    auth.onAuthStateChange((event) => events.push(event))

    expect((await auth.getSession()).data.session).toBeNull()
    await auth.signInLocal()
    expect((await new LocalAuth(storage).getSession()).data.session?.user.id).toBe('local-user')

    await auth.updateUser({ data: { name: 'Júlia' } })
    expect((await auth.getSession()).data.session?.user.user_metadata.name).toBe('Júlia')

    await auth.signOut()
    expect((await auth.getSession()).data.session).toBeNull()
    expect(events).toEqual(['SIGNED_IN', 'USER_UPDATED', 'SIGNED_OUT'])
  })

  it('reports that cloud login is unavailable', async () => {
    const { error } = await new LocalAuth(new MemoryStorage()).signInWithPassword({})
    expect(error?.message).toMatch(/não configurada/)
  })
})
