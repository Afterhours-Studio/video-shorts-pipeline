import { Loader2, AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  variant?: 'danger' | 'info'
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'XÁC NHẬN',
  cancelLabel = 'HỦY',
  loading = false,
  variant = 'danger'
}: ConfirmModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm glass-surface floating-shadow rounded-[32px] p-8 border border-white/10 animate-reveal shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-[24px] ${
            variant === 'danger' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
          } border flex items-center justify-center mb-6 shadow-lg`}>
            <AlertTriangle size={32} strokeWidth={2.5} />
          </div>

          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed px-4">
            {message}
          </p>

          <div className="flex flex-col w-full gap-3 mt-10">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`w-full py-4 rounded-[20px] text-xs font-black transition-all active:scale-95 shadow-xl uppercase tracking-[0.2em] flex items-center justify-center gap-2 ${
                variant === 'danger' 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                  : 'bg-orange-500 hover:bg-orange-600 text-black shadow-orange-500/20'
              }`}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : confirmLabel}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-4 rounded-[20px] text-xs font-black text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-[0.2em]"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
