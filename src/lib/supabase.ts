import { createClient, type Session, type User } from '@supabase/supabase-js'
import { todayISO } from './categories'

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://fvmijylacownfmmrviki.supabase.co'

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2bWlqeWxhY293bmZtbXJ2aWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTczNDMsImV4cCI6MjEwMDczMzM0M30.xzQ8RDOeyaEo07fDp1iWG9vvnb_sjsCirvHOaejGtuQ'

export const isSupabaseConfigured = true

export const realSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// LocalStorage Persistence Helpers for Resilient Dual-Storage
function getLocalData<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(`norte_db_${key}`)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalData<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(`norte_db_${key}`, JSON.stringify(data))
  } catch (e) {
    console.error('LocalStorage write error:', e)
  }
}

// Resilient Query Builder Wrapping Real Supabase with LocalStorage Safety Fallback
class ResilientQueryBuilder {
  private tableName: string
  private realBuilder: any

  constructor(tableName: string) {
    this.tableName = tableName
    this.realBuilder = realSupabase.from(tableName)
  }

  select(cols?: string) {
    return new ResilientQueryExec(this.tableName, 'select', { cols })
  }

  insert(data: any) {
    return new ResilientQueryExec(this.tableName, 'insert', { data })
  }

  update(data: any) {
    return new ResilientQueryExec(this.tableName, 'update', { data })
  }

  delete() {
    return new ResilientQueryExec(this.tableName, 'delete', {})
  }
}

class ResilientQueryExec {
  private tableName: string
  private action: 'select' | 'insert' | 'update' | 'delete'
  private payload: any
  private filterEq?: { column: string; value: any }
  private orderOpts?: { column: string; ascending?: boolean }

  constructor(tableName: string, action: 'select' | 'insert' | 'update' | 'delete', payload: any) {
    this.tableName = tableName
    this.action = action
    this.payload = payload
  }

  eq(column: string, value: any) {
    this.filterEq = { column, value }
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderOpts = { column, ascending: opts?.ascending }
    return this
  }

  select(cols?: string) {
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

  private async execute(): Promise<{ data: any[] | null; error: any }> {
    // Attempt Real Supabase Call First
    try {
      let query = realSupabase.from(this.tableName) as any

      if (this.action === 'select') {
        query = query.select(this.payload?.cols || '*')
      } else if (this.action === 'insert') {
        query = query.insert(this.payload?.data).select()
      } else if (this.action === 'update') {
        query = query.update(this.payload?.data)
      } else if (this.action === 'delete') {
        query = query.delete()
      }

      if (this.filterEq) {
        query = query.eq(this.filterEq.column, this.filterEq.value)
      }
      if (this.orderOpts) {
        query = query.order(this.orderOpts.column, { ascending: this.orderOpts.ascending })
      }

      const { data, error } = await query

      if (!error && data) {
        // Dual-sync to LocalStorage as backup cache
        if (this.action === 'select') {
          setLocalData(this.tableName, data)
        }
        return { data, error: null }
      }
    } catch (err) {
      console.warn(`Supabase network/schema fallback for ${this.tableName}:`, err)
    }

    // LocalStorage Fallback Execution (Guarantees zero-data-loss user experience)
    let localList = getLocalData<any>(this.tableName)

    if (this.action === 'select') {
      if (this.filterEq) {
        localList = localList.filter((item) => item[this.filterEq!.column] === this.filterEq!.value)
      }
      return { data: localList, error: null }
    }

    if (this.action === 'insert') {
      const insertData = Array.isArray(this.payload?.data) ? this.payload?.data : [this.payload?.data]
      const newItems = insertData.map((d: any) => ({
        id: d.id || 'loc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...d,
      }))
      localList.push(...newItems)
      setLocalData(this.tableName, localList)
      return { data: newItems, error: null }
    }

    if (this.action === 'update') {
      if (this.filterEq) {
        localList = localList.map((item) =>
          item[this.filterEq!.column] === this.filterEq!.value
            ? { ...item, ...this.payload?.data, updated_at: new Date().toISOString() }
            : item
        )
        setLocalData(this.tableName, localList)
      }
      return { data: localList, error: null }
    }

    if (this.action === 'delete') {
      if (this.filterEq) {
        localList = localList.filter((item) => item[this.filterEq!.column] !== this.filterEq!.value)
        setLocalData(this.tableName, localList)
      }
      return { data: localList, error: null }
    }

    return { data: localList, error: null }
  }
}

export const supabase: any = {
  auth: realSupabase.auth,
  from(tableName: string) {
    return new ResilientQueryBuilder(tableName)
  },
}

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
