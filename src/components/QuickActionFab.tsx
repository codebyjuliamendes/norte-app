import { useState } from 'react'
import { Plus, CheckSquare, Calendar, FileText, Target, Clock } from 'lucide-react'

interface Props {
  onOpenTask: () => void
  onOpenEvent: () => void
  onOpenNote: () => void
  onOpenGoal: () => void
  onOpenFocus: () => void
}

export default function QuickActionFab({
  onOpenTask,
  onOpenEvent,
  onOpenNote,
  onOpenGoal,
  onOpenFocus,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
      {isOpen && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => {
              setIsOpen(false)
              onOpenTask()
            }}
            className="flex items-center gap-2.5 bg-[#161B22] border border-[#21262D] hover:border-emerald-500/50 text-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold shadow-lg hover:scale-105 transition-all"
          >
            <span>Nova Tarefa</span>
            <CheckSquare className="w-4 h-4 text-emerald-400 stroke-[1.75]" />
          </button>

          <button
            onClick={() => {
              setIsOpen(false)
              onOpenFocus()
            }}
            className="flex items-center gap-2.5 bg-[#161B22] border border-[#21262D] hover:border-emerald-500/50 text-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold shadow-lg hover:scale-105 transition-all"
          >
            <span>Iniciar Foco (25m)</span>
            <Clock className="w-4 h-4 text-emerald-400 stroke-[1.75]" />
          </button>

          <button
            onClick={() => {
              setIsOpen(false)
              onOpenEvent()
            }}
            className="flex items-center gap-2.5 bg-[#161B22] border border-[#21262D] hover:border-indigo-500/50 text-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold shadow-lg hover:scale-105 transition-all"
          >
            <span>Novo Evento na Agenda</span>
            <Calendar className="w-4 h-4 text-indigo-400 stroke-[1.75]" />
          </button>

          <button
            onClick={() => {
              setIsOpen(false)
              onOpenNote()
            }}
            className="flex items-center gap-2.5 bg-[#161B22] border border-[#21262D] hover:border-amber-500/50 text-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold shadow-lg hover:scale-105 transition-all"
          >
            <span>Nova Anotação</span>
            <FileText className="w-4 h-4 text-amber-400 stroke-[1.75]" />
          </button>

          <button
            onClick={() => {
              setIsOpen(false)
              onOpenGoal()
            }}
            className="flex items-center gap-2.5 bg-[#161B22] border border-[#21262D] hover:border-cyan-500/50 text-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold shadow-lg hover:scale-105 transition-all"
          >
            <span>Nova Meta</span>
            <Target className="w-4 h-4 text-cyan-400 stroke-[1.75]" />
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-xl transition-all duration-200 ${
          isOpen
            ? 'bg-rose-500 text-white rotate-45'
            : 'bg-emerald-400 hover:bg-emerald-300 hover:scale-105'
        }`}
        title="Criar Item Rápido"
      >
        <Plus className="w-6 h-6 stroke-[2.2]" />
      </button>
    </div>
  )
}
