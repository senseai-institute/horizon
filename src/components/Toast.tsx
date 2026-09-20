import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface ToastSpec {
  text: string
  /** An optional link, used to point at the review queue when something lands there. */
  to?: string
  actionLabel?: string
  ttlMs?: number
}

interface Toast extends ToastSpec {
  id: number
}

const ToastContext = createContext<(t: ToastSpec) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((spec: ToastSpec) => {
    const id = nextId++
    setToasts((t) => [...t.slice(-2), { ...spec, id }])
    const ttl = spec.ttlMs ?? 6500
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl)
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-layer" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span>{t.text}</span>
            {t.to && t.actionLabel && (
              <Link to={t.to} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                {t.actionLabel}
              </Link>
            )}
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
