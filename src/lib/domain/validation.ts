/** Input limits applied in the UI (and mirrored as CHECK constraints in supabase-schema.sql). */
export const LIMITS = {
  title: 200,
  noteContent: 10_000,
  journalShort: 300,
  journalReflection: 5_000,
  unit: 20,
  avatarUrl: 500,
  displayName: 60,
} as const

export function validateTitle(value: string, label = 'O título', max: number = LIMITS.title): string | null {
  const trimmed = value.trim()
  if (!trimmed) return `${label} não pode ficar vazio.`
  if (trimmed.length > max) return `${label} pode ter no máximo ${max} caracteres.`
  return null
}

export function validateMaxLength(value: string, label: string, max: number): string | null {
  return value.length > max ? `${label} pode ter no máximo ${max} caracteres.` : null
}

export function validateDate(value: string, label = 'A data'): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${label} é obrigatória.`
  return null
}

/** Only allow https image URLs for avatars (blocks `javascript:`, `data:`, mixed content etc.). */
export function sanitizeImageUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.length > LIMITS.avatarUrl) return null
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function validateGoal(input: { title: string; targetDate: string; targetValue: number; unit: string }): string | null {
  return (
    validateTitle(input.title, 'A meta') ||
    validateDate(input.targetDate, 'A data alvo') ||
    (!Number.isFinite(input.targetValue) || input.targetValue <= 0 ? 'O valor da meta deve ser maior que zero.' : null) ||
    (input.targetValue > 1_000_000_000 ? 'O valor da meta é grande demais.' : null) ||
    validateMaxLength(input.unit, 'A unidade', LIMITS.unit)
  )
}

/** Normalizes "+55 (11) 99999-9999" to E.164 ("+5511999999999"). Assumes Brazil when no country code. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (raw.trim().startsWith('+')) return `+${digits}`
  return digits.length <= 11 ? `+55${digits}` : `+${digits}`
}
