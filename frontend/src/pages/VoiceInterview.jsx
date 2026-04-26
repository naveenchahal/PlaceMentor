import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { voiceInterviewAPI } from '../services/api'

const TOPICS = [
  { value: 'dsa',          label: 'DSA',           icon: '🧩', desc: 'Arrays, Trees, DP, Graphs' },
  { value: 'backend',      label: 'Backend',        icon: '⚙️', desc: 'APIs, DB, Auth, System Design' },
  { value: 'react',        label: 'React.js',       icon: '⚛️', desc: 'Hooks, Redux, Performance' },
  { value: 'aptitude',     label: 'Aptitude',       icon: '🔢', desc: 'Quant, Logical, Verbal' },
  { value: 'hr',           label: 'HR Round',       icon: '🤝', desc: 'Behavioral, Situational' },
  { value: 'genai',        label: 'Gen AI',         icon: '🤖', desc: 'LLMs, Prompting, RAG, Agents' },
  { value: 'devops',       label: 'DevOps',         icon: '🚀', desc: 'CI/CD, Docker, K8s, Cloud' },
  { value: 'dbms',         label: 'DBMS',           icon: '🗄️', desc: 'SQL, Indexes, Transactions' },
  { value: 'os',           label: 'OS',             icon: '💻', desc: 'Processes, Memory, Scheduling' },
  { value: 'networking',   label: 'Networking',     icon: '🌐', desc: 'TCP/IP, HTTP, DNS, Security' },
  { value: 'frontend',     label: 'Frontend',       icon: '🎨', desc: 'HTML, CSS, JS, Performance' },
  { value: 'systemdesign', label: 'System Design',  icon: '🏗️', desc: 'Scalability, HLD, LLD' },
]

const DURATIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
]

export default function VoiceInterview() {
  const [form, setForm]       = useState({ topic: '', duration: '30', numQuestions: 5 })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  const hasSpeechSupport = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

  const start = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await voiceInterviewAPI.start(form)
      navigate('/voice-interview/session', { state: { sessionData: data } })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start')
    } finally { setLoading(false) }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🎙</span>
        <h1 className="font-heading text-3xl font-bold text-white">Voice Mock Interview</h1>
      </div>
      <p className="text-slate-400 mb-2">Answer questions verbally — get feedback on both content AND communication skills</p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['🎤 Speech-to-Text', '🔊 AI Reads Questions', '💬 Filler Word Detection', '📊 Pace Analysis', '🧠 Content Scoring'].map(f => (
          <span key={f} className="bg-dark-700 border border-dark-600 text-slate-400 text-xs px-3 py-1.5 rounded-full">{f}</span>
        ))}
      </div>

      {!hasSpeechSupport && (
        <div className="bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-3 rounded-xl mb-6">
          ⚠️ Your browser may not support speech recognition. Please use <strong>Chrome</strong> or <strong>Edge</strong> for the best experience.
        </div>
      )}

      <form onSubmit={start} className="space-y-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Choose Topic</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPICS.map(t => (
              <button type="button" key={t.value}
                onClick={() => setForm({ ...form, topic: t.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.topic === t.value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-dark-500 hover:border-dark-400'}`}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <div className="text-white text-sm font-medium">{t.label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Duration</h3>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <button type="button" key={d.value}
                onClick={() => setForm({ ...form, duration: d.value })}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  form.duration === d.value
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-dark-500 text-slate-400 hover:border-dark-400'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Number of Questions</h3>
          <input type="range" min="3" max="10" value={form.numQuestions}
            onChange={e => setForm({ ...form, numQuestions: parseInt(e.target.value) })}
            className="w-full accent-brand-500" />
          <div className="flex justify-between text-slate-400 text-sm mt-2">
            <span>3</span>
            <span className="text-brand-400 font-semibold">{form.numQuestions} questions</span>
            <span>10</span>
          </div>
          <p className="text-slate-600 text-xs mt-2">
            Voice interviews have a lower max (10) since each answer takes more time
          </p>
        </div>

        {/* Tips card */}
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-4">
          <p className="text-slate-400 text-sm font-medium mb-2">💡 Tips for best results</p>
          <ul className="space-y-1 text-slate-500 text-xs">
            <li>→ Use Chrome or Edge browser</li>
            <li>→ Allow microphone access when prompted</li>
            <li>→ Speak clearly at a normal pace</li>
            <li>→ Press ⏹ when done speaking, then Submit</li>
            <li>→ Use 🔊 Replay to re-hear the question anytime</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl">{error}</div>
        )}

        <button type="submit" disabled={loading || !form.topic} className="btn-primary w-full text-base py-4">
          {loading ? 'Preparing Interview... (30s)' : '🎙 Start Voice Interview'}
        </button>
      </form>
    </main>
  )
}
