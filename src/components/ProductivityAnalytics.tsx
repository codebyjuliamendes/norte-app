import { BarChart3, TrendingUp, Award, Flame, CheckCircle2, Clock, Calendar, Zap } from 'lucide-react'
import type { Task, CalendarEvent, Habit, HabitCheckin } from '../lib/supabase'
import { todayISO } from '../lib/categories'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  habits: Habit[]
  checkins: HabitCheckin[]
  bonusXp: number
}

export default function ProductivityAnalytics({ tasks, events, habits, checkins, bonusXp }: Props) {
  const today = todayISO()
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.done).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const todayHabitsCount = habits.filter((h) =>
    checkins.some((c) => c.habit_id === h.id && c.checkin_date === today)
  ).length
  const habitRate = habits.length > 0 ? Math.round((todayHabitsCount / habits.length) * 100) : 0

  // Calculate Productivity Health Score (0-100%)
  const healthScore = Math.min(100, Math.round(completionRate * 0.5 + habitRate * 0.3 + (bonusXp > 0 ? 20 : 0)))

  return (
    <div className="space-y-6">
      {/* Top Banner: Productivity Health Score */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-display">Saúde da Sua Produtividade 📊</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                  REAL-TIME
                </span>
              </div>
              <p className="text-xs text-slate-400">Métricas consolidadas de tarefas, foco e consistência de hábitos</p>
            </div>
          </div>

          <div className="text-right self-end sm:self-center">
            <span className="font-mono text-3xl font-extrabold text-emerald-400">{healthScore}%</span>
            <span className="text-[11px] text-slate-400 block font-mono">Score de Produtividade</span>
          </div>
        </div>

        {/* Progress Bar Health */}
        <div className="w-full bg-[#0D1117] h-3 rounded-full overflow-hidden p-0.5 border border-[#21262D]">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 h-full rounded-full transition-all duration-700"
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Taxa Conclusão</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-display">{completionRate}%</div>
          <span className="text-[10px] font-mono text-slate-500">
            {completedTasks} de {totalTasks} concluídas
          </span>
        </div>

        <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hábitos Hoje</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-display">{habitRate}%</div>
          <span className="text-[10px] font-mono text-slate-500">
            {todayHabitsCount} de {habits.length} check-ins
          </span>
        </div>

        <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>XP Acumulado</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-display">+{bonusXp} XP</div>
          <span className="text-[10px] font-mono text-slate-500">Bônus por sessões</span>
        </div>

        <div className="bg-[#161B22] border border-[#21262D] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Agenda Próxima</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-display">{events.length}</div>
          <span className="text-[10px] font-mono text-slate-500">Compromissos salvos</span>
        </div>
      </div>
    </div>
  )
}
