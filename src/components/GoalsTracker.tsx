import { useState } from 'react'
import confetti from 'canvas-confetti'
import { Target, Plus, Trash2, CheckCircle2, TrendingUp, Calendar, Sparkles } from 'lucide-react'
import { supabase, type Goal, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg, formatDatePT, todayISO } from '../lib/categories'

interface Props {
  goals: Goal[]
  userId: string
  onChange: () => void
}

export default function GoalsTracker({ goals, userId, onChange }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [targetDate, setTargetDate] = useState('')
  const [targetValue, setTargetValue] = useState(100)
  const [unit, setUnit] = useState('%')
  const [isAdding, setIsAdding] = useState(false)

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    await supabase.from('goals').insert({
      title: title.trim(),
      category,
      target_date: targetDate || '2026-12-31',
      target_value: Number(targetValue) || 100,
      current_value: 0,
      progress: 0,
      unit: unit || '%',
      user_id: userId,
    })

    setTitle('')
    setIsAdding(false)
    onChange()
  }

  async function updateProgress(goal: Goal, increment: number) {
    const nextCurrent = Math.min(goal.target_value, Math.max(0, goal.current_value + increment))
    const nextProgress = Math.round((nextCurrent / goal.target_value) * 100)

    if (nextProgress === 100 && goal.progress < 100) {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#10B981', '#6366F1', '#F59E0B'],
      })
    }

    await supabase
      .from('goals')
      .update({ current_value: nextCurrent, progress: nextProgress })
      .eq('id', goal.id)

    onChange()
  }

  async function remove(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    onChange()
  }

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold font-display text-white">Metas & Visão de Futuro</h2>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form
          onSubmit={addGoal}
          className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Qual é a sua grande meta? (ex: Ler 12 livros, Economizar R$ 5.000, Passar na prova)..."
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Data Alvo</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none text-slate-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Valor Meta</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none text-slate-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Unidade (ex: %, R$, dias)</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, livros, R$"
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    category === c.value
                      ? categoryBg[c.value] + ' font-semibold'
                      : 'border-slate-800 text-slate-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              Salvar Meta
            </button>
          </div>
        </form>
      )}

      {/* Goal Cards */}
      {goals.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
          <Target className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-400">Nenhuma meta definida ainda.</p>
          <p className="text-xs text-slate-500 mt-1">Defina seus grandes objetivos de curto e longo prazo acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((goal) => {
            const isCompleted = goal.progress >= 100
            return (
              <div
                key={goal.id}
                className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-500/40 transition-all group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${categoryBg[goal.category]}`}>
                      {goal.category}
                    </span>

                    <button
                      onClick={() => remove(goal.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1 leading-snug">{goal.title}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Meta para {formatDatePT(goal.target_date)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                    <span className="font-bold text-indigo-400">{goal.progress}%</span>
                  </div>

                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {/* Increment buttons */}
                  {!isCompleted && (
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={() => updateProgress(goal, 1)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono py-1 rounded-lg transition-colors"
                      >
                        +1 {goal.unit}
                      </button>
                      <button
                        onClick={() => updateProgress(goal, Math.round(goal.target_value * 0.1) || 1)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono py-1 rounded-lg transition-colors"
                      >
                        +10%
                      </button>
                    </div>
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
