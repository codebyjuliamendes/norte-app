import type { Category } from './supabase'

export const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: 'vida', label: 'Vida', description: 'Saúde, pessoal, finanças e lazer' },
  { value: 'estudo', label: 'Estudo', description: 'Cursos, faculdade, exames e leitura' },
  { value: 'trabalho', label: 'Trabalho', description: 'Projetos, reuniões e entregas' },
]

export const categoryDot: Record<Category, string> = {
  vida: 'bg-emerald-500',
  estudo: 'bg-indigo-400',
  trabalho: 'bg-amber-500',
}

export const categoryText: Record<Category, string> = {
  vida: 'text-emerald-400',
  estudo: 'text-indigo-400',
  trabalho: 'text-amber-400',
}

export const categoryBg: Record<Category, string> = {
  vida: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
  estudo: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80',
  trabalho: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
}

export const categoryBorder: Record<Category, string> = {
  vida: 'border-emerald-500/40',
  estudo: 'border-indigo-500/40',
  trabalho: 'border-amber-500/40',
}

export function todayISO(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function formatDatePT(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const today = todayISO()

  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  const todayObj = new Date()
  todayObj.setHours(0, 0, 0, 0)
  dateObj.setHours(0, 0, 0, 0)

  const diffTime = dateObj.getTime() - todayObj.getTime()
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  if (diffDays === -1) return 'Ontem'

  return `${d}/${m}/${y}`
}

export function formatFullDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  return dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
