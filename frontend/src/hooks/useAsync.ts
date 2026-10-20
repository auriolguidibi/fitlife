import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { reload: () => void; setData: (data: T) => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const mounted = useRef(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const load = useCallback(async () => {
    // Rechargement « silencieux » : si des données sont déjà affichées, on les garde à l'écran
    // pendant la requête (sinon chaque action ferait clignoter la page derrière un spinner).
    setState((s) => ({ ...s, loading: s.data === null, error: null }))
    try {
      const data = await fnRef.current()
      if (mounted.current) setState({ data, loading: false, error: null })
    } catch (e) {
      if (mounted.current) {
        setState((s) => ({ data: s.data, loading: false, error: e instanceof Error ? e.message : 'Erreur' }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Mise à jour locale (après une action) sans repasser par l'état de chargement.
  const setData = useCallback((data: T) => setState((s) => ({ ...s, data })), [])

  return { ...state, reload: load, setData }
}
