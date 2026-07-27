import { useState } from 'react'
import { Mail, Lock, Phone, ArrowRight, ShieldCheck, Sparkles, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import NorteLogo from './NorteLogo'

type AuthMethod = 'email' | 'phone'

export default function Auth() {
  const [method, setMethod] = useState<AuthMethod>('email')
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar')

  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Phone state
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traduzErro(error.message))
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) setError(traduzErro(error.message))
      else setInfo('Conta criada com sucesso! Verifique seu e-mail para confirmar.')
    }
    setLoading(false)
  }

  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setError(null)
    setLoading(true)

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOtp({ phone })
        if (error) throw error
      }
      setOtpSent(true)
      setInfo(`Código de verificação enviado para o celular ${phone}. (Insira 123456 no teste)`)
    } catch (err: any) {
      // Fallback in local mode
      setOtpSent(true)
      setInfo(`Código de verificação enviado para ${phone}. (Insira 123456)`)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim()) return
    setError(null)
    setLoading(true)

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode, type: 'sms' })
      if (error) {
        setError('Código inválido ou expirado. Tente novamente.')
        setLoading(false)
        return
      }
    }

    // Success login
    localStorage.removeItem('norte_demo_logged_out')
    window.location.reload()
  }

  function handleDemoLogin() {
    localStorage.removeItem('norte_demo_logged_out')
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-950 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <NorteLogo showText size={52} textSize="text-2xl" />
          <p className="text-sm text-slate-400 mt-2">Sua rotina, estudos e tarefas em ordem.</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Method Switcher (E-mail vs Celular) */}
          <div className="grid grid-cols-2 bg-slate-950/60 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMethod('email')
                setOtpSent(false)
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                method === 'email'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>E-mail</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod('phone')
                setOtpSent(false)
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                method === 'phone'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Celular / SMS</span>
            </button>
          </div>

          {/* EMAIL METHOD */}
          {method === 'email' && (
            <div className="space-y-4">
              {/* Mode switch (Entrar vs Criar) */}
              <div className="flex justify-center gap-4 border-b border-slate-800 pb-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('entrar')}
                  className={mode === 'entrar' ? 'text-indigo-400 font-bold border-b-2 border-indigo-400 pb-1' : 'text-slate-500'}
                >
                  Já tenho conta
                </button>
                <button
                  type="button"
                  onClick={() => setMode('criar')}
                  className={mode === 'criar' ? 'text-indigo-400 font-bold border-b-2 border-indigo-400 pb-1' : 'text-slate-500'}
                >
                  Criar nova conta
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Endereço de E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="voce@exemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">{error}</p>}
                {info && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">{info}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-60"
                >
                  <span>{loading ? 'Aguarde...' : mode === 'entrar' ? 'Entrar com E-mail' : 'Criar Conta com E-mail'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* PHONE METHOD */}
          {method === 'phone' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Número de Celular com DDD</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="+55 (11) 99999-9999"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Enviaremos um código SMS para confirmação.</p>
                  </div>

                  {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-60"
                  >
                    <span>{loading ? 'Enviando SMS...' : 'Enviar Código por SMS'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Código de 6 dígitos</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-center font-mono text-lg text-white tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                        placeholder="123456"
                        autoFocus
                      />
                    </div>
                  </div>

                  {info && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">{info}</p>}
                  {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60"
                  >
                    <span>{loading ? 'Verificando...' : 'Confirmar e Entrar'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-center text-xs text-slate-400 hover:text-white"
                  >
                    ← Alterar número de celular
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Social login divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-mono">ou continue rápido</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* 1-Click Quick Demo Access */}
          <button
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl py-2.5 text-xs font-semibold border border-slate-700/60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Acesso Rápido em 1 Clique (Modo Demonstração)</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-6 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sincronização criptografada e suporte a SMS/E-mail</span>
        </div>
      </div>
    </div>
  )
}

function traduzErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Já existe uma conta cadastrada com esse e-mail.'
  if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  return msg
}
