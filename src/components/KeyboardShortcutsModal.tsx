import { Keyboard } from 'lucide-react'
import { Modal } from './ui'

interface Props {
  onClose: () => void
  /** Tabs reachable with the number keys, in order (1–9). */
  tabs: { label: string }[]
}

export default function KeyboardShortcutsModal({ onClose, tabs }: Props) {
  const shortcuts = [
    ...tabs.slice(0, 9).map((t, i) => ({ key: String(i + 1), desc: `Ir para ${t.label}` })),
    { key: 'N', desc: 'Criar nova tarefa' },
    { key: 'F', desc: 'Abrir temporizador de foco' },
    { key: '?', desc: 'Mostrar/ocultar atalhos' },
    { key: 'Esc', desc: 'Fechar janelas' },
  ]

  return (
    <Modal
      title="Atalhos de Teclado"
      description="Funcionam quando o foco não está em um campo de texto."
      onClose={onClose}
      icon={<Keyboard className="w-5 h-5 text-indigo-400" aria-hidden="true" />}
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {shortcuts.map((sc) => (
          <div
            key={sc.key}
            className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs"
          >
            <dt className="text-slate-300">{sc.desc}</dt>
            <dd>
              <kbd className="bg-slate-800 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-slate-700">
                {sc.key}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
