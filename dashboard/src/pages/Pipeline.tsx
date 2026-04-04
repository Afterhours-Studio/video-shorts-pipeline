import { useState, useEffect, useRef, useMemo } from 'react'
import { useRunPipeline, usePipelineStatus } from '../api/pipeline'
import { usePipelineWebSocket } from '../lib/websocket'
import api from '../lib/api'
import {
  Rocket,
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  Sparkles,
  Timer,
  Ban,
  Lightbulb,
  Cpu,
  Play,
  Clock,
  Zap,
  Search,
  FileText,
  Image,
  Mic2,
  Subtitles,
  Music2,
  Clapperboard,
  ImageIcon,
} from 'lucide-react'

const NICHES = ['tech', 'gaming', 'finance', 'entertainment', 'sports', 'science', 'general']

const STAGES = [
  { key: 'research', label: 'Nghiên cứu', icon: Search },
  { key: 'draft', label: 'Viết script', icon: FileText },
  { key: 'broll', label: 'B-Roll', icon: Image },
  { key: 'voiceover', label: 'Giọng nói', icon: Mic2 },
  { key: 'captions', label: 'Phụ đề', icon: Subtitles },
  { key: 'music', label: 'Nhạc nền', icon: Music2 },
  { key: 'assemble', label: 'Ghép video', icon: Clapperboard },
  { key: 'thumbnail', label: 'Thumbnail', icon: ImageIcon },
]

const nicheConfig: Record<string, { emoji: string; color: string; activeColor: string }> = {
  tech: { emoji: '💻', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  gaming: { emoji: '🎮', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  finance: { emoji: '💰', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  entertainment: { emoji: '🎬', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  sports: { emoji: '⚽', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  science: { emoji: '🔬', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  general: { emoji: '📱', color: 'border-zinc-800 text-zinc-500', activeColor: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
}

interface DiscoveredTopic {
  topic: string
  score?: number
  reason?: string
}

function useElapsedTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setElapsed(0)
      startRef.current = null
    }
  }, [running])

  return elapsed
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Pipeline() {
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState('tech')
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [discoveredTopics, setDiscoveredTopics] = useState<DiscoveredTopic[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [pipelineHistory, setPipelineHistory] = useState<any[]>([])

  const runPipeline = useRunPipeline()
  const { events, reset: resetEvents } = usePipelineWebSocket(videoId)
  const { data: pollingData } = usePipelineStatus(videoId)

  // Derive terminal states from WS events first, fallback to polling
  const wsIsDone = !!events.find((e) => e.event === 'pipeline_done')
  const wsHasFailed = !!events.find((e) => e.event === 'pipeline_error')
  const pollIsDone = pollingData?.video_status === 'done'
  const pollHasFailed = pollingData?.video_status === 'failed'

  const isDone = wsIsDone || pollIsDone
  const hasFailed = wsHasFailed || pollHasFailed
  const isRunning = !!videoId && !isDone && !hasFailed
  const elapsed = useElapsedTimer(isRunning)

  const stageStatus = (stage: string) => {
    // WS events have priority
    const failed = events.find((e) => e.event === 'stage_error' && e.stage === stage)
    const done = events.find((e) => e.event === 'stage_done' && e.stage === stage)
    const running = events.find((e) => e.event === 'stage_start' && e.stage === stage)
    if (failed) return { status: 'failed' as const, error: failed.error, duration: failed.duration }
    if (done) return { status: 'done' as const, duration: done.duration }
    if (running) return { status: 'running' as const }

    // Fallback: check polling data
    const pollStage = pollingData?.stages?.find((s: any) => s.stage === stage)
    if (pollStage) {
      if (pollStage.status === 'error') return { status: 'failed' as const, error: pollStage.error }
      if (pollStage.status === 'done') return { status: 'done' as const }
      if (pollStage.status === 'running') return { status: 'running' as const }
    }

    return { status: 'pending' as const }
  }

  const progress = useMemo(() => {
    const doneCount = STAGES.filter((s) => {
      const st = stageStatus(s.key)
      return st.status === 'done' || st.status === 'failed'
    }).length
    return Math.round((doneCount / STAGES.length) * 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, pollingData])

  // Fetch pipeline history on mount
  useEffect(() => {
    api
      .get('videos', { searchParams: { limit: '8', offset: '0' } })
      .json<{ videos: any[] }>()
      .then((res) => setPipelineHistory(res.videos ?? []))
      .catch(() => {})
  }, [isDone])

  const handleDiscover = async () => {
    setIsDiscovering(true)
    try {
      const res = await api.get('topics/discover', { searchParams: { niche } }).json<{ topics: DiscoveredTopic[] }>()
      setDiscoveredTopics(res.topics ?? [])
    } catch {
      setDiscoveredTopics([])
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleRun = async () => {
    if (!topic.trim()) return
    resetEvents()
    const res = await runPipeline.mutateAsync({ topic, niche, provider })
    setVideoId(res.video_id)
  }

  const handleCancel = () => {
    setVideoId(null)
    resetEvents()
  }

  const handleNewPipeline = () => {
    setVideoId(null)
    setTopic('')
    resetEvents()
    setDiscoveredTopics([])
  }

  return (
    <div className="space-y-4 animate-reveal">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Pipeline</h1>
          <p className="text-zinc-500 mt-2 font-medium">Tạo video tự động từ topic đến thành phẩm</p>
        </div>
        {(isDone || hasFailed) && (
          <button
            onClick={handleNewPipeline}
            className="flex items-center gap-2.5 text-xs font-bold text-zinc-400 hover:text-orange-500 transition-all px-5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800/50 hover:border-orange-500/30 active:scale-95"
          >
            <Zap size={14} />
            PIPELINE MỚI
          </button>
        )}
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Create Form */}
        <div className="glass-surface floating-shadow rounded-3xl overflow-hidden animate-reveal reveal-stagger-1 shrink-0">
          <div className="p-6 border-b border-zinc-800/40 bg-zinc-900/40">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Rocket size={20} className="text-orange-500" />
              </div>
              <h2 className="text-lg font-bold text-white">Tạo Video Mới</h2>
            </div>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-2 ml-[52px] opacity-70">Nhập topic hoặc khám phá trends</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Topic Input */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Topic / Ý tưởng</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Top 5 AI tools thay đổi cuộc chơi năm 2026..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/5 transition-all placeholder:text-zinc-700 resize-none leading-relaxed"
              />
            </div>

            {/* Discover Topics */}
            <div className="relative group/discover">
              <button
                onClick={handleDiscover}
                disabled={isDiscovering}
                className="flex items-center gap-2.5 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors disabled:opacity-50"
              >
                {isDiscovering ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isDiscovering ? 'ĐANG TÌM TOPICS...' : 'KHÁM PHÁ TRENDING TOPICS'}
              </button>

              {discoveredTopics.length > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {discoveredTopics.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setTopic(t.topic)
                        setDiscoveredTopics([])
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 transform active:scale-95 ${
                        topic === t.topic
                          ? 'border-orange-500/40 bg-orange-500/5 text-orange-100'
                          : 'border-zinc-800/50 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                          <Lightbulb size={12} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold line-clamp-2">{t.topic}</span>
                          {t.reason && (
                            <span className="block text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-wider">{t.reason}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Niche Selector */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Niche nội dung</label>
              <div className="flex flex-wrap gap-2.5">
                {NICHES.map((n) => {
                  const cfg = nicheConfig[n]
                  const isActive = niche === n
                  return (
                    <button
                      key={n}
                      onClick={() => setNiche(n)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-300 active:scale-90 ${
                        isActive ? cfg.activeColor : cfg.color + ' hover:border-zinc-700 bg-zinc-900/50'
                      }`}
                    >
                      <span className="text-sm">{cfg.emoji}</span>
                      <span className="uppercase tracking-wider">{n}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Provider Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest">AI Engine</label>
                <p className="text-[10px] text-zinc-600 font-medium mt-1">Lựa chọn mô hình xử lý</p>
              </div>
              <div className="inline-flex rounded-xl border border-zinc-800/50 p-1 bg-zinc-950">
                <button
                  onClick={() => setProvider('gemini')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    provider === 'gemini'
                      ? 'bg-zinc-800 text-orange-500 shadow-xl'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <Sparkles size={14} />
                  GEMINI
                </button>
                <button
                  onClick={() => setProvider('ollama')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    provider === 'ollama'
                      ? 'bg-zinc-800 text-orange-500 shadow-xl'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <Cpu size={14} />
                  OLLAMA
                </button>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={!topic.trim() || runPipeline.isPending || isRunning}
              className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black transition-all px-8 py-5 rounded-2xl text-base font-extrabold shadow-lg shadow-orange-500/20 active:scale-95 disabled:shadow-none"
            >
              {runPipeline.isPending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Zap size={24} fill="currentColor" />
              )}
              <span>{runPipeline.isPending ? 'ĐANG KHỞI TẠO...' : 'BẮT ĐẦU PIPELINE'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT: Pipeline Progress */}
        <div className="glass-surface floating-shadow rounded-3xl overflow-hidden animate-reveal reveal-stagger-2 shrink-0">
          {videoId ? (
            <>
              {/* Progress Header */}
              <div className="p-6 border-b border-zinc-800/40 bg-zinc-900/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        isDone
                          ? 'bg-emerald-500/15'
                          : hasFailed
                          ? 'bg-red-500/15'
                          : 'bg-orange-500/15'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={20} className="text-emerald-400" />
                      ) : hasFailed ? (
                        <XCircle size={20} className="text-red-400" />
                      ) : (
                        <Loader2 size={20} className="text-orange-500 animate-spin" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-white leading-tight">
                        {isDone ? 'Hoàn thành!' : hasFailed ? 'Pipeline thất bại' : 'Đang xử lý...'}
                      </h2>
                      <p className="text-[10px] text-zinc-600 mt-1 font-bold tracking-widest uppercase">ID: {videoId.slice(0, 12)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800/50">
                      <Timer size={14} className="text-orange-500" />
                      <span className="tabular-nums">{formatElapsed(elapsed)}</span>
                    </div>
                    {isRunning && (
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 text-[10px] font-bold text-red-500 hover:text-red-400 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all uppercase tracking-widest"
                      >
                        <Ban size={12} />
                        Hủy
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar Detail */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Tiến độ tổng thể</span>
                  <span className="text-[10px] font-bold text-orange-500 tabular-nums">{isDone ? 100 : progress}%</span>
                </div>
                <div className="relative h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/30 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-in-out ${
                      hasFailed
                        ? 'bg-red-500'
                        : isDone
                        ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                    }`}
                    style={{ width: `${isDone ? 100 : progress}%` }}
                  />
                  {isRunning && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]" />
                  )}
                </div>
              </div>

              {/* Stage List */}
              <div className="p-6">
                <div className="space-y-2">
                  {STAGES.map((stage, idx) => {
                    const info = stageStatus(stage.key)
                    const StageIcon = stage.icon
                    return (
                      <div
                        key={stage.key}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 animate-reveal ${
                          info.status === 'running'
                            ? 'bg-orange-500/5 border border-orange-500/20 translate-x-1'
                            : info.status === 'done'
                            ? 'bg-emerald-500/[0.03]'
                            : info.status === 'failed'
                            ? 'bg-red-500/5 border border-red-500/20'
                            : 'opacity-50 grayscale'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="shrink-0">
                          {info.status === 'done' && <CheckCircle2 size={20} className="text-emerald-500" fill="currentColor" fillOpacity={0.1} />}
                          {info.status === 'running' && <Loader2 size={18} className="text-orange-500 animate-spin" />}
                          {info.status === 'failed' && <XCircle size={20} className="text-red-500" />}
                          {info.status === 'pending' && <Circle size={20} className="text-zinc-800" />}
                        </div>

                        {/* Stage Icon + Name */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          info.status === 'running' ? 'bg-orange-500/10' : 'bg-zinc-800/40'
                        }`}>
                          <StageIcon
                            size={16}
                            className={
                              info.status === 'pending'
                                ? 'text-zinc-700'
                                : info.status === 'running'
                                ? 'text-orange-500'
                                : info.status === 'failed'
                                ? 'text-red-500'
                                : 'text-emerald-500'
                            }
                          />
                        </div>
                        <span
                          className={`text-sm flex-1 font-bold tracking-tight ${
                            info.status === 'pending'
                              ? 'text-zinc-700'
                              : info.status === 'running'
                              ? 'text-orange-100'
                              : info.status === 'failed'
                              ? 'text-red-300'
                              : 'text-zinc-300'
                          }`}
                        >
                          {stage.label.toUpperCase()}
                        </span>

                        {/* Duration / Error */}
                        {info.status === 'done' && info.duration != null && (
                          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800/50 tabular-nums">
                            {info.duration.toFixed(1)}s
                          </span>
                        )}
                        {info.status === 'failed' && info.error && (
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider truncate max-w-[120px]" title={info.error}>
                            FAIL
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Idle State */
            <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8 text-center">
              <div className="relative group cursor-pointer" onClick={handleRun}>
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="relative w-32 h-32 rounded-[2.5rem] bg-zinc-900 border border-zinc-800/50 flex items-center justify-center mb-10 transition-transform group-hover:scale-110 active:scale-90 duration-500">
                  <Play size={48} className="text-orange-500 translate-x-1" fill="currentColor" fillOpacity={0.2} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">Ready to Output</h3>
              <p className="text-sm text-zinc-500 max-w-sm leading-relaxed font-medium">
                Cấu hình topic và niche bên trái. Nhấn nút bắt đầu để khởi tạo quy trình sản xuất video tự động.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-md">
                {[
                  { label: 'Research', icon: Search },
                  { label: 'Writing', icon: FileText },
                  { label: 'VFX & Audio', icon: Zap },
                  { label: 'Rendering', icon: Cpu }
                ].map((step, i) => (
                  <div key={step.label} className="bg-zinc-900/50 border border-zinc-800/40 p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/5 flex items-center justify-center text-[10px] font-bold text-orange-500 border border-orange-500/10">
                      {i + 1}
                    </div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline History */}
      {pipelineHistory.length > 0 && (
        <div className="glass-surface floating-shadow rounded-3xl overflow-hidden animate-reveal reveal-stagger-3">
          <div className="px-8 py-5 border-b border-zinc-800/40 bg-zinc-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-orange-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Lịch sử Pipeline</h2>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{pipelineHistory.length} PHIÊN GẦN ĐÂY</span>
          </div>
          <div className="divide-y divide-zinc-800/30 max-h-[220px] overflow-y-auto custom-scrollbar">
            {pipelineHistory.map((v) => (
              <div
                key={v.id}
                className="px-8 py-5 flex items-center gap-6 hover:bg-orange-500/[0.02] transition-colors group"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor] ${
                    v.status === 'ready' || v.status === 'uploaded'
                      ? 'text-emerald-500 bg-emerald-500'
                      : v.status === 'failed'
                      ? 'text-red-500 bg-red-500'
                      : v.status === 'producing'
                      ? 'text-orange-500 bg-orange-500'
                      : 'text-zinc-500 bg-zinc-500'
                  }`}
                />
                <span className="text-sm font-bold text-zinc-300 flex-1 truncate group-hover:text-white transition-colors">{v.title || v.topic}</span>
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950/50 border border-zinc-800/80 px-2.5 py-1 rounded-xl uppercase tracking-widest">{v.niche}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                  v.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                }`}>{v.status}</span>
                <span className="text-[10px] font-bold text-zinc-600 tabular-nums uppercase tracking-widest">
                  {new Date(v.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
