import type { Category, Task, TaskQuadrant } from '../types'

export type KanbanStatus = 'fazer' | 'em_andamento' | 'concluido'

/**
 * Kanban column of a task. "Em andamento" is represented by the `agendar` quadrant
 * (there is no dedicated status column in the schema).
 */
export function kanbanStatus(task: Pick<Task, 'done' | 'quadrant'>): KanbanStatus {
  if (task.done) return 'concluido'
  if (task.quadrant === 'agendar') return 'em_andamento'
  return 'fazer'
}

/** Minimal patch to move a task to a Kanban column without clobbering its Eisenhower quadrant needlessly. */
export function kanbanPatch(
  task: Pick<Task, 'done' | 'quadrant'>,
  target: KanbanStatus,
): { done: boolean; quadrant?: TaskQuadrant } {
  if (target === 'concluido') return { done: true }
  if (target === 'em_andamento') return { done: false, quadrant: 'agendar' }
  // Back to "A fazer": only change the quadrant if it currently means "em andamento".
  return task.quadrant === 'agendar' ? { done: false, quadrant: 'fazer' } : { done: false }
}

export interface TaskFilters {
  category: 'todas' | Category
  status: 'todas' | 'pendentes' | 'concluidas'
  query: string
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Filters by category/status/text (accent-insensitive) and lists pending tasks first. */
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const q = normalize(filters.query.trim())
  return tasks
    .filter((t) => {
      if (filters.category !== 'todas' && t.category !== filters.category) return false
      if (filters.status === 'pendentes' && t.done) return false
      if (filters.status === 'concluidas' && !t.done) return false
      if (q && !normalize(t.title).includes(q)) return false
      return true
    })
    .sort((a, b) => Number(a.done) - Number(b.done))
}

/** Tasks considered "for today": due today or without a due date. */
export function todaySummary(tasks: Task[], today: string) {
  const relevant = tasks.filter((t) => t.due_date === today || !t.due_date)
  const done = relevant.filter((t) => t.done).length
  return {
    total: relevant.length,
    done,
    percent: relevant.length > 0 ? Math.round((done / relevant.length) * 100) : 0,
  }
}
