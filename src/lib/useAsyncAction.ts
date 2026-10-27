import { useCallback, useRef, useState } from 'react'
import type { QueryResult } from './db/dataClient'

/**
 * Runs an async action at most once at a time (prevents double submits) and keeps an
 * error message for the UI. The action may return an error string to signal failure.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const run = useCallback(async (action: () => Promise<string | null | void>): Promise<boolean> => {
    if (inFlight.current) return false
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      const failure = await action()
      if (failure) {
        setError(failure)
        return false
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.')
      return false
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }, [])

  return { pending, error, setError, run }
}

/** Awaits a data query and returns its error message (or null on success). */
export async function errorOf(query: PromiseLike<QueryResult<unknown>>): Promise<string | null> {
  const { error } = await query
  return error ? error.message : null
}
