import { describe, expect, it } from 'vitest'
import { parseConfig } from './config'

const KEY = 'eyJhbGciOiJIUzI1NiJ9.test-anon-key-placeholder'

describe('parseConfig', () => {
  it('enables Supabase only with a valid https URL and a key', () => {
    const cfg = parseConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: KEY })
    expect(cfg.isSupabaseConfigured).toBe(true)
    expect(cfg.problems).toEqual([])
  })

  it('falls back to local mode when variables are missing or blank', () => {
    expect(parseConfig({}).isSupabaseConfigured).toBe(false)
    const blank = parseConfig({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: '' })
    expect(blank.isSupabaseConfigured).toBe(false)
    expect(blank.problems).toHaveLength(2)
  })

  it('rejects malformed or insecure URLs', () => {
    expect(parseConfig({ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_ANON_KEY: KEY }).problems[0]).toMatch(/válida/)
    expect(parseConfig({ VITE_SUPABASE_URL: 'http://abc.supabase.co', VITE_SUPABASE_ANON_KEY: KEY }).problems[0]).toMatch(/https/)
    // Local Supabase CLI over http is allowed.
    expect(parseConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: KEY }).isSupabaseConfigured).toBe(
      true,
    )
  })

  it('rejects an obviously truncated key', () => {
    expect(
      parseConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'short' }).isSupabaseConfigured,
    ).toBe(false)
  })
})
