import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import { filterTasks, kanbanPatch, kanbanStatus, todaySummary } from './tasks'
import { applyGoalIncrement, computeXp, goalPercent, productivityScore, tenPercentStep } from './progress'
import { normalizePhone, sanitizeImageUrl, validateGoal, validateTitle } from './validation'
import { buildReport } from './report'
import { formatClock, nextPhase, secondsLeft } from './pomodoro'

const task = (over: Partial<Task>): Task => ({
  id: over.id ?? 'id',
  user_id: 'u',
  title: 'Tarefa',
  category: 'vida',
  due_date: null,
  done: false,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('kanban', () => {
  it('derives the column from done + quadrant only', () => {
    expect(kanbanStatus(task({ done: true, quadrant: 'agendar' }))).toBe('concluido')
    expect(kanbanStatus(task({ quadrant: 'agendar' }))).toBe('em_andamento')
    // Regression: high priority used to pin tasks in "Em andamento" forever.
    expect(kanbanStatus(task({ quadrant: 'fazer', priority: 'alta' }))).toBe('fazer')
    expect(kanbanStatus(task({ quadrant: null }))).toBe('fazer')
  })

  it('moves a task back to "A fazer" from any column', () => {
    const inProgress = task({ quadrant: 'agendar' })
    const patch = kanbanPatch(inProgress, 'fazer')
    expect(kanbanStatus({ ...inProgress, ...patch })).toBe('fazer')
  })

  it('keeps the Eisenhower quadrant when completing or reopening', () => {
    expect(kanbanPatch(task({ quadrant: 'delegar' }), 'concluido')).toEqual({ done: true })
    expect(kanbanPatch(task({ quadrant: 'delegar', done: true }), 'fazer')).toEqual({ done: false })
  })
})

describe('filterTasks', () => {
  const tasks = [
    task({ id: '1', title: 'Estudar Álgebra', category: 'estudo', done: true }),
    task({ id: '2', title: 'Reunião', category: 'trabalho' }),
    task({ id: '3', title: 'Academia', category: 'vida' }),
  ]

  it('filters by category, status and accent-insensitive text', () => {
    expect(filterTasks(tasks, { category: 'estudo', status: 'todas', query: '' }).map((t) => t.id)).toEqual(['1'])
    expect(filterTasks(tasks, { category: 'todas', status: 'pendentes', query: '' }).map((t) => t.id)).toEqual(['2', '3'])
    expect(filterTasks(tasks, { category: 'todas', status: 'todas', query: 'algebra' }).map((t) => t.id)).toEqual(['1'])
  })

  it('lists pending tasks before completed ones', () => {
    expect(filterTasks(tasks, { category: 'todas', status: 'todas', query: '' }).at(-1)?.id).toBe('1')
  })

  it('summarizes today (due today or undated)', () => {
    const summary = todaySummary(
      [task({ due_date: '2026-05-10', done: true }), task({ due_date: null }), task({ due_date: '2026-05-11' })],
      '2026-05-10',
    )
    expect(summary).toEqual({ total: 2, done: 1, percent: 50 })
    expect(todaySummary([], '2026-05-10').percent).toBe(0)
  })
})

describe('progress', () => {
  it('computes XP and levels', () => {
    const xp = computeXp({ completedTasks: 4, checkins: 3, notes: 2, events: 1, bonusXp: 50 })
    // 4*25 + 3*20 + 2*15 + 1*15 + 50 = 255
    expect(xp.totalXp).toBe(255)
    expect(xp.level).toBe(2)
    expect(xp.xpToNextLevel).toBe(145)
    expect(xp.title).toBe('Aprendiz de Organização')
    expect(computeXp({ completedTasks: 1000, checkins: 0, notes: 0, events: 0, bonusXp: 0 }).title).toBe('Lenda do Norte')
  })

  it('clamps goal progress and never divides by zero', () => {
    expect(goalPercent(5, 0)).toBe(0)
    expect(goalPercent(150, 100)).toBe(100)
    expect(applyGoalIncrement({ current_value: 95, target_value: 100 }, 10)).toEqual({ current_value: 100, progress: 100 })
    expect(applyGoalIncrement({ current_value: 0, target_value: 12 }, -1)).toEqual({ current_value: 0, progress: 0 })
    expect(tenPercentStep(5)).toBe(1)
    expect(tenPercentStep(250)).toBe(25)
  })

  it('caps the productivity score at 100', () => {
    expect(productivityScore(100, 100, 50)).toBe(100)
    expect(productivityScore(50, 0, 0)).toBe(25)
  })
})

describe('validation', () => {
  it('validates titles', () => {
    expect(validateTitle('   ')).toMatch(/vazio/)
    expect(validateTitle('x'.repeat(201))).toMatch(/200/)
    expect(validateTitle(' ok ')).toBeNull()
  })

  it('validates goals', () => {
    const base = { title: 'Ler 12 livros', targetDate: '2026-12-31', targetValue: 12, unit: 'livros' }
    expect(validateGoal(base)).toBeNull()
    expect(validateGoal({ ...base, targetValue: 0 })).toMatch(/maior que zero/)
    expect(validateGoal({ ...base, targetValue: Number.NaN })).toMatch(/maior que zero/)
    expect(validateGoal({ ...base, targetDate: '' })).toMatch(/data alvo/)
  })

  it('only accepts https avatar URLs', () => {
    expect(sanitizeImageUrl('')).toBe('')
    expect(sanitizeImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeImageUrl('data:image/png;base64,AAAA')).toBeNull()
    expect(sanitizeImageUrl('http://example.com/a.png')).toBeNull()
  })

  it('normalizes Brazilian phone numbers to E.164', () => {
    expect(normalizePhone('+55 (11) 99999-9999')).toBe('+5511999999999')
    expect(normalizePhone('(11) 99999-9999')).toBe('+5511999999999')
    expect(normalizePhone('')).toBe('')
  })
})

describe('report', () => {
  it('lists completed and pending tasks', () => {
    const text = buildReport({
      tasks: [task({ title: 'Feita', done: true }), task({ title: 'Aberta' })],
      events: [],
      notes: [],
      habits: [],
      goals: [],
      today: '2026-01-10',
    })
    expect(text).toContain('Tarefas Concluídas: 1 / 2')
    expect(text).toContain('- [x] [VIDA] Feita')
    expect(text).toContain('- [ ] [VIDA] Aberta')
    expect(text).toContain('Nenhuma meta cadastrada.')
  })
})

describe('pomodoro', () => {
  it('alternates focus and breaks, with a long break every 4 sessions', () => {
    expect(nextPhase('foco', 1)).toBe('pausaCurta')
    expect(nextPhase('foco', 4)).toBe('pausaLonga')
    expect(nextPhase('pausaCurta', 1)).toBe('foco')
    expect(nextPhase('pausaLonga', 4)).toBe('foco')
  })

  it('counts down from a wall-clock deadline', () => {
    expect(secondsLeft(10_000, 0)).toBe(10)
    expect(secondsLeft(10_000, 9_001)).toBe(1)
    expect(secondsLeft(10_000, 20_000)).toBe(0)
    expect(formatClock(25 * 60)).toBe('25:00')
    expect(formatClock(65)).toBe('01:05')
  })
})
