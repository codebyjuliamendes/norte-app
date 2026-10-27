import { useState } from 'react'
import { FileSpreadsheet, Copy, Check, Download } from 'lucide-react'
import type { Task, CalendarEvent, Note, Habit, Goal } from '../lib/supabase'
import { todayISO } from '../lib/categories'
import { buildReport } from '../lib/domain/report'
import { FormError } from './ui'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  goals: Goal[]
}

export default function WeeklyReportExporter({ tasks, events, notes, habits, goals }: Props) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reportText = buildReport({ tasks, events, notes, habits, goals })

  async function handleCopyReport() {
    try {
      await navigator.clipboard.writeText(reportText)
      setError(null)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Não foi possível copiar: permissão da área de transferência negada. Use "Baixar".')
    }
  }

  function handleDownloadTxt() {
    const url = URL.createObjectURL(new Blob([reportText], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-norte-${todayISO()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <section aria-labelledby="report-heading" className="space-y-5">
      <div className="bg-[#161B22] border border-[#21262D] rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#21262D] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="report-heading" className="text-base font-bold text-white font-display">
                Gerador de Relatórios
              </h2>
              <p className="text-xs text-slate-400">Exporte um resumo das suas entregas e rotina</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 bg-[#0D1117] hover:bg-slate-800 text-slate-200 border border-[#21262D] px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Baixar (.txt)</span>
            </button>
          </div>
        </div>

        <FormError message={error} />

        <div className="space-y-2">
          <label htmlFor="report-preview" className="text-[10px] font-mono uppercase text-slate-400">
            Pré-visualização do Relatório
          </label>
          <textarea
            id="report-preview"
            readOnly
            value={reportText}
            rows={12}
            className="w-full bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed resize-none"
          />
        </div>
      </div>
    </section>
  )
}
