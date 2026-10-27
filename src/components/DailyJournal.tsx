import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { Heart, Sparkles, Save, BookOpen } from 'lucide-react'
import { supabase, type JournalEntry } from '../lib/supabase'
import { formatDatePT, todayISO } from '../lib/categories'
import { LIMITS, validateMaxLength } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError } from './ui'

interface Props {
  journalEntries: JournalEntry[]
  userId: string
  onChange: () => void
}

const MOODS: { value: JournalEntry['mood']; label: string; icon: string }[] = [
  { value: 'otimo', label: 'Excelente', icon: '😄' },
  { value: 'bem', label: 'Bem', icon: '🙂' },
  { value: 'neutro', label: 'Neutro', icon: '😐' },
  { value: 'cansado', label: 'Cansado', icon: '😴' },
  { value: 'estressado', label: 'Estressado', icon: '😤' },
]

export default function DailyJournal({ journalEntries, userId, onChange }: Props) {
  const today = todayISO()
  const existingToday = journalEntries.find((j) => j.entry_date === today)

  const [mood, setMood] = useState<JournalEntry['mood']>(existingToday?.mood || 'bem')
  const [grat1, setGrat1] = useState(existingToday?.gratitude_1 || '')
  const [grat2, setGrat2] = useState(existingToday?.gratitude_2 || '')
  const [grat3, setGrat3] = useState(existingToday?.gratitude_3 || '')
  const [reflection, setReflection] = useState(existingToday?.reflection || '')
  const [saved, setSaved] = useState(false)
  const save = useAsyncAction()

  // When today's entry arrives after mount (data still loading), hydrate the form once so
  // that saving updates it instead of creating a duplicate entry for the same day.
  const existingId = existingToday?.id
  useEffect(() => {
    if (!existingToday) return
    setMood(existingToday.mood || 'bem')
    setGrat1(existingToday.gratitude_1 || '')
    setGrat2(existingToday.gratitude_2 || '')
    setGrat3(existingToday.gratitude_3 || '')
    setReflection(existingToday.reflection || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const fields = {
      mood,
      gratitude_1: grat1.trim(),
      gratitude_2: grat2.trim(),
      gratitude_3: grat3.trim(),
      reflection: reflection.trim(),
    }
    const ok = await save.run(async () => {
      const invalid =
        validateMaxLength(fields.gratitude_1, 'A gratidão 1', LIMITS.journalShort) ||
        validateMaxLength(fields.gratitude_2, 'A gratidão 2', LIMITS.journalShort) ||
        validateMaxLength(fields.gratitude_3, 'A gratidão 3', LIMITS.journalShort) ||
        validateMaxLength(fields.reflection, 'A reflexão', LIMITS.journalReflection)
      if (invalid) return invalid
      const err = existingToday
        ? await errorOf(supabase.from('journal').update(fields).eq('id', existingToday.id))
        : await errorOf(supabase.from('journal').insert({ user_id: userId, entry_date: today, ...fields }))
      if (!err && !existingToday) confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 }, disableForReducedMotion: true })
      return err && `Não foi possível salvar o registro: ${err}`
    })
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onChange()
    }
  }

  const history = [...journalEntries].sort((a, b) => b.entry_date.localeCompare(a.entry_date))

  return (
    <div className="space-y-6">
      {/* Daily Check-in Card */}
      <form
        onSubmit={handleSave}
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" aria-hidden="true" />
            <h2 className="text-base font-bold text-white font-display">Diário de Humor & Gratidão</h2>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">{formatDatePT(today)}</span>
        </div>

        {/* Mood Selector */}
        <div>
          <p id="mood-label" className="text-xs font-semibold text-slate-300 block mb-2">
            Como você se sente hoje?
          </p>
          <div role="radiogroup" aria-labelledby="mood-label" className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {MOODS.map((m) => (
              <button
                type="button"
                role="radio"
                aria-checked={mood === m.value}
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border transition-all ${
                  mood === m.value
                    ? 'bg-gradient-to-b from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-md scale-105 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-2xl mb-1" aria-hidden="true">
                  {m.icon}
                </span>
                <span className="text-[10px] font-mono">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Gratitudes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3 coisas pelas quais você é grato(a) hoje:</span>
          </p>
          <input
            aria-label="Gratidão 1"
            maxLength={LIMITS.journalShort}
            value={grat1}
            onChange={(e) => setGrat1(e.target.value)}
            placeholder="1. Pelo que é grato hoje?"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
          />
          <input
            aria-label="Gratidão 2"
            maxLength={LIMITS.journalShort}
            value={grat2}
            onChange={(e) => setGrat2(e.target.value)}
            placeholder="2. Outra grande conquista ou benção..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
          />
          <input
            aria-label="Gratidão 3"
            maxLength={LIMITS.journalShort}
            value={grat3}
            onChange={(e) => setGrat3(e.target.value)}
            placeholder="3. Um pequeno momento positivo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Free Reflection */}
        <div>
          <label htmlFor="journal-reflection" className="text-xs font-semibold text-slate-300 block mb-1.5">
            Reflexão do Dia
          </label>
          <textarea
            id="journal-reflection"
            maxLength={LIMITS.journalReflection}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Escreva como foi o seu dia, aprendizados ou insights..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <FormError message={save.error} />
        <button
          type="submit"
          disabled={save.pending}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white rounded-xl py-3 text-xs font-bold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>
            {save.pending
              ? 'Salvando...'
              : saved
                ? 'Registro Salvo com Sucesso!'
                : existingToday
                  ? 'Atualizar Registro de Hoje'
                  : 'Salvar Registro Diário'}
          </span>
        </button>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Histórico de Registros</span>
          </h3>

          <div className="space-y-2">
            {history.map((j) => {
              const moodObj = MOODS.find((m) => m.value === j.mood)
              return (
                <div key={j.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-white font-bold">
                      <span>{moodObj?.icon}</span>
                      <span>Humor: {moodObj?.label}</span>
                    </span>
                    <span>{formatDatePT(j.entry_date)}</span>
                  </div>

                  {(j.gratitude_1 || j.gratitude_2 || j.gratitude_3) && (
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5 pt-1">
                      {j.gratitude_1 && <li>{j.gratitude_1}</li>}
                      {j.gratitude_2 && <li>{j.gratitude_2}</li>}
                      {j.gratitude_3 && <li>{j.gratitude_3}</li>}
                    </ul>
                  )}

                  {j.reflection && <p className="text-slate-400 italic pt-1">"{j.reflection}"</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
