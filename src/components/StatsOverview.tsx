import { CheckCircle2, Calendar, Flame, StickyNote } from 'lucide-react'
import type { Task, CalendarEvent, Note, Habit, HabitCheckin } from '../lib/supabase'
import { todayISO } from '../lib/categories'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  checkins: HabitCheckin[]
  onSelectTab: (tab: 'tarefas' | 'calendario' | 'notas' | 'habitos') => void
}

export default function StatsOverview({ tasks, events, notes, habits, checkins, onSelectTab }: Props) {
  const today = todayISO()
  const todayTasks = tasks.filter((t) => t.due_date === today || !t.due_date)
  const completedToday = todayTasks.filter((t) => t.done).length
  const totalToday = todayTasks.length
  const percentCompleted = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100

  const upcomingEvents = events.filter((e) => e.event_date >= today).length

  const habitsCheckedToday = habits.filter((h) =>
    checkins.some((c) => c.habit_id === h.id && c.checkin_date === today)
  ).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {/* KPI 1: Tarefas */}
      <div
        onClick={() => onSelectTab('tarefas')}
        className="bg-[#161B22] border border-[#21262D] hover:border-[#30363D] rounded-2xl p-4 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Tarefas Hoje</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 stroke-[1.75]" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">
            {completedToday}/{totalToday}
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            {percentCompleted}%
          </span>
        </div>
        <div className="w-full bg-[#0D1117] h-1.5 rounded-full mt-2.5 overflow-hidden border border-[#21262D]">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentPercent(completedToday, totalToday)}%` }}
          />
        </div>
      </div>

      {/* KPI 2: Agenda */}
      <div
        onClick={() => onSelectTab('calendario')}
        className="bg-[#161B22] border border-[#21262D] hover:border-[#30363D] rounded-2xl p-4 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Agenda</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Calendar className="w-4 h-4 stroke-[1.75]" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">
            {upcomingEvents}
          </span>
          <span className="text-[11px] font-mono text-slate-400">Eventos</span>
        </div>
        <p className="text-[11px] text-indigo-400 font-medium mt-2.5 truncate">
          {upcomingEvents > 0 ? `${upcomingEvents} compromisso(s)` : 'Sem eventos'}
        </p>
      </div>

      {/* KPI 3: Hábitos */}
      <div
        onClick={() => onSelectTab('habitos')}
        className="bg-[#161B22] border border-[#21262D] hover:border-[#30363D] rounded-2xl p-4 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Hábitos Hoje</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Flame className="w-4 h-4 stroke-[1.75]" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">
            {habitsCheckedToday}/{habits.length}
          </span>
          <span className="text-[11px] font-mono text-amber-400 font-bold">
            {habits.length > 0 ? `${Math.round((habitsCheckedToday / habits.length) * 100)}%` : '0%'}
          </span>
        </div>
        <div className="w-full bg-[#0D1117] h-1.5 rounded-full mt-2.5 overflow-hidden border border-[#21262D]">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${habits.length > 0 ? (habitsCheckedToday / habits.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* KPI 4: Notas */}
      <div
        onClick={() => onSelectTab('notas')}
        className="bg-[#161B22] border border-[#21262D] hover:border-[#30363D] rounded-2xl p-4 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Anotações</span>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <StickyNote className="w-4 h-4 stroke-[1.75]" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold font-display text-white">
            {notes.length}
          </span>
          <span className="text-[11px] font-mono text-slate-400">Bloco</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2.5 truncate">
          {notes.length > 0 ? `${notes.length} nota(s) salvas` : 'Sem notas'}
        </p>
      </div>
    </div>
  )
}

function percentPercent(num: number, total: number) {
  return total > 0 ? Math.round((num / total) * 100) : 100
}
