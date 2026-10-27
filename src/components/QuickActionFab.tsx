import { useEffect, useRef, useState } from 'react'
import { Plus, CheckSquare, Calendar, FileText, Target, Clock } from 'lucide-react'

interface Props {
  onOpenTask: () => void
  onOpenEvent: () => void
  onOpenNote: () => void
  onOpenGoal: () => void
  onOpenFocus: () => void
}

export default function QuickActionFab({ onOpenTask, onOpenEvent, onOpenNote, onOpenGoal, onOpenFocus }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [isOpen])

  const actions = [
    { label: 'Nova Tarefa', icon: CheckSquare, color: 'text-emerald-400', onClick: onOpenTask },
    { label: 'Iniciar Foco (25m)', icon: Clock, color: 'text-emerald-400', onClick: onOpenFocus },
    { label: 'Novo Evento na Agenda', icon: Calendar, color: 'text-indigo-400', onClick: onOpenEvent },
    { label: 'Nova Anotação', icon: FileText, color: 'text-amber-400', onClick: onOpenNote },
    { label: 'Nova Meta', icon: Target, color: 'text-cyan-400', onClick: onOpenGoal },
  ]

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2.5">
      {isOpen && (
        <div id="quick-actions" className="flex flex-col items-end gap-2">
          {actions.map(({ label, icon: Icon, color, onClick }) => (
            <button
              type="button"
              key={label}
              onClick={() => {
                setIsOpen(false)
                onClick()
              }}
              className="flex items-center gap-2.5 bg-[#161B22] border border-[#21262D] hover:border-emerald-500/50 text-slate-200 px-4 py-2 rounded-2xl text-xs font-semibold shadow-lg transition-all"
            >
              <span>{label}</span>
              <Icon className={`w-4 h-4 ${color} stroke-[1.75]`} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="quick-actions"
        aria-label={isOpen ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-xl transition-all duration-200 ${
          isOpen ? 'bg-rose-500 text-white rotate-45' : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
        }`}
      >
        <Plus className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
      </button>
    </div>
  )
}
