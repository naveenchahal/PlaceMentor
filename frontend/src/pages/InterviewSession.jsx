import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { interviewAPI } from '../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getResultColor = (result) => {
  if (result === 'correct')  return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (result === 'partial')  return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

const getResultIcon = (result) => {
  if (result === 'correct') return '✓'
  if (result === 'partial') return '◑'
  return '✗'
}

const getAccuracyColor = (pct) => {
  if (pct >= 80) return 'text-emerald-400'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

const getAccuracyBg = (pct) => {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getSkillColor = (score) => {
  if (score >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-400' }
  if (score >= 50) return { bar: 'bg-yellow-500',  text: 'text-yellow-400' }
  return { bar: 'bg-red-500', text: 'text-red-400' }
}

const getLevelBadge = (level) => {
  const map = {
    intern:  'bg-slate-700 text-slate-300',
    junior:  'bg-blue-900/40 text-blue-400',
    mid:     'bg-purple-900/40 text-purple-400',
    senior:  'bg-amber-900/40 text-amber-400',
  }
  return map[level] || map.junior
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold text-white">{score}</div>
        <div className="text-slate-400 text-xs">/ 100</div>
      </div>
    </div>
  )
}

function SkillBar({ label, score, feedback }) {
  const { bar, text } = getSkillColor(score)
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-300 text-sm">{label}</span>
        <span className={`text-sm font-bold ${text}`}>{score}%</span>
      </div>
      <div className="w-full bg-dark-700 rounded-full h-2 mb-1">
        <div className={`${bar} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      {feedback && <p className="text-slate-500 text-xs">{feedback}</p>}
    </div>
  )
}

function QuestionCard({ qa, index }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState('analysis') // analysis | answer | study

  return (
    <div className={`border rounded-2xl overflow-hidden mb-3 transition-all ${getResultColor(qa.result)}`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        {/* Result icon */}
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
          ${qa.result === 'correct' ? 'bg-emerald-500/20 text-emerald-400'
            : qa.result === 'partial' ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-red-500/20 text-red-400'}`}>
          {getResultIcon(qa.result)}
        </span>

        {/* Question preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-slate-400 text-xs font-mono">Q{qa.questionNumber}</span>
            <span className="text-slate-500 text-xs">{qa.topic}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono uppercase
              ${qa.difficulty === 'easy' ? 'bg-green-900/30 text-green-400'
                : qa.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400'
                : 'bg-red-900/30 text-red-400'}`}>
              {qa.difficulty}
            </span>
            <span className="text-slate-600 text-xs uppercase">{qa.type}</span>
          </div>
          <p className="text-white text-sm truncate">{qa.question}</p>
        </div>

        {/* Accuracy pill */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-bold ${getAccuracyColor(qa.accuracyPercent)}`}>
            {qa.accuracyPercent}%
          </div>
          <div className="text-slate-600 text-xs">accuracy</div>
        </div>

        {/* Chevron */}
        <span className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-white/10 bg-dark-800/60">
          {/* Accuracy bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-dark-700 rounded-full h-1.5">
                <div className={`${getAccuracyBg(qa.accuracyPercent)} h-1.5 rounded-full`}
                  style={{ width: `${qa.accuracyPercent}%` }} />
              </div>
              <span className={`text-xs font-bold ${getAccuracyColor(qa.accuracyPercent)}`}>
                {qa.accuracyPercent}% correct
              </span>
            </div>
            {qa.timeTaken > 0 && (
              <p className="text-slate-600 text-xs">
                Time: {qa.timeTaken}s —{' '}
                <span className={qa.timeVerdict === 'good' ? 'text-emerald-500'
                  : qa.timeVerdict === 'too fast' ? 'text-yellow-500' : 'text-red-500'}>
                  {qa.timeVerdict}
                </span>
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 px-4">
            {['analysis', 'answer', 'study'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors -mb-px
                  ${tab === t ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}>
                {t === 'analysis' ? '🔍 Analysis' : t === 'answer' ? '💡 Model Answer' : '📚 Study'}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Analysis tab */}
            {tab === 'analysis' && (
              <div className="space-y-3">
                {qa.userAnswerSummary && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase mb-1 font-medium">Your Answer</p>
                    <p className="text-slate-300 text-sm bg-dark-700/60 rounded-xl p-3">{qa.userAnswerSummary}</p>
                  </div>
                )}
                {qa.whatWasRight && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    <div>
                      <p className="text-emerald-400 text-xs font-medium mb-0.5">What you got right</p>
                      <p className="text-slate-300 text-sm">{qa.whatWasRight}</p>
                    </div>
                  </div>
                )}
                {qa.whatWasMissing && (
                  <div className="flex gap-2">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">◎</span>
                    <div>
                      <p className="text-yellow-400 text-xs font-medium mb-0.5">What was missing</p>
                      <p className="text-slate-300 text-sm">{qa.whatWasMissing}</p>
                    </div>
                  </div>
                )}
                {qa.whatWasWrong && (
                  <div className="flex gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                    <div>
                      <p className="text-red-400 text-xs font-medium mb-0.5">What was wrong</p>
                      <p className="text-slate-300 text-sm">{qa.whatWasWrong}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Model Answer tab */}
            {tab === 'answer' && (
              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 text-xs uppercase mb-2 font-medium">Ideal Answer</p>
                  <p className="text-slate-200 text-sm leading-relaxed bg-dark-700/60 rounded-xl p-3 whitespace-pre-wrap">
                    {qa.modelAnswer}
                  </p>
                </div>
                {qa.codeExample && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase mb-2 font-medium">Code Solution</p>
                    <pre className="bg-dark-900 border border-dark-600 rounded-xl p-3 text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {qa.codeExample}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Study tab */}
            {tab === 'study' && (
              <div className="space-y-3">
                {qa.conceptsToStudy?.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase mb-2 font-medium">Concepts to Study</p>
                    <div className="flex flex-wrap gap-2">
                      {qa.conceptsToStudy.map((c, i) => (
                        <span key={i} className="bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs px-2 py-1 rounded-lg">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {qa.studyResources?.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase mb-2 font-medium">Resources</p>
                    <ul className="space-y-1">
                      {qa.studyResources.map((r, i) => (
                        <li key={i} className="text-slate-400 text-sm flex gap-2">
                          <span className="text-brand-400 flex-shrink-0">→</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Analysis Section (shown after interview ends) ────────────────────────────

function AnalysisView({ analysis, navigate }) {
  const [section, setSection] = useState('overview') // overview | questions | skills | plan

  const tabs = [
    { id: 'overview',   label: '📊 Overview' },
    { id: 'questions',  label: '📝 Questions' },
    { id: 'skills',     label: '🎯 Skills' },
    { id: 'plan',       label: '🗓️ Study Plan' },
  ]

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">

      {/* Top hero */}
      <div className="card mb-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <ScoreRing score={analysis.overallScore || 0} />
          <div>
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="text-3xl font-bold font-heading text-white">Grade: {analysis.grade}</span>
              {analysis.estimatedLevel && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getLevelBadge(analysis.estimatedLevel)}`}>
                  {analysis.estimatedLevel}
                </span>
              )}
            </div>
            {analysis.readinessVerdict && (
              <p className="text-slate-400 text-sm max-w-lg mx-auto">{analysis.readinessVerdict}</p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Correct',  value: analysis.correctAnswers,  color: 'text-emerald-400' },
            { label: 'Partial',  value: analysis.partialAnswers,  color: 'text-yellow-400' },
            { label: 'Wrong',    value: analysis.wrongAnswers,    color: 'text-red-400' },
            { label: 'Total',    value: analysis.totalQuestions,  color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="bg-dark-700/60 rounded-xl py-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-dark-800 rounded-2xl p-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${section === t.id ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <div className="space-y-4">
          {/* Overall feedback */}
          {analysis.overallFeedback && (
            <div className="card border-l-4 border-brand-500">
              <p className="text-slate-400 text-xs uppercase font-medium mb-2">Overall Feedback</p>
              <p className="text-slate-200 leading-relaxed">{analysis.overallFeedback}</p>
            </div>
          )}

          {/* Topic breakdown */}
          {analysis.topicBreakdown?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-4">Topic Breakdown</h3>
              {analysis.topicBreakdown.map((t, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-white text-sm font-medium">{t.topic}</span>
                      <span className="text-slate-500 text-xs ml-2">{t.questionsCount} questions</span>
                    </div>
                    <span className={`text-sm font-bold ${getAccuracyColor(t.score)}`}>{t.score}%</span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2 mb-1">
                    <div className={`${getAccuracyBg(t.score)} h-2 rounded-full`} style={{ width: `${t.score}%` }} />
                  </div>
                  {t.summary && <p className="text-slate-500 text-xs">{t.summary}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Difficulty breakdown */}
          {analysis.difficultyBreakdown && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-4">Difficulty Breakdown</h3>
              <div className="grid grid-cols-3 gap-3">
                {['easy', 'medium', 'hard'].map(d => {
                  const data = analysis.difficultyBreakdown[d]
                  if (!data) return null
                  return (
                    <div key={d} className="bg-dark-700/60 rounded-xl p-3 text-center">
                      <div className={`text-xl font-bold ${d === 'easy' ? 'text-emerald-400' : d === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {data.score ?? 0}%
                      </div>
                      <div className="text-white text-sm capitalize font-medium">{d}</div>
                      <div className="text-slate-500 text-xs mt-1">{data.correct ?? 0}/{data.total ?? 0} correct</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Strong / Weak */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.strongTopics?.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-emerald-400 mb-3">💪 Strong Topics</h3>
                {analysis.strongTopics.map((t, i) => (
                  <div key={i} className="bg-emerald-900/20 text-emerald-400 text-sm px-3 py-1.5 rounded-lg mb-2">{t}</div>
                ))}
              </div>
            )}
            {analysis.weakTopics?.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-red-400 mb-3">📚 Weak Topics</h3>
                {analysis.weakTopics.map((t, i) => (
                  <div key={i} className="bg-red-900/20 text-red-400 text-sm px-3 py-1.5 rounded-lg mb-2">{t}</div>
                ))}
              </div>
            )}
          </div>

          {/* Top 3 improvements */}
          {analysis.top3Improvements?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-3">🚀 Top Improvements</h3>
              {analysis.top3Improvements.map((imp, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed">{imp}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QUESTIONS ── */}
      {section === 'questions' && (
        <div>
          {/* Summary bar */}
          <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> {analysis.correctAnswers} correct</span>
            <span className="flex items-center gap-1"><span className="text-yellow-400">◑</span> {analysis.partialAnswers} partial</span>
            <span className="flex items-center gap-1"><span className="text-red-400">✗</span> {analysis.wrongAnswers} wrong</span>
          </div>

          {analysis.questionAnalysis?.length > 0
            ? analysis.questionAnalysis.map((qa, i) => (
                <QuestionCard key={qa.questionId ?? i} qa={qa} index={i} />
              ))
            : <p className="text-slate-500 text-center py-8">Question analysis not available</p>
          }
        </div>
      )}

      {/* ── SKILLS ── */}
      {section === 'skills' && (
        <div className="space-y-4">
          {analysis.skillsAssessment ? (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-5">Skills Assessment</h3>
              {Object.entries(analysis.skillsAssessment).map(([key, val]) => (
                <SkillBar
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  score={val.score}
                  feedback={val.feedback}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">Skills assessment not available</p>
          )}

          {/* English analysis */}
          {analysis.englishAnalysis && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-4">🗣️ Communication</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Clarity',    value: analysis.englishAnalysis.clarity },
                  { label: 'Grammar',    value: analysis.englishAnalysis.grammar },
                  { label: 'Vocabulary', value: analysis.englishAnalysis.technicalVocabulary },
                ].map(e => (
                  <div key={e.label} className="bg-dark-700 rounded-xl p-3 text-center">
                    <div className="text-white text-sm font-medium capitalize">{e.value}</div>
                    <div className="text-slate-500 text-xs mt-1">{e.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-sm">{analysis.englishAnalysis.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* ── STUDY PLAN ── */}
      {section === 'plan' && (
        <div className="space-y-4">
          {analysis.studyPlan ? (
            Object.entries(analysis.studyPlan).map(([week, items]) => (
              <div key={week} className="card">
                <h3 className="font-heading font-semibold text-brand-400 mb-3 capitalize">
                  {week.replace(/(\d)/, ' $1')}
                </h3>
                <ul className="space-y-2">
                  {(Array.isArray(items) ? items : [items]).map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-brand-400 flex-shrink-0">→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-8">Study plan not available</p>
          )}

          {/* improvements as bonus */}
          {analysis.top3Improvements?.length > 0 && (
            <div className="card border border-brand-500/20">
              <h3 className="font-heading font-semibold text-white mb-3">🎯 Focus Areas</h3>
              {analysis.top3Improvements.map((imp, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">
                    {i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed">{imp}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <button onClick={() => navigate('/interview')} className="btn-primary w-full mt-6">
        Start New Interview
      </button>
    </main>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InterviewSession() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const sessionData = location.state?.sessionData

  const [current,   setCurrent]   = useState(sessionData?.currentQuestion)
  const [sessionId]               = useState(sessionData?.sessionId)
  const [answer,    setAnswer]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [analysis,  setAnalysis]  = useState(null)
  const [timeLeft,  setTimeLeft]  = useState(() => {
    if (!sessionData?.endsAt) return 0
    return Math.max(0, Math.floor((new Date(sessionData.endsAt) - new Date()) / 1000))
  })
  const [startTime, setStartTime] = useState(Date.now())

  useEffect(() => {
    if (analysis) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [analysis])

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const submitAnswer = async () => {
    if (!answer.trim()) return
    setLoading(true)
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    try {
      const { data } = await interviewAPI.next({
        sessionId, questionId: current.id, answer, timeTaken
      })
      if (data.isCompleted) {
        const res = await interviewAPI.finish({ sessionId })
        setAnalysis(res.data.analysis)
        setCurrent(null)
      } else {
        setCurrent(data.currentQuestion)
        setAnswer('')
        setStartTime(Date.now())
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting answer')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionData) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-4">No session found</p>
        <button onClick={() => navigate('/interview')} className="btn-primary">Start Interview</button>
      </div>
    </div>
  )

  // Show deep analysis
  if (analysis) return <AnalysisView analysis={analysis} navigate={navigate} />

  // Loading state while fetching analysis
  if (loading && !current) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400">Generating your detailed analysis...</p>
      <p className="text-slate-600 text-sm">This may take a minute ☕</p>
    </div>
  )

  // ── Question view ──────────────────────────────────────────────────────────
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-slate-400 text-sm">
          Question <span className="text-white font-bold">{current?.questionNumber}</span> of {sessionData.totalQuestions}
        </div>
        <div className={`font-mono text-lg font-bold ${timeLeft < 120 ? 'text-red-400' : 'text-brand-400'}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-dark-600 rounded-full h-1.5 mb-8">
        <div className="bg-brand-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((current?.questionNumber - 1) / sessionData.totalQuestions) * 100}%` }} />
      </div>

      {/* Question card */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className={`badge-${current?.difficulty}`}>{current?.difficulty}</span>
          {current?.topic && <span className="text-slate-500 text-sm">{current.topic}</span>}
          <span className="text-slate-600 text-xs uppercase font-mono">{current?.type}</span>
        </div>
        <p className="text-white text-lg leading-relaxed">{current?.question}</p>

        {current?.type === 'mcq' && current.options && (
          <div className="mt-4 space-y-2">
            {current.options.map((opt, i) => (
              <button key={i} type="button"
                onClick={() => setAnswer(opt)}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                  answer === opt
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-dark-500 text-slate-300 hover:border-dark-400'}`}>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {current?.type !== 'mcq' && (
        <textarea
          className={`input resize-none mb-6 ${current?.type === 'code' ? 'font-mono text-sm' : ''}`}
          rows={current?.type === 'code' ? 8 : 5}
          placeholder={current?.type === 'code' ? '// Write your code here...' : 'Type your answer...'}
          value={answer}
          onChange={e => setAnswer(e.target.value)} />
      )}

      <button onClick={submitAnswer} disabled={loading || !answer.trim()} className="btn-primary w-full text-base py-4">
        {loading ? 'Submitting...' : current?.questionNumber === sessionData.totalQuestions ? 'Submit & Finish 🎯' : 'Next Question →'}
      </button>
    </main>
  )
}