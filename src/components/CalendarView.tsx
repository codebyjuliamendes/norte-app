import { useState } from 'react'
import { Calendar as CalendarIcon, Plus, Trash2, Clock, AlertTriangle, BookOpen, Briefcase, Grid, List } from 'lucide-react'
import { supabase, type CalendarEvent, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg, formatDatePT, formatFullDate, todayISO } from '../lib/categories'

interface Props {
  events: CalendarEvent[]
  userId: string
  onChange: () => void
}

const EVENT_TYPES: { value: CalendarEvent['event_type']; label: string; icon: any }[] = [
  { value: 'prazo', label: 'Prazo Final', icon: Clock },
  { value: 'prova', label: 'Prova / Exame', icon: BookOpen },
  { value: 'compromisso', label: 'Compromisso', icon: Briefcase },
]

export default function CalendarView({ events, userId, onChange }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('estudo')
  const [eventType, setEventType] = useState<CalendarEvent['event_type']>('prazo')
  const [eventDate, setEventDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [viewMode, setViewMode] = useState<'lista' | 'grid'>('lista')

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !eventDate) return
    await supabase.from('events').insert({
      title: title.trim(),
      category,
      event_type: eventType,
      event_date: eventDate,
      notes: notes.trim() || null,
      user_id: userId,
    })
    setTitle('')
    setNotes('')
    setIsAdding(false)
    onChange()
  }

  async function remove(id: string) {
    await supabase.from('events').delete().eq('id', id)
    onChange()
  }

  const today = todayISO()
  const sortedEvents = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))
  const upcoming = sortedEvents.filter((e) => e.event_date >= today)
  const past = sortedEvents.filter((e) => e.event_date < today)

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">Agenda & Prazos</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form
          onSubmit={addEvent}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome da prova, entrega de trabalho ou reunião..."
            autoFocus
            className="w-full text-sm font-medium bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tipo de Evento</label>
              <div className="flex gap-1">
                {EVENT_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setEventType(t.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      eventType === t.value
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Data</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
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
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              Salvar Evento
            </button>
          </div>
        </form>
      )}

      {/* List section */}
      {upcoming.length === 0 ? (
        <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-8 text-center">
          <CalendarIcon className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-400">Nenhum evento futuro agendado.</p>
          <p className="text-xs text-slate-500 mt-1">Adicione prazos de exames, provas ou compromissos acima.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((ev) => {
            const isToday = ev.event_date === today
            return (
              <div
                key={ev.id}
                className="flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-4 py-3 group hover:border-amber-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[ev.category]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ev.title}</p>
                      {isToday && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          HOJE!
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 capitalize font-mono">{ev.event_type} • {ev.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {formatDatePT(ev.event_date)}
                  </span>
                  <button
                    onClick={() => remove(ev.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Past events */}
      {past.length > 0 && (
        <div className="pt-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Eventos Anteriores</h3>
          <div className="space-y-1.5 opacity-50">
            {past.slice(0, 3).map((ev) => (
              <div key={ev.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                <span className="text-slate-300">{ev.title}</span>
                <span className="font-mono text-slate-500">{formatDatePT(ev.event_date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
