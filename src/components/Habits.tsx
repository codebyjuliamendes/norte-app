import { useState } from 'react'
import confetti from 'canvas-confetti'
import { Flame, Plus, Trash2, Check } from 'lucide-react'
import { supabase, type Habit, type HabitCheckin, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg, todayISO } from '../lib/categories'
import { lastNDays, formatFullDate } from '../lib/dates'
import { LIMITS, validateTitle } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError, hoverReveal } from './ui'

interface Props {
  habits: Habit[]
  checkins: HabitCheckin[]
  userId: string
  onChange: () => void
}

export default function Habits({ habits, checkins, userId, onChange }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [isAdding, setIsAdding] = useState(false)
  const [busyCell, setBusyCell] = useState<string | null>(null)
  const form = useAsyncAction()
  const rowAction = useAsyncAction()
  const days = lastNDays(7)
  const today = todayISO()

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await form.run(async () => {
      const invalid = validateTitle(name, 'O nome do hábito')
      if (invalid) return invalid
      const err = await errorOf(supabase.from('habits').insert({ name: name.trim(), category, user_id: userId }))
      return err && `Não foi possível salvar o hábito: ${err}`
    })
    if (ok) {
      setName('')
      setIsAdding(false)
      onChange()
    }
  }

  async function remove(habit: Habit) {
    if (!window.confirm(`Excluir o hábito "${habit.name}" e todo o histórico de check-ins?`)) return
    await rowAction.run(async () => {
      // Local-mode rows have no FK cascade, so clear check-ins explicitly.
      const checkinErr = await errorOf(supabase.from('habit_checkins').delete().eq('habit_id', habit.id))
      if (checkinErr) return `Não foi possível excluir os check-ins: ${checkinErr}`
      const err = await errorOf(supabase.from('habits').delete().eq('id', habit.id))
      return err && `Não foi possível excluir o hábito: ${err}`
    })
    onChange()
  }

  async function toggleDay(habitId: string, iso: string) {
    const cell = `${habitId}:${iso}`
    if (busyCell) return
    setBusyCell(cell)
    await rowAction.run(async () => {
      const existing = checkins.find((c) => c.habit_id === habitId && c.checkin_date === iso)
      if (existing) {
        const err = await errorOf(supabase.from('habit_checkins').delete().eq('id', existing.id))
        return err && `Não foi possível desmarcar: ${err}`
      }
      const err = await errorOf(supabase.from('habit_checkins').insert({ habit_id: habitId, checkin_date: iso, user_id: userId }))
      if (!err && iso === today) {
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#10B981', '#6366F1', '#F59E0B'],
          disableForReducedMotion: true,
        })
      }
      return err && `Não foi possível marcar o hábito: ${err}`
    })
    setBusyCell(null)
    onChange()
  }

  return (
    <section aria-labelledby="habits-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-emerald-500" aria-hidden="true" />
          <h2 id="habits-heading" className="text-base font-bold font-display text-white">
            Rastreador de Hábitos
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          aria-expanded={isAdding}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Novo Hábito</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={addHabit}
          aria-label="Novo hábito"
          className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-3"
        >
          <label htmlFor="habit-name" className="sr-only">
            Nome do hábito
          </label>
          <input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do hábito (ex: Ler 10 páginas, Beber 2L de água, Meditar)..."
            maxLength={LIMITS.title}
            required
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
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

            <button
              type="submit"
              disabled={form.pending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
            >
              {form.pending ? 'Salvando...' : 'Salvar Hábito'}
            </button>
          </div>
          <FormError message={form.error} />
        </form>
      )}

      <FormError message={rowAction.error} />

      {habits.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
          <Flame className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-400">Nenhum hábito cadastrado.</p>
          <p className="text-xs text-slate-400 mt-1">Crie um hábito para acompanhar a sua consistência diária.</p>
        </div>
      ) : (
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full table-fixed sm:table-auto border-collapse">
            <caption className="sr-only">Check-ins dos últimos 7 dias</caption>
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-800/40">
                <th
                  scope="col"
                  className="text-left px-2 sm:px-4 py-3 text-xs font-bold font-mono text-slate-400 uppercase tracking-wider"
                >
                  Hábito
                </th>
                {days.map((d) => (
                  <th key={d.iso} scope="col" className="px-0 sm:px-0.5 py-3 w-7 sm:w-9">
                    <span className="flex flex-col items-center" title={formatFullDate(d.iso)}>
                      <span className="text-[10px] font-mono text-slate-400" aria-hidden="true">
                        {d.dayLabel}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${d.iso === today ? 'text-emerald-400' : 'text-slate-300'}`}
                        aria-hidden="true"
                      >
                        {d.dayNum}
                      </span>
                      <span className="sr-only">{formatFullDate(d.iso)}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const streakCount = days.filter((d) =>
                  checkins.some((c) => c.habit_id === h.id && c.checkin_date === d.iso),
                ).length
                return (
                  <tr
                    key={h.id}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20 transition-colors group"
                  >
                    <th scope="row" className="px-2 sm:px-4 py-3 text-left font-normal">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[h.category]}`} aria-hidden="true" />
                        <span className="text-sm font-semibold text-slate-100 truncate min-w-0 sm:max-w-none">{h.name}</span>
                        <span
                          className="hidden sm:flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex-shrink-0"
                          aria-label={`${streakCount} de 7 dias`}
                        >
                          <Flame className="w-3 h-3 fill-current" aria-hidden="true" />
                          <span aria-hidden="true">{streakCount}/7</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(h)}
                          aria-label={`Excluir hábito "${h.name}"`}
                          className={`text-slate-400 hover:text-rose-500 p-1 ml-auto ${hoverReveal}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </th>

                    {days.map((d) => {
                      const checked = checkins.some((c) => c.habit_id === h.id && c.checkin_date === d.iso)
                      return (
                        <td key={d.iso} className="px-0 sm:px-0.5 py-3 text-center">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`${h.name} em ${formatFullDate(d.iso)}`}
                            disabled={busyCell !== null}
                            onClick={() => toggleDay(h.id, d.iso)}
                            className={`w-6 h-6 mx-auto rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                              checked
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                : d.iso === today
                                  ? 'border-emerald-500/50 hover:border-emerald-500 bg-emerald-500/5'
                                  : 'border-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 stroke-[3] animate-checkmark" aria-hidden="true" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
