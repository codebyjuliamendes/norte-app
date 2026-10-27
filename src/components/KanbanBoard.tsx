import { useState } from 'react'
import { LayoutGrid, Plus, CheckCircle2, Clock, CircleAlert } from 'lucide-react'
import { supabase, type Task, type Category } from '../lib/supabase'
import { CATEGORIES, categoryBg, categoryDot, categoryLabel } from '../lib/categories'
import { kanbanPatch, kanbanStatus, type KanbanStatus } from '../lib/domain/tasks'
import { LIMITS, validateTitle } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError } from './ui'

interface Props {
  tasks: Task[]
  userId: string
  onChange: () => void
}

const COLUMNS: { status: KanbanStatus; title: string; icon: typeof Clock; color: string; bg: string }[] = [
  { status: 'fazer', title: 'A Fazer', icon: CircleAlert, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  {
    status: 'em_andamento',
    title: 'Em Andamento',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    status: 'concluido',
    title: 'Concluído',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
]

export default function KanbanBoard({ tasks, userId, onChange }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('estudo')
  const [addingStatus, setAddingStatus] = useState<KanbanStatus | null>(null)
  const form = useAsyncAction()
  const move = useAsyncAction()

  async function handleAddTask(e: React.FormEvent, status: KanbanStatus) {
    e.preventDefault()
    const ok = await form.run(async () => {
      const invalid = validateTitle(newTitle, 'A tarefa')
      if (invalid) return invalid
      const err = await errorOf(
        supabase.from('tasks').insert({
          title: newTitle.trim(),
          category: newCategory,
          done: status === 'concluido',
          user_id: userId,
          quadrant: status === 'em_andamento' ? 'agendar' : 'fazer',
        }),
      )
      return err && `Não foi possível salvar a tarefa: ${err}`
    })
    if (ok) {
      setNewTitle('')
      setAddingStatus(null)
      onChange()
    }
  }

  async function moveTaskStatus(task: Task, target: KanbanStatus) {
    await move.run(async () => {
      const err = await errorOf(supabase.from('tasks').update(kanbanPatch(task, target)).eq('id', task.id))
      return err && `Não foi possível mover a tarefa: ${err}`
    })
    onChange()
  }

  return (
    <section aria-labelledby="kanban-heading" className="space-y-4">
      <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <LayoutGrid className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div>
            <h2 id="kanban-heading" className="text-base font-bold text-white font-display">
              Quadro Kanban
            </h2>
            <p className="text-[11px] text-slate-400">Gerencie o fluxo de trabalho em 3 colunas</p>
          </div>
        </div>
      </div>

      <FormError message={move.error} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const Icon = col.icon
          const colTasks = tasks.filter((t) => kanbanStatus(t) === col.status)
          const headingId = `kanban-col-${col.status}`

          return (
            <section
              key={col.status}
              aria-labelledby={headingId}
              className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 flex flex-col justify-between space-y-3 md:min-h-[420px]"
            >
              <div className="flex items-center justify-between border-b border-[#21262D] pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${col.bg}`}>
                    <Icon className={`w-4 h-4 ${col.color}`} aria-hidden="true" />
                  </div>
                  <h3 id={headingId} className="text-xs font-bold text-white font-display">
                    {col.title}
                  </h3>
                </div>
                <span
                  className="text-xs font-mono font-bold text-slate-400 bg-[#0D1117] px-2 py-0.5 rounded-lg border border-[#21262D]"
                  aria-label={`${colTasks.length} tarefas`}
                >
                  {colTasks.length}
                </span>
              </div>

              <ul className="flex-1 space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
                {colTasks.length === 0 ? (
                  <li className="text-center py-8 text-slate-400 text-xs font-mono">Nenhuma tarefa aqui</li>
                ) : (
                  colTasks.map((t) => (
                    <li
                      key={t.id}
                      className="bg-[#0D1117] border border-[#21262D] hover:border-slate-700 rounded-xl p-3 space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200 break-words min-w-0">{t.title}</span>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${categoryDot[t.category]}`}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-slate-400 pt-1 border-t border-[#21262D]">
                        <span className={`px-2 py-0.5 rounded-md border ${categoryBg[t.category]}`}>
                          {categoryLabel[t.category]}
                        </span>

                        <div className="flex items-center gap-1">
                          {COLUMNS.filter((c) => c.status !== col.status).map((target) => (
                            <button
                              type="button"
                              key={target.status}
                              disabled={move.pending}
                              onClick={() => moveTaskStatus(t, target.status)}
                              className="hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-60"
                              aria-label={`Mover "${t.title}" para ${target.title}`}
                            >
                              {target.status === 'fazer'
                                ? '← Fazer'
                                : target.status === 'em_andamento'
                                  ? '⚡ Andamento'
                                  : '✓ Concluir'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              {addingStatus === col.status ? (
                <form
                  onSubmit={(e) => handleAddTask(e, col.status)}
                  className="bg-[#0D1117] border border-[#21262D] p-2.5 rounded-xl space-y-2"
                >
                  <label htmlFor={`kanban-new-${col.status}`} className="sr-only">
                    Nome da tarefa em {col.title}
                  </label>
                  <input
                    id={`kanban-new-${col.status}`}
                    type="text"
                    autoFocus
                    required
                    maxLength={LIMITS.title}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Nome da tarefa..."
                    className="w-full bg-[#161B22] border border-[#21262D] rounded-lg p-2 text-xs text-white focus:border-indigo-500"
                  />
                  <div role="group" aria-label="Categoria" className="flex gap-1">
                    {CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        aria-pressed={newCategory === c.value}
                        onClick={() => setNewCategory(c.value)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border ${newCategory === c.value ? categoryBg[c.value] : 'border-slate-800 text-slate-400'}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <FormError message={form.error} />
                  <div className="flex gap-1.5">
                    <button
                      type="submit"
                      disabled={form.pending}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                    >
                      {form.pending ? 'Salvando...' : 'Adicionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingStatus(null)}
                      className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingStatus(col.status)
                    setNewTitle('')
                    form.setError(null)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#0D1117] hover:bg-slate-800 text-slate-400 hover:text-white py-2 rounded-xl text-xs font-semibold border border-[#21262D] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Adicionar em {col.title}</span>
                </button>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
