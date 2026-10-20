import type { GpsPoint } from '@/types'

function project(points: GpsPoint[]) {
  if (points.length === 0) return { path: '', start: null, end: null }
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const pad = 6
  const w = 100
  const h = 100
  const spanLat = maxLat - minLat || 0.0001
  const spanLng = maxLng - minLng || 0.0001
  const toXY = (p: GpsPoint) => ({
    x: pad + ((p.lng - minLng) / spanLng) * (w - pad * 2),
    y: pad + ((maxLat - p.lat) / spanLat) * (h - pad * 2),
  })
  const xy = points.map(toXY)
  const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
  return { path, start: xy[0], end: xy[xy.length - 1], xy }
}

export function RouteMap({ points, live }: { points: GpsPoint[]; live?: boolean }) {
  const { path, start, end, xy } = project(points)

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-3xl border border-white/10 bg-ink-800">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {path && (
          <path d={path} fill="none" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {xy && start && (
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-fit"
          style={{ left: `${start.x}%`, top: `${start.y}%` }}
        />
      )}
      {xy && end && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${end.x}%`, top: `${end.y}%` }}
        >
          {live && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-fit" />}
          <span className="relative block h-3.5 w-3.5 rounded-full bg-fit ring-2 ring-white" />
        </span>
      )}

      {points.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-xs text-white/40">
          En attente du signal GPS…
        </div>
      )}
    </div>
  )
}
