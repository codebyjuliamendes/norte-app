import { createClient, type Session, type User } from '@supabase/supabase-js'
import { todayISO } from './categories'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawKey &&
    rawUrl !== 'https://SEU-PROJETO.supabase.co' &&
    !rawUrl.includes('SEU-PROJETO') &&
    rawKey !== 'sua-anon-key-aqui'
)

const realSupabase = isSupabaseConfigured ? createClient(rawUrl!, rawKey!) : null

const DEMO_USER: User = {
  id: 'demo-user-123',
  app_metadata: {},
  user_metadata: { name: 'Usuário Local' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@norte.app',
}

const DEMO_SESSION: Session = {
  access_token: 'demo-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'demo-refresh-token',
  user: DEMO_USER,
}

function getLocalData<T>(key: string, initial: T[]): T[] {
  const stored = localStorage.getItem(`norte_db_${key}`)
  if (!stored) {
    localStorage.setItem(`norte_db_${key}`, JSON.stringify(initial))
    return initial
  }
  try {
    return JSON.parse(stored)
  } catch {
    return initial
  }
}

function setLocalData<T>(key: string, data: T[]) {
  localStorage.setItem(`norte_db_${key}`, JSON.stringify(data))
}

const INITIAL_TASKS: Task[] = [
  {
    id: 't-1',
    user_id: 'demo-user-123',
    title: 'Conhecer o aplicativo Norte',
    category: 'vida',
    due_date: todayISO(),
    done: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-2',
    user_id: 'demo-user-123',
    title: 'Organizar as tarefas da semana',
    category: 'trabalho',
    due_date: todayISO(),
    done: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-3',
    user_id: 'demo-user-123',
    title: 'Estudar para a próxima semana',
    category: 'estudo',
    due_date: null,
    done: false,
    created_at: new Date().toISOString(),
  },
]

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'e-1',
    user_id: 'demo-user-123',
    title: 'Reunião de Alinhamento',
    category: 'trabalho',
    event_date: todayISO(),
    event_type: 'compromisso',
    notes: 'Alinhar metas do mês',
    created_at: new Date().toISOString(),
  },
]

const INITIAL_NOTES: Note[] = [
  {
    id: 'n-1',
    user_id: 'demo-user-123',
    title: 'Bem-vindo ao Norte! 🧭',
    content:
      'Aqui você pode organizar sua vida, estudos e trabalho em um só lugar. Adicione tarefas, eventos no calendário, notas e acompanhe seus hábitos.',
    category: 'vida',
    updated_at: new Date().toISOString(),
  },
]

const INITIAL_HABITS: Habit[] = [
  {
    id: 'h-1',
    user_id: 'demo-user-123',
    name: 'Beber 2L de água',
    category: 'vida',
    created_at: new Date().toISOString(),
  },
  {
    id: 'h-2',
    user_id: 'demo-user-123',
    name: 'Estudar 30 min por dia',
    category: 'estudo',
    created_at: new Date().toISOString(),
  },
]

const INITIAL_CHECKINS: HabitCheckin[] = [
  {
    id: 'c-1',
    habit_id: 'h-1',
    user_id: 'demo-user-123',
    checkin_date: todayISO(),
  },
]

const INITIAL_GOALS: Goal[] = [
  {
    id: 'g-1',
    user_id: 'demo-user-123',
    title: 'Aprender uma nova habilidade ou idioma',
    category: 'estudo',
    target_date: '2026-12-31',
    progress: 40,
    target_value: 100,
    current_value: 40,
    unit: '%',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-2',
    user_id: 'demo-user-123',
    title: 'Manter rotina saudável diária',
    category: 'vida',
    target_date: '2026-08-31',
    progress: 75,
    target_value: 30,
    current_value: 22,
    unit: 'dias',
    created_at: new Date().toISOString(),
  },
]

const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: 'j-1',
    user_id: 'demo-user-123',
    entry_date: todayISO(),
    mood: 'otimo',
    gratitude_1: 'Saúde e energia no dia de hoje',
    gratitude_2: 'Avanço nos projetos e estudos',
    gratitude_3: 'Tempo de qualidade e foco',
    reflection: 'Um ótimo dia de produtividade e conquistas!',
    created_at: new Date().toISOString(),
  },
]

class LocalQueryBuilder {
  private tableName: string
  private filterEq?: { column: string; value: any }
  private pendingAction: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private insertData: any = null
  private updateData: any = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(_cols?: string) {
    this.pendingAction = 'select'
    return this
  }

  order(_column: string, _opts?: { ascending?: boolean }) {
    return this
  }

  eq(column: string, value: any) {
    this.filterEq = { column, value }
    return this
  }

  insert(data: any) {
    this.pendingAction = 'insert'
    this.insertData = data
    return this.execute()
  }

  update(data: any) {
    this.pendingAction = 'update'
    this.updateData = data
    return this
  }

  delete() {
    this.pendingAction = 'delete'
    return this
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute()
      return onfulfilled ? onfulfilled(res) : res
    } catch (err) {
      if (onrejected) return onrejected(err)
      throw err
    }
  }

  private async execute() {
    let initial: any[] = []
    if (this.tableName === 'tasks') initial = INITIAL_TASKS
    else if (this.tableName === 'events') initial = INITIAL_EVENTS
    else if (this.tableName === 'notes') initial = INITIAL_NOTES
    else if (this.tableName === 'habits') initial = INITIAL_HABITS
    else if (this.tableName === 'habit_checkins') initial = INITIAL_CHECKINS
    else if (this.tableName === 'goals') initial = INITIAL_GOALS
    else if (this.tableName === 'journal') initial = INITIAL_JOURNAL

    let list = getLocalData<any>(this.tableName, initial)

    if (this.pendingAction === 'select') {
      if (this.filterEq) {
        list = list.filter((item) => item[this.filterEq!.column] === this.filterEq!.value)
      }
      return { data: list, error: null }
    }

    if (this.pendingAction === 'insert') {
      const newItem = {
        id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...this.insertData,
      }
      list.push(newItem)
      setLocalData(this.tableName, list)
      return { data: [newItem], error: null }
    }

    if (this.pendingAction === 'update') {
      if (this.filterEq) {
        list = list.map((item) =>
          item[this.filterEq!.column] === this.filterEq!.value
            ? { ...item, ...this.updateData, updated_at: new Date().toISOString() }
            : item
        )
        setLocalData(this.tableName, list)
      }
      return { data: list, error: null }
    }

    if (this.pendingAction === 'delete') {
      if (this.filterEq) {
        list = list.filter((item) => item[this.filterEq!.column] !== this.filterEq!.value)
        setLocalData(this.tableName, list)
      }
      return { data: list, error: null }
    }

    return { data: list, error: null }
  }
}

const mockSupabase = {
  auth: {
    async getSession() {
      const loggedOut = localStorage.getItem('norte_demo_logged_out') === 'true'
      return { data: { session: loggedOut ? null : DEMO_SESSION }, error: null }
    },
    onAuthStateChange(_callback: (event: string, session: Session | null) => void) {
      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }
    },
    async signInWithPassword(_credentials: { email: string }) {
      localStorage.removeItem('norte_demo_logged_out')
      return { data: { session: DEMO_SESSION, user: DEMO_USER }, error: null }
    },
    async signUp(_credentials: { email: string }) {
      localStorage.removeItem('norte_demo_logged_out')
      return { data: { session: DEMO_SESSION, user: DEMO_USER }, error: null }
    },
    async signOut() {
      localStorage.setItem('norte_demo_logged_out', 'true')
      window.location.reload()
      return { error: null }
    },
  },
  from(tableName: string) {
    return new LocalQueryBuilder(tableName)
  },
}

export const supabase: any = isSupabaseConfigured ? realSupabase : mockSupabase

export type Category = 'vida' | 'estudo' | 'trabalho'

export interface Task {
  id: string
  user_id: string
  title: string
  category: Category
  due_date: string | null
  done: boolean
  priority?: 'normal' | 'alta' | 'urgente'
  quadrant?: 'fazer' | 'agendar' | 'delegar' | 'eliminar'
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  category: Category
  event_date: string
  event_type: 'prazo' | 'prova' | 'compromisso'
  notes: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  category: Category
  updated_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  category: Category
  created_at: string
}

export interface HabitCheckin {
  id: string
  habit_id: string
  user_id: string
  checkin_date: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  category: Category
  target_date: string
  progress: number
  target_value: number
  current_value: number
  unit: string
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  mood: 'otimo' | 'bem' | 'neutro' | 'cansado' | 'estressado'
  gratitude_1: string
  gratitude_2: string
  gratitude_3: string
  reflection: string
  created_at: string
}
