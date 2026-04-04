import { useState } from 'react'
import {
  useSchedules,
  useCreateSchedule,
  useToggleSchedule,
  useDeleteSchedule,
} from '../api/schedule'
import {
  Plus,
  Pause,
  Play,
  Trash2,
  Calendar,
  Pencil,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

const NICHES = ['gaming', 'tech', 'finance', 'lifestyle', 'education', 'news']
const ACTIONS = [
  { value: 'full_pipeline', label: 'Full Pipeline' },
  { value: 'draft_only', label: 'Draft Only' },
]

const CRON_PRESETS: Record<string, string> = {
  '0 8 * * *': 'Mỗi ngày lúc 8:00',
  '0 12 * * *': 'Mỗi ngày lúc 12:00',
  '0 18 * * *': 'Mỗi ngày lúc 18:00',
  '0 8 * * 1-5': 'Thứ 2 - Thứ 6 lúc 8:00',
  '0 */6 * * *': 'Mỗi 6 giờ',
  '0 0 * * 0': 'Chủ nhật lúc 0:00',
}

function humanizeCron(expr: string): string {
  if (CRON_PRESETS[expr]) return CRON_PRESETS[expr]

  const parts = expr.split(' ')
  if (parts.length !== 5) return expr

  const [min, hour, dom, , dow] = parts

  let time = ''
  if (hour !== '*' && min !== '*') {
    time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  if (dom === '*' && dow === '*' && time) return `Mỗi ngày lúc ${time}`
  if (dom === '*' && dow === '1-5' && time) return `Thứ 2-6 lúc ${time}`
  if (hour.startsWith('*/')) return `Mỗi ${hour.slice(2)} giờ`

  return expr
}

function formatTime(iso: string | null): string {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Schedule() {
  const { data: schedules, isLoading } = useSchedules()
  const createSchedule = useCreateSchedule()
  const toggleSchedule = useToggleSchedule()
  const deleteSchedule = useDeleteSchedule()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    cron_expr: '0 8 * * *',
    niche: 'gaming',
    action: 'full_pipeline',
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const handleCreate = () => {
    if (!form.name.trim()) return
    createSchedule.mutate(form, {
      onSuccess: () => {
        setForm({ name: '', cron_expr: '0 8 * * *', niche: 'gaming', action: 'full_pipeline' })
        setShowForm(false)
      },
    })
  }

  const handleConfirmDelete = () => {
    if (confirmDeleteId !== null) {
      deleteSchedule.mutate(confirmDeleteId, {
        onSuccess: () => setConfirmDeleteId(null),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-10 animate-reveal">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase">Lịch Tự Động</h2>
          <p className="text-sm font-medium text-zinc-500 mt-1">
            Quản lý lịch chạy pipeline sản xuất video tự động
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2.5 bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-2xl text-sm font-extrabold text-black shadow-lg shadow-orange-500/20 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          ADD SCHEDULE
        </button>
      </div>

      {/* Add Schedule Form */}
      {showForm && (
        <div className="glass-surface floating-shadow rounded-3xl p-8 mb-10 animate-reveal">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                <Plus size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Tạo lịch mới
              </h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronUp size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5 ml-1">
                Tên lịch
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Gaming hàng ngày buổi sáng"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/5 transition-all"
              />
            </div>

            {/* Cron */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5 ml-1">
                Cron Expression
              </label>
              <div className="relative">
                <input
                  value={form.cron_expr}
                  onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
                  placeholder="0 8 * * *"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-mono text-orange-500 placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/5 transition-all"
                />
              </div>
              <p className="text-[10px] font-bold text-zinc-600 mt-2.5 ml-1 uppercase tracking-wider">
                {humanizeCron(form.cron_expr)}
              </p>
            </div>

            {/* Niche */}
            <div className="relative">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5 ml-1">
                Niche
              </label>
              <select
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-400 focus:outline-none focus:border-orange-500/40 transition-all appearance-none uppercase tracking-wider cursor-pointer"
              >
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-[58px] pointer-events-none text-zinc-600">
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Action */}
            <div className="relative">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5 ml-1">
                Action
              </label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-400 focus:outline-none focus:border-orange-500/40 transition-all appearance-none uppercase tracking-wider cursor-pointer"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-[58px] pointer-events-none text-zinc-600">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-10 pt-8 border-t border-zinc-800/50">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3.5 text-sm font-black text-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-widest"
            >
              Huỷ bỏ
            </button>
            <button
              onClick={handleCreate}
              disabled={createSchedule.isPending || !form.name.trim()}
              className="flex items-center gap-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:grayscale px-8 py-3.5 rounded-2xl text-sm font-extrabold text-black shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
              {createSchedule.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} strokeWidth={3} />
              )}
              LƯU LỊCH CHẠY
            </button>
          </div>
        </div>
      )}

      {/* Schedule Cards */}
      {!schedules?.length ? (
        <div className="flex flex-col items-center justify-center py-32 animate-reveal">
          <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/5">
            <Calendar size={40} className="text-orange-500/40" />
          </div>
          <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">
            Chưa có lịch nào
          </h3>
          <p className="text-sm font-medium text-zinc-500 mb-10 max-w-sm text-center leading-relaxed">
            Tạo lịch đầu tiên để tự động hoá pipeline sản xuất video theo khung giờ cố định.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-8 py-4 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:border-orange-500/30 uppercase tracking-widest"
          >
            <Plus size={18} strokeWidth={3} className="text-orange-500" />
            TẠO LỊCH ĐẦU TIÊN
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {schedules.map((s, idx) => (
            <div
              key={s.id}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="glass-surface floating-shadow rounded-3xl overflow-hidden transition-all duration-300 hover:border-orange-500/20 group animate-reveal"
            >
              <div className="p-8">
                <div className="flex items-center justify-between">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="font-extrabold text-lg text-white tracking-tight truncate group-hover:text-orange-500 transition-colors">
                        {s.name}
                      </h3>
                      <span
                        onClick={() => toggleSchedule.mutate(s.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase cursor-pointer transition-all ${
                          s.is_active
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500 shadow-[0_0_8px_currentColor] animate-pulse' : 'bg-zinc-500'}`} />
                        {s.is_active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      {/* Cron */}
                      <span className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
                        <Clock size={12} className="text-orange-500" />
                        <code className="text-orange-500/80 font-mono text-[11px] font-bold">
                          {s.cron_expr}
                        </code>
                        <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider ml-1">
                          {humanizeCron(s.cron_expr)}
                        </span>
                      </span>

                      {/* Niche badge */}
                      <span className="bg-zinc-950 border border-zinc-800/80 text-zinc-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {s.niche}
                      </span>

                      {/* Action */}
                      <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest border-l border-zinc-800 pl-6">
                        {s.action === 'full_pipeline' ? 'FULL PIPELINE' : 'DRAFT ONLY'}
                      </span>
                    </div>

                    {/* Run times */}
                    <div className="flex gap-8 mt-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">
                          Lần cuối
                        </span>
                        <span className="text-xs font-bold text-zinc-400 tabular-nums">
                          {formatTime(s.last_run_at)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-orange-500/40 uppercase tracking-[0.2em]">
                          Lần tới
                        </span>
                        <span className="text-xs font-bold text-orange-500/80 tabular-nums">
                          {formatTime(s.next_run_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-8">
                    <button
                      onClick={() => toggleSchedule.mutate(s.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        s.is_active
                          ? 'bg-zinc-950 text-emerald-500 border border-zinc-800 hover:border-emerald-500/30'
                          : 'bg-zinc-950 text-zinc-500 border border-zinc-800 hover:border-orange-500/30'
                      }`}
                      title={s.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                    >
                      {s.is_active ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
                    </button>
                    <button
                      className="w-11 h-11 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                      title="Chỉnh sửa"
                    >
                      <Pencil size={18} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(s.id)}
                      className="w-11 h-11 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-600 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
                      title="Xoá"
                    >
                      <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteSchedule.isPending}
        title="Xóa Lịch Chạy?"
        message="Dừng và xóa lịch pipeline này vĩnh viễn? Hành động này không thể hoàn tác."
        confirmLabel="XÓA LỊCH"
        variant="danger"
      />
    </div>
  )
}
