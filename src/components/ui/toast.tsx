import { useEffect, useState } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' }

let listeners: ((t: Toast) => void)[] = []
let counter = 0

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast = { id: ++counter, message, type }
  listeners.forEach((l) => l(toast))
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((p) => p.id !== t.id)), 2500)
    }
    listeners.push(handler)
    return () => { listeners = listeners.filter((l) => l !== handler) }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all
            ${t.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
