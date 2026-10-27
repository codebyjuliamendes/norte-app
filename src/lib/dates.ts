/**
 * Date helpers that always work in the user's *local* calendar.
 *
 * Dates are stored as `YYYY-MM-DD` strings (Postgres `date`). Building them with
 * `toISOString()` converts to UTC first, which in Brazil (UTC-3) turns "today" into
 * "tomorrow" after 21h — so every helper here formats from local components instead.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parses `YYYY-MM-DD` as a local date at midnight. Returns null for malformed input. */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) {
    return null
  }
  return date
}

export function todayISO(now: Date = new Date()): string {
  return toLocalISODate(now)
}

export function addDays(iso: string, days: number): string {
  const base = parseISODate(iso) ?? new Date()
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)
  return toLocalISODate(next)
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`), DST-safe. */
export function diffInDays(from: string, to: string): number {
  const a = parseISODate(from)
  const b = parseISODate(to)
  if (!a || !b) return NaN
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86_400_000)
}

/** Monday-to-Sunday week containing `now`, shifted by `offsetWeeks`. */
export function getWeekDates(offsetWeeks = 0, now: Date = new Date()): string[] {
  const reference = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetWeeks * 7)
  const mondayOffset = (reference.getDay() + 6) % 7
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, i) =>
    toLocalISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
  )
}

const SHORT_WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** The last 7 days ending today (oldest first). */
export function lastNDays(n = 7, now: Date = new Date()): { iso: string; dayNum: number; dayLabel: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))
    return { iso: toLocalISODate(d), dayNum: d.getDate(), dayLabel: SHORT_WEEKDAYS[d.getDay()] }
  })
}

/**
 * Next date (today included) that falls on `weekday` (0 = Sunday … 6 = Saturday).
 */
export function nextWeekday(weekday: number, now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const delta = (weekday - today.getDay() + 7) % 7
  return toLocalISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta))
}

export function formatDatePT(iso: string, now: Date = new Date()): string {
  if (!iso) return ''
  const date = parseISODate(iso)
  if (!date) return iso
  const diff = diffInDays(todayISO(now), iso)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff === -1) return 'Ontem'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

export function formatFullDate(iso: string): string {
  const date = parseISODate(iso)
  if (!date) return ''
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
