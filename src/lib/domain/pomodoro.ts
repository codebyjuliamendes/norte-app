export type PomodoroMode = 'foco' | 'pausaCurta' | 'pausaLonga'

export const DURATIONS: Record<PomodoroMode, number> = {
  foco: 25 * 60,
  pausaCurta: 5 * 60,
  pausaLonga: 15 * 60,
}

/** Mode that follows a finished phase. Every 4th focus session earns a long break. */
export function nextPhase(finished: PomodoroMode, completedFocusSessions: number): PomodoroMode {
  if (finished !== 'foco') return 'foco'
  return completedFocusSessions > 0 && completedFocusSessions % 4 === 0 ? 'pausaLonga' : 'pausaCurta'
}

/** Seconds left until `endsAt` (ms epoch), never negative. */
export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
