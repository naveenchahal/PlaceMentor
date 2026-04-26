import { useState } from 'react'
import { resumeAPI } from '../services/api'

export default function ResumeAnalyzer() {
  const [form, setForm]       = useState({ companyName: '', jobRole: '', requirements: '' })
  const [file, setFile]       = useState(null)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const analyze = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setResult(null)
    try {
      const fd = new FormData()
      fd.append('resume', file)
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      const { data } = await resumeAPI.analyze(fd)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed')
    } finally { setLoading(false) }
  }

  const scoreColor = (s) => s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400'

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">Resume Analyzer</h1>
      <p className="text-slate-400 mb-8">Upload your resume + company requirements for ATS analysis</p>

      <form onSubmit={analyze} className="card mb-8 space-y-4">
        <div className="border-2 border-dashed border-dark-500 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors">
          {file ? (
            <div>
              <p className="text-white font-medium">📄 {file.name}</p>
              <button type="button" onClick={() => setFile(null)} className="text-red-400 text-sm mt-1 hover:underline">Remove</button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <p className="text-slate-400">Click to upload PDF resume</p>
              <input type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
          )}
        </div>
        <input className="input" placeholder="Company Name (e.g. Google)" value={form.companyName}
          onChange={e => setForm({...form, companyName: e.target.value})} required />
        <input className="input" placeholder="Job Role (e.g. Backend Developer)" value={form.jobRole}
          onChange={e => setForm({...form, jobRole: e.target.value})} required />
        <textarea className="input resize-none" rows={3} placeholder="Requirements (e.g. Node.js, Docker, PostgreSQL, REST APIs)"
          value={form.requirements} onChange={e => setForm({...form, requirements: e.target.value})} required />
        <button type="submit" disabled={loading || !file} className="btn-primary w-full">
          {loading ? 'Analyzing... (may take 1 min)' : 'Analyze Resume'}
        </button>
      </form>

      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl mb-6">{error}</div>}

      {result && (
        <div className="space-y-6">
          {/* Score */}
          <div className="card flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-bold font-heading ${scoreColor(result.analysis.atsScore)}`}>
                {result.analysis.atsScore}
              </div>
              <div className="text-slate-400 text-sm mt-1">ATS Score</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${result.analysis.overallVerdict === 'Strong Match' ? 'text-emerald-400' : result.analysis.overallVerdict === 'Moderate Match' ? 'text-yellow-400' : 'text-red-400'}`}>
                {result.analysis.overallVerdict}
              </div>
              <p className="text-slate-400 text-sm mt-1">{result.analysis.summary}</p>
            </div>
          </div>

          {/* Words to Add */}
          {result.analysis.wordsToAdd?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-3">💡 Words to Add</h3>
              <div className="space-y-3">
                {result.analysis.wordsToAdd.map((w, i) => (
                  <div key={i} className="bg-dark-700 rounded-xl p-3">
                    <span className="text-brand-400 font-mono font-medium">{w.word}</span>
                    <span className="text-slate-500 text-sm mx-2">→</span>
                    <span className="text-slate-400 text-sm">{w.where}</span>
                    <p className="text-slate-500 text-xs mt-1">{w.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Requirements */}
          {result.analysis.missingRequirements?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-3">❌ Missing Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {result.analysis.missingRequirements.map((m, i) => (
                  <span key={i} className="bg-red-900/30 text-red-400 text-sm px-3 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Matched */}
          {result.analysis.matchedRequirements?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-3">✅ Matched Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {result.analysis.matchedRequirements.map((m, i) => (
                  <span key={i} className="bg-emerald-900/30 text-emerald-400 text-sm px-3 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Section Scores */}
          {result.analysis.sections && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-3">📊 Section Scores</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.analysis.sections).map(([sec, val]) => (
                  <div key={sec} className="bg-dark-700 rounded-xl p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300 text-sm capitalize">{sec}</span>
                      <span className={`text-sm font-bold ${scoreColor(val.score * 10)}`}>{val.score}/10</span>
                    </div>
                    <div className="w-full bg-dark-500 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{width: `${val.score * 10}%`}} />
                    </div>
                    <p className="text-slate-500 text-xs mt-2">{val.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {result.analysis.improvements?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-3">🚀 Improvements</h3>
              <ul className="space-y-2">
                {result.analysis.improvements.map((imp, i) => (
                  <li key={i} className="text-slate-400 text-sm flex gap-2"><span className="text-brand-400">→</span>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  )
}