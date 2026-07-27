import { useState } from 'react'
import { Sparkles, Bot, Check, ArrowRight, Lightbulb, Zap, X } from 'lucide-react'
import { supabase, type Task } from '../lib/supabase'
import { todayISO } from '../lib/categories'

interface Props {
  userId: string
  tasks: Task[]
  onClose: () => void
  onSuccess: () => void
}

const ROUTINE_PRESETS = [
  { title: 'Estudar 45 minutos sem interrupções', category: 'estudo' as const },
  { title: 'Beber 2L de água e fazer caminhada rápida', category: 'vida' as const },
  { title: 'Revisar metas da semana e responder e-mails', category: 'trabalho' as const },
]

export default function AiAssistantModal({ userId, tasks, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedTaskToBreak, setSelectedTaskToBreak] = useState<string>('')
  const [createdMsg, setCreatedMsg] = useState<string | null>(null)

  async function generateBalancedRoutine() {
    setLoading(true)
    const today = todayISO()
    for (const preset of ROUTINE_PRESETS) {
      await supabase.from('tasks').insert({
        title: preset.title,
        category: preset.category,
        due_date: today,
        user_id: userId,
      })
    }
    setLoading(false)
    setCreatedMsg('3 tarefas de rotina equilibrada geradas para o seu dia!')
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 1200)
  }

  async function decomposeTask() {
    if (!selectedTaskToBreak) return
    const targetTask = tasks.find((t) => t.id === selectedTaskToBreak)
    if (!targetTask) return

    setLoading(true)
    const today = todayISO()

    const subSteps = [
      `Passo 1: Preparar material para "${targetTask.title}"`,
      `Passo 2: Executar bloco de foco de 20 min em "${targetTask.title}"`,
      `Passo 3: Revisar e finalizar "${targetTask.title}"`,
    ]

    for (const stepTitle of subSteps) {
      await supabase.from('tasks').insert({
        title: stepTitle,
        category: targetTask.category,
        due_date: today,
        user_id: userId,
      })
    }

    setLoading(false)
    setCreatedMsg(`Tarefa "${targetTask.title}" decomposta em 3 passos práticos!`)
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Assistente do Norte</h2>
              <p className="text-[11px] text-slate-400">Inteligência de rotina e decomposição</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action 1: Suggest Routine */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white">Sugerir Rotina do Dia</h3>
          </div>
          <p className="text-xs text-slate-400">
            Gera automaticamente 3 tarefas fundamentais equilibradas (*Vida*, *Estudo* e *Trabalho*) para hoje.
          </p>
          <button
            onClick={generateBalancedRoutine}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-60"
          >
            <span>Gerar Rotina de Hoje</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action 2: Decompose Task */}
        {tasks.filter((t) => !t.done).length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">Decompor Tarefa Complexa</h3>
            </div>
            <p className="text-xs text-slate-400">
              Escolha uma tarefa pendente para dividi-la em 3 micro-passos acionáveis.
            </p>

            <select
              value={selectedTaskToBreak}
              onChange={(e) => setSelectedTaskToBreak(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl p-2.5 outline-none"
            >
              <option value="">Selecione uma tarefa...</option>
              {tasks
                .filter((t) => !t.done)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>

            <button
              onClick={decomposeTask}
              disabled={loading || !selectedTaskToBreak}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <span>Decompor em 3 Passos</span>
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {createdMsg && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{createdMsg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
