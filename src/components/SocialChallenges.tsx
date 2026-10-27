import { useState } from 'react'
import confetti from 'canvas-confetti'
import {
  Droplet,
  Trophy,
  Users,
  Plus,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  Coffee,
  CheckCircle2,
  UserCheck,
  Info,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDatePT } from '../lib/categories'
import { nextWeekday } from '../lib/dates'
import { LIMITS } from '../lib/domain/validation'
import { errorOf, useAsyncAction } from '../lib/useAsyncAction'
import { FormError, Modal } from './ui'

interface Friend {
  id: string
  name: string
  avatar: string
  waterLiters: number
  studyMinutes: number
  streakDays: number
  schedule: Record<string, { time: string; title: string; busy: boolean }[]>
}

const INITIAL_FRIENDS: Friend[] = [
  {
    id: 'f-1',
    name: 'Beatriz Lima',
    avatar: '👩🏻‍💻',
    waterLiters: 2.25,
    studyMinutes: 75,
    streakDays: 6,
    schedule: {
      Segunda: [
        { time: '09:00 - 11:00', title: 'Aula de Direito Processual', busy: true },
        { time: '11:00 - 14:00', title: 'Livre', busy: false },
        { time: '14:00 - 16:00', title: 'Horário Livre para Estudo', busy: false },
        { time: '16:00 - 18:00', title: 'Estágio no Tribunal', busy: true },
        { time: '18:30 - 21:00', title: 'Livre / Descanso', busy: false },
      ],
      Terça: [
        { time: '08:00 - 10:00', title: 'Treino Academia', busy: true },
        { time: '10:00 - 15:00', title: 'Horário Livre para Encontro', busy: false },
        { time: '15:00 - 17:00', title: 'Grupo de Pesquisa', busy: true },
      ],
      Quarta: [
        { time: '09:00 - 12:00', title: 'Livre', busy: false },
        { time: '14:00 - 17:00', title: 'Horário Livre para Estudo Juntos', busy: false },
      ],
      Quinta: [
        { time: '10:00 - 12:00', title: 'Reunião de Projetos', busy: true },
        { time: '13:30 - 17:30', title: 'Livre', busy: false },
      ],
      Sexta: [{ time: '14:00 - 18:00', title: 'Janela de Tarde Livre', busy: false }],
    },
  },
  {
    id: 'f-2',
    name: 'Lucas Silva',
    avatar: '👨🏽‍🎓',
    waterLiters: 1.75,
    studyMinutes: 50,
    streakDays: 4,
    schedule: {
      Segunda: [
        { time: '10:00 - 12:00', title: 'Trabalho de Programação', busy: true },
        { time: '14:00 - 18:00', title: 'Horário Livre para Foco', busy: false },
      ],
      Terça: [
        { time: '09:00 - 12:00', title: 'Livre', busy: false },
        { time: '14:00 - 16:00', title: 'Reunião com Alunos', busy: true },
      ],
      Quarta: [{ time: '13:00 - 16:00', title: 'Horário Livre em Comum', busy: false }],
      Quinta: [{ time: '15:00 - 18:00', title: 'Livre para Café ou Estudo', busy: false }],
      Sexta: [{ time: '10:00 - 15:00', title: 'Livre', busy: false }],
    },
  },
  {
    id: 'f-3',
    name: 'Camila Rocha',
    avatar: '👩🏼‍🎨',
    waterLiters: 1.5,
    studyMinutes: 100,
    streakDays: 8,
    schedule: {
      Segunda: [{ time: '14:00 - 17:00', title: 'Livre para Encontro', busy: false }],
      Terça: [
        { time: '10:00 - 12:00', title: 'Curso de Design', busy: true },
        { time: '14:00 - 16:00', title: 'Livre', busy: false },
      ],
      Quarta: [{ time: '15:00 - 18:00', title: 'Horário Livre', busy: false }],
      Quinta: [{ time: '09:00 - 12:00', title: 'Livre', busy: false }],
      Sexta: [{ time: '16:00 - 19:00', title: 'Livre / Happy Hour', busy: false }],
    },
  },
]

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
/** JS weekday number (0 = domingo) for each label above. */
const WEEKDAY_NUMBER: Record<string, number> = { Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5 }

/**
 * Demonstration screen: friends, leaderboards and schedules are sample data kept in memory.
 * The only real side effect is "Propor encontro", which creates an event in the user's agenda.
 */
export default function SocialChallenges({ userId, onScheduled }: { userId: string; onScheduled?: () => void }) {
  const [myWater, setMyWater] = useState(2.0)
  const myStudy = 75
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS)
  const [selectedFriendId, setSelectedFriendId] = useState<string>('f-1')
  const [selectedDay, setSelectedDay] = useState<string>('Segunda')
  const [friendCodeInput, setFriendCodeInput] = useState('')
  const schedule = useAsyncAction()
  const [reactions, setReactions] = useState<Record<string, number>>({})
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [scheduledSuccessMsg, setScheduledSuccessMsg] = useState<string | null>(null)

  const myProfile: Friend = {
    id: 'my-profile',
    name: 'Você',
    avatar: '🧭',
    waterLiters: myWater,
    studyMinutes: myStudy,
    streakDays: 7,
    schedule: {},
  }

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) || friends[0]
  const friendDaySchedule = selectedFriend.schedule[selectedDay] || [
    { time: '14:00 - 16:00', title: 'Horário Livre', busy: false },
  ]

  const allCompetitorsWater = [myProfile, ...friends].sort((a, b) => b.waterLiters - a.waterLiters)
  const allCompetitorsStudy = [myProfile, ...friends].sort((a, b) => b.studyMinutes - a.studyMinutes)

  const addWater = (amountLiters: number) => {
    const next = Math.round((myWater + amountLiters) * 100) / 100
    setMyWater(next)
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#06B6D4', '#3B82F6', '#60A5FA'],
    })
  }

  const sendReaction = (feedId: string) => {
    setReactions((prev) => ({ ...prev, [feedId]: (prev[feedId] || 0) + 1 }))
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.8 } })
  }

  const handleScheduleTogether = async (slotTime: string) => {
    const eventDate = nextWeekday(WEEKDAY_NUMBER[selectedDay] ?? 1)
    const eventTitle = `Encontro / Estudo com ${selectedFriend.name} (${slotTime})`
    const ok = await schedule.run(async () => {
      const err = await errorOf(
        supabase.from('events').insert({
          title: eventTitle,
          category: 'estudo',
          event_date: eventDate,
          event_type: 'compromisso',
          notes: `Horário livre (${selectedDay}, ${slotTime}) combinado com ${selectedFriend.name}`,
          user_id: userId,
        }),
      )
      return err && `Não foi possível agendar: ${err}`
    })
    if (!ok) return
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10B981', '#6366F1', '#F59E0B'],
      disableForReducedMotion: true,
    })
    setScheduledSuccessMsg(`"${eventTitle}" foi adicionado à sua Agenda para ${formatDatePT(eventDate)}.`)
    setTimeout(() => setScheduledSuccessMsg(null), 5000)
    onScheduled?.()
  }

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!friendCodeInput.trim()) return

    const code = friendCodeInput.trim().toUpperCase().slice(0, 20)
    const newFriend: Friend = {
      id: 'f-' + Date.now(),
      name: `Amigo (${code})`,
      avatar: '🧑🏽‍🚀',
      waterLiters: 1.0,
      studyMinutes: 30,
      streakDays: 1,
      schedule: {
        Segunda: [{ time: '14:00 - 17:00', title: 'Horário Livre', busy: false }],
      },
    }
    setFriends((prev) => [...prev, newFriend])
    setFriendCodeInput('')
    setShowAddFriendModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header Invite Banner */}
      <div className="bg-gradient-to-r from-cyan-900/60 via-indigo-900/60 to-purple-900/60 border border-cyan-500/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Competição & Agendas Compartilhadas</h2>
              <p className="text-xs text-slate-300">Desafie amigos na água/foco e veja horários livres em comum.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddFriendModal(true)}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Conectar Amigo</span>
            </button>
          </div>
        </div>
        <p className="flex items-start gap-2 text-[11px] text-cyan-100 bg-slate-950/40 border border-cyan-500/20 rounded-xl px-3 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            Prévia da funcionalidade: os amigos, placares e agendas abaixo são <strong>dados de exemplo</strong> e não são salvos.
            Apenas “Propor encontro” cria um compromisso real na sua Agenda.
          </span>
        </p>
      </div>

      {/* FEATURE DESTAQUE: Agenda do Amigo & Encontro de Horários Livres 📅⚡ */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Agenda do Amigo & Horários Livres</h3>
              <p className="text-[11px] text-slate-300">
                Descubra quando seu amigo está livre para estudarem ou tomarem um café juntos.
              </p>
            </div>
          </div>
        </div>

        {/* Friend Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 font-mono flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Amigo:</span>
          </span>
          {friends.map((f) => (
            <button
              type="button"
              key={f.id}
              aria-pressed={selectedFriendId === f.id}
              onClick={() => setSelectedFriendId(f.id)}
              className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-xl border transition-all ${
                selectedFriendId === f.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white font-bold shadow-md shadow-indigo-500/30'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{f.avatar}</span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        {/* Day Selector Bar */}
        <div className="flex gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          {DAYS.map((d) => (
            <button
              type="button"
              key={d}
              aria-pressed={selectedDay === d}
              onClick={() => setSelectedDay(d)}
              className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-all ${
                selectedDay === d ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Schedule & Free Slots Card */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono text-slate-400 mb-1">
            <span>
              Agenda de {selectedFriend.name} ({selectedDay}):
            </span>
            <span className="text-emerald-400 font-bold">Verde = horário livre</span>
          </div>

          {friendDaySchedule.map((slot, i) => (
            <div
              key={i}
              className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                !slot.busy
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    !slot.busy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold">{slot.time}</span>
                  <p className="text-xs font-semibold text-white">{slot.title}</p>
                </div>
              </div>

              {!slot.busy ? (
                <button
                  type="button"
                  disabled={schedule.pending}
                  onClick={() => handleScheduleTogether(slot.time)}
                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md transition-all disabled:opacity-60"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Propor Encontro / Estudo Juntos</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 self-start sm:self-center">
                  Ocupado
                </span>
              )}
            </div>
          ))}
        </div>

        <FormError message={schedule.error} />
        {scheduledSuccessMsg && (
          <div
            role="status"
            className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{scheduledSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Challenge Card 1: Desafio de Água 💧 */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Desafio da Água</h3>
              <p className="text-[11px] text-slate-400">Quem bebe mais água hoje? Meta diária: 3.0L</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Adicionar 250 ml de água"
              onClick={() => addWater(0.25)}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold px-2.5 py-1 rounded-xl transition-all"
            >
              +250ml
            </button>
            <button
              type="button"
              aria-label="Adicionar 500 ml de água"
              onClick={() => addWater(0.5)}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold px-2.5 py-1 rounded-xl transition-all"
            >
              +500ml
            </button>
          </div>
        </div>

        {/* Leaderboard Table for Water */}
        <div className="space-y-2.5">
          {allCompetitorsWater.map((comp, index) => {
            const isMe = comp.id === 'my-profile'
            const percent = Math.min(100, Math.round((comp.waterLiters / 3.0) * 100))
            const rankMedal = index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`

            return (
              <div
                key={comp.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isMe ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-mono">{rankMedal}</span>
                    <span className="text-xl">{comp.avatar}</span>
                    <div>
                      <span className={`text-sm font-bold ${isMe ? 'text-cyan-300' : 'text-white'}`}>
                        {comp.name} {isMe && '(Você)'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-mono font-extrabold text-cyan-400">{comp.waterLiters.toFixed(2)}L</span>
                    <span className="text-[10px] text-slate-400 block"> / 3.00L ({percent}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Challenge Card 2: Maratonista de Estudo & Foco 📚 */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Maratonista de Foco</h3>
              <p className="text-[11px] text-slate-400">Minutos acumulados em sessões Pomodoro hoje</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {allCompetitorsStudy.slice(0, 3).map((comp, idx) => (
            <div
              key={comp.id}
              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden"
            >
              <span className="text-2xl">{comp.avatar}</span>
              <h4 className="text-xs font-bold text-white">{comp.name}</h4>
              <div className="text-lg font-mono font-extrabold text-purple-400">{comp.studyMinutes} min</div>
              <span className="text-[10px] text-slate-500 font-mono">
                {idx === 0 ? '🏆 1º Lugar Foco' : `${idx + 1}º Colocado`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed & Cheer Station 👏 */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Feed de Conquistas dos Amigos (exemplo)</span>
        </h3>

        <div className="space-y-2.5">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👩🏻‍💻</span>
              <div>
                <p className="text-slate-200">
                  <strong className="text-white">Beatriz Lima</strong> bebeu +500ml de água!
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Há 12 minutos</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => sendReaction('feed-1')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
            >
              <span>👏 Incentivar</span>
              {reactions['feed-1'] && (
                <span className="bg-amber-400/20 text-amber-400 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
                  +{reactions['feed-1']}
                </span>
              )}
            </button>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👨🏽‍🎓</span>
              <div>
                <p className="text-slate-200">
                  <strong className="text-white">Lucas Silva</strong> concluiu 2 sessões de Foco Pomodoro!
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Há 35 minutos</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => sendReaction('feed-2')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
            >
              <span>🔥 Enviar Fogo</span>
              {reactions['feed-2'] && (
                <span className="bg-purple-400/20 text-purple-400 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
                  +{reactions['feed-2']}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {showAddFriendModal && (
        <Modal
          title="Adicionar Amigo por Código"
          description="Demonstração: o amigo é adicionado apenas nesta tela, com dados de exemplo."
          onClose={() => setShowAddFriendModal(false)}
          maxWidth="max-w-sm"
        >
          <form onSubmit={handleAddFriend} className="space-y-4">
            <label htmlFor="friend-code" className="block text-xs text-slate-300">
              Código do amigo
            </label>
            <input
              id="friend-code"
              type="text"
              required
              maxLength={LIMITS.unit}
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value)}
              placeholder="Ex: NORTE-BEA9821"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white font-mono placeholder:text-slate-500 focus:border-cyan-500"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFriendModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-2.5 rounded-xl text-xs font-bold shadow-md"
              >
                Conectar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
