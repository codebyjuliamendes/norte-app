import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://fvmijylacownfmmrviki.supabase.co'

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2bWlqeWxhY293bmZtbXJ2aWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTczNDMsImV4cCI6MjEwMDczMzM0M30.xzQ8RDOeyaEo07fDp1iWG9vvnb_sjsCirvHOaejGtuQ'

export const isSupabaseConfigured = true

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
