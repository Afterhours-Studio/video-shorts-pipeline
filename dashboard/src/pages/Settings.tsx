import { useState, useEffect } from 'react'
import api from '../lib/api'
import {
  Save,
  Eye,
  EyeOff,
  Key,
  Mic,
  Cog,
  Info,
  ExternalLink,
  Check,
  Loader2,
  Brain,
  Subtitles,
} from 'lucide-react'

// ── Vietnamese Edge TTS voices ──────────────────────────────
const EDGE_VOICES = [
  { id: 'vi-VN-NamMinhNeural', label: 'Nam Minh (Nam)', desc: 'Tự nhiên, chuyên nghiệp' },
  { id: 'vi-VN-HoaiMyNeural', label: 'Hoài My (Nữ)', desc: 'Tự nhiên, rõ ràng' },
]

const WHISPER_MODELS = [
  { id: 'tiny', label: 'Tiny', desc: '~39M, nhanh nhất, accuracy thấp' },
  { id: 'base', label: 'Base', desc: '~74M, cân bằng tốc độ' },
  { id: 'small', label: 'Small', desc: '~244M, chính xác hơn' },
  { id: 'medium', label: 'Medium', desc: '~769M, khuyến nghị cho tiếng Việt' },
  { id: 'large-v3', label: 'Large v3', desc: '~1.5G, chính xác nhất, chậm' },
]

const TTS_PROVIDERS = [
  { id: 'edge', label: 'Edge TTS', desc: 'Miễn phí, chất lượng tốt' },
  { id: 'elevenlabs', label: 'ElevenLabs', desc: 'Premium, tự nhiên nhất' },
]

const LLM_PROVIDERS = [
  { id: 'gemini', label: 'Gemini Flash 2.5', desc: 'Nhanh, miễn phí tier' },
  { id: 'ollama', label: 'Ollama (Local)', desc: 'Chạy local, không cần API key' },
]

// ── Expected config keys ────────────────────────────────────
const EXPECTED_KEYS = [
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', required: true },
  { key: 'GNEWS_API_KEY', label: 'GNews API Key', required: true },
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key', required: false },
  { key: 'NEWSAPI_KEY', label: 'NewsAPI Key', required: false },
  { key: 'TIKTOK_CLIENT_KEY', label: 'TikTok Client Key', required: false },
  { key: 'TIKTOK_CLIENT_SECRET', label: 'TikTok Client Secret', required: false },
]

// ── Default config values ───────────────────────────────────
const CAPTION_SPLIT_MODES = [
  { id: 'smart', label: 'Thông minh', desc: 'Cắt theo dấu câu (. , ! ?) — tự nhiên nhất' },
  { id: 'fixed', label: 'Cố định', desc: 'Cắt đều theo số âm tiết' },
]

const CAPTION_MAX_WORDS_OPTIONS = [4, 6, 8, 10, 12]

const DEFAULTS: Record<string, string> = {
  LLM_PROVIDER: 'gemini',
  TTS_PROVIDER: 'edge',
  EDGE_VOICE: 'vi-VN-NamMinhNeural',
  WHISPER_MODEL: 'medium',
  CAPTION_SPLIT_MODE: 'smart',
  CAPTION_MAX_WORDS: '8',
  TIKTOK_DEFAULT_PRIVACY: 'SELF_ONLY',
}

export default function Settings() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; mode: 'success' | 'error'; message: string }>({ 
    show: false, 
    mode: 'success', 
    message: '' 
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api
      .get('settings')
      .json<{ config: Record<string, string> }>()
      .then((data) => {
        // Merge defaults with actual config
        setConfig({ ...DEFAULTS, ...data.config })
        setLoaded(true)
      })
      .catch(() => {
        setConfig({ ...DEFAULTS })
        setLoaded(true)
      })
  }, [])

  const update = (key: string, value: string) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('settings', { json: config })
      setToast({ show: true, mode: 'success', message: 'Đã lưu cấu hình thành công' })
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000)
    } catch (err) {
      console.error(err)
      setToast({ show: true, mode: 'error', message: 'Lỗi: Không thể kết nối tới backend' })
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 5000)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-32 px-4">
      {/* Header */}
      <div className="mb-12 animate-reveal flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight leading-tight uppercase">
            Cấu hình <span className="text-orange-500">Hệ thống</span>
          </h2>
          <p className="text-sm font-bold text-zinc-500 mt-2 uppercase tracking-widest flex items-center gap-2">
            <Cog size={14} className="text-orange-500" />
            Quản lý API keys, giọng nói, và cài đặt pipeline
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="hidden sm:flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 uppercase tracking-widest"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={3} />}
          {saving ? 'SAVING' : 'Lưu cài đặt'}
        </button>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-[100] flex items-center gap-3 bg-zinc-950 border ${
          toast.mode === 'success' ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'
        } px-6 py-4 rounded-2xl shadow-2xl animate-reveal floating-shadow`}>
          <div className={`w-8 h-8 rounded-xl ${toast.mode === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
            {toast.mode === 'success' ? <Check size={16} strokeWidth={3} /> : <Info size={16} strokeWidth={3} />}
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* ── API Keys ─────────────────────────────────────── */}
        <section className="glass-surface floating-shadow rounded-[32px] overflow-hidden animate-reveal stagger-delay-1">
          <div className="px-8 py-6 border-b border-white/[0.05] flex items-center gap-4 bg-white/[0.02]">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Key size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">API Keys</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Khoá API cho các dịch vụ bên ngoài</p>
            </div>
          </div>
          <div className="p-8 space-y-6">
            {EXPECTED_KEYS.map(({ key, label, required }) => {
              const value = config[key] || ''
              // If it has a value, it's configured (even if masked with bullets)
              const hasValue = !!value && value.length > 0 
              return (
                <div key={key} className="group">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {label}
                      {required && <span className="text-orange-500 ml-1">*</span>}
                    </label>
                    <span className={`inline-flex items-center gap-2 text-[10px] font-black tracking-widest uppercase ${hasValue ? 'text-emerald-500' : required ? 'text-orange-500' : 'text-zinc-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hasValue ? 'bg-emerald-500 shadow-[0_0_8px_currentColor]' : required ? 'bg-orange-500' : 'bg-zinc-800'}`} />
                      {hasValue ? 'Configured' : required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[key] ? 'text' : 'password'}
                        value={value}
                        onChange={(e) => update(key, e.target.value)}
                        placeholder={`Enter ${label}`}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm font-mono text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all"
                      />
                    </div>
                    <button
                      onClick={() => setShowKeys({ ...showKeys, [key]: !showKeys[key] })}
                      className="w-14 h-auto bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 transition-all"
                    >
                      {showKeys[key] ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── LLM Provider ─────────────────────────────────── */}
        <section className="glass-surface floating-shadow rounded-[32px] overflow-hidden animate-reveal stagger-delay-2">
          <div className="px-8 py-6 border-b border-white/[0.05] flex items-center gap-4 bg-white/[0.02]">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Brain size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">LLM Provider</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI model cho script generation</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4">
              {LLM_PROVIDERS.map(({ id, label, desc }) => {
                const active = config.LLM_PROVIDER === id
                return (
                  <button
                    key={id}
                    onClick={() => update('LLM_PROVIDER', id)}
                    className={`text-left p-6 rounded-[24px] border-2 transition-all duration-300 relative overflow-hidden group ${
                      active
                        ? 'bg-orange-500/5 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.1)]'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className={`text-sm font-black uppercase tracking-tight transition-colors ${active ? 'text-orange-500' : 'text-zinc-400'}`}>
                      {label}
                    </div>
                    <div className="text-[11px] font-bold text-zinc-500 mt-2 leading-relaxed">{desc}</div>
                    {active && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check size={12} strokeWidth={4} className="text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {config.LLM_PROVIDER === 'ollama' && (
              <div className="mt-8 animate-reveal">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Ollama Model</label>
                <input
                  value={config.OLLAMA_MODEL || 'llama3.1'}
                  onChange={(e) => update('OLLAMA_MODEL', e.target.value)}
                  placeholder="llama3.1"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm font-bold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all"
                />
              </div>
            )}
          </div>
        </section>

        {/* ── TTS / Voice ──────────────────────────────────── */}
        <section className="glass-surface floating-shadow rounded-[32px] overflow-hidden animate-reveal stagger-delay-3">
          <div className="px-8 py-6 border-b border-white/[0.05] flex items-center gap-4 bg-white/[0.02]">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Mic size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Giọng nói (TTS)</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Chọn giọng nói cho video</p>
            </div>
          </div>
          <div className="p-8 space-y-8">
            {/* TTS Provider */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-1">Provider Selection</label>
              <div className="grid grid-cols-2 gap-4">
                {TTS_PROVIDERS.map(({ id, label, desc }) => {
                  const active = config.TTS_PROVIDER === id
                  return (
                    <button
                      key={id}
                      onClick={() => update('TTS_PROVIDER', id)}
                      className={`text-left p-6 rounded-[24px] border-2 transition-all duration-300 relative overflow-hidden ${
                        active
                          ? 'bg-orange-500/5 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.1)]'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className={`text-sm font-black uppercase tracking-tight transition-colors ${active ? 'text-orange-500' : 'text-zinc-400'}`}>
                        {label}
                      </div>
                      <div className="text-[11px] font-bold text-zinc-500 mt-2 leading-relaxed">{desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Voice Selector */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-1">Vietnamese Edge Voices</label>
              <div className="grid grid-cols-1 gap-3">
                {EDGE_VOICES.map(({ id, label, desc }) => {
                  const active = config.EDGE_VOICE === id
                  return (
                    <button
                      key={id}
                      onClick={() => update('EDGE_VOICE', id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        active
                          ? 'bg-orange-500/5 border-orange-500'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${active ? 'bg-orange-500 animate-pulse shadow-[0_0_8px_currentColor]' : 'bg-zinc-800'}`} />
                        <div>
                          <div className={`text-sm font-black uppercase tracking-tight ${active ? 'text-white' : 'text-zinc-400'}`}>{label}</div>
                          <div className="text-[11px] font-medium text-zinc-500">{desc}</div>
                        </div>
                      </div>
                      {active && <Check size={16} strokeWidth={3} className="text-orange-500" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ElevenLabs Voice ID */}
            {config.TTS_PROVIDER === 'elevenlabs' && (
              <div className="animate-reveal">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">ElevenLabs Voice ID</label>
                <input
                  value={config.ELEVENLABS_VOICE_ID || ''}
                  onChange={(e) => update('ELEVENLABS_VOICE_ID', e.target.value)}
                  placeholder="Enter voice ID from ElevenLabs"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all"
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Caption Settings ──────────────────────────────── */}
        <section className="glass-surface floating-shadow rounded-[32px] overflow-hidden animate-reveal">
          <div className="px-8 py-6 border-b border-white/[0.05] flex items-center gap-4 bg-white/[0.02]">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Subtitles size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Phụ đề (Captions)</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cách cắt câu và số âm tiết mỗi dòng sub</p>
            </div>
          </div>
          <div className="p-8 space-y-8">
            {/* Split Mode */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-1">Chế độ cắt câu</label>
              <div className="grid grid-cols-2 gap-4">
                {CAPTION_SPLIT_MODES.map(({ id, label, desc }) => {
                  const active = config.CAPTION_SPLIT_MODE === id
                  return (
                    <button
                      key={id}
                      onClick={() => update('CAPTION_SPLIT_MODE', id)}
                      className={`text-left p-6 rounded-[24px] border-2 transition-all duration-300 relative overflow-hidden ${
                        active
                          ? 'bg-orange-500/5 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.1)]'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className={`text-sm font-black uppercase tracking-tight transition-colors ${active ? 'text-orange-500' : 'text-zinc-400'}`}>
                        {label}
                      </div>
                      <div className="text-[11px] font-bold text-zinc-500 mt-2 leading-relaxed">{desc}</div>
                      {active && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                          <Check size={12} strokeWidth={4} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Max Words Per Line */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-1">
                {config.CAPTION_SPLIT_MODE === 'smart' ? 'Tối đa âm tiết / dòng' : 'Số âm tiết / dòng'}
              </label>
              <div className="flex gap-3">
                {CAPTION_MAX_WORDS_OPTIONS.map((n) => {
                  const active = String(n) === config.CAPTION_MAX_WORDS
                  return (
                    <button
                      key={n}
                      onClick={() => update('CAPTION_MAX_WORDS', String(n))}
                      className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all border-2 ${
                        active
                          ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] font-bold text-zinc-600 mt-3 px-1">
                {config.CAPTION_SPLIT_MODE === 'smart'
                  ? 'Tiếng Việt khuyến nghị 8-10. Cắt tại dấu câu, tối đa không quá số này.'
                  : 'Tiếng Việt khuyến nghị 6-8. Mỗi dòng sub luôn đúng số âm tiết này.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Pipeline Settings ─────────────────────────────── */}
        <section className="glass-surface floating-shadow rounded-[32px] overflow-hidden animate-reveal">
          <div className="px-8 py-6 border-b border-white/[0.05] flex items-center gap-4 bg-white/[0.02]">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Cog size={18} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Pipeline</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cài đặt Whisper, upload, và pipeline</p>
            </div>
          </div>
          <div className="p-8 space-y-8">
            {/* Whisper Model */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-1">Whisper Transcription Model</label>
              <div className="grid grid-cols-1 gap-3">
                {WHISPER_MODELS.map(({ id, label, desc }) => {
                  const active = config.WHISPER_MODEL === id
                  return (
                    <button
                      key={id}
                      onClick={() => update('WHISPER_MODEL', id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        active
                          ? 'bg-orange-500/5 border-orange-500'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${active ? 'bg-orange-500 animate-pulse' : 'bg-zinc-800'}`} />
                        <div>
                          <span className={`text-sm font-black uppercase tracking-tight ${active ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
                          <span className="text-[11px] font-bold text-zinc-500 ml-3 uppercase tracking-widest opacity-60">/ {desc}</span>
                        </div>
                      </div>
                      {id === 'medium' && !active && (
                        <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase tracking-widest border border-orange-500/20">Khuyến nghị</span>
                      )}
                      {active && <Check size={16} strokeWidth={3} className="text-orange-500" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* TikTok Privacy */}
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-1">TikTok Default Privacy</label>
              <div className="relative">
                <select
                  value={config.TIKTOK_DEFAULT_PRIVACY || 'SELF_ONLY'}
                  onChange={(e) => update('TIKTOK_DEFAULT_PRIVACY', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-200 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all cursor-pointer"
                >
                  <option value="SELF_ONLY">Self Only (Chỉ mình tôi)</option>
                  <option value="FOLLOWER_OF_CREATOR">Followers</option>
                  <option value="MUTUAL_FOLLOW_FRIENDS">Bạn bè</option>
                  <option value="PUBLIC_TO_EVERYONE">Public</option>
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                  <Cog size={16} className="text-zinc-600" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── About ──────────────────────────────────────────── */}
        <section className="glass-surface border border-white/[0.05] rounded-[32px] overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
          <div className="px-8 py-6 border-b border-white/[0.05] flex items-center gap-4">
            <Info size={18} className="text-zinc-500" />
            <h3 className="text-base font-black text-zinc-400 uppercase tracking-tight">System Info</h3>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] block mb-2">Version</span>
                <p className="text-xs font-black text-orange-500 font-mono tracking-tighter">V4.0 (FLUID)</p>
              </div>
              <div>
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] block mb-2">Platform</span>
                <p className="text-xs font-black text-zinc-300 uppercase">TIKTOK VN</p>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] block mb-2">Technohaven</span>
                <p className="text-[10px] font-bold text-zinc-500">Node + Gemini + Edge TTS + ffmpeg</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/[0.03]">
              <a
                href="https://github.com/h1dr0n/video-shorts-pipeline"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-[10px] font-black text-zinc-500 hover:text-orange-500 uppercase tracking-[0.2em] transition-colors"
              >
                <ExternalLink size={12} strokeWidth={3} />
                GitHub Repository
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Save Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50">
        <div className="glass-surface floating-shadow rounded-[24px] p-2 pr-2 border border-white/10 flex items-center justify-between animate-reveal shadow-2xl">
          <div className="px-4 py-2">
             {saving ? (
               <div className="flex items-center gap-3">
                 <Loader2 size={16} className="animate-spin text-orange-500" />
                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saving...</span>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ready</span>
               </div>
             )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-8 py-3.5 rounded-[20px] text-xs font-black text-white transition-all shadow-xl shadow-orange-500/20 active:scale-95 uppercase tracking-widest"
          >
            <Save size={16} strokeWidth={3} />
            {saving ? 'SAVING' : 'SAVE CONFIG'}
          </button>
        </div>
      </div>
    </div>
  )
}
