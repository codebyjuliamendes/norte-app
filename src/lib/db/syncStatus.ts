/**
 * Tiny observable store describing where the user's data currently lives.
 * Consumed by the UI through `useSyncStatus` (useSyncExternalStore).
 */
export interface SyncStatus {
  /** `cloud` = Supabase configured; `local` = browser-only mode. */
  mode: 'cloud' | 'local'
  /** Tables whose last operation fell back to the local cache, with the reason. */
  degraded: Record<string, string>
}

type Listener = () => void

export class SyncStatusStore {
  private state: SyncStatus
  private listeners = new Set<Listener>()

  constructor(mode: SyncStatus['mode']) {
    this.state = { mode, degraded: {} }
  }

  get = (): SyncStatus => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  markDegraded(table: string, reason: string) {
    if (this.state.degraded[table] === reason) return
    this.state = { ...this.state, degraded: { ...this.state.degraded, [table]: reason } }
    this.emit()
  }

  markHealthy(table: string) {
    if (!(table in this.state.degraded)) return
    const { [table]: _removed, ...rest } = this.state.degraded
    this.state = { ...this.state, degraded: rest }
    this.emit()
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }
}
