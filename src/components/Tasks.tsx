import { useState } from 'react'
import confetti from 'canvas-confetti'
import { Plus, Search, Check, Trash2, Calendar as CalendarIcon, Grid, List, Sparkles, AlertCircle } from 'lucide-react'
import { supabase, type Task, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg, formatDatePT, todayISO } from '../lib/categories'

interface Props {
  tasks: Task[]
  userId: string
  onChange: () => void
  selectedDate?: string
}

export default function Tasks({ tasks, userId, onChange, selectedDate }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [dueDate, setDueDate] = useState(selectedDate || todayISO())
  const [priority, setPriority] = useState<'normal' | 'alta' | 'urgente'>('normal')
  const [quadrant, setQuadrant] = useState<'fazer' | 'agendar' | 'delegar' | 'eliminar'>('fazer')
  const [filterCategory, setFilterCategory] = useState<'todas' | Category>('todas')
  const [filterStatus, setFilterStatus] = useState<'todas' | 'pendentes' | 'concluidas'>('todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [viewMode, setViewMode] = useState<'lista' | 'matriz'>('lista')

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    await supabase.from('tasks').insert({
      title: title.trim(),
      category,
      due_date: dueDate || null,
      user_id: userId,
      priority,
      quadrant,
    })

    setTitle('')
    setIsAdding(false)
    onChange()
  }

  async function toggleDone(task: Task) {
    const nextState = !task.done
    if (nextState) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366F1', '#10B981', '#F59E0B'],
      })
    }
    await supabase.from('tasks').update({ done: nextState }).eq('id', task.id)
    onChange()
  }

  async function remove(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    onChange()
  }

  const filteredTasks = tasks.filter((t) => {
    if (filterCategory !== 'todas' && t.category !== filterCategory) return false
    if (filterStatus === 'pendentes' && t.done) return false
    if (filterStatus === 'concluidas' && !t.done) return false
    if (searchQuery.trim()) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  }).sort((a, b) => Number(a.done) - Number(b.done))

  const QUADRANTS = [
    { key: 'fazer', title: '🔴 Fazer Agora', desc: 'Urgente & Importante', border: 'border-rose-500/40 bg-rose-500/5' },
    { key: 'agendar', title: '🔵 Agendar', desc: 'Importante (Não Urgente)', border: 'border-indigo-500/40 bg-indigo-500/5' },
    { key: 'delegar', title: '🟡 Delegar / Rápido', desc: 'Urgente (Não Importante)', border: 'border-amber-500/40 bg-amber-500/5' },
    { key: 'eliminar', title: '🟢 Secundário', desc: 'Baixa Prioridade', border: 'border-emerald-500/40 bg-emerald-500/5' },
  ]

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefas..."
            className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher (Lista vs Matriz) */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'lista' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setViewMode('matriz')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'matriz' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matriz 4Q</span>
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Form Nova Tarefa */}
      {isAdding && (
        <form
          onSubmit={addTask}
          className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
            <div className="flex gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    category === c.value
                      ? categoryBg[c.value] + ' font-semibold'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={quadrant}
                onChange={(e) => setQuadrant(e.target.value as any)}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 outline-none"
              >
                <option value="fazer">🔴 Fazer Agora</option>
                <option value="agendar">🔵 Agendar</option>
                <option value="delegar">🟡 Delegar/Rápido</option>
                <option value="eliminar">🟢 Secundário</option>
              </select>

              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent text-xs font-mono outline-none text-slate-300"
                />
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters Bar (when in List View) */}
      {viewMode === 'lista' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setFilterCategory('todas')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                filterCategory === 'todas' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCategory(c.value)}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors capitalize ${
                  filterCategory === c.value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setFilterStatus('todas')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'todas' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('pendentes')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'pendentes' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus('concluidas')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'concluidas' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}
            >
              Concluídas
            </button>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'lista' && (
        filteredTasks.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-400">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 bg-slate-900/70 border rounded-xl px-3.5 py-3 transition-all duration-200 group ${
                  t.done
                    ? 'border-slate-800/40 opacity-60'
                    : 'border-slate-800 hover:border-indigo-500/40 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleDone(t)}
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                    t.done
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white'
                      : 'border-slate-700 hover:border-indigo-500'
                  }`}
                >
                  {t.done && <Check className="w-3.5 h-3.5 stroke-[3] animate-checkmark" />}
                </button>

                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[t.category]}`} />

                <span
                  className={`flex-1 text-sm font-medium transition-all ${
                    t.done ? 'line-through text-slate-500' : 'text-slate-100'
                  }`}
                >
                  {t.title}
                </span>

                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${categoryBg[t.category]}`}>
                  {t.category}
                </span>

                {t.due_date && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    {formatDatePT(t.due_date)}
                  </span>
                )}

                <button
                  onClick={() => remove(t.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* EISENHOWER MATRIX 4-QUADRANT VIEW */}
      {viewMode === 'matriz' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUADRANTS.map((quad) => {
            const quadTasks = filteredTasks.filter((t) => (t.quadrant || 'fazer') === quad.key)
            return (
              <div
                key={quad.key}
                className={`border rounded-2xl p-4 space-y-3 ${quad.border} backdrop-blur-md min-h-[160px]`}
              >
                <div>
                  <h3 className="text-xs font-bold text-white font-display">{quad.title}</h3>
                  <p className="text-[10px] text-slate-400">{quad.desc}</p>
                </div>

                <div className="space-y-1.5">
                  {quadTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2">Sem tarefas neste quadrante.</p>
                  ) : (
                    quadTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => toggleDone(t)}
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              t.done ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600'
                            }`}
                          >
                            {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                          <span className={`truncate ${t.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {t.title}
                          </span>
                        </div>
                        <button
                          onClick={() => remove(t.id)}
                          className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
