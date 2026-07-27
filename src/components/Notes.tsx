import { useState } from 'react'
import { StickyNote, Plus, Trash2, Pin, Search, Copy, Check, Maximize2 } from 'lucide-react'
import { supabase, type Note, type Category } from '../lib/supabase'
import { CATEGORIES, categoryDot, categoryBg } from '../lib/categories'

interface Props {
  notes: Note[]
  userId: string
  onChange: () => void
}

export default function Notes({ notes, userId, onChange }: Props) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return

    await supabase.from('notes').insert({
      title: title.trim() || 'Sem título',
      content: content.trim(),
      category,
      user_id: userId,
    })

    setTitle('')
    setContent('')
    setCreating(false)
    onChange()
  }

  async function remove(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    if (selectedNote?.id === id) setSelectedNote(null)
    onChange()
  }

  const copyToClipboard = (note: Note) => {
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`)
    setCopiedId(note.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  }).sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  return (
    <div className="space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nas anotações..."
            className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-purple-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Nota</span>
        </button>
      </div>

      {/* Form Nova Nota */}
      {creating && (
        <form
          onSubmit={addNote}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da anotação..."
            autoFocus
            className="w-full text-base font-bold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva aqui ideias, resumos, listas ou rascunhos..."
            rows={4}
            className="w-full text-sm bg-transparent outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none"
          />

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    category === c.value
                      ? categoryBg[c.value] + ' font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Salvar Nota
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid of Note Cards */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-8 text-center">
          <StickyNote className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-400">Nenhuma nota encontrada.</p>
          <p className="text-xs text-slate-500 mt-1">Crie a sua primeira anotação no botão "+ Nova Nota".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 cursor-pointer hover:border-purple-500/40 transition-all group flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              {/* Category Top Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${categoryBg[note.category].split(' ')[0]}`} />

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[note.category]}`} />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{note.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(note)
                      }}
                      className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                      title="Copiar texto"
                    >
                      {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(note.id)
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Excluir nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 font-mono">
                <span className="capitalize">{note.category}</span>
                <span>{new Date(note.updated_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Note Modal Reader */}
      {selectedNote && (
        <div
          onClick={() => setSelectedNote(null)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${categoryDot[selectedNote.category]}`} />
                <h2 className="text-base font-bold text-white">{selectedNote.title}</h2>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-slate-400 hover:text-white text-xs font-mono bg-slate-800 px-2 py-1 rounded-lg"
              >
                ESC
              </button>
            </div>

            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedNote.content}
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => copyToClipboard(selectedNote)}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copiedId === selectedNote.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedNote.id ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
              <button
                onClick={() => remove(selectedNote.id)}
                className="flex items-center gap-1.5 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
