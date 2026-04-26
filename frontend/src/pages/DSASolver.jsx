import { useState, useRef, useEffect } from 'react'

const PLATFORMS = [
  { value: 'leetcode',    label: '🟡 LeetCode' },
  { value: 'gfg',         label: '🟢 GeeksForGeeks' },
  { value: 'codeforces',  label: '🔵 Codeforces' },
  { value: 'hackerrank',  label: '🟩 HackerRank' },
  { value: 'atcoder',     label: '⬛ AtCoder' },
]

const SOLVE_LEVELS = [
  { value: 'explain', label: '📖 Question Explain', desc: 'Full breakdown of problem, concepts & approach' },
  { value: 'hints',   label: '💡 Hints',            desc: 'Progressive hints — no spoilers' },
  { value: 'code',    label: '💻 Full Code',         desc: 'Complete solution with walkthrough & complexity' },
]

const LANGUAGES = [
  { value: 'C++',    label: '⚙️ C++' },
  { value: 'Java',   label: '☕ Java' },
  { value: 'Python', label: '🐍 Python' },
  { value: 'C',      label: '🔧 C' },
]

export default function DSASolver() {
  const [platform,       setPlatform]       = useState('')
  const [questionNumber, setQuestionNumber] = useState('')
  const [solveLevel,     setSolveLevel]     = useState('')
  const [language,       setLanguage]       = useState('')
  const [response,       setResponse]       = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [copied,         setCopied]         = useState(false)
  const responseRef = useRef(null)

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [response])

  const isValid = platform && questionNumber.trim() && solveLevel && language

  const handleSolve = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')
    setResponse('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/dsa/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ platform, questionNumber, solveLevel, language }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Server error')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.text)  setResponse(prev => prev + data.text)
              if (data.error) throw new Error(data.error)
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to get response. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setPlatform(''); setQuestionNumber(''); setSolveLevel(''); setLanguage('')
    setResponse(''); setError('')
  }

  const selectedLevel = SOLVE_LEVELS.find(l => l.value === solveLevel)

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">
            🧩 DSA / <span className="text-brand-400">CP Solver</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            AI-powered explanations, hints & solutions for competitive programming problems
          </p>
        </div>
        <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30
                         text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          🔒 Questions not stored in database
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* ── Left Panel ── */}
        <div className="card space-y-5">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold">Configure Query</p>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">🌐 Platform</label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 text-white rounded-lg px-3 py-2.5
                         text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="" disabled>Select platform...</option>
              {PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Question Number */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium"># Question Number / ID</label>
            <input
              type="text"
              value={questionNumber}
              onChange={e => setQuestionNumber(e.target.value)}
              placeholder="e.g. 1, 42, 1235..."
              className="w-full bg-dark-700 border border-dark-500 text-white rounded-lg px-3 py-2.5
                         text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors
                         font-mono"
            />
          </div>

          {/* Mode */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">🎯 Mode</label>
            <select
              value={solveLevel}
              onChange={e => setSolveLevel(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 text-white rounded-lg px-3 py-2.5
                         text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="" disabled>Select mode...</option>
              {SOLVE_LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            {selectedLevel && (
              <p className="text-xs text-brand-400 pl-1 border-l-2 border-brand-500 ml-1">
                {selectedLevel.desc}
              </p>
            )}
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">💻 Language</label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all
                    ${language === lang.value
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                      : 'bg-dark-700 border-dark-500 text-slate-400 hover:border-dark-400 hover:text-white'
                    }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSolve}
              disabled={!isValid || loading}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all
                ${isValid && !loading
                  ? 'btn-primary'
                  : 'bg-dark-600 text-slate-600 cursor-not-allowed'}`}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                : '⚡ Solve Now'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-dark-500
                         text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              🔄
            </button>
          </div>

          {/* Summary preview */}
          {isValid && (
            <div className="bg-dark-700/60 border border-dark-500 rounded-lg p-3 space-y-1.5 text-xs">
              <p className="text-slate-500 uppercase tracking-wider font-semibold mb-2">Query Preview</p>
              {[
                ['Platform', PLATFORMS.find(p => p.value === platform)?.label],
                ['Question', `#${questionNumber}`],
                ['Mode',     SOLVE_LEVELS.find(l => l.value === solveLevel)?.label],
                ['Language', language],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="card flex flex-col min-h-[580px]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold">AI Response</p>
            {response && (
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg border border-dark-500
                           text-slate-400 hover:text-white hover:border-dark-400 transition-all"
              >
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            )}
          </div>

          <div
            ref={responseRef}
            className="flex-1 overflow-y-auto max-h-[65vh] scrollbar-thin"
          >
            {/* Empty state */}
            {!response && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-white font-semibold text-lg mb-2">Ready to Help!</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
                  Select a platform, enter a question number, choose your mode & language — then hit Solve Now.
                </p>
                <div className="space-y-2 text-left">
                  {SOLVE_LEVELS.map(l => (
                    <div key={l.value}
                         className="bg-dark-700/60 border border-dark-500 rounded-lg px-4 py-2 text-sm text-slate-400">
                      {l.label} — <span className="text-slate-500">{l.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}

            {/* Response — rendered as formatted text */}
            {(response || loading) && (
              <div className="prose-dsa text-slate-300 text-sm leading-7 whitespace-pre-wrap font-mono">
                {response}
                {loading && (
                  <span className="inline-block w-2 h-4 bg-brand-400 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
