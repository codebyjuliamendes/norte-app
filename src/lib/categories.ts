import type { Category } from './types'

export { todayISO, formatDatePT, formatFullDate } from './dates'

export const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: 'vida', label: 'Vida', description: 'Saúde, pessoal, finanças e lazer' },
  { value: 'estudo', label: 'Estudo', description: 'Cursos, faculdade, exames e leitura' },
  { value: 'trabalho', label: 'Trabalho', description: 'Projetos, reuniões e entregas' },
]

export const categoryLabel: Record<Category, string> = {
  vida: 'Vida',
  estudo: 'Estudo',
  trabalho: 'Trabalho',
}

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

/** Fallback for rows whose category is missing/unknown (e.g. legacy local data). */
export function safeCategory(value: unknown): Category {
  return value === 'estudo' || value === 'trabalho' ? value : 'vida'
}
