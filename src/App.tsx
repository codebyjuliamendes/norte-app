import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
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
  Target,
  Heart,
  Users,
  Keyboard,
  LayoutGrid,
  BarChart3,
  FileSpreadsheet,
  CloudOff,
  HardDrive,
} from 'lucide-react'
import {
  supabase,
  type Task,
  type CalendarEvent,
  type Note,
  type Habit,
  type HabitCheckin,
  type Goal,
  type JournalEntry,
} from './lib/supabase'
import { useAuth, useSyncStatus } from './lib/useAuth'
import { safeCategory, todayISO, formatDatePT } from './lib/categories'
import Auth from './components/Auth'
import WeekRibbon from './components/WeekRibbon'
import StatsOverview from './components/StatsOverview'
import Tasks from './components/Tasks'
import FocusTimer from './components/FocusTimer'
import QuickActionFab from './components/QuickActionFab'
import NorteLogo from './components/NorteLogo'
import { FormError } from './components/ui'

// Secondary screens are code-split to keep the initial bundle small.
const KanbanBoard = lazy(() => import('./components/KanbanBoard'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const Notes = lazy(() => import('./components/Notes'))
const Habits = lazy(() => import('./components/Habits'))
const ProductivityAnalytics = lazy(() => import('./components/ProductivityAnalytics'))
const WeeklyReportExporter = lazy(() => import('./components/WeeklyReportExporter'))
const SocialChallenges = lazy(() => import('./components/SocialChallenges'))
const GoalsTracker = lazy(() => import('./components/GoalsTracker'))
const DailyJournal = lazy(() => import('./components/DailyJournal'))
const Gamification = lazy(() => import('./components/Gamification'))
const AiAssistantModal = lazy(() => import('./components/AiAssistantModal'))
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'))
const UserProfileModal = lazy(() => import('./components/UserProfileModal'))

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

const TABS: { value: Tab; label: string; icon: typeof Compass }[] = [
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

interface AppData {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  checkins: HabitCheckin[]
  goals: Goal[]
  journal: JournalEntry[]
}

const EMPTY_DATA: AppData = { tasks: [], events: [], notes: [], habits: [], checkins: [], goals: [], journal: [] }

/** Normalizes rows coming from storage (legacy/local rows may miss fields). */
function withCategory<T extends { category: unknown }>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).map((r) => ({ ...r, category: safeCategory(r.category) }))
}

function readBonusXp(userId: string): number {
  try {
    const v = Number(window.localStorage.getItem(`norte_bonus_xp_${userId}`))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

function TabFallback() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-xs font-mono text-slate-400">
      <Compass className="w-4 h-4 animate-spin" aria-hidden="true" />
      <span>Carregando...</span>
    </div>
  )
}

export default function App() {
  const { session, loading, user } = useAuth()
  const sync = useSyncStatus()
  const [tab, setTab] = useState<Tab>('tarefas')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [bonusXp, setBonusXp] = useState(0)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const loadSeq = useRef(0)
  const userId = user?.id ?? null

  const loadData = useCallback(async () => {
    if (!userId) return
    const seq = ++loadSeq.current
    setDataLoading(true)
    try {
      const [t, e, n, h, c, g, j] = await Promise.all([
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('events').select('*').order('event_date', { ascending: true }),
        supabase.from('notes').select('*'),
        supabase.from('habits').select('*').order('created_at', { ascending: true }),
        supabase.from('habit_checkins').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('journal').select('*'),
      ])
      if (seq !== loadSeq.current) return // a newer load superseded this one
      const failed = [t, e, n, h, c, g, j].find((r) => r.error)
      setDataError(failed?.error ? `Alguns dados não puderam ser carregados: ${failed.error.message}` : null)
      setData({
        tasks: withCategory(t.data as Task[]),
        events: withCategory(e.data as CalendarEvent[]),
        notes: withCategory(n.data as Note[]),
        habits: withCategory(h.data as Habit[]),
        checkins: (c.data as HabitCheckin[]) ?? [],
        goals: withCategory(g.data as Goal[]),
        journal: (j.data as JournalEntry[]) ?? [],
      })
    } catch (err) {
      if (seq === loadSeq.current) setDataError(err instanceof Error ? err.message : 'Falha ao carregar os dados.')
    } finally {
      if (seq === loadSeq.current) setDataLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setData(EMPTY_DATA)
    setBonusXp(userId ? readBonusXp(userId) : 0)
    void loadData()
  }, [loadData, userId])

  const handlePomodoroReward = useCallback(
    (xp: number) => {
      setBonusXp((prev) => {
        const next = prev + xp
        try {
          if (userId) window.localStorage.setItem(`norte_bonus_xp_${userId}`, String(next))
        } catch {
          /* ignore storage errors */
        }
        return next
      })
    },
    [userId],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return
      if (document.querySelector('[role="dialog"]') && e.key !== '?') return

      if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev)
      } else if (e.key >= '1' && e.key <= '9') {
        const next = TABS[Number(e.key) - 1]
        if (next) setTab(next.value)
      } else if (e.key === 'n' || e.key === 'N') {
        setTab('tarefas')
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-controls="new-task-form"]')?.click())
      } else if (e.key === 'f' || e.key === 'F') {
        setTab('foco')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (loading) {
    return (
      <div role="status" className="min-h-screen flex flex-col items-center justify-center bg-[#0D1117] text-slate-400 gap-3">
        <Compass className="w-9 h-9 text-emerald-400 animate-spin" aria-hidden="true" />
        <p className="text-xs font-mono">Carregando o Norte...</p>
      </div>
    )
  }

  if (!session || !user) {
    return <Auth />
  }

  const { tasks, events, notes, habits, checkins, goals, journal } = data
  const pendingCount = tasks.filter((t) => t.due_date === selectedDate && !t.done).length
  const degradedTables = Object.keys(sync.degraded)
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const avatarUrl = typeof meta.avatar_url === 'string' && /^https:\/\//.test(meta.avatar_url) ? meta.avatar_url : null
  const displayName = (typeof meta.name === 'string' && meta.name) || user.email?.split('@')[0] || 'Perfil'

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F0F6FC] pb-24">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 bg-[#0D1117]/90 backdrop-blur-md border-b border-[#21262D]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <NorteLogo showText size={38} />

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 bg-[#161B22] hover:bg-[#1F242C] text-slate-200 border border-[#30363D] hover:border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
              aria-label="Meu perfil e personalização"
            >
              <span
                className="w-5 h-5 rounded-lg bg-[#0D1117] border border-[#30363D] flex items-center justify-center text-xs overflow-hidden"
                aria-hidden="true"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{typeof meta.avatar === 'string' ? meta.avatar : '🧭'}</span>
                )}
              </span>
              <span className="hidden sm:inline max-w-[100px] truncate font-mono text-[11px] font-bold text-white">
                {displayName}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1.5 bg-[#161B22] hover:bg-[#1F242C] text-slate-200 border border-[#30363D] text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all"
              aria-label="Abrir assistente"
            >
              <Bot className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="hidden sm:inline">Assistente</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161B22] transition-colors"
              aria-label="Atalhos de teclado (?)"
              title="Atalhos de teclado (?)"
            >
              <Keyboard className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={dataLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161B22] transition-colors disabled:opacity-60"
              aria-label={dataLoading ? 'Atualizando dados' : 'Atualizar dados'}
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Encerrar a sessão?')) void supabase.auth.signOut()
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-2 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors"
              aria-label="Encerrar sessão"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {sync.mode === 'local' && (
          <p className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 mb-4">
            <HardDrive className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
            <span>Modo local: seus dados ficam salvos apenas neste navegador.</span>
          </p>
        )}
        {sync.mode === 'cloud' && degradedTables.length > 0 && (
          <p
            role="status"
            className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-xl px-3 py-2 mb-4"
          >
            <CloudOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Sem sincronização no momento. Alterações recentes foram salvas neste dispositivo e serão enviadas quando possível.
              Use “Atualizar dados” para tentar novamente.
            </span>
          </p>
        )}
        <FormError message={dataError} />

        <StatsOverview tasks={tasks} events={events} notes={notes} habits={habits} checkins={checkins} onSelectTab={setTab} />

        <WeekRibbon tasks={tasks} events={events} selectedDate={selectedDate} onSelect={setSelectedDate} />

        {pendingCount > 0 && (
          <div className="flex items-center justify-between gap-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-4 py-2.5 mb-5">
            <span className="text-xs font-medium text-emerald-300">
              {pendingCount} pendência{pendingCount > 1 ? 's' : ''} para {formatDatePT(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => setTab('tarefas')}
              className="text-xs font-bold text-emerald-400 hover:underline"
            >
              Ver tarefas →
            </button>
          </div>
        )}

        <nav aria-label="Seções" className="mb-6">
          <div className="flex gap-1 bg-[#161B22] border border-[#21262D] rounded-2xl p-1.5 shadow-sm overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              const isActive = tab === t.value
              return (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex-1 min-w-[72px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-2 rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0D1117] text-white border border-[#30363D] font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F242C]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.75]" aria-hidden="true" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <main id="conteudo" tabIndex={-1} className="outline-none">
          {/* The timer stays mounted so it keeps running (and playing sound) while you browse other tabs. */}
          <div hidden={tab !== 'foco'}>
            <FocusTimer onSessionComplete={handlePomodoroReward} />
          </div>

          <Suspense fallback={<TabFallback />}>
            {tab === 'tarefas' && <Tasks tasks={tasks} userId={user.id} onChange={loadData} selectedDate={selectedDate} />}
            {tab === 'kanban' && <KanbanBoard tasks={tasks} userId={user.id} onChange={loadData} />}
            {tab === 'calendario' && <CalendarView events={events} userId={user.id} onChange={loadData} />}
            {tab === 'notas' && <Notes notes={notes} userId={user.id} onChange={loadData} />}
            {tab === 'habitos' && <Habits habits={habits} checkins={checkins} userId={user.id} onChange={loadData} />}
            {tab === 'metrica' && (
              <ProductivityAnalytics tasks={tasks} events={events} habits={habits} checkins={checkins} bonusXp={bonusXp} />
            )}
            {tab === 'relatorio' && (
              <WeeklyReportExporter tasks={tasks} events={events} notes={notes} habits={habits} goals={goals} />
            )}
            {tab === 'social' && <SocialChallenges userId={user.id} onScheduled={loadData} />}
            {tab === 'metas' && <GoalsTracker goals={goals} userId={user.id} onChange={loadData} />}
            {tab === 'diario' && <DailyJournal journalEntries={journal} userId={user.id} onChange={loadData} />}
            {tab === 'conquistas' && (
              <Gamification tasks={tasks} events={events} notes={notes} checkins={checkins} bonusXp={bonusXp} />
            )}
          </Suspense>
        </main>
      </div>

      <QuickActionFab
        onOpenTask={() => setTab('tarefas')}
        onOpenEvent={() => setTab('calendario')}
        onOpenNote={() => setTab('notas')}
        onOpenGoal={() => setTab('metas')}
        onOpenFocus={() => setTab('foco')}
      />

      <Suspense fallback={null}>
        {showAiModal && (
          <AiAssistantModal userId={user.id} tasks={tasks} onClose={() => setShowAiModal(false)} onSuccess={loadData} />
        )}
        {showShortcutsModal && <KeyboardShortcutsModal tabs={TABS} onClose={() => setShowShortcutsModal(false)} />}
        {showProfileModal && (
          <UserProfileModal user={user} onClose={() => setShowProfileModal(false)} onUpdateProfile={loadData} />
        )}
      </Suspense>
    </div>
  )
}
