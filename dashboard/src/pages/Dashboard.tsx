import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Video, Zap, Calendar, Circle, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import { useVideos } from '../api/videos'
import { useSchedules } from '../api/schedule'

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('health').json<{ status: string; pipeline?: string }>(),
    retry: false,
  })

  const { data: videosData, isLoading: videosLoading } = useVideos({ limit: 5 })
  const { data: schedulesData } = useSchedules()

  const apiConnected = !!healthData
  const pipelineStatus = healthData?.pipeline ?? 'Idle'
  const pipelineRunning = pipelineStatus === 'Running'
  const totalVideos = videosData?.total ?? 0
  const recentVideos = videosData?.videos ?? []
  const activeSchedules = Array.isArray(schedulesData)
    ? schedulesData.filter((s) => s.is_active).length
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-reveal">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Tổng quan
        </h1>
        <p className="text-zinc-500 mt-2 font-medium">
          Hệ thống điều khiển Pipeline và quản lý nội dung video.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Videos */}
        <div className="glass-surface floating-shadow rounded-3xl p-5 flex flex-col justify-between min-h-[130px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-reveal reveal-stagger-1 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
              Total Library
            </p>
            <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center transition-colors group-hover:bg-orange-500/20">
              <Video size={18} className="text-orange-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
            {videosLoading ? '--' : totalVideos}
          </p>
        </div>

        {/* Pipeline Status */}
        <div className="glass-surface floating-shadow rounded-3xl p-5 flex flex-col justify-between min-h-[130px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-reveal reveal-stagger-2 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
              Pipeline
            </p>
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${
              pipelineRunning ? 'bg-orange-500/10' : 'bg-zinc-800/40'
            }`}>
              <Zap
                size={18}
                className={pipelineRunning ? 'text-orange-500 animate-pulse' : 'text-zinc-600'}
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-bold tracking-tight ${
              pipelineRunning ? 'text-orange-400' : 'text-zinc-300'
            }`}>
              {pipelineStatus.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Active Schedules */}
        <div className="glass-surface floating-shadow rounded-3xl p-5 flex flex-col justify-between min-h-[130px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-reveal reveal-stagger-3 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
              Schedules
            </p>
            <div className="h-10 w-10 rounded-2xl bg-zinc-800/40 flex items-center justify-center transition-colors group-hover:bg-orange-500/10">
              <Calendar size={18} className="text-zinc-400 group-hover:text-orange-500 transition-colors" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
            {activeSchedules}
          </p>
        </div>

        {/* API Status */}
        <div className="glass-surface floating-shadow rounded-3xl p-5 flex flex-col justify-between min-h-[130px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-reveal reveal-stagger-4 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
              Connectivity
            </p>
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${
              apiConnected ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <Circle
                size={18}
                className={apiConnected ? 'text-emerald-500' : 'text-red-500'}
              />
            </div>
          </div>
          <p className={`text-2xl font-bold tracking-tight ${
            apiConnected ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {apiConnected ? 'READY' : 'OFFLINE'}
          </p>
        </div>
      </div>

      {/* Recent Videos & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-surface floating-shadow rounded-3xl overflow-hidden animate-reveal reveal-stagger-3">
          <div className="px-8 py-5 border-b border-zinc-800/40 flex items-center justify-between bg-zinc-900/40">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Video gần đây</h2>
            <button
              onClick={() => navigate('/videos')}
              className="text-xs font-bold text-zinc-500 hover:text-orange-500 transition-colors flex items-center gap-1.5 group"
            >
              XEM TẤT CẢ <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="overflow-x-auto">
            {recentVideos.length === 0 ? (
              <div className="px-8 py-16 text-center text-sm text-zinc-600 font-medium">
                Chưa có video nào. Tạo video đầu tiên từ Pipeline.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-zinc-500 uppercase font-bold tracking-widest border-b border-zinc-800/40 bg-zinc-900/20">
                    <th className="text-left px-8 py-4">Tiêu đề</th>
                    <th className="text-left px-8 py-4">Niche</th>
                    <th className="text-left px-8 py-4">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/10">
                  {recentVideos.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-orange-500/[0.03] transition-colors cursor-pointer group"
                      onClick={() => navigate('/videos')}
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-zinc-200 font-bold group-hover:text-white transition-colors line-clamp-1">
                            {v.title || v.topic}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-block w-fit ${
                            v.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="bg-zinc-800 border border-zinc-700/50 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {v.niche}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-zinc-500 tabular-nums font-medium">
                        {new Date(v.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6 animate-reveal reveal-stagger-4">
          <div className="glass-surface floating-shadow rounded-3xl p-6 flex flex-col gap-4 group">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Thao tác nhanh</h2>
            <button
              onClick={() => navigate('/pipeline')}
              className="w-full flex items-center justify-between gap-3 bg-orange-500 hover:bg-orange-600 text-black text-sm font-extrabold px-6 py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <div className="flex items-center gap-3">
                <Zap size={18} fill="currentColor" />
                <span>Tạo Video Mới</span>
              </div>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/pipeline?mode=discover')}
              className="w-full flex items-center justify-between gap-3 bg-zinc-800/50 hover:bg-zinc-800 text-white text-sm font-bold px-6 py-4 rounded-2xl border border-zinc-700/50 transition-all active:scale-95"
            >
              <span>Discover Topics</span>
              <Sparkles size={18} className="text-orange-500" />
            </button>
          </div>
          
          <div className="glass-surface floating-shadow rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">PRO ENGINE</h2>
              <p className="text-lg font-bold text-white leading-tight">Video pipeline thông minh v4.0</p>
              <p className="text-xs text-zinc-500 mt-2">Hệ thống đang hoạt động với hiệu suất tối đa.</p>
            </div>
            <div className="absolute -bottom-12 -right-8 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Add Sparkles to imports
import { Sparkles } from 'lucide-react'
