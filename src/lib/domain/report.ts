import type { CalendarEvent, Goal, Habit, Note, Task } from '../types'
import { formatDatePT, todayISO } from '../dates'

export interface ReportInput {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  goals: Goal[]
  today?: string
}

/** Plain-text (Markdown-ish) summary of the user's data, used for copy/download. */
export function buildReport({ tasks, events, notes, habits, goals, today = todayISO() }: ReportInput): string {
  const completed = tasks.filter((t) => t.done)
  const pending = tasks.filter((t) => !t.done)
  const line = (t: Task, mark: string) => `- [${mark}] [${t.category.toUpperCase()}] ${t.title}`

  return `
# RELATÓRIO DE DESEMPENHO E ROTINA — NORTE
Data de Emissão: ${formatDatePT(today)}

---

## RESUMO DE EXECUÇÃO
- Tarefas Concluídas: ${completed.length} / ${tasks.length}
- Tarefas Pendentes: ${pending.length}
- Hábitos Ativos: ${habits.length}
- Compromissos Agendados: ${events.length}
- Anotações Salvas: ${notes.length}
- Metas de Longo Prazo: ${goals.length}

---

## TAREFAS CONCLUÍDAS
${completed.length > 0 ? completed.map((t) => line(t, 'x')).join('\n') : 'Nenhuma tarefa concluída no período.'}

---

## PENDÊNCIAS
${pending.length > 0 ? pending.map((t) => line(t, ' ')).join('\n') : 'Nenhuma pendência em aberto!'}

---

## METAS & OBJETIVOS
${
  goals.length > 0
    ? goals.map((g) => `- ${g.title} (${g.progress}% concluído — Meta: ${g.target_value} ${g.unit})`).join('\n')
    : 'Nenhuma meta cadastrada.'
}
`.trim()
}
