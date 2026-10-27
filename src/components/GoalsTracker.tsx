import { useState } from 'react'
import confetti from 'canvas-confetti'
import { Target, Plus, Trash2, Calendar } from 'lucide-react'
import { supabase, type Goal, type Category } from '../lib/supabase'
import { CATEGORIES, categoryBg, categoryLabel, formatDatePT } from '../lib/categories'
import { applyGoalIncrement, goalPercent, tenPercentStep } from '../lib/domain/progress'
import { LIMITS, validateGoal } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError, hoverReveal } from './ui'

interface Props {
  goals: Goal[]
  userId: string
  onChange: () => void
}

export default function GoalsTracker({ goals, userId, onChange }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [targetDate, setTargetDate] = useState('')
  const [targetValue, setTargetValue] = useState('100')
  const [unit, setUnit] = useState('%')
  const [isAdding, setIsAdding] = useState(false)
  const form = useAsyncAction()
  const rowAction = useAsyncAction()

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    const target = Number(targetValue)
    const ok = await form.run(async () => {
      const invalid = validateGoal({ title, targetDate, targetValue: target, unit })
      if (invalid) return invalid
      const err = await errorOf(
        supabase.from('goals').insert({
          title: title.trim(),
          category,
          target_date: targetDate,
          target_value: target,
          current_value: 0,
          progress: 0,
          unit: unit.trim() || '%',
          user_id: userId,
        }),
      )
      return err && `Não foi possível salvar a meta: ${err}`
    })
    if (ok) {
      setTitle('')
      setTargetDate('')
      setIsAdding(false)
      onChange()
    }
  }

  async function updateProgress(goal: Goal, increment: number) {
    const patch = applyGoalIncrement(goal, increment)
    await rowAction.run(async () => {
      const err = await errorOf(supabase.from('goals').update(patch).eq('id', goal.id))
      if (!err && patch.progress === 100 && goal.progress < 100) {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#10B981', '#6366F1', '#F59E0B'],
          disableForReducedMotion: true,
        })
      }
      return err && `Não foi possível atualizar a meta: ${err}`
    })
    onChange()
  }

  async function remove(goal: Goal) {
    if (!window.confirm(`Excluir a meta "${goal.title}"?`)) return
    await rowAction.run(async () => {
      const err = await errorOf(supabase.from('goals').delete().eq('id', goal.id))
      return err && `Não foi possível excluir a meta: ${err}`
    })
    onChange()
  }

  return (
    <section aria-labelledby="goals-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" aria-hidden="true" />
          <h2 id="goals-heading" className="text-base font-bold font-display text-white">
            Metas & Visão de Futuro
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          aria-expanded={isAdding}
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Nova Meta</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={addGoal}
          aria-label="Nova meta"
          className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 shadow-xl space-y-3"
        >
          <label htmlFor="goal-title" className="sr-only">
            Meta
          </label>
          <input
            id="goal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Qual é a sua grande meta? (ex: Ler 12 livros, Passar na prova)..."
            maxLength={LIMITS.title}
            required
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="goal-date" className="text-[11px] text-slate-400 block mb-1">
                Data Alvo
              </label>
              <input
                id="goal-date"
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 [color-scheme:dark]"
              />
            </div>

            <div>
              <label htmlFor="goal-target" className="text-[11px] text-slate-400 block mb-1">
                Valor Meta
              </label>
              <input
                id="goal-target"
                type="number"
                min="1"
                step="any"
                required
                inputMode="decimal"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label htmlFor="goal-unit" className="text-[11px] text-slate-400 block mb-1">
                Unidade (ex: %, R$, dias)
              </label>
              <input
                id="goal-unit"
                type="text"
                value={unit}
                maxLength={LIMITS.unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, livros, R$"
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
          </div>

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
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
            >
              {form.pending ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </div>
          <FormError message={form.error} />
        </form>
      )}

      <FormError message={rowAction.error} />

      {goals.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
          <Target className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-400">Nenhuma meta definida ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Defina seus grandes objetivos de curto e longo prazo acima.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Metas">
          {goals.map((goal) => {
            const percent = goalPercent(goal.current_value, goal.target_value)
            const isCompleted = percent >= 100
            return (
              <li
                key={goal.id}
                className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-500/40 transition-all group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${categoryBg[goal.category]}`}>
                      {categoryLabel[goal.category]}
                    </span>

                    <button
                      type="button"
                      onClick={() => remove(goal)}
                      aria-label={`Excluir meta "${goal.title}"`}
                      className={`text-slate-400 hover:text-rose-500 p-1 ${hoverReveal}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1 leading-snug break-words">{goal.title}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    <span>Meta para {formatDatePT(goal.target_date)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                    <span className="font-bold text-indigo-300">{percent}%</span>
                  </div>

                  <div
                    className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800"
                    role="progressbar"
                    aria-label={`Progresso de ${goal.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {!isCompleted && (
                    <div className="flex gap-1 pt-1">
                      <button
                        type="button"
                        disabled={rowAction.pending}
                        onClick={() => updateProgress(goal, 1)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono py-1 rounded-lg transition-colors disabled:opacity-60"
                      >
                        +1 {goal.unit}
                      </button>
                      <button
                        type="button"
                        disabled={rowAction.pending}
                        onClick={() => updateProgress(goal, tenPercentStep(goal.target_value))}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono py-1 rounded-lg transition-colors disabled:opacity-60"
                      >
                        +10%
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
