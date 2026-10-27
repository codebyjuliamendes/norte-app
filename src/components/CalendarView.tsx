import { useState } from 'react'
import { Calendar as CalendarIcon, Plus, Trash2, Clock, BookOpen, Briefcase } from 'lucide-react'
import { supabase, type CalendarEvent, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg, categoryLabel, formatDatePT, todayISO } from '../lib/categories'
import { LIMITS, validateDate, validateMaxLength, validateTitle } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError, hoverReveal } from './ui'

interface Props {
  events: CalendarEvent[]
  userId: string
  onChange: () => void
}

const EVENT_TYPES: { value: CalendarEvent['event_type']; label: string; icon: typeof Clock }[] = [
  { value: 'prazo', label: 'Prazo Final', icon: Clock },
  { value: 'prova', label: 'Prova / Exame', icon: BookOpen },
  { value: 'compromisso', label: 'Compromisso', icon: Briefcase },
]

const TYPE_LABEL: Record<CalendarEvent['event_type'], string> = { prazo: 'Prazo', prova: 'Prova', compromisso: 'Compromisso' }

export default function CalendarView({ events, userId, onChange }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('estudo')
  const [eventType, setEventType] = useState<CalendarEvent['event_type']>('prazo')
  const [eventDate, setEventDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const form = useAsyncAction()
  const rowAction = useAsyncAction()

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    const ok = await form.run(async () => {
      const invalid =
        validateTitle(title, 'O nome do evento') ||
        validateDate(eventDate) ||
        validateMaxLength(notes, 'As observações', LIMITS.noteContent)
      if (invalid) return invalid
      const err = await errorOf(
        supabase.from('events').insert({
          title: title.trim(),
          category,
          event_type: eventType,
          event_date: eventDate,
          notes: notes.trim() || null,
          user_id: userId,
        }),
      )
      return err && `Não foi possível salvar o evento: ${err}`
    })
    if (ok) {
      setTitle('')
      setNotes('')
      setIsAdding(false)
      onChange()
    }
  }

  async function remove(ev: CalendarEvent) {
    if (!window.confirm(`Excluir o evento "${ev.title}"?`)) return
    await rowAction.run(async () => {
      const err = await errorOf(supabase.from('events').delete().eq('id', ev.id))
      return err && `Não foi possível excluir o evento: ${err}`
    })
    onChange()
  }

  const today = todayISO()
  const sortedEvents = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))
  const upcoming = sortedEvents.filter((e) => e.event_date >= today)
  const past = sortedEvents.filter((e) => e.event_date < today).reverse()

  return (
    <section aria-labelledby="calendar-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-500" aria-hidden="true" />
          <h2 id="calendar-heading" className="text-base font-bold font-display text-white">
            Agenda & Prazos
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          aria-expanded={isAdding}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Novo Evento</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={addEvent}
          aria-label="Novo evento"
          className="bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3"
        >
          <label htmlFor="event-title" className="sr-only">
            Nome do evento
          </label>
          <input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome da prova, entrega de trabalho ou reunião..."
            maxLength={LIMITS.title}
            required
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <fieldset>
              <legend className="text-[11px] text-slate-400 block mb-1">Tipo de Evento</legend>
              <div className="flex flex-wrap gap-1">
                {EVENT_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    aria-pressed={eventType === t.value}
                    onClick={() => setEventType(t.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      eventType === t.value
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-semibold'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="event-date" className="text-[11px] text-slate-400 block mb-1">
                Data
              </label>
              <input
                id="event-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs font-mono bg-slate-800 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-notes" className="text-[11px] text-slate-400 block mb-1">
              Observações (opcional)
            </label>
            <textarea
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={LIMITS.noteContent}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
            <div role="group" aria-label="Categoria" className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
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
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
            >
              {form.pending ? 'Salvando...' : 'Salvar Evento'}
            </button>
          </div>
          <FormError message={form.error} />
        </form>
      )}

      <FormError message={rowAction.error} />

      {upcoming.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
          <CalendarIcon className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-400">Nenhum evento futuro agendado.</p>
          <p className="text-xs text-slate-400 mt-1">Adicione prazos de exames, provas ou compromissos acima.</p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Próximos eventos">
          {upcoming.map((ev) => {
            const isToday = ev.event_date === today
            return (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-xl px-4 py-3 group hover:border-amber-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[ev.category]}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                      {isToday && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                          HOJE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {TYPE_LABEL[ev.event_type] ?? ev.event_type} • {categoryLabel[ev.category]}
                    </p>
                    {ev.notes && <p className="text-[11px] text-slate-400 mt-0.5 break-words">{ev.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    {formatDatePT(ev.event_date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(ev)}
                    aria-label={`Excluir "${ev.title}"`}
                    className={`text-slate-400 hover:text-rose-500 p-1 ${hoverReveal}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {past.length > 0 && (
        <div className="pt-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Eventos Anteriores</h3>
          <ul className="space-y-1.5">
            {past.slice(0, 3).map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-slate-400 truncate">{ev.title}</span>
                <span className="font-mono text-slate-400">{formatDatePT(ev.event_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
