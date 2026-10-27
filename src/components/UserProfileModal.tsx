import { useState } from 'react'
import { User, Check, Droplet, Clock, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LIMITS, sanitizeImageUrl, validateTitle } from '../lib/domain/validation'
import { useAsyncAction } from '../lib/useAsyncAction'
import { FormError, Modal } from './ui'

interface ProfileUser {
  email?: string | null
  phone?: string | null
  user_metadata?: Record<string, unknown>
}

interface Props {
  user: ProfileUser
  onClose: () => void
  onUpdateProfile: () => void
}

const AVATAR_OPTIONS = ['👩🏻‍💻', '👨🏽‍🎓', '🧑🏽‍🚀', '🧭', '⚡', '🚀', '🎨', '🏆', '👑', '🌿', '🔮', '🦊']

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export default function UserProfileModal({ user, onClose, onUpdateProfile }: Props) {
  const meta = user?.user_metadata || {}
  const [name, setName] = useState(str(meta.name, user?.email?.split('@')[0] || 'Usuário'))
  const [avatar, setAvatar] = useState(str(meta.avatar, '🧭'))
  const [avatarUrl, setAvatarUrl] = useState(str(meta.avatar_url))
  const [waterGoal, setWaterGoal] = useState(num(meta.water_goal, 3))
  const [focusGoal, setFocusGoal] = useState(num(meta.focus_goal, 100))
  const [savedMsg, setSavedMsg] = useState(false)
  const save = useAsyncAction()
  const previewUrl = sanitizeImageUrl(avatarUrl)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const ok = await save.run(async () => {
      const invalid = validateTitle(name, 'O nome', LIMITS.displayName)
      if (invalid) return invalid
      const safeUrl = sanitizeImageUrl(avatarUrl)
      if (safeUrl === null) return 'A URL da foto precisa ser um endereço https:// válido.'
      if (!(waterGoal >= 1 && waterGoal <= 10)) return 'A meta de água deve ficar entre 1 e 10 litros.'
      if (!(focusGoal >= 15 && focusGoal <= 600)) return 'A meta de foco deve ficar entre 15 e 600 minutos.'
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim(), avatar, avatar_url: safeUrl, water_goal: waterGoal, focus_goal: focusGoal },
      })
      return error ? `Não foi possível salvar o perfil: ${error.message}` : null
    })
    if (ok) {
      setSavedMsg(true)
      setTimeout(() => {
        onUpdateProfile()
        onClose()
      }, 800)
    }
  }

  return (
    <Modal
      title="Perfil & Personalização"
      description="Edite sua foto, nome e metas diárias"
      onClose={onClose}
      icon={
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
          <User className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex flex-col items-center justify-center gap-3 bg-[#0D1117] border border-[#21262D] p-4 rounded-2xl">
          <div className="w-20 h-20 rounded-2xl bg-[#161B22] border-2 border-emerald-500/50 flex items-center justify-center text-4xl shadow-md overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pré-visualização da foto de perfil"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span aria-hidden="true">{avatar}</span>
            )}
          </div>

          <div role="radiogroup" aria-label="Escolha um avatar" className="flex flex-wrap justify-center gap-1.5 pt-1">
            {AVATAR_OPTIONS.map((emoji) => {
              const selected = avatar === emoji && !avatarUrl
              return (
                <button
                  key={emoji}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Avatar ${emoji}`}
                  onClick={() => {
                    setAvatar(emoji)
                    setAvatarUrl('')
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all ${
                    selected
                      ? 'bg-emerald-500/20 border border-emerald-500 scale-110'
                      : 'bg-[#161B22] border border-[#21262D] hover:bg-slate-800'
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>

          <div className="w-full pt-2 border-t border-[#21262D]">
            <label htmlFor="profile-avatar-url" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Ou cole a URL de uma foto (https://)
            </label>
            <input
              id="profile-avatar-url"
              type="url"
              inputMode="url"
              maxLength={LIMITS.avatarUrl}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://exemplo.com/foto.jpg"
              className="w-full bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-300 mb-1">
              Seu Nome / Apelido
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={LIMITS.displayName}
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#21262D] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
              placeholder="Como prefere ser chamado(a)?"
            />
          </div>

          <div className="bg-[#0D1117] border border-[#21262D] rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-1">
            <span className="text-slate-400 font-mono text-[11px]">Conta:</span>
            <span className="font-bold text-white font-mono text-[11px] break-all">
              {user?.email || user?.phone || 'Modo local (somente este navegador)'}
            </span>
          </div>
        </div>

        <fieldset className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
          <legend className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 px-1">
            <Settings className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Metas Pessoais Diárias</span>
          </legend>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-water" className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Droplet className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                <span>Meta Água (L)</span>
              </label>
              <input
                id="profile-water"
                type="number"
                step="0.25"
                min="1"
                max="10"
                value={waterGoal}
                onChange={(e) => setWaterGoal(Number(e.target.value))}
                className="w-full bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="profile-focus" className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" aria-hidden="true" />
                <span>Meta Foco (min)</span>
              </label>
              <input
                id="profile-focus"
                type="number"
                step="15"
                min="15"
                max="600"
                value={focusGoal}
                onChange={(e) => setFocusGoal(Number(e.target.value))}
                className="w-full bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </fieldset>

        <FormError message={save.error} />
        {savedMsg && (
          <div
            role="status"
            className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Perfil salvo com sucesso!</span>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-[#21262D]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[#0D1117] hover:bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-semibold border border-[#21262D]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={save.pending || savedMsg}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-extrabold shadow-md disabled:opacity-60"
          >
            {save.pending ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
