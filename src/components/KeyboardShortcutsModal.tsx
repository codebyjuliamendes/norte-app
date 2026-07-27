import { X, Command, Keyboard } from 'lucide-react'

interface Props {
  onClose: () => void
}

const SHORTCUTS = [
  { key: '1', desc: 'Ir para Tarefas' },
  { key: '2', desc: 'Ir para Temporizador de Foco' },
  { key: '3', desc: 'Ir para Agenda / Calendário' },
  { key: '4', desc: 'Ir para Bloco de Notas' },
  { key: '5', desc: 'Ir para Rastreador de Hábitos' },
  { key: '6', desc: 'Ir para Social & Amigos' },
  { key: '7', desc: 'Ir para Metas' },
  { key: '8', desc: 'Ir para Diário Diário' },
  { key: '9', desc: 'Ir para Conquistas & XP' },
  { key: 'N', desc: 'Criar Nova Tarefa' },
  { key: 'F', desc: 'Iniciar Foco Pomodoro' },
  { key: 'ESC', desc: 'Fechar Modais / Diálogos' },
]

export default function KeyboardShortcutsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white font-display">Atalhos de Teclado Rápido</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="bg-slate-800 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-slate-700">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center border-t border-slate-800">
          <p className="text-[11px] text-slate-500 font-mono">Pressione ESC a qualquer momento para fechar.</p>
        </div>
      </div>
    </div>
  )
}
