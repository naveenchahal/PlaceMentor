import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewAPI } from '../services/api'

const TOPICS = [
  { value: 'dsa',        label: 'DSA',             icon: '🧩', desc: 'Arrays, Trees, DP, Graphs' },
  { value: 'backend',    label: 'Backend',          icon: '⚙️', desc: 'APIs, DB, Auth, System Design' },
  { value: 'react',      label: 'React.js',         icon: '⚛️', desc: 'Hooks, Redux, Performance' },
  { value: 'aptitude',   label: 'Aptitude',         icon: '🔢', desc: 'Quant, Logical, Verbal' },
  { value: 'hr',         label: 'HR Round',         icon: '🤝', desc: 'Behavioral, Situational' },
  { value: 'genai',      label: 'Gen AI',           icon: '🤖', desc: 'LLMs, Prompting, RAG, Agents' },
  { value: 'devops',     label: 'DevOps',           icon: '🚀', desc: 'CI/CD, Docker, K8s, Cloud' },
  { value: 'dbms',       label: 'DBMS',             icon: '🗄️', desc: 'SQL, Indexes, Transactions, NoSQL' },
  { value: 'os',         label: 'OS',               icon: '💻', desc: 'Processes, Memory, Scheduling' },
  { value: 'networking', label: 'Networking',       icon: '🌐', desc: 'TCP/IP, HTTP, DNS, Security' },
  { value: 'frontend',   label: 'Frontend',         icon: '🎨', desc: 'HTML, CSS, JS, Web Performance' },
  { value: 'systemdesign', label: 'System Design',  icon: '🏗️', desc: 'Scalability, HLD, LLD, Patterns' },
]

const DURATIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
]

// Backend needs to know descriptions for these new topics
// Add these to your TOPICS constant in interviewController.js:
// genai: "Generative AI & LLMs (prompt engineering, RAG, vector databases, LangChain, agents, fine-tuning, embeddings, hallucinations, evaluation)"
// devops: "DevOps & Cloud (Docker, Kubernetes, CI/CD pipelines, GitHub Actions, AWS/GCP basics, monitoring, logging, infrastructure as code)"
// dbms: "Database Management Systems (SQL queries, joins, indexing, normalization, transactions, ACID, NoSQL vs SQL, Redis, MongoDB)"
// os: "Operating Systems (processes vs threads, memory management, virtual memory, scheduling algorithms, deadlocks, semaphores, file systems)"
// networking: "Computer Networking (OSI model, TCP/IP, HTTP/HTTPS, DNS, load balancing, WebSockets, REST vs GraphQL, network security)"
// frontend: "Frontend Development (HTML5, CSS3, JavaScript ES6+, browser rendering, web performance, accessibility, responsive design, TypeScript)"
// systemdesign: "System Design (scalability, load balancing, caching strategies, database sharding, microservices, message queues, CAP theorem, HLD/LLD)"

export default function Interview() {
  const [form, setForm]       = useState({ topic: '', duration: '30', numQuestions: 5 })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  const start = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await interviewAPI.start(form)
      navigate('/interview/session', { state: { sessionData: data } })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start')
    } finally { setLoading(false) }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">Mock Interview</h1>
      <p className="text-slate-400 mb-8">Real interview experience with AI-powered questions & analysis</p>

      <form onSubmit={start} className="space-y-6">
        {/* Topic */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Choose Topic</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPICS.map(t => (
              <button type="button" key={t.value}
                onClick={() => setForm({ ...form, topic: t.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.topic === t.value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-dark-500 hover:border-dark-400'
                }`}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <div className="text-white text-sm font-medium">{t.label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Duration</h3>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <button type="button" key={d.value}
                onClick={() => setForm({ ...form, duration: d.value })}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  form.duration === d.value
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-dark-500 text-slate-400 hover:border-dark-400'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Number of Questions</h3>
          <input type="range" min="3" max="15" value={form.numQuestions}
            onChange={e => setForm({ ...form, numQuestions: parseInt(e.target.value) })}
            className="w-full accent-brand-500" />
          <div className="flex justify-between text-slate-400 text-sm mt-2">
            <span>3</span>
            <span className="text-brand-400 font-semibold">{form.numQuestions} questions</span>
            <span>15</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !form.topic} className="btn-primary w-full text-base py-4">
          {loading ? 'Preparing Interview... (30s)' : '🎤 Start Interview'}
        </button>
      </form>
    </main>
  )
}