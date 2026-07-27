import { useState } from 'react'
import { Sparkles, Bot, Check, ArrowRight, Zap, X, Search, Database, BrainCircuit } from 'lucide-react'
import { supabase, type Task } from '../lib/supabase'
import { todayISO } from '../lib/categories'
import { queryRagContext, type RagMemory } from '../lib/ragEngine'

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

  // RAG Search State
  const [ragQuery, setRagQuery] = useState('')
  const [ragResults, setRagResults] = useState<{ title: string; content: string; sourceType: string; score: number }[]>([])
  const [isSearchingRag, setIsSearchingRag] = useState(false)

  async function handleSearchRag(e: React.FormEvent) {
    e.preventDefault()
    if (!ragQuery.trim()) return
    setIsSearchingRag(true)
    const results = await queryRagContext(userId, ragQuery, 5)
    setRagResults(results)
    setIsSearchingRag(false)
  }

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
      <div className="bg-[#161B22] border border-[#21262D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Bot className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Assistente IA & Memória RAG 🧠</h2>
              <p className="text-[11px] text-slate-400">Sua memória pessoal indexada no Supabase</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0D1117] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* RAG Memory Search Box */}
        <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white">Consulta à Memória RAG (Supabase)</h3>
          </div>
          <p className="text-xs text-slate-400">
            Pesquise no seu histórico completo de tarefas, notas, compromissos e diário por similaridade semântica.
          </p>

          <form onSubmit={handleSearchRag} className="flex gap-2">
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="Ex: o que tenho de estudo ou reuniões?"
              className="flex-1 bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isSearchingRag || !ragQuery.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>
          </form>

          {/* RAG Results */}
          {ragResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#21262D]">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Contextos Encontrados:</span>
              {ragResults.map((r, i) => (
                <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span className="capitalize font-bold text-emerald-400">[{r.sourceType}]</span>
                    <span>Relevância: {Math.round(r.score * 100)}%</span>
                  </div>
                  <h4 className="font-bold text-white">{r.title}</h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action 1: Suggest Routine */}
        <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white">Sugerir Rotina de Hoje</h3>
          </div>
          <p className="text-xs text-slate-400">
            Gera 3 tarefas equilibradas (*Vida*, *Estudo* e *Trabalho*) para hoje.
          </p>
          <button
            onClick={generateBalancedRoutine}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#161B22] hover:bg-slate-800 text-white border border-[#30363D] py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          >
            <span>Gerar Rotina de Hoje</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>

        {/* Action 2: Decompose Task */}
        {tasks.filter((t) => !t.done).length > 0 && (
          <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">Decompor Tarefa Complexa</h3>
            </div>
            <select
              value={selectedTaskToBreak}
              onChange={(e) => setSelectedTaskToBreak(e.target.value)}
              className="w-full bg-[#161B22] border border-[#21262D] text-xs text-white rounded-xl p-2.5 outline-none"
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
              className="w-full flex items-center justify-center gap-2 bg-[#161B22] hover:bg-slate-800 text-white border border-[#30363D] py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              <span>Decompor em 3 Passos</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        )}

        {createdMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{createdMsg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
