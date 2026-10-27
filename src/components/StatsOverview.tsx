import { CheckCircle2, Calendar, Flame, StickyNote } from 'lucide-react'
import type { Task, CalendarEvent, Note, Habit, HabitCheckin } from '../lib/supabase'
import { todayISO } from '../lib/categories'
import { todaySummary } from '../lib/domain/tasks'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  checkins: HabitCheckin[]
  onSelectTab: (tab: 'tarefas' | 'calendario' | 'notas' | 'habitos') => void
}

const card =
  'text-left bg-[#161B22] border border-[#21262D] hover:border-[#30363D] rounded-2xl p-4 cursor-pointer transition-all w-full'

function Bar({ percent, color, label }: { percent: number; color: string; label: string }) {
  return (
    <div
      className="w-full bg-[#0D1117] h-1.5 rounded-full mt-2.5 overflow-hidden border border-[#21262D]"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
    </div>
  )
}

export default function StatsOverview({ tasks, events, notes, habits, checkins, onSelectTab }: Props) {
  const today = todayISO()
  const summary = todaySummary(tasks, today)
  const upcomingEvents = events.filter((e) => e.event_date >= today).length
  const habitsCheckedToday = habits.filter((h) => checkins.some((c) => c.habit_id === h.id && c.checkin_date === today)).length
  const habitPercent = habits.length > 0 ? Math.round((habitsCheckedToday / habits.length) * 100) : 0

  return (
    <section aria-label="Resumo do dia" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <button type="button" onClick={() => onSelectTab('tarefas')} className={card}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Tarefas Hoje</span>
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">
            {summary.done}/{summary.total}
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">{summary.percent}%</span>
        </div>
        <Bar percent={summary.percent} color="bg-emerald-500" label="Tarefas de hoje concluídas" />
      </button>

      <button type="button" onClick={() => onSelectTab('calendario')} className={card}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Agenda</span>
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Calendar className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">{upcomingEvents}</span>
          <span className="text-[11px] font-mono text-slate-400">Eventos</span>
        </div>
        <p className="text-[11px] text-indigo-300 font-medium mt-2.5 truncate">
          {upcomingEvents > 0 ? `${upcomingEvents} compromisso(s) futuros` : 'Sem eventos futuros'}
        </p>
      </button>

      <button type="button" onClick={() => onSelectTab('habitos')} className={card}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Hábitos Hoje</span>
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Flame className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">
            {habitsCheckedToday}/{habits.length}
          </span>
          <span className="text-[11px] font-mono text-amber-400 font-bold">{habitPercent}%</span>
        </div>
        <Bar percent={habitPercent} color="bg-amber-500" label="Hábitos marcados hoje" />
      </button>

      <button type="button" onClick={() => onSelectTab('notas')} className={card}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Anotações</span>
          <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <StickyNote className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">{notes.length}</span>
          <span className="text-[11px] font-mono text-slate-400">Bloco</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2.5 truncate">
          {notes.length > 0 ? `${notes.length} nota(s) salvas` : 'Sem notas'}
        </p>
      </button>
    </section>
  )
}
