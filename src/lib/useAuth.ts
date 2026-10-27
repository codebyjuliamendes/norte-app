import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { setActiveUserId, supabase, syncStatus } from './supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const apply = (next: Session | null) => {
      setActiveUserId(next?.user?.id ?? null)
      setSession(next)
    }

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }: { data: { session: Session | null }; error: { message: string } | null }) => {
        if (!active) return
        if (sessionError) setError(sessionError.message)
        apply(data.session)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Falha ao recuperar a sessão.')
        apply(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, next: Session | null) => {
      if (active) apply(next)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, loading, error, user: session?.user ?? null }
}

export function useSyncStatus() {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.get, syncStatus.get)
}
