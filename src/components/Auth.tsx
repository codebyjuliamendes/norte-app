import { useState } from 'react'
import { Mail, Lock, Phone, ArrowRight, ShieldCheck, KeyRound, CheckCircle2, HardDrive } from 'lucide-react'
import { isSupabaseConfigured, localAuth, supabase } from '../lib/supabase'
import NorteLogo from './NorteLogo'
import { normalizePhone } from '../lib/domain/validation'

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
    if (loading) return
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (mode === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          setError(traduzErro(error.message))
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) {
          setError(traduzErro(error.message))
        } else if (data.session) {
          setInfo('Conta criada com sucesso! Entrando...')
        } else {
          setInfo('Conta criada! Se a confirmação por e-mail estiver ativa, confirme pelo link recebido e depois faça login.')
          setMode('entrar')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao realizar autenticação.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(phone)
    if (!normalized || loading) return
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
      if (error) {
        setError(traduzErro(error.message))
      } else {
        setPhone(normalized)
        setOtpSent(true)
        setInfo(`Código de verificação enviado para ${normalized}.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar código por SMS.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otpCode) || loading) {
      setError('Digite o código de 6 dígitos recebido por SMS.')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode, type: 'sms' })
      if (error) {
        setError('Código inválido ou expirado. Tente novamente.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-950 relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <NorteLogo showText size={52} textSize="text-2xl" />
          <p className="text-sm text-slate-400 mt-2">Sua rotina, estudos e tarefas em ordem.</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white">Modo local</h2>
                <p className="text-xs text-slate-400">
                  A sincronização em nuvem não está configurada neste ambiente. Você pode usar o Norte normalmente: os dados ficam
                  salvos apenas neste navegador.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void localAuth.signInLocal()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl py-3 text-sm font-extrabold shadow-md transition-all"
            >
              <span>Começar no modo local</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            {/* Method Switcher (E-mail vs Celular) */}
            <div
              role="group"
              aria-label="Forma de acesso"
              className="grid grid-cols-2 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs font-semibold"
            >
              <button
                type="button"
                aria-pressed={method === 'email'}
                onClick={() => {
                  setMethod('email')
                  setOtpSent(false)
                  setError(null)
                  setInfo(null)
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                  method === 'email'
                    ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-mail</span>
              </button>

              <button
                type="button"
                aria-pressed={method === 'phone'}
                onClick={() => {
                  setMethod('phone')
                  setOtpSent(false)
                  setError(null)
                  setInfo(null)
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
                  method === 'phone'
                    ? 'bg-slate-800 text-white border border-slate-700 font-bold'
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
                    aria-pressed={mode === 'entrar'}
                    onClick={() => {
                      setMode('entrar')
                      setError(null)
                      setInfo(null)
                    }}
                    className={
                      mode === 'entrar' ? 'text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1' : 'text-slate-400'
                    }
                  >
                    Entrar na conta
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === 'criar'}
                    onClick={() => {
                      setMode('criar')
                      setError(null)
                      setInfo(null)
                    }}
                    className={
                      mode === 'criar' ? 'text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1' : 'text-slate-400'
                    }
                  >
                    Criar nova conta
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Endereço de E-mail
                    </label>
                    <div className="relative">
                      <Mail aria-hidden="true" className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="voce@exemplo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock aria-hidden="true" className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-password"
                        type="password"
                        autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                        required
                        minLength={6}
                        maxLength={72}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Sua senha secreta"
                      />
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                      {error}
                    </p>
                  )}
                  {info && (
                    <p
                      role="status"
                      className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5"
                    >
                      {info}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl py-3 text-sm font-extrabold shadow-md transition-all disabled:opacity-60"
                  >
                    <span>{loading ? 'Aguarde...' : mode === 'entrar' ? 'Entrar no Norte' : 'Criar minha conta'}</span>
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
                      <label htmlFor="auth-phone" className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Número de Celular com DDD
                      </label>
                      <div className="relative">
                        <Phone aria-hidden="true" className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-phone"
                          type="tel"
                          autoComplete="tel"
                          required
                          maxLength={20}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                          placeholder="+55 (11) 99999-9999"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Enviaremos um código SMS de login.</p>
                    </div>

                    {error && (
                      <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl py-3 text-sm font-extrabold shadow-md transition-all disabled:opacity-60"
                    >
                      <span>{loading ? 'Enviando SMS...' : 'Enviar Código por SMS'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 ">
                    <div>
                      <label htmlFor="auth-otp" className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Código de 6 dígitos
                      </label>
                      <div className="relative">
                        <KeyRound
                          aria-hidden="true"
                          className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
                        />
                        <input
                          id="auth-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-center font-mono text-lg text-white tracking-widest placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                          placeholder="123456"
                          autoFocus
                        />
                      </div>
                    </div>

                    {info && (
                      <p
                        role="status"
                        className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5"
                      >
                        {info}
                      </p>
                    )}
                    {error && (
                      <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl py-3 text-sm font-extrabold shadow-md transition-all disabled:opacity-60"
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
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-6 font-mono text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
          <span>
            {isSupabaseConfigured
              ? 'Conexão HTTPS e dados isolados por conta (Supabase + RLS)'
              : 'Dados guardados somente neste navegador'}
          </span>
        </div>
      </div>
    </div>
  )
}

function traduzErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('User already registered'))
    return 'Já existe uma conta cadastrada com este e-mail. Alterne para a aba "Entrar na conta".'
  if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (msg.includes('Unsupported country code')) return 'Código de país não suportado para SMS.'
  if (msg.includes('SMS provider')) return 'Provedor de SMS não habilitado no Supabase. Recomendamos utilizar login por E-mail.'
  return msg
}
