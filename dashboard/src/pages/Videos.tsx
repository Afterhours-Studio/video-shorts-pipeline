import { useState, useMemo } from 'react'
import { useVideos, useDeleteVideo } from '../api/videos'
import { Link } from 'react-router-dom'
import {
  Trash2,
  Copy,
  Play,
  Search,
  Film,
  ChevronLeft,
  ChevronRight,
  Hash,
  Plus,
  Clock,
  CheckCheck,
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import VideoPlayerModal from '../components/VideoPlayerModal'

const NICHES = ['all', 'tech', 'gaming', 'finance', 'entertainment', 'sports', 'science', 'general']
const STATUSES = ['all', 'draft', 'producing', 'ready', 'uploaded', 'failed']
const PAGE_SIZE = 12

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'NHÁP', bg: 'bg-zinc-800 text-zinc-500', text: 'text-zinc-400' },
  producing: { label: 'ĐANG TẠO', bg: 'bg-orange-500/10 text-orange-400', text: 'text-orange-500' },
  ready: { label: 'SẴN SÀNG', bg: 'bg-emerald-500/10 text-emerald-400', text: 'text-emerald-500' },
  uploaded: { label: 'ĐÃ ĐĂNG', bg: 'bg-blue-500/10 text-blue-400', text: 'text-blue-500' },
  failed: { label: 'THẤT BẠI', bg: 'bg-red-500/10 text-red-400', text: 'text-red-500' },
}

const nicheColors: Record<string, string> = {
  tech: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
  gaming: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
  finance: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
  entertainment: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
  sports: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
  science: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
  general: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50',
}

function formatDuration(seconds: number | undefined) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function CopyButton({ text, label, icon: Icon }: { text: string; label: string; icon: typeof Copy }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-orange-500 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-orange-500/5"
    >
      {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Icon size={12} />}
      <span>{copied ? 'COPIED!' : label.toUpperCase()}</span>
    </button>
  )
}

export default function Videos() {
  const [nicheFilter, setNicheFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [playingVideo, setPlayingVideo] = useState<{ id: string; title: string } | null>(null)

  const queryParams = {
    ...(nicheFilter !== 'all' ? { niche: nicheFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }

  const { data, isLoading } = useVideos(queryParams)
  const deleteVideo = useDeleteVideo()

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteVideo.mutate(confirmDeleteId, {
        onSuccess: () => setConfirmDeleteId(null),
      })
    }
  }

  const videos = useMemo(() => {
    const list = data?.videos ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (v) =>
        (v.title || '').toLowerCase().includes(q) ||
        (v.topic || '').toLowerCase().includes(q) ||
        (v.caption || '').toLowerCase().includes(q)
    )
  }, [data?.videos, search])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-8 animate-reveal">
        <div className="flex items-center gap-4">
          <div className="h-10 w-48 bg-zinc-900 rounded-2xl animate-pulse" />
          <div className="h-8 w-12 bg-zinc-900 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-12 w-48 bg-zinc-900 rounded-2xl animate-pulse" />
          <div className="h-12 w-48 bg-zinc-900 rounded-2xl animate-pulse" />
          <div className="h-12 flex-1 bg-zinc-900 rounded-2xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-3xl border border-zinc-800/50 aspect-[9/16] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-reveal">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Thư viện Video</h1>
          <span className="inline-flex items-center justify-center h-8 min-w-[32px] px-2.5 rounded-xl bg-orange-500/10 text-orange-500 text-[11px] font-bold tabular-nums border border-orange-500/20 shadow-lg shadow-orange-500/5">
            {total}
          </span>
        </div>
        <Link
          to="/pipeline"
          className="flex items-center gap-2.5 bg-orange-500 hover:bg-orange-600 transition-all px-6 py-3 rounded-2xl text-sm font-extrabold text-black shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          TẠO VIDEO MỚI
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative">
          <select
            value={nicheFilter}
            onChange={(e) => {
              setNicheFilter(e.target.value)
              setPage(0)
            }}
            className="bg-zinc-900 border border-zinc-800/60 rounded-2xl pl-5 pr-10 py-3.5 text-sm font-bold text-zinc-400 focus:outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/5 transition-all appearance-none cursor-pointer min-w-[180px] uppercase tracking-wider"
          >
            {NICHES.map((n) => (
              <option key={n} value={n}>
                {n === 'all' ? 'Tất cả niches' : n.toUpperCase()}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight size={14} className="rotate-90 text-zinc-600" />
          </div>
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            className="bg-zinc-900 border border-zinc-800/60 rounded-2xl pl-5 pr-10 py-3.5 text-sm font-bold text-zinc-400 focus:outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/5 transition-all appearance-none cursor-pointer min-w-[180px] uppercase tracking-wider"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Tất cả trạng thái' : (statusConfig[s]?.label ?? s.toUpperCase())}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight size={14} className="rotate-90 text-zinc-600" />
          </div>
        </div>

        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="TÌM KIẾM THEO TIÊU ĐỀ, TOPIC..."
            className="w-full bg-zinc-900 border border-zinc-800/60 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-zinc-300 focus:outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/5 transition-all placeholder:text-zinc-700 tracking-wider"
          />
        </div>
      </div>

      {/* Empty state */}
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 animate-reveal">
          <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/5">
            <Film size={40} className="text-orange-500/40" />
          </div>
          <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Chưa có video nào</h3>
          <p className="text-sm text-zinc-500 text-center max-w-sm mb-10 leading-relaxed font-medium">
            Bắt đầu tạo video đầu tiên của bạn bằng Pipeline tự động. Chỉ cần nhập topic và để hệ thống xử lý phần còn lại.
          </p>
          <Link
            to="/pipeline"
            className="flex items-center gap-2.5 bg-orange-500 hover:bg-orange-600 transition-all px-8 py-3.5 rounded-2xl text-sm font-extrabold text-black shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            TẠO VIDEO ĐẦU TIÊN
          </Link>
        </div>
      ) : (
        <>
          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((v, idx) => {
              const status = statusConfig[v.status] ?? statusConfig.draft
              const nicheColor = nicheColors[v.niche] ?? nicheColors.general

              return (
                <div
                  key={v.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="group bg-zinc-900 rounded-3xl border border-zinc-800/40 overflow-hidden hover:border-orange-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1 animate-reveal"
                >
                  {/* Thumbnail / Preview */}
                  <div className="relative aspect-[9/16] bg-zinc-900 overflow-hidden">
                    <video
                      src={`/api/videos/${v.id}/file`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      preload="metadata"
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    {/* Play overlay */}
                    <button
                      onClick={() => setPlayingVideo({ id: v.id, title: v.title || v.topic || 'Untitled' })}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-full bg-orange-500 text-black flex items-center justify-center shadow-2xl shadow-orange-500/40 active:scale-90 transition-transform">
                        <Play size={28} className="ml-1" fill="currentColor" />
                      </div>
                    </button>

                    {/* Status badge - Floating Top Left */}
                    <div className={`absolute top-4 left-4 ${status.bg} border border-white/5 backdrop-blur-md rounded-xl px-2.5 py-1 text-[9px] font-black tracking-widest ${status.text} shadow-lg`}>
                      {status.label}
                    </div>

                    {/* Meta - Bottom */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-white/10 backdrop-blur-md ${nicheColor} shadow-lg`}>
                        {v.niche}
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-950/60 backdrop-blur-md border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-200 shadow-lg">
                        <Clock size={10} className="text-orange-500" />
                        <span className="tabular-nums">{formatDuration(v.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="font-bold text-sm leading-tight text-zinc-100 line-clamp-2 mb-4 min-h-[2.5rem] group-hover:text-orange-400 transition-colors">
                      {(v.title || v.topic || "Untitled Video").toUpperCase()}
                    </h3>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-1 pt-4 border-t border-zinc-800/40">
                      <CopyButton text={v.caption} label="CAP" icon={Copy} />
                      <CopyButton text={v.hashtags} label="TAGS" icon={Hash} />
                      
                      <button
                        onClick={() => setConfirmDeleteId(v.id)}
                        className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-8 border-t border-zinc-800/40">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Trang {page + 1} / {totalPages} — {total} Videos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-orange-500 disabled:text-zinc-800 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-orange-500/30 uppercase tracking-widest shadow-lg shadow-black/20"
                >
                  <ChevronLeft size={14} />
                  PREV
                </button>
                <div className="flex items-center gap-1.5 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) pageNum = i
                    else if (page < 3) pageNum = i
                    else if (page > totalPages - 4) pageNum = totalPages - 5 + i
                    else pageNum = page - 2 + i

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all flex items-center justify-center ${
                          page === pageNum
                            ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                            : 'text-zinc-500 hover:text-orange-500 hover:bg-zinc-800'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-orange-500 disabled:text-zinc-800 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-orange-500/30 uppercase tracking-widest shadow-lg shadow-black/20"
                >
                  NEXT
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
        videoId={playingVideo?.id ?? null}
        title={playingVideo?.title}
      />

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteVideo.isPending}
        title="Xóa Video?"
        message="Hành động này không thể hoàn tác. Video sẽ bị xóa vĩnh viễn khỏi thư viện."
        confirmLabel="XÓA VĨNH VIỄN"
        variant="danger"
      />
    </div>
  )
}
