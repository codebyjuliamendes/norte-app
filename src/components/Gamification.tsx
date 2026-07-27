import { Trophy, Award, Zap, Star, ShieldCheck, Flame, Target, Sparkles, CheckCircle2 } from 'lucide-react'
import type { Task, CalendarEvent, Note, Habit, HabitCheckin } from '../lib/supabase'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  checkins: HabitCheckin[]
  bonusXp?: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: any
  xpReward: number
  unlocked: boolean
  color: string
}

export default function Gamification({ tasks, events, notes, habits, checkins, bonusXp = 0 }: Props) {
  const completedTasks = tasks.filter((t) => t.done).length
  const totalNotes = notes.length
  const totalEvents = events.length
  const totalCheckins = checkins.length

  // XP Calculation
  const baseTaskXp = completedTasks * 25
  const baseHabitXp = totalCheckins * 20
  const baseNoteXp = totalNotes * 15
  const baseEventXp = totalEvents * 15

  const totalXp = baseTaskXp + baseHabitXp + baseNoteXp + baseEventXp + bonusXp

  // Level logic (each level requires 200 XP)
  const currentLevel = Math.floor(totalXp / 200) + 1
  const xpInCurrentLevel = totalXp % 200
  const xpToNextLevel = 200 - xpInCurrentLevel
  const levelProgressPercent = Math.round((xpInCurrentLevel / 200) * 100)

  const LEVEL_TITLES = [
    'Iniciante da Rotina',
    'Aprendiz de Organização',
    'Explorador Focado',
    'Mestre da Produtividade',
    'Especialista em Foco',
    'Lenda do Norte',
  ]

  const titleForLevel = LEVEL_TITLES[Math.min(currentLevel - 1, LEVEL_TITLES.length - 1)]

  const ACHIEVEMENTS: Achievement[] = [
    {
      id: 'first-task',
      title: 'Primeiro Passo',
      description: 'Conclua a sua 1ª tarefa',
      icon: Target,
      xpReward: 50,
      unlocked: completedTasks >= 1,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'task-master',
      title: 'Máquina de Entregas',
      description: 'Conclua 5 tarefas',
      icon: Zap,
      xpReward: 100,
      unlocked: completedTasks >= 5,
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'habit-starter',
      title: 'Consistência Diária',
      description: 'Marque o seu 1º hábito',
      icon: Flame,
      xpReward: 40,
      unlocked: totalCheckins >= 1,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'note-taker',
      title: 'Escriba do Norte',
      description: 'Crie 1 anotação rápida',
      icon: Star,
      xpReward: 30,
      unlocked: totalNotes >= 1,
      color: 'from-pink-500 to-rose-600',
    },
    {
      id: 'planner',
      title: 'Visão de Futuro',
      description: 'Agende 1 evento na agenda',
      icon: Award,
      xpReward: 30,
      unlocked: totalEvents >= 1,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      id: 'streak-master',
      title: 'Inabalável',
      description: 'Acumule 10 checkins em hábitos',
      icon: Trophy,
      xpReward: 150,
      unlocked: totalCheckins >= 10,
      color: 'from-purple-600 to-pink-600',
    },
  ]

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Level Header Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-slate-900/80 p-5 rounded-2xl border border-indigo-500/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex flex-col items-center justify-center font-display font-extrabold shadow-lg shadow-indigo-500/30">
            <span className="text-[10px] opacity-80 uppercase tracking-wide">Nível</span>
            <span className="text-xl leading-none">{currentLevel}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{titleForLevel}</h2>
              <span className="text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {totalXp} XP TOTAL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Faltam <span className="font-bold text-indigo-300">{xpToNextLevel} XP</span> para o Nível {currentLevel + 1}
            </p>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="w-full sm:w-48 space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-slate-300">
            <span>Progresso</span>
            <span>{levelProgressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-indigo-500/30">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${levelProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">Conquistas Desbloqueáveis</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {unlockedCount}/{ACHIEVEMENTS.length} Desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const Icon = ach.icon
            return (
              <div
                key={ach.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  ach.unlocked
                    ? 'bg-slate-900/80 border-indigo-500/40 shadow-sm'
                    : 'bg-slate-900/30 border-slate-800/50 opacity-40 grayscale'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ach.color} text-white flex items-center justify-center flex-shrink-0 shadow-md`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate">{ach.title}</h4>
                    {ach.unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{ach.description}</p>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">+{ach.xpReward} XP</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
