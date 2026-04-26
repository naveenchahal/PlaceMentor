import { useState, useEffect } from 'react'
import api from '../services/api'

const COMPANY_ICONS = {
  google: '🔵', amazon: '🟠', microsoft: '🟦', flipkart: '🛒',
  uber: '⚫', adobe: '🔴', infosys: '🔷', tcs: '🔵', wipro: '💜', goldman: '🟡'
}

export default function CompanyPrep() {
  const [companies, setCompanies]   = useState([])
  const [selected, setSelected]     = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)
  const [filters, setFilters]       = useState({ topic: '', difficulty: 'medium', round: '', numQuestions: 5 })
  const [questions, setQuestions]   = useState([])
  const [showAnswers, setShowAnswers] = useState({})
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    api.get('/company/list').then(({ data }) => setCompanies(data.companies))
  }, [])

  const selectCompany = async (company) => {
    setSelected(company.key)
    setQuestions([])
    setError('')
    const { data } = await api.get(`/company/${company.key}`)
    setCompanyInfo(data.company)
    setFilters(f => ({ ...f, topic: '', round: '' }))
  }

  const generate = async () => {
    if (!filters.topic) return setError('Please select a topic')
    setError(''); setLoading(true); setQuestions([])
    try {
      const { data } = await api.post('/company/questions', {
        company: selected,
        topic: filters.topic,
        difficulty: filters.difficulty,
        numQuestions: filters.numQuestions,
        round: filters.round
      })
      setQuestions(data.questions)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate')
    } finally { setLoading(false) }
  }

  const toggleAnswer = (id) => setShowAnswers(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">Company-wise Preparation</h1>
      <p className="text-slate-400 mb-8">Select a company and get targeted interview questions</p>

      {/* Company Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {companies.map(c => (
          <button key={c.key} onClick={() => selectCompany(c)}
            className={`card py-4 text-center hover:border-brand-500/50 transition-all ${selected === c.key ? 'border-brand-500 bg-brand-500/10' : ''}`}>
            <div className="text-2xl mb-1">{COMPANY_ICONS[c.key] || '🏢'}</div>
            <div className="text-white text-sm font-medium">{c.name}</div>
          </button>
        ))}
      </div>

      {/* Company Info + Filters */}
      {companyInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Interview Rounds */}
          <div className="card md:col-span-1">
            <h3 className="font-heading font-semibold text-white mb-3">📋 Interview Rounds</h3>
            <div className="space-y-2">
              {companyInfo.rounds.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-brand-400 font-mono text-xs w-5">{i+1}.</span>
                  <span className="text-slate-300 text-sm">{r}</span>
                </div>
              ))}
            </div>
            <h3 className="font-heading font-semibold text-white mt-4 mb-3">🎯 Focus Topics</h3>
            <div className="flex flex-wrap gap-2">
              {companyInfo.focusTopics.map((t, i) => (
                <span key={i} className="bg-brand-500/10 text-brand-400 text-xs px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="card md:col-span-2">
            <h3 className="font-heading font-semibold text-white mb-4">⚙️ Generate Questions</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">

              {/* Topic */}
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Topic</label>
                <select className="input" value={filters.topic}
                  onChange={e => setFilters({...filters, topic: e.target.value})}>
                  <option value="">Select topic</option>
                  {companyInfo.availableTopics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Difficulty</label>
                <select className="input" value={filters.difficulty}
                  onChange={e => setFilters({...filters, difficulty: e.target.value})}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Round */}
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Round (optional)</label>
                <select className="input" value={filters.round}
                  onChange={e => setFilters({...filters, round: e.target.value})}>
                  <option value="">All Rounds</option>
                  {companyInfo.rounds.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Num Questions */}
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Questions: {filters.numQuestions}</label>
                <input type="range" min="3" max="15" value={filters.numQuestions}
                  onChange={e => setFilters({...filters, numQuestions: parseInt(e.target.value)})}
                  className="w-full accent-brand-500 mt-2" />
              </div>
            </div>

            {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

            <button onClick={generate} disabled={loading || !filters.topic} className="btn-primary w-full">
              {loading ? 'Generating... (30s)' : `Generate ${filters.numQuestions} Questions`}
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-white">
              {questions.length} Questions — {selected && companies.find(c => c.key === selected)?.name}
            </h2>
            <span className="text-slate-400 text-sm">Click answer to reveal</span>
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-brand-400 font-mono text-sm font-bold">Q{i+1}</span>
                  <span className={`badge-${q.difficulty}`}>{q.difficulty}</span>
                  <span className="bg-dark-600 text-slate-400 text-xs px-2 py-0.5 rounded-full">{q.topic}</span>
                  <span className="bg-dark-600 text-slate-500 text-xs px-2 py-0.5 rounded-full ml-auto">{q.round}</span>
                </div>
                <p className="text-white mb-4 leading-relaxed">{q.question}</p>
                <button onClick={() => toggleAnswer(q.id)}
                  className="text-brand-400 text-sm hover:underline flex items-center gap-1">
                  {showAnswers[q.id] ? '▲ Hide Answer' : '▼ Show Answer'}
                </button>
                {showAnswers[q.id] && (
                  <div className="mt-3 bg-dark-700 rounded-xl p-4 border-l-2 border-brand-500">
                    <p className="text-slate-300 text-sm leading-relaxed">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}