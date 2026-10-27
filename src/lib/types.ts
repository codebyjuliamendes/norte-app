/** Domain types shared by the UI, the data layer and the Supabase schema. */

export type Category = 'vida' | 'estudo' | 'trabalho'

export type TaskPriority = 'normal' | 'alta' | 'urgente'
export type TaskQuadrant = 'fazer' | 'agendar' | 'delegar' | 'eliminar'

export interface Task {
  id: string
  user_id: string
  title: string
  category: Category
  due_date: string | null
  done: boolean
  priority?: TaskPriority | null
  quadrant?: TaskQuadrant | null
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
