import { useEffect, useState } from 'react'

export interface RingSpec {
  key: string
  label: string
  value: number
  goal: number
  /** Dégradé de l'anneau (début → fin). */
  colors: [string, string]
}

/**
 * Trois anneaux concentriques façon montre connectée : chacun se remplit vers son objectif
 * du jour. Animation de remplissage à l'apparition ; au-delà de 100 % l'anneau reste plein et brille.
 */
export function DailyRings({ rings, size = 220 }: { rings: RingSpec[]; size?: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const stroke = size * 0.105
  const gap = stroke * 0.32
  const c = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible" role="img" aria-label="Anneaux de la journée">
      <defs>
        {rings.map((r) => (
          <linearGradient key={r.key} id={`ring-${r.key}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={r.colors[0]} />
            <stop offset="100%" stopColor={r.colors[1]} />
          </linearGradient>
        ))}
      </defs>
      {rings.map((r, i) => {
        const radius = c - stroke / 2 - i * (stroke + gap)
        const circ = 2 * Math.PI * radius
        const pct = r.goal > 0 ? Math.min(1, r.value / r.goal) : 0
        const done = pct >= 1
        return (
          <g key={r.key}>
            <circle cx={c} cy={c} r={radius} fill="none" stroke={r.colors[1]} strokeOpacity={0.16} strokeWidth={stroke} />
            <circle
              cx={c}
              cy={c}
              r={radius}
              fill="none"
              stroke={`url(#ring-${r.key})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={shown ? circ * (1 - Math.max(pct, 0.001)) : circ}
              style={{
                transition: `stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1) ${i * 0.15}s`,
                filter: done ? `drop-shadow(0 0 ${stroke * 0.45}px ${r.colors[0]})` : undefined,
              }}
            />
          </g>
        )
      })}
    </svg>
  )
}
