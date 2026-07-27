import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Play, Pause, RotateCcw, Volume2, CloudRain, Waves, Coffee, Brain, Sparkles } from 'lucide-react'

interface Props {
  onSessionComplete?: (xpEarned: number) => void
}

type Mode = 'foco' | 'pausaCurta' | 'pausaLonga'
type AmbientSound = 'off' | 'chuva' | 'ondas' | 'binaural' | 'ruido'

const DURACOES: Record<Mode, number> = {
  foco: 25 * 60,
  pausaCurta: 5 * 60,
  pausaLonga: 15 * 60,
}

export default function FocusTimer({ onSessionComplete }: Props) {
  const [mode, setMode] = useState<Mode>('foco')
  const [timeLeft, setTimeLeft] = useState(DURACOES.foco)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [ambient, setAmbient] = useState<AmbientSound>('off')
  const [volume, setVolume] = useState(0.4)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  useEffect(() => {
    let interval: any = null
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false)
      stopAmbient()

      if (mode === 'foco') {
        const nextSessions = completedSessions + 1
        setCompletedSessions(nextSessions)
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        })
        if (onSessionComplete) onSessionComplete(50)

        if (nextSessions % 4 === 0) {
          setMode('pausaLonga')
          setTimeLeft(DURACOES.pausaLonga)
        } else {
          setMode('pausaCurta')
          setTimeLeft(DURACOES.pausaCurta)
        }
      } else {
        setMode('foco')
        setTimeLeft(DURACOES.foco)
      }
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, mode, completedSessions])

  const startAmbient = (sound: AmbientSound) => {
    stopAmbient()
    if (sound === 'off') return

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const bufferSize = ctx.sampleRate * 2
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        if (sound === 'chuva' || sound === 'ruido') {
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          b3 = 0.86650 * b3 + white * 0.3104856
          b4 = 0.55000 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.0168980
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
          output[i] *= 0.11
          b6 = white * 0.115926
        } else {
          b0 = (b0 + 0.02 * white) / 1.02
          output[i] = b0 * 3.5
        }
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = sound === 'chuva' ? 'lowpass' : 'bandpass'
      filter.frequency.value = sound === 'chuva' ? 800 : 400

      const gain = ctx.createGain()
      gain.gain.value = volume

      whiteNoise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      whiteNoise.start()
      noiseNodeRef.current = whiteNoise
      gainNodeRef.current = gain
    } catch (e) {
      console.error('Ambient audio error:', e)
    }
  }

  const stopAmbient = () => {
    if (noiseNodeRef.current) {
      try {
        (noiseNodeRef.current as any).stop()
      } catch (e) {}
      noiseNodeRef.current = null
    }
  }

  const toggleAmbientSound = (sound: AmbientSound) => {
    if (ambient === sound) {
      setAmbient('off')
      stopAmbient()
    } else {
      setAmbient(sound)
      startAmbient(sound)
    }
  }

  const resetTimer = (newMode: Mode = mode) => {
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(DURACOES[newMode])
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const progressPercent = ((DURACOES[mode] - timeLeft) / DURACOES[mode]) * 100

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-3xl p-6 shadow-sm space-y-6">
      {/* Modes Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex bg-[#0D1117] p-1 rounded-2xl border border-[#21262D] text-xs font-semibold">
          <button
            onClick={() => resetTimer('foco')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              mode === 'foco'
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Foco (25m)
          </button>
          <button
            onClick={() => resetTimer('pausaCurta')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              mode === 'pausaCurta'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pausa Curta (5m)
          </button>
          <button
            onClick={() => resetTimer('pausaLonga')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              mode === 'pausaLonga'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pausa Longa (15m)
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl text-xs font-mono font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{completedSessions} Sessões Concluídas (+{completedSessions * 50} XP)</span>
        </div>
      </div>

      {/* Main Circular Timer Display */}
      <div className="flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-[#21262D]"
              strokeWidth="5"
              fill="transparent"
            />
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
            <span className="font-mono text-5xl font-extrabold text-white tracking-tight">
              {formattedTime}
            </span>
            <span className="text-xs font-medium text-slate-400 mt-1 capitalize font-mono">
              {mode === 'foco' ? 'Sessão de Foco' : 'Descanso'}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3 rounded-2xl text-sm font-extrabold shadow-md transition-all active:scale-95"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Foco</span>
              </>
            )}
          </button>

          <button
            onClick={() => resetTimer()}
            className="p-3 bg-[#0D1117] hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-[#21262D] transition-colors"
            title="Reiniciar temporizador"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ambient Audio Bar */}
      <div className="border-t border-[#21262D] pt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sons Ambiente para Concentração</span>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => toggleAmbientSound('chuva')}
            className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all ${
              ambient === 'chuva'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#0D1117] border-[#21262D] text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Chuva</span>
          </button>

          <button
            onClick={() => toggleAmbientSound('ondas')}
            className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all ${
              ambient === 'ondas'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#0D1117] border-[#21262D] text-slate-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Ondas</span>
          </button>

          <button
            onClick={() => toggleAmbientSound('ruido')}
            className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all ${
              ambient === 'ruido'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#0D1117] border-[#21262D] text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Café</span>
          </button>

          <button
            onClick={() => toggleAmbientSound('binaural')}
            className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all ${
              ambient === 'binaural'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#0D1117] border-[#21262D] text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Binaural</span>
          </button>
        </div>
      </div>
    </div>
  )
}
