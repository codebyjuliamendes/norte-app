import { useState } from 'react'
import { StickyNote, Plus, Trash2, Search, Copy, Check } from 'lucide-react'
import { supabase, type Note, type Category } from '../lib/supabase'
import { syncItemToRagMemory } from '../lib/ragEngine'
import { CATEGORIES, categoryDot, categoryBg, categoryLabel } from '../lib/categories'
import { LIMITS, validateMaxLength } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError, Modal, hoverReveal } from './ui'

interface Props {
  notes: Note[]
  userId: string
  onChange: () => void
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function Notes({ notes, userId, onChange }: Props) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('vida')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const form = useAsyncAction()
  const rowAction = useAsyncAction()

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    const ok = await form.run(async () => {
      if (!title.trim() && !content.trim()) return 'Escreva um título ou um conteúdo para a nota.'
      const invalid =
        validateMaxLength(title.trim(), 'O título', LIMITS.title) || validateMaxLength(content, 'O conteúdo', LIMITS.noteContent)
      if (invalid) return invalid
      const noteTitle = title.trim() || 'Sem título'
      const noteContent = content.trim()
      const { data, error } = await supabase
        .from('notes')
        .insert({ title: noteTitle, content: noteContent, category, user_id: userId })
        .select()
      if (error) return `Não foi possível salvar a nota: ${error.message}`
      if (data?.[0]) void syncItemToRagMemory(userId, 'note', String(data[0].id), noteTitle, noteContent, { category })
    })
    if (ok) {
      setTitle('')
      setContent('')
      setCreating(false)
      onChange()
    }
  }

  async function remove(note: Note) {
    if (!window.confirm(`Excluir a nota "${note.title}"?`)) return
    const ok = await rowAction.run(async () => {
      const err = await errorOf(supabase.from('notes').delete().eq('id', note.id))
      return err && `Não foi possível excluir a nota: ${err}`
    })
    if (ok && selectedNote?.id === note.id) setSelectedNote(null)
    onChange()
  }

  async function copyToClipboard(note: Note) {
    if (await copyText(`${note.title}\n\n${note.content}`)) {
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      rowAction.setError('Não foi possível copiar: permissão da área de transferência negada.')
    }
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredNotes = notes
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))

  return (
    <section aria-labelledby="notes-heading" className="space-y-4">
      <h2 id="notes-heading" className="sr-only">
        Notas
      </h2>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar nas anotações"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nas anotações..."
            className="w-full bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(!creating)}
          aria-expanded={creating}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-purple-500/20 transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Nova Nota</span>
        </button>
      </div>

      {creating && (
        <form
          onSubmit={addNote}
          aria-label="Nova nota"
          className="bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-lg space-y-3"
        >
          <label htmlFor="note-title" className="sr-only">
            Título da nota
          </label>
          <input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da anotação..."
            maxLength={LIMITS.title}
            autoFocus
            className="w-full text-base font-bold bg-transparent border-b border-slate-800 pb-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
          />
          <label htmlFor="note-content" className="sr-only">
            Conteúdo da nota
          </label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva aqui ideias, resumos, listas ou rascunhos..."
            rows={4}
            maxLength={LIMITS.noteContent}
            className="w-full text-sm bg-transparent text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none"
          />

          <div className="flex flex-wrap gap-2 items-center justify-between pt-2">
            <div role="group" aria-label="Categoria" className="flex gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    category === c.value ? categoryBg[c.value] + ' font-semibold' : 'border-slate-800 text-slate-400'
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
                disabled={form.pending}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
              >
                {form.pending ? 'Salvando...' : 'Salvar Nota'}
              </button>
            </div>
          </div>
          <FormError message={form.error} />
        </form>
      )}

      <FormError message={rowAction.error} />

      {filteredNotes.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-8 text-center">
          <StickyNote className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-400">
            {notes.length === 0 ? 'Nenhuma nota ainda.' : 'Nenhuma nota encontrada.'}
          </p>
          {notes.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">Crie a sua primeira anotação no botão "Nova Nota".</p>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Notas">
          {filteredNotes.map((note) => (
            <li
              key={note.id}
              className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 hover:border-purple-500/40 transition-all group flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${categoryBg[note.category].split(' ')[0]}`}
                aria-hidden="true"
              />

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryDot[note.category]}`} aria-hidden="true" />
                    <h3 className="text-sm font-bold text-white truncate">
                      <button
                        type="button"
                        onClick={() => setSelectedNote(note)}
                        className="text-left hover:underline truncate max-w-full"
                      >
                        {note.title}
                      </button>
                    </h3>
                  </div>

                  <div className={`flex items-center gap-1 ${hoverReveal} sm:group-focus-within:opacity-100`}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(note)}
                      className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                      aria-label={`Copiar texto de "${note.title}"`}
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(note)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      aria-label={`Excluir "${note.title}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-wrap break-words leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                <span>{categoryLabel[note.category]}</span>
                <span>{note.updated_at ? new Date(note.updated_at).toLocaleDateString('pt-BR') : ''}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedNote && (
        <Modal
          title={selectedNote.title}
          onClose={() => setSelectedNote(null)}
          maxWidth="max-w-lg"
          icon={
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${categoryDot[selectedNote.category]}`} aria-hidden="true" />
          }
        >
          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
            {selectedNote.content || 'Sem conteúdo.'}
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => copyToClipboard(selectedNote)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copiedId === selectedNote.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{copiedId === selectedNote.id ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              type="button"
              onClick={() => remove(selectedNote)}
              className="flex items-center gap-1.5 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Excluir</span>
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
