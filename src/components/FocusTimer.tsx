import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Play, Pause, RotateCcw, Volume2, CloudRain, Waves, Coffee, Brain, Sparkles } from 'lucide-react'
import { DURATIONS, formatClock, nextPhase, secondsLeft, type PomodoroMode } from '../lib/domain/pomodoro'
import { XP_RULES } from '../lib/domain/progress'

interface Props {
  onSessionComplete?: (xpEarned: number) => void
}

type AmbientSound = 'off' | 'chuva' | 'ondas' | 'binaural' | 'ruido'

const MODE_LABEL: Record<PomodoroMode, string> = {
  foco: 'Foco (25m)',
  pausaCurta: 'Pausa Curta (5m)',
  pausaLonga: 'Pausa Longa (15m)',
}

const SOUNDS: { value: Exclude<AmbientSound, 'off'>; label: string; icon: typeof CloudRain; hint: string }[] = [
  { value: 'chuva', label: 'Chuva', icon: CloudRain, hint: 'Ruído rosa filtrado' },
  { value: 'ondas', label: 'Ondas', icon: Waves, hint: 'Ruído com volume ondulante' },
  { value: 'ruido', label: 'Café', icon: Coffee, hint: 'Ruído de fundo constante' },
  { value: 'binaural', label: 'Binaural', icon: Brain, hint: 'Tons de 200/210 Hz (use fones)' },
]

function createNoiseBuffer(ctx: AudioContext, kind: 'pink' | 'brown'): AudioBuffer {
  const size = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const out = buffer.getChannelData(0)
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0
  for (let i = 0; i < size; i++) {
    const white = Math.random() * 2 - 1
    if (kind === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    } else {
      b0 = (b0 + 0.02 * white) / 1.02
      out[i] = b0 * 3.5
    }
  }
  return buffer
}

export default function FocusTimer({ onSessionComplete }: Props) {
  const [mode, setMode] = useState<PomodoroMode>('foco')
  const [timeLeft, setTimeLeft] = useState(DURATIONS.foco)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [ambient, setAmbient] = useState<AmbientSound>('off')
  const [volume, setVolume] = useState(0.4)
  const [audioError, setAudioError] = useState<string | null>(null)

  const isRunning = endsAt !== null
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourcesRef = useRef<AudioScheduledSourceNode[]>([])
  const gainRef = useRef<GainNode | null>(null)
  const onCompleteRef = useRef(onSessionComplete)
  useEffect(() => {
    onCompleteRef.current = onSessionComplete
  }, [onSessionComplete])

  // Wall-clock based countdown: stays accurate when the tab is throttled in background.
  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const left = secondsLeft(endsAt, Date.now())
      setTimeLeft(left)
      if (left > 0) return
      setEndsAt(null)
      if (mode === 'foco') {
        const done = completedSessions + 1
        setCompletedSessions(done)
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, disableForReducedMotion: true })
        onCompleteRef.current?.(XP_RULES.focusSession)
        const next = nextPhase('foco', done)
        setMode(next)
        setTimeLeft(DURATIONS[next])
      } else {
        setMode('foco')
        setTimeLeft(DURATIONS.foco)
      }
    }
    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [endsAt, mode, completedSessions])

  useEffect(() => {
    const original = 'Norte — Organização Pessoal & Produtividade'
    document.title = isRunning ? `${formatClock(timeLeft)} · ${mode === 'foco' ? 'Foco' : 'Pausa'} — Norte` : original
    return () => {
      document.title = original
    }
  }, [isRunning, timeLeft, mode])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  const stopAmbient = () => {
    for (const node of sourcesRef.current) {
      try {
        node.stop()
        node.disconnect()
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = []
    gainRef.current?.disconnect()
    gainRef.current = null
  }

  // Release audio resources when the component unmounts (e.g. on logout).
  useEffect(
    () => () => {
      stopAmbient()
      void audioCtxRef.current?.close().catch(() => undefined)
      audioCtxRef.current = null
    },
    [],
  )

  const startAmbient = (sound: AmbientSound) => {
    stopAmbient()
    setAudioError(null)
    if (sound === 'off') return
    try {
      const AudioCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) throw new Error('Web Audio API indisponível')
      audioCtxRef.current ??= new AudioCtor()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') void ctx.resume()

      const gain = ctx.createGain()
      gain.gain.value = volume
      gain.connect(ctx.destination)
      gainRef.current = gain

      if (sound === 'binaural') {
        const merger = ctx.createChannelMerger(2)
        const left = ctx.createOscillator()
        const right = ctx.createOscillator()
        left.frequency.value = 200
        right.frequency.value = 210
        const level = ctx.createGain()
        level.gain.value = 0.25
        left.connect(merger, 0, 0)
        right.connect(merger, 0, 1)
        merger.connect(level)
        level.connect(gain)
        left.start()
        right.start()
        sourcesRef.current = [left, right]
        return
      }

      const noise = ctx.createBufferSource()
      noise.buffer = createNoiseBuffer(ctx, sound === 'chuva' ? 'pink' : 'brown')
      noise.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = sound === 'chuva' ? 'lowpass' : 'bandpass'
      filter.frequency.value = sound === 'chuva' ? 800 : 400
      noise.connect(filter)

      if (sound === 'ondas') {
        // Slow amplitude modulation (~8s period) to evoke waves.
        const swell = ctx.createGain()
        swell.gain.value = 0.6
        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.125
        const depth = ctx.createGain()
        depth.gain.value = 0.4
        lfo.connect(depth)
        depth.connect(swell.gain)
        filter.connect(swell)
        swell.connect(gain)
        lfo.start()
        sourcesRef.current = [noise, lfo]
      } else {
        filter.connect(gain)
        sourcesRef.current = [noise]
      }
      noise.start()
    } catch (e) {
      console.error('[norte] erro no áudio ambiente', e)
      setAudioError('Não foi possível tocar o som neste navegador.')
    }
  }

  const toggleAmbientSound = (sound: AmbientSound) => {
    const next = ambient === sound ? 'off' : sound
    setAmbient(next)
    startAmbient(next)
  }

  const toggleRunning = () => {
    if (isRunning) {
      setTimeLeft(secondsLeft(endsAt, Date.now()))
      setEndsAt(null)
    } else {
      setEndsAt(Date.now() + timeLeft * 1000)
    }
  }

  const resetTimer = (newMode: PomodoroMode = mode) => {
    setEndsAt(null)
    setMode(newMode)
    setTimeLeft(DURATIONS[newMode])
  }

  const formattedTime = formatClock(timeLeft)
  const progressPercent = ((DURATIONS[mode] - timeLeft) / DURATIONS[mode]) * 100

  return (
    <section
      aria-labelledby="focus-heading"
      className="bg-[#161B22] border border-[#21262D] rounded-3xl p-4 sm:p-6 shadow-sm space-y-6"
    >
      <h2 id="focus-heading" className="sr-only">
        Temporizador de foco
      </h2>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Modo do temporizador"
          className="flex bg-[#0D1117] p-1 rounded-2xl border border-[#21262D] text-xs font-semibold"
        >
          {(Object.keys(MODE_LABEL) as PomodoroMode[]).map((m) => (
            <button
              type="button"
              key={m}
              aria-pressed={mode === m}
              onClick={() => resetTimer(m)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                mode === m
                  ? m === 'foco'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700'
                    : m === 'pausaCurta'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl text-xs font-mono font-semibold">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {completedSessions} sessões (+{completedSessions * XP_RULES.focusSession} XP)
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="44" className="stroke-[#21262D]" strokeWidth="5" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-emerald-500 transition-all duration-1000 ease-linear"
              strokeWidth="5"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono text-5xl font-extrabold text-white tracking-tight"
              role="timer"
              aria-live="off"
              aria-label={`Tempo restante ${formattedTime}`}
            >
              {formattedTime}
            </span>
            <span className="text-xs font-medium text-slate-400 mt-1 font-mono">
              {mode === 'foco' ? 'Sessão de Foco' : 'Descanso'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={toggleRunning}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3 rounded-2xl text-sm font-extrabold shadow-md transition-all active:scale-95"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>{timeLeft < DURATIONS[mode] ? 'Continuar' : mode === 'foco' ? 'Iniciar Foco' : 'Iniciar Pausa'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => resetTimer()}
            className="p-3 bg-[#0D1117] hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-[#21262D] transition-colors"
            aria-label="Reiniciar temporizador"
            title="Reiniciar temporizador"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="border-t border-[#21262D] pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5" id="ambient-label">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Sons ambiente (gerados no navegador)</span>
          </span>
          <label className="flex items-center gap-2">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 accent-emerald-500"
            />
          </label>
        </div>

        <div role="group" aria-labelledby="ambient-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOUNDS.map(({ value, label, icon: Icon, hint }) => (
            <button
              type="button"
              key={value}
              aria-pressed={ambient === value}
              title={hint}
              onClick={() => toggleAmbientSound(value)}
              className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all ${
                ambient === value
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-[#0D1117] border-[#21262D] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {audioError && (
          <p role="alert" className="text-xs text-rose-300">
            {audioError}
          </p>
        )}
      </div>
    </section>
  )
}
