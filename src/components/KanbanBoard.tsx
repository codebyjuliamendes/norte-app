import { useState } from 'react'
import { LayoutGrid, Plus, ArrowRight, CheckCircle2, Clock, CircleAlert } from 'lucide-react'
import { supabase, type Task, type Category } from '../lib/supabase'
import { CATEGORIES, categoryBg, categoryDot } from '../lib/categories'

interface Props {
  tasks: Task[]
  userId: string
  onChange: () => void
}

type KanbanStatus = 'fazer' | 'em_andamento' | 'concluido'

export default function KanbanBoard({ tasks, userId, onChange }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('estudo')
  const [addingStatus, setAddingStatus] = useState<KanbanStatus | null>(null)

  const handleAddTask = async (status: KanbanStatus) => {
    if (!newTitle.trim()) return

    await supabase.from('tasks').insert({
      title: newTitle.trim(),
      category: newCategory,
      done: status === 'concluido',
      user_id: userId,
      quadrant: status === 'em_andamento' ? 'agendar' : 'fazer',
    })

    setNewTitle('')
    setAddingStatus(null)
    onChange()
  }

  const moveTaskStatus = async (task: Task, targetStatus: KanbanStatus) => {
    const isDone = targetStatus === 'concluido'
    await supabase
      .from('tasks')
      .update({
        done: isDone,
        quadrant: targetStatus === 'em_andamento' ? 'agendar' : 'fazer',
      })
      .eq('id', task.id)
    onChange()
  }

  const columns: { status: KanbanStatus; title: string; icon: any; color: string; bg: string }[] = [
    {
      status: 'fazer',
      title: 'A Fazer',
      icon: CircleAlert,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
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

  const getTaskStatus = (task: Task): KanbanStatus => {
    if (task.done) return 'concluido'
    if (task.quadrant === 'agendar' || task.priority === 'alta') return 'em_andamento'
    return 'fazer'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <LayoutGrid className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-display">Quadro Kanban Visual 📊</h2>
            <p className="text-[11px] text-slate-400">Gerencie o fluxo de trabalho em 3 colunas ágeis</p>
          </div>
        </div>
      </div>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const Icon = col.icon
          const colTasks = tasks.filter((t) => getTaskStatus(t) === col.status)

          return (
            <div
              key={col.status}
              className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 flex flex-col justify-between space-y-3 min-h-[420px]"
            >
              {/* Column Title */}
              <div className="flex items-center justify-between border-b border-[#21262D] pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${col.bg}`}>
                    <Icon className={`w-4 h-4 ${col.color}`} />
                  </div>
                  <h3 className="text-xs font-bold text-white font-display">{col.title}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 bg-[#0D1117] px-2 py-0.5 rounded-lg border border-[#21262D]">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 text-xs font-mono">
                    Nenhuma tarefa aqui
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-[#0D1117] border border-[#21262D] hover:border-slate-700 rounded-xl p-3 space-y-2 group transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">{t.title}</span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${categoryDot[t.category]}`} />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#21262D]">
                        <span className={`px-2 py-0.5 rounded-md border ${categoryBg[t.category]}`}>
                          {t.category}
                        </span>

                        {/* Move Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {col.status !== 'fazer' && (
                            <button
                              onClick={() => moveTaskStatus(t, 'fazer')}
                              className="hover:text-indigo-400 px-1 py-0.5 rounded bg-slate-900 border border-slate-800"
                              title="Mover para A Fazer"
                            >
                              ← Fazer
                            </button>
                          )}
                          {col.status !== 'em_andamento' && (
                            <button
                              onClick={() => moveTaskStatus(t, 'em_andamento')}
                              className="hover:text-amber-400 px-1 py-0.5 rounded bg-slate-900 border border-slate-800"
                              title="Mover para Em Andamento"
                            >
                              ⚡ Andamento
                            </button>
                          )}
                          {col.status !== 'concluido' && (
                            <button
                              onClick={() => moveTaskStatus(t, 'concluido')}
                              className="hover:text-emerald-400 px-1 py-0.5 rounded bg-slate-900 border border-slate-800"
                              title="Mover para Concluído"
                            >
                              ✓ Concluir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Task Button per Column */}
              {addingStatus === col.status ? (
                <div className="bg-[#0D1117] border border-[#21262D] p-2.5 rounded-xl space-y-2">
                  <input
                    type="text"
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Nome da tarefa..."
                    className="w-full bg-[#161B22] border border-[#21262D] rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAddTask(col.status)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-1.5 rounded-lg text-xs font-bold"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => setAddingStatus(null)}
                      className="bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingStatus(col.status)
                    setNewTitle('')
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#0D1117] hover:bg-slate-800 text-slate-400 hover:text-white py-2 rounded-xl text-xs font-semibold border border-[#21262D] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar nesta coluna</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
