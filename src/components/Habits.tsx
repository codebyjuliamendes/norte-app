import { useState } from 'react'
import confetti from 'canvas-confetti'
import { Flame, Plus, Trash2, Check, Sparkles, Award } from 'lucide-react'
import { supabase, type Habit, type HabitCheckin, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg, todayISO } from '../lib/categories'

interface Props {
  habits: Habit[]
  checkins: HabitCheckin[]
  userId: string
  onChange: () => void
}

function last7Days(): { iso: string; dayNum: number; dayLabel: string }[] {
  const daysMap = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().slice(0, 10)
    return {
      iso,
      dayNum: d.getDate(),
      dayLabel: daysMap[d.getDay()],
    }
  })
}

export default function Habits({ habits, checkins, userId, onChange }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [isAdding, setIsAdding] = useState(false)
  const days = last7Days()
  const today = todayISO()

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('habits').insert({ name: name.trim(), category, user_id: userId })
    setName('')
    setIsAdding(false)
    onChange()
  }

  async function remove(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    onChange()
  }

  async function toggleDay(habitId: string, iso: string) {
    const existing = checkins.find((c) => c.habit_id === habitId && c.checkin_date === iso)
    if (existing) {
      await supabase.from('habit_checkins').delete().eq('id', existing.id)
    } else {
      if (iso === today) {
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#10B981', '#6366F1', '#F59E0B'],
        })
      }
      await supabase.from('habit_checkins').insert({ habit_id: habitId, checkin_date: iso, user_id: userId })
    }
    onChange()
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">Rastreador de Hábitos</h2>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Hábito</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form
          onSubmit={addHabit}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do hábito (ex: Ler 10 páginas, Beber 2L de água, Meditar)..."
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />

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
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              Salvar Hábito
            </button>
          </div>
        </form>
      )}

      {/* Habits Table Card */}
      {habits.length === 0 ? (
        <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-8 text-center">
          <Flame className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-400">Nenhum hábito cadastrado.</p>
          <p className="text-xs text-slate-500 mt-1">Crie um hábito para acompanhar a sua consistência diária.</p>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          {/* Header Row */}
          <div className="grid grid-cols-[1fr_repeat(7,36px)] items-center px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">Hábito</span>
            {days.map((d) => (
              <div key={d.iso} className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-slate-400">{d.dayLabel}</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    d.iso === today ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {d.dayNum}
                </span>
              </div>
            ))}
          </div>

          {/* Habit Rows */}
          {habits.map((h) => {
            const streakCount = days.filter((d) =>
              checkins.some((c) => c.habit_id === h.id && c.checkin_date === d.iso)
            ).length
            const isCompletedToday = checkins.some((c) => c.habit_id === h.id && c.checkin_date === today)

            return (
              <div
                key={h.id}
                className="grid grid-cols-[1fr_repeat(7,36px)] items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group"
              >
                {/* Info */}
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[h.category]}`} />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{h.name}</span>

                  <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ml-auto sm:ml-0 flex-shrink-0">
                    <Flame className="w-3 h-3 fill-current" />
                    <span>{streakCount}/7</span>
                  </div>

                  <button
                    onClick={() => remove(h.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Days */}
                {days.map((d) => {
                  const checked = checkins.some((c) => c.habit_id === h.id && c.checkin_date === d.iso)
                  return (
                    <button
                      key={d.iso}
                      onClick={() => toggleDay(h.id, d.iso)}
                      className="flex justify-center group/btn"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                          checked
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30 scale-105'
                            : d.iso === today
                            ? 'border-emerald-500/50 hover:border-emerald-500 bg-emerald-500/5'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5 stroke-[3] animate-checkmark" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
