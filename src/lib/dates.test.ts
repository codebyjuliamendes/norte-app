import { describe, expect, it } from 'vitest'
import {
  addDays,
  diffInDays,
  formatDatePT,
  getWeekDates,
  lastNDays,
  nextWeekday,
  parseISODate,
  toLocalISODate,
  todayISO,
} from './dates'

describe('dates', () => {
  it('formats local dates without UTC shift (21h in UTC-3 is still "today")', () => {
    // 2026-03-10 23:30 local time — toISOString() would already be the 11th in UTC-3.
    const lateNight = new Date(2026, 2, 10, 23, 30)
    expect(todayISO(lateNight)).toBe('2026-03-10')
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('parses only valid YYYY-MM-DD dates', () => {
    expect(parseISODate('2026-02-28')?.getDate()).toBe(28)
    expect(parseISODate('2026-02-30')).toBeNull()
    expect(parseISODate('28/02/2026')).toBeNull()
    expect(parseISODate('')).toBeNull()
  })

  it('adds days and computes differences across month/year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffInDays('2026-01-01', '2026-01-31')).toBe(30)
    expect(diffInDays('2026-01-31', '2026-01-01')).toBe(-30)
  })

  it('builds Monday-to-Sunday weeks', () => {
    const wednesday = new Date(2026, 9, 28) // 28/10/2026
    const week = getWeekDates(0, wednesday)
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-10-26')
    expect(week[6]).toBe('2026-11-01')
    expect(getWeekDates(1, wednesday)[0]).toBe('2026-11-02')

    const sunday = new Date(2026, 10, 1)
    expect(getWeekDates(0, sunday)[0]).toBe('2026-10-26')
  })

  it('lists the last N days ending today', () => {
    const days = lastNDays(7, new Date(2026, 0, 3))
    expect(days.map((d) => d.iso)).toEqual([
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
    expect(days[6].dayLabel).toBe('S') // sábado
  })

  it('finds the next occurrence of a weekday', () => {
    const tuesday = new Date(2026, 9, 27)
    expect(nextWeekday(2, tuesday)).toBe('2026-10-27') // same day
    expect(nextWeekday(1, tuesday)).toBe('2026-11-02') // next Monday
    expect(nextWeekday(5, tuesday)).toBe('2026-10-30')
  })

  it('formats relative dates in Portuguese', () => {
    const now = new Date(2026, 4, 10, 22, 0)
    expect(formatDatePT('2026-05-10', now)).toBe('Hoje')
    expect(formatDatePT('2026-05-11', now)).toBe('Amanhã')
    expect(formatDatePT('2026-05-09', now)).toBe('Ontem')
    expect(formatDatePT('2026-06-01', now)).toBe('01/06/2026')
    expect(formatDatePT('', now)).toBe('')
  })
})
