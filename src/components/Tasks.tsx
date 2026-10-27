import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { Plus, Search, Check, Trash2, Calendar as CalendarIcon, Grid, List, Sparkles } from 'lucide-react'
import { supabase, type Task, type Category, type TaskPriority, type TaskQuadrant } from '../lib/supabase'
import { syncItemToRagMemory } from '../lib/ragEngine'
import { CATEGORIES, categoryDot, categoryBg, categoryLabel, formatDatePT, todayISO } from '../lib/categories'
import { filterTasks, type TaskFilters } from '../lib/domain/tasks'
import { LIMITS, validateTitle } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError, hoverReveal } from './ui'

interface Props {
  tasks: Task[]
  userId: string
  onChange: () => void
  selectedDate?: string
}

const QUADRANTS: { key: TaskQuadrant; title: string; desc: string; border: string }[] = [
  { key: 'fazer', title: '🔴 Fazer Agora', desc: 'Urgente & Importante', border: 'border-rose-500/40 bg-rose-500/5' },
  { key: 'agendar', title: '🔵 Agendar', desc: 'Importante (Não Urgente)', border: 'border-indigo-500/40 bg-indigo-500/5' },
  {
    key: 'delegar',
    title: '🟡 Delegar / Rápido',
    desc: 'Urgente (Não Importante)',
    border: 'border-amber-500/40 bg-amber-500/5',
  },
  { key: 'eliminar', title: '🟢 Secundário', desc: 'Baixa Prioridade', border: 'border-emerald-500/40 bg-emerald-500/5' },
]

const PRIORITY_LABEL: Record<TaskPriority, string> = { normal: 'Normal', alta: 'Alta', urgente: 'Urgente' }

export default function Tasks({ tasks, userId, onChange, selectedDate }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [dueDate, setDueDate] = useState(selectedDate || todayISO())
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [quadrant, setQuadrant] = useState<TaskQuadrant>('fazer')
  const [filters, setFilters] = useState<TaskFilters>({ category: 'todas', status: 'todas', query: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [viewMode, setViewMode] = useState<'lista' | 'matriz'>('lista')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const form = useAsyncAction()
  const rowAction = useAsyncAction()

  // Keep the form's default date in sync with the day picked in the week ribbon.
  useEffect(() => {
    if (selectedDate) setDueDate(selectedDate)
  }, [selectedDate])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    const ok = await form.run(async () => {
      const invalid = validateTitle(title, 'A tarefa')
      if (invalid) return invalid
      const cleanTitle = title.trim()
      const { data, error } = await supabase
        .from('tasks')
        .insert({ title: cleanTitle, category, due_date: dueDate || null, user_id: userId, priority, quadrant })
        .select()
      if (error) return `Não foi possível salvar a tarefa: ${error.message}`
      if (data?.[0]) {
        void syncItemToRagMemory(
          userId,
          'task',
          String(data[0].id),
          cleanTitle,
          `Categoria: ${category}, Prazo: ${dueDate || 'Sem data'}, Prioridade: ${priority}`,
          { category, priority, quadrant },
        )
      }
    })
    if (ok) {
      setTitle('')
      setPriority('normal')
      setIsAdding(false)
      onChange()
    }
  }

  async function withBusy(id: string, action: () => Promise<string | null>) {
    if (busyIds.has(id)) return
    setBusyIds((prev) => new Set(prev).add(id))
    await rowAction.run(action)
    setBusyIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    onChange()
  }

  function toggleDone(task: Task) {
    const nextState = !task.done
    void withBusy(task.id, async () => {
      const err = await errorOf(supabase.from('tasks').update({ done: nextState }).eq('id', task.id))
      if (!err && nextState) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366F1', '#10B981', '#F59E0B'],
          disableForReducedMotion: true,
        })
      }
      return err && `Não foi possível atualizar a tarefa: ${err}`
    })
  }

  function remove(task: Task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return
    void withBusy(task.id, async () => {
      const err = await errorOf(supabase.from('tasks').delete().eq('id', task.id))
      return err && `Não foi possível excluir a tarefa: ${err}`
    })
  }

  const filteredTasks = filterTasks(tasks, filters)
  const viewButton = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${active ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`

  return (
    <section aria-labelledby="tasks-heading" className="space-y-4">
      <h2 id="tasks-heading" className="sr-only">
        Tarefas
      </h2>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar tarefas"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Buscar tarefas..."
            className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Modo de visualização"
            className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'lista'}
              onClick={() => setViewMode('lista')}
              className={viewButton(viewMode === 'lista')}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lista</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'matriz'}
              onClick={() => setViewMode('matriz')}
              className={viewButton(viewMode === 'matriz')}
            >
              <Grid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Matriz 4Q</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            aria-expanded={isAdding}
            aria-controls="new-task-form"
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Form Nova Tarefa */}
      {isAdding && (
        <form
          id="new-task-form"
          onSubmit={addTask}
          aria-label="Nova tarefa"
          className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-3"
        >
          <label htmlFor="task-title" className="sr-only">
            Título da tarefa
          </label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            maxLength={LIMITS.title}
            required
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
            <div role="group" aria-label="Categoria" className="flex gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    category === c.value ? categoryBg[c.value] + ' font-semibold' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="task-quadrant">
                Quadrante
              </label>
              <select
                id="task-quadrant"
                value={quadrant}
                onChange={(e) => setQuadrant(e.target.value as TaskQuadrant)}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1"
              >
                <option value="fazer">🔴 Fazer Agora</option>
                <option value="agendar">🔵 Agendar</option>
                <option value="delegar">🟡 Delegar/Rápido</option>
                <option value="eliminar">🟢 Secundário</option>
              </select>

              <label className="sr-only" htmlFor="task-priority">
                Prioridade
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1"
              >
                <option value="normal">Prioridade normal</option>
                <option value="alta">Prioridade alta</option>
                <option value="urgente">Urgente</option>
              </select>

              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <label className="sr-only" htmlFor="task-due">
                  Prazo
                </label>
                <input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent text-xs font-mono text-slate-300 [color-scheme:dark]"
                />
              </div>

              <button
                type="submit"
                disabled={form.pending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
              >
                {form.pending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
          <FormError message={form.error} />
        </form>
      )}

      <FormError message={rowAction.error} />

      {/* Filters Bar (when in List View) */}
      {viewMode === 'lista' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
          <div role="group" aria-label="Filtrar por categoria" className="flex gap-1 overflow-x-auto">
            {[{ value: 'todas' as const, label: 'Todas' }, ...CATEGORIES].map((c) => (
              <button
                type="button"
                key={c.value}
                aria-pressed={filters.category === c.value}
                onClick={() => setFilters((f) => ({ ...f, category: c.value }))}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                  filters.category === c.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Filtrar por status" className="flex gap-1 text-[11px]">
            {(
              [
                ['todas', 'Todas'],
                ['pendentes', 'Pendentes'],
                ['concluidas', 'Concluídas'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={filters.status === value}
                onClick={() => setFilters((f) => ({ ...f, status: value }))}
                className={`px-2 py-0.5 rounded ${filters.status === value ? 'text-indigo-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'lista' &&
        (filteredTasks.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-400">
              {tasks.length === 0
                ? 'Nenhuma tarefa ainda. Crie a primeira em "Nova Tarefa".'
                : 'Nenhuma tarefa encontrada com esses filtros.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Lista de tarefas">
            {filteredTasks.map((t) => (
              <li
                key={t.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-slate-900/70 border rounded-xl px-3.5 py-3 transition-all duration-200 group ${
                  t.done ? 'border-slate-800/40 opacity-60' : 'border-slate-800 hover:border-indigo-500/40 shadow-sm'
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={`Marcar "${t.title}" como ${t.done ? 'pendente' : 'concluída'}`}
                  disabled={busyIds.has(t.id)}
                  onClick={() => toggleDone(t)}
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    t.done
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white'
                      : 'border-slate-600 hover:border-indigo-500'
                  }`}
                >
                  {t.done && <Check className="w-3.5 h-3.5 stroke-[3] animate-checkmark" aria-hidden="true" />}
                </button>

                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[t.category]}`} aria-hidden="true" />

                <span
                  className={`flex-1 min-w-0 break-words text-sm font-medium transition-all ${t.done ? 'line-through text-slate-500' : 'text-slate-100'}`}
                >
                  {t.title}
                </span>

                <span className="flex items-center gap-1.5 ml-auto">
                  {t.priority && t.priority !== 'normal' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold border border-rose-500/40 text-rose-300 bg-rose-500/10">
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${categoryBg[t.category]}`}>
                    {categoryLabel[t.category]}
                  </span>

                  {t.due_date && (
                    <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                      {formatDatePT(t.due_date)}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => remove(t)}
                    disabled={busyIds.has(t.id)}
                    aria-label={`Excluir "${t.title}"`}
                    className={`text-slate-400 hover:text-rose-500 p-1 ${hoverReveal}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ))}

      {/* EISENHOWER MATRIX 4-QUADRANT VIEW */}
      {viewMode === 'matriz' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUADRANTS.map((quad) => {
            const quadTasks = filteredTasks.filter((t) => (t.quadrant || 'fazer') === quad.key)
            return (
              <section
                key={quad.key}
                aria-label={quad.title}
                className={`border rounded-2xl p-4 space-y-3 ${quad.border} backdrop-blur-md min-h-[160px]`}
              >
                <div>
                  <h3 className="text-xs font-bold text-white font-display">{quad.title}</h3>
                  <p className="text-[10px] text-slate-400">{quad.desc}</p>
                </div>

                {quadTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2">Sem tarefas neste quadrante.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {quadTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={t.done}
                            aria-label={`Marcar "${t.title}" como ${t.done ? 'pendente' : 'concluída'}`}
                            disabled={busyIds.has(t.id)}
                            onClick={() => toggleDone(t)}
                            className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                              t.done ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-500'
                            }`}
                          >
                            {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />}
                          </button>
                          <span className={`truncate ${t.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {t.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(t)}
                          aria-label={`Excluir "${t.title}"`}
                          className={`text-slate-400 hover:text-rose-400 px-1 ${hoverReveal}`}
                        >
                          <span aria-hidden="true">✕</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
