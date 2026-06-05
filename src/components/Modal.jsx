import { useEffect } from 'react'
import { X } from 'lucide-react'

// Modal tipo bottom-sheet en movil, centrado en escritorio.
export default function Modal({ abierto, onClose, titulo, children, footer }) {
  useEffect(() => {
    if (!abierto) return
    const handler = (e) => e.key === 'Escape' && onClose?.()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [abierto, onClose])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-clinic-900/40 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-xl2 rounded-t-3xl shadow-card
                      max-h-[92vh] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-clinic-50">
          <h3 className="font-display text-lg font-bold text-clinic-800">{titulo}</h3>
          <button onClick={onClose}
            className="grid place-items-center w-10 h-10 rounded-full hover:bg-clinic-50 text-clinic-400"
            aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-clinic-50 flex gap-3">{footer}</div>}
      </div>
    </div>
  )
}
