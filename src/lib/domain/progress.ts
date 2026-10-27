import type { Goal } from '../types'

export const XP_PER_LEVEL = 200

export const XP_RULES = {
  completedTask: 25,
  habitCheckin: 20,
  note: 15,
  event: 15,
  focusSession: 50,
} as const

const LEVEL_TITLES = [
  'Iniciante da Rotina',
  'Aprendiz de Organização',
  'Explorador Focado',
  'Mestre da Produtividade',
  'Especialista em Foco',
  'Lenda do Norte',
]

export interface XpInput {
  completedTasks: number
  checkins: number
  notes: number
  events: number
  bonusXp: number
}

export function computeXp(input: XpInput) {
  const totalXp = Math.max(
    0,
    input.completedTasks * XP_RULES.completedTask +
      input.checkins * XP_RULES.habitCheckin +
      input.notes * XP_RULES.note +
      input.events * XP_RULES.event +
      Math.max(0, input.bonusXp),
  )
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const xpInLevel = totalXp % XP_PER_LEVEL
  return {
    totalXp,
    level,
    xpInLevel,
    xpToNextLevel: XP_PER_LEVEL - xpInLevel,
    percent: Math.round((xpInLevel / XP_PER_LEVEL) * 100),
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
  }
}

/** Percentage (0–100) of a goal, safe against zero/invalid targets. */
export function goalPercent(current: number, target: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)))
}

/** New current value/progress after adding `increment`, clamped to [0, target]. */
export function applyGoalIncrement(goal: Pick<Goal, 'current_value' | 'target_value'>, increment: number) {
  const target = Number(goal.target_value) || 0
  const current = Number(goal.current_value) || 0
  const nextCurrent = Math.min(target, Math.max(0, current + increment))
  return { current_value: nextCurrent, progress: goalPercent(nextCurrent, target) }
}

/** Increment for the "+10%" button: 10% of the target, at least 1. */
export function tenPercentStep(target: number): number {
  return Math.max(1, Math.round((Number(target) || 0) * 0.1))
}

/**
 * Simple 0–100 score: half from overall task completion, 30% from today's habits,
 * and 20% if at least one focus session was completed this session.
 */
export function productivityScore(completionRate: number, habitRate: number, bonusXp: number): number {
  return Math.min(100, Math.round(completionRate * 0.5 + habitRate * 0.3 + (bonusXp > 0 ? 20 : 0)))
}
