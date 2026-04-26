import { useState, useEffect } from 'react'
import api from '../services/api'

const TOPIC_COLORS = {
  DSA:            'bg-blue-900/30 text-blue-400',
  'System Design':'bg-purple-900/30 text-purple-400',
  HR:             'bg-pink-900/30 text-pink-400',
  OOPs:           'bg-emerald-900/30 text-emerald-400',
  Aptitude:       'bg-yellow-900/30 text-yellow-400'
}

export default function Streak() {
  const [data, setData]         = useState(null)
  const [answers, setAnswers]   = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [gifts, setGifts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('today')
  const [historyDate, setHistoryDate] = useState('')
  const [historyData, setHistoryData] = useState(null)

  useEffect(() => { fetchToday() }, [])

  const fetchToday = async () => {
    try {
      const { data: res } = await api.get('/streak/today')
      setData(res)
      setSubmitted(res.isCompleted)
    } finally { setLoading(false) }
  }

  const submit = async () => {
    const answersArr = data.questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || ''
    }))

    if (answersArr.some(a => !a.answer)) {
      return alert('Please answer all questions!')
    }

    setSubmitting(true)
    try {
      const { data: res } = await api.post('/streak/submit', { answers: answersArr })
      setSubmitted(true)
      setGifts(res.gifts || [])
      setData(prev => ({ ...prev, questions: res.questions, streak: res.streak }))
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  const fetchHistory = async () => {
    if (!historyDate) return
    const { data: res } = await api.get(`/streak/history/${historyDate}`)
    setHistoryData(res)
  }

  const streakColor = (n) => n >= 30 ? 'text-yellow-400' : n >= 7 ? 'text-orange-400' : 'text-brand-400'
  const flameCount  = (n) => n >= 30 ? '🔥🔥🔥' : n >= 14 ? '🔥🔥' : '🔥'

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center text-brand-400">Loading...</div>
  )

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">Daily Streak</h1>
      <p className="text-slate-400 mb-8">5 questions every day — build the habit, ace the placement</p>

      {/* Streak Stats */}
      {data?.streak && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Current Streak', value: `${data.streak.currentStreak} ${flameCount(data.streak.currentStreak)}`, color: streakColor(data.streak.currentStreak) },
            { label: 'Longest Streak', value: `${data.streak.longestStreak} days`, color: 'text-purple-400' },
            { label: 'Total Completed', value: `${data.streak.totalCompleted} days`, color: 'text-emerald-400' },
            { label: 'Next Milestone', value: data.streak.currentStreak < 7 ? `${7 - data.streak.currentStreak} days to 🎁` : data.streak.currentStreak < 30 ? `${30 - data.streak.currentStreak} days to 🎁` : '365 day goal!', color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gift notification */}
      {gifts.length > 0 && (
        <div className="mb-6 space-y-3">
          {gifts.map((g, i) => (
            <div key={i} className="bg-yellow-900/30 border border-yellow-500/40 rounded-2xl p-4 text-center">
              <p className="text-yellow-400 font-semibold text-lg">{g.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['today', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-brand-500 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'}`}>
            {tab === 'today' ? "Today's Questions" : 'Past Questions'}
          </button>
        ))}
      </div>

      {/* Today's Questions */}
      {activeTab === 'today' && (
        <div>
          {submitted && (
            <div className="bg-emerald-900/30 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-center font-medium">
              ✅ Today's questions completed! Come back tomorrow.
            </div>
          )}

          <div className="space-y-6">
            {data?.questions?.map((q, i) => (
              <div key={q.id} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-brand-400 font-mono font-bold text-sm">Q{i+1}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${TOPIC_COLORS[q.topic] || 'bg-dark-600 text-slate-400'}`}>
                    {q.topic}
                  </span>
                  <span className={`badge-${q.difficulty}`}>{q.difficulty}</span>
                </div>

                <p className="text-white mb-4 leading-relaxed">{q.question}</p>

                {/* MCQ */}
                {q.type === 'mcq' && q.options && (
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, j) => (
                      <button key={j} type="button"
                        disabled={submitted}
                        onClick={() => setAnswers({...answers, [q.id]: opt})}
                        className={`w-full text-left p-3 rounded-xl border text-sm transition-all
                          ${submitted && opt === q.correctAnswer ? 'border-emerald-500 bg-emerald-900/20 text-emerald-400' :
                            submitted && answers[q.id] === opt && opt !== q.correctAnswer ? 'border-red-500 bg-red-900/20 text-red-400' :
                            answers[q.id] === opt ? 'border-brand-500 bg-brand-500/10 text-brand-400' :
                            'border-dark-500 text-slate-300 hover:border-dark-400'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Text */}
                {q.type === 'text' && (
                  <textarea
                    className="input resize-none mb-2"
                    rows={4}
                    placeholder="Type your answer..."
                    disabled={submitted}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />
                )}

                {/* Show answer after submission */}
                {submitted && q.answer && (
                  <div className="mt-3 bg-dark-700 rounded-xl p-4 border-l-2 border-brand-500">
                    <p className="text-slate-400 text-xs mb-1">Expected Answer:</p>
                    <p className="text-slate-300 text-sm">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!submitted && (
            <button onClick={submit} disabled={submitting} className="btn-primary w-full mt-6 text-base py-4">
              {submitting ? 'Submitting...' : 'Submit All Answers 🎯'}
            </button>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          <div className="card mb-6">
            <h3 className="font-heading font-semibold text-white mb-4">View Past Questions</h3>
            <div className="flex gap-3">
              <input type="date" className="input"
                value={historyDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setHistoryDate(e.target.value)} />
              <button onClick={fetchHistory} disabled={!historyDate} className="btn-primary px-6">
                View
              </button>
            </div>
          </div>

          {historyData && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-heading font-semibold text-white">{historyData.date}</h3>
                <span className={`text-xs px-3 py-1 rounded-full ${historyData.isCompleted ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                  {historyData.isCompleted ? '✅ Completed' : '❌ Missed'}
                </span>
              </div>

              <div className="space-y-4">
                {historyData.questions?.map((q, i) => {
                  const userAns = historyData.userAnswers?.find(a => a.questionId === q.id)
                  return (
                    <div key={q.id} className="card">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-brand-400 font-mono text-sm">Q{i+1}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${TOPIC_COLORS[q.topic] || 'bg-dark-600 text-slate-400'}`}>{q.topic}</span>
                        <span className={`badge-${q.difficulty}`}>{q.difficulty}</span>
                      </div>
                      <p className="text-white mb-3">{q.question}</p>
                      {userAns && (
                        <div className="bg-dark-700 rounded-xl p-3 mb-2">
                          <p className="text-slate-400 text-xs mb-1">Your answer:</p>
                          <p className="text-slate-300 text-sm">{userAns.answer}</p>
                        </div>
                      )}
                      {q.answer && (
                        <div className="bg-dark-700 rounded-xl p-3 border-l-2 border-brand-500">
                          <p className="text-slate-400 text-xs mb-1">Correct answer:</p>
                          <p className="text-emerald-400/80 text-sm">{q.answer}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
