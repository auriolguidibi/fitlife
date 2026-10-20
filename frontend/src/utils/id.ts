export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function daysAgoKey(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return todayKey(d)
}
