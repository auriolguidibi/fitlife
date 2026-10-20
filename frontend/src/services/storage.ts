const NS = 'fitlife:'

export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(NS + key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value))
    } catch {
      /* quota exceeded – ignore */
    }
  },
  remove(key: string): void {
    localStorage.removeItem(NS + key)
  },
  keys(): string[] {
    const out: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(NS)) out.push(k.slice(NS.length))
    }
    return out
  },
}
