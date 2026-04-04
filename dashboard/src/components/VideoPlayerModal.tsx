import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string | null
  title?: string
}

export default function VideoPlayerModal({ isOpen, onClose, videoId, title }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
    if (!isOpen && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isOpen, videoId])

  if (!isOpen || !videoId) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex flex-col items-center animate-reveal max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-orange-500/50 transition-all flex items-center justify-center shadow-2xl"
        >
          <X size={18} />
        </button>

        {/* Video container — 9:16 portrait */}
        <div className="relative rounded-3xl overflow-hidden border border-zinc-700/30 shadow-2xl shadow-black/50 bg-black" style={{ maxHeight: '85vh', aspectRatio: '9/16' }}>
          <video
            ref={videoRef}
            src={`/api/videos/${videoId}/file`}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
          />
        </div>

        {/* Title below video */}
        {title && (
          <p className="mt-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center max-w-xs line-clamp-2">
            {title}
          </p>
        )}
      </div>
    </div>
  )
}
