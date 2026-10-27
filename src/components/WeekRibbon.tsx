import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import type { Task, CalendarEvent } from '../lib/supabase'
import { categoryDot, todayISO } from '../lib/categories'
import { formatFullDate, getWeekDates, parseISODate } from '../lib/dates'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  selectedDate: string
  onSelect: (iso: string) => void
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function WeekRibbon({ tasks, events, selectedDate, onSelect }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const week = getWeekDates(weekOffset)
  const todayIso = todayISO()

  const handleResetToday = () => {
    setWeekOffset(0)
    onSelect(todayIso)
  }

  return (
    <nav
      aria-label="Seletor de dia da semana"
      className="bg-[#161B22] border border-[#21262D] rounded-2xl p-3 sm:p-4 mb-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-emerald-400 stroke-[1.75]" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            {weekOffset === 0
              ? 'Esta Semana'
              : weekOffset === 1
                ? 'Próxima Semana'
                : weekOffset === -1
                  ? 'Semana Passada'
                  : 'Agenda Semanal'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={handleResetToday}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors mr-1"
            >
              Hoje
            </button>
          )}
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Próxima semana"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {week.map((iso) => {
          const dow = parseISODate(iso)?.getDay() ?? 0
          const isToday = iso === todayIso
          const isSelected = iso === selectedDate

          const dayTasks = tasks.filter((t) => t.due_date === iso)
          const dayEvents = events.filter((e) => e.event_date === iso)

          const dayItems = [...dayTasks.map((t) => t.category), ...dayEvents.map((e) => e.category)]
          const uniqueCats = Array.from(new Set(dayItems))

          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${formatFullDate(iso)}${dayTasks.length + dayEvents.length > 0 ? `, ${dayTasks.length} tarefa(s) e ${dayEvents.length} evento(s)` : ''}`}
              className={`flex flex-col items-center justify-between rounded-xl py-2.5 px-1 border transition-all duration-150 ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500/60 text-white font-bold'
                  : isToday
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#0D1117] border-[#21262D] text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">{DIAS[dow]}</span>
              <span className={`font-display text-base font-bold my-0.5 ${isToday ? 'text-emerald-400' : ''}`}>
                {Number(iso.slice(8, 10))}
              </span>
              <span className="flex gap-1 h-2 items-center justify-center">
                {uniqueCats.length === 0 ? (
                  <span className="w-1 h-1 rounded-full opacity-0" />
                ) : (
                  uniqueCats.map((c) => <span key={c} className={`w-1.5 h-1.5 rounded-full ${categoryDot[c]}`} />)
                )}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
