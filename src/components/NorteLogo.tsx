interface NorteLogoProps {
  className?: string
  size?: number
  showText?: boolean
  textSize?: string
}

export default function NorteLogo({
  className = '',
  size = 36,
  showText = false,
  textSize = 'text-lg',
}: NorteLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Precision Geometric Compass & Star SVG Mark */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-[#161B22] border border-[#30363D] shadow-md group transition-all duration-200 hover:border-emerald-500/60"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.65}
          height={size * 0.65}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:rotate-12"
        >
          {/* Outer Ring */}
          <circle
            cx="20"
            cy="20"
            r="17"
            stroke="#30363D"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />

          {/* Cardinal Directions subtle crosshair */}
          <line x1="20" y1="5" x2="20" y2="35" stroke="#484F58" strokeWidth="1" opacity="0.6" />
          <line x1="5" y1="20" x2="35" y2="20" stroke="#484F58" strokeWidth="1" opacity="0.6" />

          {/* Secondary Star Points (East, South, West) */}
          <polygon points="20,20 28,20 20,24" fill="#484F58" opacity="0.5" />
          <polygon points="20,20 20,28 16,20" fill="#30363D" opacity="0.5" />
          <polygon points="20,20 12,20 20,16" fill="#484F58" opacity="0.5" />

          {/* NORTH POINT (Emerald Sharp Diamond Vector) */}
          <polygon points="20,6 24,20 20,18" fill="#10B981" />
          <polygon points="20,6 20,18 16,20" fill="#059669" />

          {/* Center Pivot Point */}
          <circle cx="20" cy="20" r="2.5" fill="#F0F6FC" />
          <circle cx="20" cy="20" r="1.2" fill="#0D1117" />

          {/* North Badge Letter N */}
          <text
            x="20"
            y="4"
            textAnchor="middle"
            fill="#10B981"
            fontSize="5"
            fontWeight="bold"
            fontFamily="monospace"
          >
            N
          </text>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-display font-extrabold tracking-wider text-white ${textSize}`}>
            NORTE
          </span>
          <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold -mt-1">
            Produtividade
          </span>
        </div>
      )}
    </div>
  )
}
