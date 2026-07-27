import { useCallback, useEffect, useState } from 'react'
import {
  Compass,
  CheckSquare,
  Calendar as CalendarIcon,
  FileText,
  Flame,
  LogOut,
  Clock,
  Trophy,
  Bot,
  RefreshCw,
  Database,
  Target,
  Heart,
  Users,
  User as UserIcon,
  Keyboard,
} from 'lucide-react'
import {
  supabase,
  isSupabaseConfigured,
  type Task,
  type CalendarEvent,
  type Note,
  type Habit,
  type HabitCheckin,
  type Goal,
  type JournalEntry,
} from './lib/supabase'
import { useAuth } from './lib/useAuth'
import Auth from './components/Auth'
import WeekRibbon from './components/WeekRibbon'
import Tasks from './components/Tasks'
import CalendarView from './components/CalendarView'
import Notes from './components/Notes'
import Habits from './components/Habits'
import StatsOverview from './components/StatsOverview'
import FocusTimer from './components/FocusTimer'
import Gamification from './components/Gamification'
import AiAssistantModal from './components/AiAssistantModal'
import GoalsTracker from './components/GoalsTracker'
import DailyJournal from './components/DailyJournal'
import SocialChallenges from './components/SocialChallenges'
import QuickActionFab from './components/QuickActionFab'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import KanbanBoard from './components/KanbanBoard'
import ProductivityAnalytics from './components/ProductivityAnalytics'
import WeeklyReportExporter from './components/WeeklyReportExporter'
import UserProfileModal from './components/UserProfileModal'
import NorteLogo from './components/NorteLogo'
import { todayISO, formatDatePT } from './lib/categories'
import { LayoutGrid, BarChart3, FileSpreadsheet } from 'lucide-react'

type Tab =
  | 'tarefas'
  | 'kanban'
  | 'foco'
  | 'calendario'
  | 'notas'
  | 'habitos'
  | 'metrica'
  | 'relatorio'
  | 'social'
  | 'metas'
  | 'diario'
  | 'conquistas'

const TABS: { value: Tab; label: string; icon: any }[] = [
  { value: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { value: 'foco', label: 'Foco', icon: Clock },
  { value: 'calendario', label: 'Agenda', icon: CalendarIcon },
  { value: 'notas', label: 'Notas', icon: FileText },
  { value: 'habitos', label: 'Hábitos', icon: Flame },
  { value: 'metrica', label: 'Métricas', icon: BarChart3 },
  { value: 'relatorio', label: 'Relatório', icon: FileSpreadsheet },
  { value: 'social', label: 'Social', icon: Users },
  { value: 'metas', label: 'Metas', icon: Target },
  { value: 'diario', label: 'Diário', icon: Heart },
  { value: 'conquistas', label: 'Nível & XP', icon: Trophy },
]

export default function App() {
  const { session, loading, user } = useAuth()
  const [tab, setTab] = useState<Tab>('tarefas')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [bonusXp, setBonusXp] = useState(0)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<HabitCheckin[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])

  const loadData = useCallback(async () => {
    if (!user) return
    const [t, e, n, h, c, g, j] = await Promise.all([
      supabase.from('tasks').select('*').order('due_date', { ascending: true }),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('notes').select('*'),
      supabase.from('habits').select('*').order('created_at', { ascending: true }),
      supabase.from('habit_checkins').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('journal').select('*'),
    ])
    setTasks(t.data ?? [])
    setEvents(e.data ?? [])
    setNotes(n.data ?? [])
    setHabits(h.data ?? [])
    setCheckins(c.data ?? [])
    setGoals(g.data ?? [])
    setJournalEntries(j.data ?? [])
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev)
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false)
        setShowAiModal(false)
      } else if (e.key >= '1' && e.key <= '9') {
        const tabIndex = Number(e.key) - 1
        if (TABS[tabIndex]) {
          setTab(TABS[tabIndex].value)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePomodoroReward = (xp: number) => {
    setBonusXp((prev) => prev + xp)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1117] text-slate-400 gap-3">
        <Compass className="w-9 h-9 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono">Carregando o Norte...</p>
      </div>
    )
  }

  if (!session || !user) {
    return <Auth />
  }

  const userAccountLabel = user.email || user.phone || 'Usuário Conectado'
  const pendingCount = tasks.filter((t) => t.due_date === selectedDate && !t.done).length

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F0F6FC] pb-20">
      {/* Editorial Top Header */}
      <header className="sticky top-0 z-30 bg-[#0D1117]/90 backdrop-blur-md border-b border-[#21262D]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <NorteLogo showText size={38} />

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* Clickable User Profile Avatar Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 bg-[#161B22] hover:bg-[#1F242C] text-slate-200 border border-[#30363D] hover:border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all group"
              title="Meu Perfil e Personalização"
            >
              <div className="w-5 h-5 rounded-lg bg-[#0D1117] border border-[#30363D] flex items-center justify-center text-xs overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.user_metadata?.avatar || '🧭'}</span>
                )}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate font-mono text-[11px] font-bold text-white">
                {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Perfil'}
              </span>
            </button>

            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1.5 bg-[#161B22] hover:bg-[#1F242C] text-slate-200 border border-[#30363D] text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Assistente</span>
            </button>

            {/* Shortcuts help button */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161B22] transition-colors"
              title="Atalhos de Teclado (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161B22] transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Sair */}
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* KPI Dashboard */}
        <StatsOverview
          tasks={tasks}
          events={events}
          notes={notes}
          habits={habits}
          checkins={checkins}
          onSelectTab={setTab}
        />

        {/* Week Ribbon Date Selector */}
        <WeekRibbon
          tasks={tasks}
          events={events}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        {/* Selected date alert */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-4 py-2.5 mb-5">
            <span className="text-xs font-medium text-emerald-300">
              {pendingCount} pendência{pendingCount > 1 ? 's' : ''} para {formatDatePT(selectedDate)}
            </span>
            <button onClick={() => setTab('tarefas')} className="text-xs font-bold text-emerald-400 hover:underline">
              Ver tarefas →
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="mb-6">
          <div className="flex gap-1 bg-[#161B22] border border-[#21262D] rounded-2xl p-1.5 shadow-sm overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              const isActive = tab === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`flex-1 min-w-[65px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#0D1117] text-white border border-[#30363D] font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F242C]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Main Content View */}
        <main>
          {tab === 'tarefas' && (
            <Tasks tasks={tasks} userId={user.id} onChange={loadData} selectedDate={selectedDate} />
          )}
          {tab === 'kanban' && (
            <KanbanBoard tasks={tasks} userId={user.id} onChange={loadData} />
          )}
          {tab === 'foco' && <FocusTimer onSessionComplete={handlePomodoroReward} />}
          {tab === 'calendario' && (
            <CalendarView events={events} userId={user.id} onChange={loadData} />
          )}
          {tab === 'notas' && <Notes notes={notes} userId={user.id} onChange={loadData} />}
          {tab === 'habitos' && (
            <Habits habits={habits} checkins={checkins} userId={user.id} onChange={loadData} />
          )}
          {tab === 'metrica' && (
            <ProductivityAnalytics
              tasks={tasks}
              events={events}
              habits={habits}
              checkins={checkins}
              bonusXp={bonusXp}
            />
          )}
          {tab === 'relatorio' && (
            <WeeklyReportExporter
              tasks={tasks}
              events={events}
              notes={notes}
              habits={habits}
              checkins={checkins}
              goals={goals}
            />
          )}
          {tab === 'social' && <SocialChallenges />}
          {tab === 'metas' && (
            <GoalsTracker goals={goals} userId={user.id} onChange={loadData} />
          )}
          {tab === 'diario' && (
            <DailyJournal journalEntries={journalEntries} userId={user.id} onChange={loadData} />
          )}
          {tab === 'conquistas' && (
            <Gamification
              tasks={tasks}
              events={events}
              notes={notes}
              habits={habits}
              checkins={checkins}
              bonusXp={bonusXp}
            />
          )}
        </main>
      </div>

      {/* Floating Action Button (FAB) */}
      <QuickActionFab
        onOpenTask={() => setTab('tarefas')}
        onOpenEvent={() => setTab('calendario')}
        onOpenNote={() => setTab('notas')}
        onOpenGoal={() => setTab('metas')}
        onOpenFocus={() => setTab('foco')}
      />

      {/* AI Assistant Modal */}
      {showAiModal && (
        <AiAssistantModal
          userId={user.id}
          tasks={tasks}
          onClose={() => setShowAiModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={loadData}
        />
      )}
    </div>
  )
}
