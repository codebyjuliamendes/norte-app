import { useState } from 'react'
import { User, X, Camera, Check, Shield, Droplet, Clock, Sparkles, LogOut, Settings, Smile } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  user: any
  onClose: () => void
  onUpdateProfile: () => void
}

const AVATAR_OPTIONS = ['👩🏻‍💻', '👨🏽‍🎓', '🧑🏽‍🚀', '🧭', '⚡', '🚀', '🎨', '🏆', '👑', '🌿', '🔮', '🦊']

export default function UserProfileModal({ user, onClose, onUpdateProfile }: Props) {
  const currentMetadata = user?.user_metadata || {}
  const [name, setName] = useState(currentMetadata.name || user?.email?.split('@')[0] || 'Usuário')
  const [avatar, setAvatar] = useState(currentMetadata.avatar || '🧭')
  const [avatarUrl, setAvatarUrl] = useState(currentMetadata.avatar_url || '')
  const [waterGoal, setWaterGoal] = useState(currentMetadata.water_goal || 3.0)
  const [focusGoal, setFocusGoal] = useState(currentMetadata.focus_goal || 100)

  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await supabase.auth.updateUser({
        data: {
          name,
          avatar,
          avatar_url: avatarUrl,
          water_goal: waterGoal,
          focus_goal: focusGoal,
        },
      })

      // Also store in localStorage for instant offline access
      localStorage.setItem(
        'norte_user_profile',
        JSON.stringify({ name, avatar, avatar_url: avatarUrl, waterGoal, focusGoal })
      )

      setSavedMsg(true)
      setTimeout(() => {
        setSavedMsg(false)
        onUpdateProfile()
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Error updating user profile:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-[#21262D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <User className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Perfil & Personalização</h2>
              <p className="text-[11px] text-slate-400">Edite sua foto, nome e metas diárias</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0D1117] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center justify-center gap-3 bg-[#0D1117] border border-[#21262D] p-4 rounded-2xl">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-[#161B22] border-2 border-emerald-500/50 flex items-center justify-center text-4xl shadow-md overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatar}</span>
                )}
              </div>
            </div>

            {/* Avatar Preset Grid */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setAvatar(emoji)
                    setAvatarUrl('')
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all ${
                    avatar === emoji && !avatarUrl
                      ? 'bg-emerald-500/20 border border-emerald-500 scale-110'
                      : 'bg-[#161B22] border border-[#21262D] hover:bg-slate-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Custom Image URL Option */}
            <div className="w-full pt-2 border-t border-[#21262D]">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Ou cole a URL de uma foto/imagem da web:
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                className="w-full bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Name & Email Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nome / Apelido</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#21262D] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="Como prefere ser chamado(a)?"
              />
            </div>

            <div className="bg-[#0D1117] border border-[#21262D] rounded-xl p-3 text-xs flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Conta Vinculada:</span>
              <span className="font-bold text-white font-mono text-[11px]">
                {user?.email || user?.phone || 'Usuário Conectado'}
              </span>
            </div>
          </div>

          {/* Daily Goals Customization */}
          <div className="bg-[#0D1117] border border-[#21262D] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>Metas Pessoais Diárias</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-cyan-400" />
                  <span>Meta Água (L)</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="10"
                  value={waterGoal}
                  onChange={(e) => setWaterGoal(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>Meta Foco (min)</span>
                </label>
                <input
                  type="number"
                  step="15"
                  min="15"
                  max="600"
                  value={focusGoal}
                  onChange={(e) => setFocusGoal(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {savedMsg && (
            <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Perfil salvo com sucesso!</span>
            </div>
          )}

          {/* Submit */}
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
              disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-extrabold shadow-md disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
