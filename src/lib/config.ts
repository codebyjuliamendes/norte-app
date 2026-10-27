/**
 * Runtime configuration read from Vite env vars (inlined at build time).
 *
 * The Supabase anon key is a *publishable* key (it ships to every browser by design);
 * data isolation is enforced by Row Level Security in the database. It still belongs in
 * the environment, not in the source code, so each deploy can point to its own project.
 */
export interface AppConfig {
  supabaseUrl: string | null
  supabaseAnonKey: string | null
  /** True only when both values are present and well-formed. */
  isSupabaseConfigured: boolean
  /** Human-readable reasons why the cloud backend is disabled (empty when configured). */
  problems: string[]
}

type EnvLike = Record<string, string | boolean | undefined>

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseConfig(env: EnvLike): AppConfig {
  const supabaseUrl = clean(env.VITE_SUPABASE_URL)
  const supabaseAnonKey = clean(env.VITE_SUPABASE_ANON_KEY)
  const problems: string[] = []

  if (!supabaseUrl) {
    problems.push('VITE_SUPABASE_URL não definida')
  } else {
    try {
      const url = new URL(supabaseUrl)
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      if (url.protocol !== 'https:' && !(isLocalhost && url.protocol === 'http:')) {
        problems.push('VITE_SUPABASE_URL deve usar https://')
      }
    } catch {
      problems.push('VITE_SUPABASE_URL não é uma URL válida')
    }
  }

  if (!supabaseAnonKey) {
    problems.push('VITE_SUPABASE_ANON_KEY não definida')
  } else if (supabaseAnonKey.length < 20) {
    problems.push('VITE_SUPABASE_ANON_KEY parece inválida')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: problems.length === 0,
    problems,
  }
}

export const config: AppConfig = parseConfig(import.meta.env as unknown as EnvLike)
