import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewAPI, voiceInterviewAPI } from '../services/api'

const gradeColor = (g) => {
  if (!g) return 'text-slate-400'
  if (g.startsWith('A')) return 'text-emerald-400'
  if (g.startsWith('B')) return 'text-blue-400'
  if (g.startsWith('C')) return 'text-yellow-400'
  return 'text-red-400'
}

const topicLabel = {
  dsa: 'DSA', backend: 'Backend', react: 'React.js', aptitude: 'Aptitude',
  hr: 'HR Round', genai: 'Gen AI', devops: 'DevOps', dbms: 'DBMS',
  os: 'OS', networking: 'Networking', frontend: 'Frontend', systemdesign: 'System Design'
}

export default function History() {
  const [tab, setTab]         = useState('interview') // 'interview' | 'voice'
  const [history, setHistory] = useState([])
  const [voiceHistory, setVoiceHistory] = useState([])
  const [selected, setSelected]   = useState(null)
  const [detail, setDetail]       = useState(null)
  const [voiceDetail, setVoiceDetail] = useState(null)
  const [loading, setLoading]     = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      interviewAPI.getHistory(),
      voiceInterviewAPI.history()
    ]).then(([intRes, voiceRes]) => {
      setHistory(intRes.data.history)
      setVoiceHistory(voiceRes.data.history || [])
    }).finally(() => setLoading(false))
  }, [])

  const viewDetail = async (id) => {
    setSelected(id)
    setVoiceDetail(null)
    const { data } = await interviewAPI.getSession(id)
    setDetail(data.session)
  }

  const viewVoiceDetail = (session) => {
    setSelected(session.id)
    setDetail(null)
    setVoiceDetail(session)
  }

  const closeDetail = () => { setDetail(null); setVoiceDetail(null); setSelected(null) }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center text-brand-400">Loading history...</div>
  )

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">Interview History</h1>
      <p className="text-slate-400 mb-6">Review your past sessions and track your progress</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => { setTab('interview'); closeDetail() }}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all
            ${tab === 'interview' ? 'bg-brand-500 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'}`}>
          🎤 Mock Interviews
        </button>
        <button onClick={() => { setTab('voice'); closeDetail() }}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all
            ${tab === 'voice' ? 'bg-brand-500 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'}`}>
          🎙 Voice Interviews
          {voiceHistory.length > 0 && (
            <span className="ml-2 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">{voiceHistory.length}</span>
          )}
        </button>
      </div>

      {/* ── MOCK INTERVIEW TAB ── */}
      {tab === 'interview' && (
        <>
          {history.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-slate-400 mb-4">No interviews yet</p>
              <button onClick={() => navigate('/interview')} className="btn-primary">Start Your First Interview</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map(s => (
                <div key={s.id} onClick={() => viewDetail(s.id)}
                  className={`card cursor-pointer hover:border-brand-500/50 transition-all ${selected === s.id ? 'border-brand-500' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-dark-700 text-slate-300 text-sm px-3 py-1 rounded-full">
                      {topicLabel[s.topic] || s.topic}
                    </span>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {s.analysis?.overallScore !== undefined && (
                      <div className="text-3xl font-bold font-heading text-brand-400">{s.analysis.overallScore}</div>
                    )}
                    <div>
                      {s.analysis?.grade && (
                        <div className={`font-heading font-bold text-lg ${gradeColor(s.analysis.grade)}`}>Grade: {s.analysis.grade}</div>
                      )}
                      <div className="text-slate-500 text-xs">{new Date(s.startedAt).toLocaleDateString()} · {s.duration} min · {s.numQuestions} questions</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {detail && (
            <div className="mt-8 card border-brand-500/40">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-white">Session Detail</h2>
                <button onClick={closeDetail} className="text-slate-500 hover:text-white text-xl">✕</button>
              </div>
              {detail.analysis && (
                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Score',   value: detail.analysis.overallScore, color: 'text-brand-400' },
                      { label: 'Correct', value: detail.analysis.correctAnswers, color: 'text-emerald-400' },
                      { label: 'Wrong',   value: detail.analysis.wrongAnswers, color: 'text-red-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-dark-700 rounded-xl p-3 text-center">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {detail.analysis.improvements?.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Improvements</h4>
                      <ul className="space-y-1">
                        {detail.analysis.improvements.map((imp, i) => (
                          <li key={i} className="text-slate-400 text-sm flex gap-2"><span className="text-brand-400">→</span>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <h4 className="text-white font-medium mb-3">Questions & Answers</h4>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {detail.answers.map((a, i) => (
                  <div key={i} className="bg-dark-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-500 text-xs">Q{i+1}</span>
                      <span className={`badge-${a.difficulty}`}>{a.difficulty}</span>
                      <span className="text-slate-600 text-xs">{a.topic}</span>
                      {a.isCorrect !== null && (
                        <span className={`text-xs ml-auto ${a.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                          {a.isCorrect ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{a.question}</p>
                    <p className="text-slate-500 text-xs mb-1">Your answer:</p>
                    <p className="text-slate-400 text-sm bg-dark-600 rounded-lg p-2">{a.userAnswer}</p>
                    <p className="text-slate-500 text-xs mt-2 mb-1">Correct answer:</p>
                    <p className="text-emerald-400/80 text-sm bg-dark-600 rounded-lg p-2">{a.correctAnswer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VOICE INTERVIEW TAB ── */}
      {tab === 'voice' && (
        <>
          {voiceHistory.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-slate-400 mb-4">No voice interviews yet</p>
              <button onClick={() => navigate('/voice-interview')} className="btn-primary">Start Your First Voice Interview</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceHistory.map(s => (
                <div key={s.id} onClick={() => viewVoiceDetail(s)}
                  className={`card cursor-pointer hover:border-brand-500/50 transition-all ${selected === s.id ? 'border-brand-500' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-dark-700 text-slate-300 text-sm px-3 py-1 rounded-full">
                      🎙 {topicLabel[s.topic] || s.topic}
                    </span>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {s.analysis?.overallScore !== undefined && (
                      <div className="text-3xl font-bold font-heading text-brand-400">{s.analysis.overallScore}</div>
                    )}
                    <div className="flex-1">
                      {s.analysis?.grade && (
                        <div className={`font-heading font-bold text-lg ${gradeColor(s.analysis.grade)}`}>Grade: {s.analysis.grade}</div>
                      )}
                      <div className="text-slate-500 text-xs">{new Date(s.startedAt).toLocaleDateString()} · {s.duration} min · {s.numQuestions} questions</div>
                      {s.analysis?.voiceMetrics && (
                        <div className="flex gap-3 mt-1">
                          <span className="text-slate-600 text-xs">🎤 {s.analysis.voiceMetrics.avgWordsPerMinute || 0} WPM</span>
                          <span className="text-slate-600 text-xs">💬 {s.analysis.voiceMetrics.totalFillerWords || 0} fillers</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Voice detail panel */}
          {voiceDetail && voiceDetail.analysis && (
            <div className="mt-8 card border-brand-500/40">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-white">Voice Session Detail</h2>
                <button onClick={closeDetail} className="text-slate-500 hover:text-white text-xl">✕</button>
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Overall',       value: voiceDetail.analysis.overallScore,       color: 'text-brand-400' },
                  { label: 'Technical',     value: voiceDetail.analysis.technicalScore,     color: 'text-blue-400' },
                  { label: 'Communication', value: voiceDetail.analysis.communicationScore, color: 'text-purple-400' },
                  { label: 'Grade',         value: voiceDetail.analysis.grade,              color: gradeColor(voiceDetail.analysis.grade) },
                ].map(s => (
                  <div key={s.label} className="bg-dark-700 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Voice metrics */}
              {voiceDetail.analysis.voiceMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Avg Pace',     value: `${voiceDetail.analysis.voiceMetrics.avgWordsPerMinute || 0} WPM` },
                    { label: 'Filler Words', value: voiceDetail.analysis.voiceMetrics.totalFillerWords ?? 0 },
                    { label: 'Words Spoken', value: voiceDetail.analysis.voiceMetrics.totalWordCount ?? 0 },
                    { label: 'Clarity',      value: `${voiceDetail.analysis.voiceMetrics.clarityScore ?? 0}%` },
                  ].map(m => (
                    <div key={m.label} className="bg-dark-700/60 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-white">{m.value}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Overall feedback */}
              {voiceDetail.analysis.overallFeedback && (
                <div className="bg-dark-700/60 rounded-xl p-4 mb-4 border-l-2 border-brand-500">
                  <p className="text-slate-400 text-xs mb-1">Overall Feedback</p>
                  <p className="text-slate-200 text-sm">{voiceDetail.analysis.overallFeedback}</p>
                </div>
              )}

              {/* Questions */}
              {voiceDetail.analysis.questionAnalysis?.length > 0 && (
                <>
                  <h4 className="text-white font-medium mb-3">Question Breakdown</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {voiceDetail.analysis.questionAnalysis.map((qa, i) => (
                      <div key={i} className={`rounded-xl p-4 border
                        ${qa.result === 'correct' ? 'bg-emerald-900/10 border-emerald-500/20'
                          : qa.result === 'partial' ? 'bg-yellow-900/10 border-yellow-500/20'
                          : 'bg-red-900/10 border-red-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-slate-500 text-xs font-mono">Q{qa.questionNumber}</span>
                          <span className={`text-xs font-bold
                            ${qa.result === 'correct' ? 'text-emerald-400' : qa.result === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {qa.result === 'correct' ? '✓ Correct' : qa.result === 'partial' ? '◑ Partial' : '✗ Wrong'}
                          </span>
                          <span className={`ml-auto text-sm font-bold
                            ${qa.accuracyPercent >= 80 ? 'text-emerald-400' : qa.accuracyPercent >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {qa.accuracyPercent}%
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{qa.question}</p>
                        {qa.voiceFeedback?.wpm > 0 && (
                          <p className="text-slate-500 text-xs">🎙 {qa.voiceFeedback.wpm} WPM · {qa.voiceFeedback.pace}</p>
                        )}
                        {qa.whatWasMissing && (
                          <p className="text-yellow-400/80 text-xs mt-1">◎ Missing: {qa.whatWasMissing}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
