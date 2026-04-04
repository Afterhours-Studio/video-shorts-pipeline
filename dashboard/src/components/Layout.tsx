import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Video,
  Zap,
  Calendar,
  Settings,
  ChevronRight,
} from 'lucide-react'
import api from '../lib/api'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/videos', icon: Video, label: 'Videos' },
  { to: '/pipeline', icon: Zap, label: 'Pipeline' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/videos': 'Videos',
  '/pipeline': 'Pipeline',
  '/schedule': 'Schedule',
  '/settings': 'Settings',
}

export default function Layout() {
  const location = useLocation()
  const currentTitle = pageTitles[location.pathname] ?? 'Dashboard'

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('health').json<{ status: string; pipeline?: string }>(),
    refetchInterval: 15_000,
    retry: false,
  })

  const apiConnected = !!healthData
  const pipelineStatus = healthData?.pipeline ?? 'Idle'

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 p-3 gap-3 overflow-hidden font-sans">
      {/* Floating Sidebar */}
      <aside className="w-68 glass-surface rounded-3xl flex flex-col floating-shadow shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="px-7 py-6 border-b border-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-black shadow-lg shadow-orange-500/20 grayscale-[0.2] hover:grayscale-0 transition-all duration-300">
              V
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                Verticals
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold tracking-[0.1em] uppercase opacity-70">
                PRO ENGINE v4
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active =
              to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                  active
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Icon
                  size={20}
                  className={active ? 'text-orange-500' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span>{label}</span>
                {active && (
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* System Status */}
        <div className="px-5 py-6 border-t border-zinc-800/40 bg-zinc-900/20 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
              System Health
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-zinc-800/20 border border-zinc-700/10">
              <span className="text-[11px] text-zinc-500 font-medium">Pipeline</span>
              <span className="flex items-center gap-2 text-[11px] font-bold">
                <div
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    pipelineStatus === 'Running' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-zinc-600'
                  }`}
                />
                <span className={pipelineStatus === 'Running' ? 'text-orange-400' : 'text-zinc-400'}>
                  {pipelineStatus.toUpperCase()}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-zinc-800/20 border border-zinc-700/10">
              <span className="text-[11px] text-zinc-500 font-medium">API Cloud</span>
              <span className="flex items-center gap-2 text-[11px] font-bold">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    apiConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span className={apiConnected ? 'text-emerald-400' : 'text-red-400'}>
                  {apiConnected ? 'READY' : 'OFFLINE'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Main Content Area */}
      <div className="flex-1 glass-surface rounded-3xl flex flex-col floating-shadow overflow-hidden">
        {/* Minimalist Top Bar */}
        <header className="h-16 border-b border-zinc-800/40 flex items-center px-10 bg-zinc-900/30 shrink-0">
          <div className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase">
            <span className="text-zinc-600">Verticals</span>
            <ChevronRight size={14} className="text-zinc-800" />
            <span className="text-orange-500">{currentTitle}</span>
          </div>
        </header>

        {/* Page Content wrapper with scroll and fade animation */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto px-10 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
