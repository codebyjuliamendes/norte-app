import { useState } from 'react'
import { FileSpreadsheet, Copy, Check, Download, Sparkles, CheckCircle2 } from 'lucide-react'
import type { Task, CalendarEvent, Note, Habit, HabitCheckin, Goal } from '../lib/supabase'
import { todayISO, formatDatePT } from '../lib/categories'

interface Props {
  tasks: Task[]
  events: CalendarEvent[]
  notes: Note[]
  habits: Habit[]
  checkins: HabitCheckin[]
  goals: Goal[]
}

export default function WeeklyReportExporter({
  tasks,
  events,
  notes,
  habits,
  checkins,
  goals,
}: Props) {
  const [copied, setCopied] = useState(false)

  const completedTasks = tasks.filter((t) => t.done)
  const pendingTasks = tasks.filter((t) => !t.done)

  const reportText = `
# RELATÓRIO DE DESEMPENHO E ROTINA — NORTE
Data de Emissão: ${formatDatePT(todayISO())}

---

## 📊 RESUMO DE EXECUÇÃO
- Tarefas Concluídas: ${completedTasks.length} / ${tasks.length}
- Tarefas Pendentes: ${pendingTasks.length}
- Hábitos Ativos: ${habits.length}
- Compromissos Agendados: ${events.length}
- Anotações Salvas: ${notes.length}
- Metas de Longo Prazo: ${goals.length}

---

## ✅ TAREFAS CONCLUÍDAS
${
  completedTasks.length > 0
    ? completedTasks.map((t) => `- [x] [${t.category.toUpperCase()}] ${t.title}`).join('\n')
    : 'Nenhuma tarefa concluída no período.'
}

---

## ⏳ PENDÊNCIAS PRIORITÁRIAS
${
  pendingTasks.length > 0
    ? pendingTasks.map((t) => `- [ ] [${t.category.toUpperCase()}] ${t.title}`).join('\n')
    : 'Nenhuma pendência em aberto!'
}

---

## 🎯 METAS & OBJETIVOS
${
  goals.length > 0
    ? goals.map((g) => `- ${g.title} (${g.progress}% concluído - Meta: ${g.target_value}${g.unit})`).join('\n')
    : 'Nenhuma meta cadastrada.'
}
  `.trim()

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDownloadTxt = () => {
    const element = document.createElement('a')
    const file = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = `relatorio-norte-${todayISO()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#21262D] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Gerador de Relatórios 📋</h2>
              <p className="text-xs text-slate-400">Exporte um resumo executivo completo de suas entregas e rotina</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 bg-[#0D1117] hover:bg-slate-800 text-slate-200 border border-[#21262D] px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar (.txt)</span>
            </button>
          </div>
        </div>

        {/* Text Preview Box */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-500">Pré-visualização do Relatório:</span>
          <textarea
            readOnly
            value={reportText}
            rows={12}
            className="w-full bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed outline-none resize-none"
          />
        </div>
      </div>
    </div>
  )
}
