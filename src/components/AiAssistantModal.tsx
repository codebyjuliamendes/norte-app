import { useEffect, useRef, useState } from 'react'
import { Sparkles, Bot, Check, ArrowRight, Zap, Search, BrainCircuit } from 'lucide-react'
import { supabase, type Task } from '../lib/supabase'
import { todayISO } from '../lib/categories'
import { queryRagContext } from '../lib/ragEngine'
import { useAsyncAction } from '../lib/useAsyncAction'
import { FormError, Modal } from './ui'

interface Props {
  userId: string
  tasks: Task[]
  onClose: () => void
  onSuccess: () => void
}

const SOURCE_LABEL: Record<string, string> = {
  task: 'Tarefa',
  event: 'Evento',
  note: 'Nota',
  habit: 'Hábito',
  goal: 'Meta',
  journal: 'Diário',
}

const ROUTINE_PRESETS = [
  { title: 'Estudar 45 minutos sem interrupções', category: 'estudo' as const },
  { title: 'Beber 2L de água e fazer caminhada rápida', category: 'vida' as const },
  { title: 'Revisar metas da semana e responder e-mails', category: 'trabalho' as const },
]

export default function AiAssistantModal({ userId, tasks, onClose, onSuccess }: Props) {
  const [selectedTaskToBreak, setSelectedTaskToBreak] = useState<string>('')
  const [createdMsg, setCreatedMsg] = useState<string | null>(null)
  const action = useAsyncAction()
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  // Memory search state
  const [ragQuery, setRagQuery] = useState('')
  const [ragResults, setRagResults] = useState<{ title: string; content: string; sourceType: string; score: number }[] | null>(
    null,
  )
  const [isSearchingRag, setIsSearchingRag] = useState(false)

  async function handleSearchRag(e: React.FormEvent) {
    e.preventDefault()
    if (!ragQuery.trim() || isSearchingRag) return
    setIsSearchingRag(true)
    try {
      setRagResults(await queryRagContext(userId, ragQuery, 5))
    } finally {
      setIsSearchingRag(false)
    }
  }

  async function insertTasks(titles: { title: string; category: Task['category'] }[]): Promise<string | null> {
    const today = todayISO()
    const { error } = await supabase.from('tasks').insert(titles.map((t) => ({ ...t, due_date: today, user_id: userId })))
    return error ? `Não foi possível criar as tarefas: ${error.message}` : null
  }

  function finish(message: string) {
    setCreatedMsg(message)
    onSuccess()
    closeTimer.current = setTimeout(onClose, 1200)
  }

  async function generateBalancedRoutine() {
    const ok = await action.run(() => insertTasks(ROUTINE_PRESETS))
    if (ok) finish('3 tarefas de rotina equilibrada geradas para o seu dia!')
  }

  async function decomposeTask() {
    const targetTask = tasks.find((t) => t.id === selectedTaskToBreak)
    if (!targetTask) return
    const ok = await action.run(() =>
      insertTasks(
        [
          `Passo 1: Preparar material para "${targetTask.title}"`,
          `Passo 2: Executar bloco de foco de 20 min em "${targetTask.title}"`,
          `Passo 3: Revisar e finalizar "${targetTask.title}"`,
        ].map((title) => ({ title: title.slice(0, 200), category: targetTask.category })),
      ),
    )
    if (ok) finish(`Tarefa "${targetTask.title}" decomposta em 3 passos práticos!`)
  }

  const pendingTasks = tasks.filter((t) => !t.done)

  return (
    <Modal
      title="Assistente & Memória"
      description="Sugestões automáticas por regras e busca no seu histórico — sem IA generativa externa."
      onClose={onClose}
      icon={
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
          <Bot className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
        </div>
      }
    >
      {/* RAG Memory Search Box */}
      <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <h3 className="text-xs font-bold text-white">Busca na memória</h3>
        </div>
        <p className="text-xs text-slate-400">
          Pesquise nas tarefas e notas que você salvou, por similaridade de texto (palavras e trechos parecidos).
        </p>

        <form onSubmit={handleSearchRag} className="flex gap-2">
          <input
            type="search"
            aria-label="Buscar na memória"
            maxLength={200}
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Ex: o que tenho de estudo ou reuniões?"
            className="flex-1 bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isSearchingRag || !ragQuery.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isSearchingRag ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {/* RAG Results */}
        {ragResults !== null && ragResults.length === 0 && (
          <p className="text-xs text-slate-400 pt-2 border-t border-[#21262D]">Nada encontrado para essa busca.</p>
        )}
        {ragResults !== null && ragResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#21262D]">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Resultados</span>
            {ragResults.map((r, i) => (
              <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                  <span className="font-bold text-emerald-400">[{SOURCE_LABEL[r.sourceType] ?? r.sourceType}]</span>
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
          <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <h3 className="text-xs font-bold text-white">Sugerir Rotina de Hoje</h3>
        </div>
        <p className="text-xs text-slate-400">Cria 3 tarefas modelo equilibradas (Vida, Estudo e Trabalho) para hoje.</p>
        <button
          type="button"
          onClick={generateBalancedRoutine}
          disabled={action.pending || createdMsg !== null}
          className="w-full flex items-center justify-center gap-2 bg-[#161B22] hover:bg-slate-800 text-white border border-[#30363D] py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
        >
          <span>Gerar Rotina de Hoje</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
        </button>
      </div>

      {/* Action 2: Decompose Task */}
      {pendingTasks.length > 0 && (
        <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <h3 className="text-xs font-bold text-white">Decompor Tarefa Complexa</h3>
          </div>
          <select
            aria-label="Tarefa a decompor"
            value={selectedTaskToBreak}
            onChange={(e) => setSelectedTaskToBreak(e.target.value)}
            className="w-full bg-[#161B22] border border-[#21262D] text-xs text-white rounded-xl p-2.5 outline-none"
          >
            <option value="">Selecione uma tarefa...</option>
            {pendingTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={decomposeTask}
            disabled={action.pending || !selectedTaskToBreak || createdMsg !== null}
            className="w-full flex items-center justify-center gap-2 bg-[#161B22] hover:bg-slate-800 text-white border border-[#30363D] py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <span>Decompor em 3 Passos</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          </button>
        </div>
      )}

      <FormError message={action.error} />
      {createdMsg && (
        <div
          role="status"
          className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>{createdMsg}</span>
        </div>
      )}
    </Modal>
  )
}
