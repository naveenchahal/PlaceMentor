import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { voiceInterviewAPI } from '../services/api'

// ─── Speech helpers ───────────────────────────────────────────────────────────

const speak = (text, onEnd) => {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate  = 0.92
  utt.pitch = 1
  utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
  )
  if (preferred) utt.voice = preferred
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

const stopSpeaking = () => window.speechSynthesis.cancel()

// ─── Result helpers ───────────────────────────────────────────────────────────

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
const getResultIcon = (result) =>
  result === 'correct' ? '✓' : result === 'partial' ? '◑' : '✗'
const getResultColor = (result) => {
  if (result === 'correct') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (result === 'partial') return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, label, size = 120 }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const dash = ((score || 0) / 100) * circ
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
  const cx = size / 2, cy = size / 2
  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score ?? '—'}</span>
        <span className="text-slate-500 text-xs">{label}</span>
      </div>
    </div>
  )
}

// ─── Skill bar ────────────────────────────────────────────────────────────────

function SkillBar({ label, score, feedback }) {
  const { bar, text } = getSkillColor(score)
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
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

// ─── Question analysis card ───────────────────────────────────────────────────

function VoiceQuestionCard({ qa, index }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState('analysis')

  return (
    <div className={`border rounded-2xl overflow-hidden mb-3 ${getResultColor(qa.result)}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
          ${qa.result === 'correct' ? 'bg-emerald-500/20 text-emerald-400'
            : qa.result === 'partial' ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-red-500/20 text-red-400'}`}>
          {getResultIcon(qa.result)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-slate-400 text-xs font-mono">Q{qa.questionNumber}</span>
            <span className="text-slate-500 text-xs">{qa.topic}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono
              ${qa.difficulty === 'easy' ? 'bg-green-900/30 text-green-400'
                : qa.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400'
                : 'bg-red-900/30 text-red-400'}`}>
              {qa.difficulty}
            </span>
            {qa.voiceFeedback?.wpm > 0 && (
              <span className="text-slate-600 text-xs">{qa.voiceFeedback.wpm} WPM</span>
            )}
          </div>
          <p className="text-white text-sm truncate">{qa.question}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-bold ${getAccuracyColor(qa.accuracyPercent)}`}>{qa.accuracyPercent}%</div>
          <div className="text-slate-600 text-xs">content</div>
        </div>
        <span className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-white/10 bg-dark-800/60">
          {qa.voiceFeedback && (
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-3">
              {qa.voiceFeedback.wpm > 0 && (
                <span className="bg-dark-700 rounded-lg px-2 py-1 text-xs text-slate-400">
                  🎙 {qa.voiceFeedback.wpm} WPM — <span className={
                    qa.voiceFeedback.pace === 'good' ? 'text-emerald-400'
                    : 'text-yellow-400'}>{qa.voiceFeedback.pace}</span>
                </span>
              )}
              {qa.voiceFeedback.fillerCount > 0 && (
                <span className="bg-dark-700 rounded-lg px-2 py-1 text-xs text-slate-400">
                  💬 {qa.voiceFeedback.fillerCount} fillers: {qa.voiceFeedback.mainFillers?.join(', ')}
                </span>
              )}
              {qa.voiceFeedback.lengthVerdict && (
                <span className={`rounded-lg px-2 py-1 text-xs
                  ${qa.voiceFeedback.lengthVerdict === 'good'
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : 'bg-yellow-900/30 text-yellow-400'}`}>
                  📏 {qa.voiceFeedback.lengthVerdict}
                </span>
              )}
              {qa.voiceFeedback.tip && (
                <p className="w-full text-brand-400 text-xs mt-1">💡 {qa.voiceFeedback.tip}</p>
              )}
            </div>
          )}

          <div className="flex border-b border-white/10 px-4">
            {['analysis', 'answer'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px
                  ${tab === t ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}>
                {t === 'analysis' ? '🔍 Analysis' : '💡 Model Answer'}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === 'analysis' && (
              <div className="space-y-3">
                {qa.transcriptSummary && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase mb-1 font-medium">Your Spoken Answer</p>
                    <p className="text-slate-300 text-sm bg-dark-700/60 rounded-xl p-3 italic">"{qa.transcriptSummary}"</p>
                  </div>
                )}
                {qa.whatWasRight && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                    <div>
                      <p className="text-emerald-400 text-xs font-medium mb-0.5">What you covered well</p>
                      <p className="text-slate-300 text-sm">{qa.whatWasRight}</p>
                    </div>
                  </div>
                )}
                {qa.whatWasMissing && (
                  <div className="flex gap-2">
                    <span className="text-yellow-400 flex-shrink-0">◎</span>
                    <div>
                      <p className="text-yellow-400 text-xs font-medium mb-0.5">What was missing</p>
                      <p className="text-slate-300 text-sm">{qa.whatWasMissing}</p>
                    </div>
                  </div>
                )}
                {qa.whatWasWrong && (
                  <div className="flex gap-2">
                    <span className="text-red-400 flex-shrink-0">✗</span>
                    <div>
                      <p className="text-red-400 text-xs font-medium mb-0.5">What was incorrect</p>
                      <p className="text-slate-300 text-sm">{qa.whatWasWrong}</p>
                    </div>
                  </div>
                )}
                {qa.conceptsToStudy?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {qa.conceptsToStudy.map((c, i) => (
                      <span key={i} className="bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs px-2 py-1 rounded-lg">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'answer' && (
              <div>
                <p className="text-slate-500 text-xs uppercase mb-2 font-medium">Ideal Spoken Answer</p>
                <p className="text-slate-200 text-sm leading-relaxed bg-dark-700/60 rounded-xl p-3 whitespace-pre-wrap">
                  {qa.modelAnswer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Full analysis view ───────────────────────────────────────────────────────

function VoiceAnalysisView({ analysis, navigate }) {
  const [section, setSection] = useState('overview')
  const tabs = [
    { id: 'overview',  label: '📊 Overview'  },
    { id: 'questions', label: '📝 Questions' },
    { id: 'comms',     label: '🎙 Communication' },
    { id: 'plan',      label: '🗓 Study Plan' },
  ]

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <ScoreRing score={analysis.overallScore} label="Overall" size={120} />
          <div className="flex gap-6">
            <ScoreRing score={analysis.technicalScore} label="Technical" size={90} />
            <ScoreRing score={analysis.communicationScore} label="Comms" size={90} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-2xl font-bold text-white mb-1">Grade: {analysis.grade}</div>
            {analysis.estimatedLevel && (
              <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded-full">
                {analysis.estimatedLevel} level
              </span>
            )}
            {analysis.interviewReadiness && (
              <p className="text-slate-400 text-sm mt-2">{analysis.interviewReadiness}</p>
            )}
          </div>
        </div>

        {analysis.voiceMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Avg Pace', value: `${analysis.voiceMetrics.avgWordsPerMinute || 0} WPM`,
                sub: analysis.voiceMetrics.paceVerdict,
                color: analysis.voiceMetrics.paceVerdict === 'good' ? 'text-emerald-400' : 'text-yellow-400' },
              { label: 'Filler Words', value: analysis.voiceMetrics.totalFillerWords ?? 0,
                sub: analysis.voiceMetrics.fillerWordImpact,
                color: analysis.voiceMetrics.fillerWordImpact === 'none' ? 'text-emerald-400'
                  : analysis.voiceMetrics.fillerWordImpact === 'minor' ? 'text-yellow-400' : 'text-red-400' },
              { label: 'Words Spoken', value: analysis.voiceMetrics.totalWordCount ?? 0,
                sub: 'total', color: 'text-white' },
              { label: 'Clarity', value: `${analysis.voiceMetrics.clarityScore ?? 0}%`,
                sub: 'score', color: getAccuracyColor(analysis.voiceMetrics.clarityScore) },
            ].map(m => (
              <div key={m.label} className="bg-dark-700/60 rounded-xl p-3 text-center">
                <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-white text-xs font-medium mt-0.5">{m.label}</div>
                <div className="text-slate-500 text-xs capitalize">{m.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-dark-800 rounded-2xl p-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${section === t.id ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="space-y-4">
          {analysis.overallFeedback && (
            <div className="card border-l-4 border-brand-500">
              <p className="text-slate-400 text-xs uppercase font-medium mb-2">Overall Feedback</p>
              <p className="text-slate-200 leading-relaxed">{analysis.overallFeedback}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {analysis.top3CommunicationTips?.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-brand-400 mb-3">🎙 Communication Tips</h3>
                {analysis.top3CommunicationTips.map((tip, i) => (
                  <div key={i} className="flex gap-3 mb-3">
                    <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i+1}</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            )}
            {analysis.top3TechnicalTips?.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-3">🚀 Technical Tips</h3>
                {analysis.top3TechnicalTips.map((tip, i) => (
                  <div key={i} className="flex gap-3 mb-3">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i+1}</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {analysis.topicBreakdown?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-4">Topic Breakdown</h3>
              {analysis.topicBreakdown.map((t, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-white text-sm">{t.topic}</span>
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
          <div className="grid md:grid-cols-2 gap-4">
            {analysis.strongAreas?.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-emerald-400 mb-3">💪 Strong Areas</h3>
                {analysis.strongAreas.map((t, i) => (
                  <div key={i} className="bg-emerald-900/20 text-emerald-400 text-sm px-3 py-1.5 rounded-lg mb-2">{t}</div>
                ))}
              </div>
            )}
            {analysis.improvementAreas?.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-red-400 mb-3">📚 Needs Work</h3>
                {analysis.improvementAreas.map((t, i) => (
                  <div key={i} className="bg-red-900/20 text-red-400 text-sm px-3 py-1.5 rounded-lg mb-2">{t}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'questions' && (
        <div>
          {analysis.questionAnalysis?.length > 0
            ? analysis.questionAnalysis.map((qa, i) => (
                <VoiceQuestionCard key={qa.questionId ?? i} qa={qa} index={i} />
              ))
            : <p className="text-slate-500 text-center py-8">Question analysis not available</p>
          }
        </div>
      )}

      {section === 'comms' && (
        <div className="space-y-4">
          {analysis.communicationBreakdown && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-5">Communication Skills</h3>
              {Object.entries(analysis.communicationBreakdown).map(([key, val]) => (
                <SkillBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} score={val.score} feedback={val.feedback} />
              ))}
            </div>
          )}
          {analysis.voiceMetrics && (
            <div className="card">
              <h3 className="font-heading font-semibold text-white mb-4">🎙 Voice Analysis</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-slate-400">Average Pace</span>
                  <span className={`font-medium ${analysis.voiceMetrics.paceVerdict === 'good' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {analysis.voiceMetrics.avgWordsPerMinute} WPM — {analysis.voiceMetrics.paceVerdict}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-slate-400">Filler Words</span>
                  <span className={`font-medium ${
                    analysis.voiceMetrics.fillerWordImpact === 'none' ? 'text-emerald-400'
                    : analysis.voiceMetrics.fillerWordImpact === 'minor' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {analysis.voiceMetrics.totalFillerWords} ({analysis.voiceMetrics.fillerWordImpact} impact)
                  </span>
                </div>
                {analysis.voiceMetrics.topFillerWords?.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-dark-600">
                    <span className="text-slate-400">Top Fillers Used</span>
                    <span className="text-red-400 font-medium">{analysis.voiceMetrics.topFillerWords.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-slate-400">Clarity Score</span>
                  <span className={`font-medium ${getAccuracyColor(analysis.voiceMetrics.clarityScore)}`}>
                    {analysis.voiceMetrics.clarityScore}%
                  </span>
                </div>
                {analysis.voiceMetrics.clarityFeedback && (
                  <p className="text-slate-500 text-xs">{analysis.voiceMetrics.clarityFeedback}</p>
                )}
                {analysis.voiceMetrics.confidenceFeedback && (
                  <p className="text-slate-500 text-xs">{analysis.voiceMetrics.confidenceFeedback}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'plan' && (
        <div className="space-y-4">
          {analysis.studyPlan
            ? Object.entries(analysis.studyPlan).map(([week, items]) => (
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
            : <p className="text-slate-500 text-center py-8">Study plan not available</p>
          }
        </div>
      )}

      <button onClick={() => navigate('/voice-interview')} className="btn-primary w-full mt-6">
        Start New Voice Interview
      </button>
    </main>
  )
}

// ─── MAIN: Voice Interview Session ───────────────────────────────────────────

export default function VoiceInterviewSession() {
  const location    = useLocation()
  const navigate    = useNavigate()
  const sessionData = location.state?.sessionData

  const [current,    setCurrent]    = useState(sessionData?.currentQuestion)
  const [sessionId]                 = useState(sessionData?.sessionId)
  const [loading,    setLoading]    = useState(false)
  const [analysis,   setAnalysis]   = useState(null)
  const [phase,      setPhase]      = useState('idle') // idle | speaking | listening | processing
  const [transcript, setTranscript] = useState('')
  const [liveText,   setLiveText]   = useState('')
  const [statusMsg,  setStatusMsg]  = useState('')
  const [timeLeft,   setTimeLeft]   = useState(() => {
    if (!sessionData?.endsAt) return 0
    return Math.max(0, Math.floor((new Date(sessionData.endsAt) - new Date()) / 1000))
  })

  const recognitionRef     = useRef(null)
  const startTimeRef       = useRef(null)
  const finalTranscriptRef = useRef('')  // ✅ FIX 1: closure problem solve kiya

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // Timer
  useEffect(() => {
    if (analysis) return
    const t = setInterval(() => setTimeLeft(p => p <= 1 ? 0 : p - 1), 1000)
    return () => clearInterval(t)
  }, [analysis])

  // ✅ FIX 2: Cleanup on unmount - mic aur TTS band karo
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend   = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      stopSpeaking()
    }
  }, [])

  // ✅ FIX 3: Naya question aane pe recognition reset karo
  useEffect(() => {
    if (!current || analysis) return

    // Purana recognition band karo
    if (recognitionRef.current) {
      recognitionRef.current.onend   = null
      recognitionRef.current.onerror = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    // State reset karo
    setTranscript('')
    setLiveText('')
    finalTranscriptRef.current = ''
    setPhase('speaking')
    setStatusMsg('Interviewer is asking...')

    const intro = current.questionNumber === 1
      ? `Welcome to your voice interview. Let's begin. Question ${current.questionNumber}: ${current.question}`
      : `Question ${current.questionNumber}: ${current.question}`

    speak(intro, () => {
      setPhase('idle')
      setStatusMsg('Press the mic button when ready to answer')
    })

    return () => stopSpeaking()
  }, [current?.id]) // ✅ current.id pe depend karo, poore object pe nahi

  // ✅ FIX 4: setupRecognition - ref use kiya finalTranscript ke liye
  const setupRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return null

    const rec = new SpeechRecognition()
    rec.continuous     = true
    rec.interimResults = true
    rec.lang           = 'en-US'

    finalTranscriptRef.current = ''

    rec.onstart = () => {
      finalTranscriptRef.current = ''
      startTimeRef.current = Date.now()
      setPhase('listening')
      setStatusMsg('Listening... speak your answer')
    }

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscriptRef.current += e.results[i][0].transcript + ' '
        } else {
          interim += e.results[i][0].transcript
        }
      }
      setLiveText(finalTranscriptRef.current + interim)
    }

    rec.onend = () => {
      const final = finalTranscriptRef.current.trim()
      setTranscript(final)
      setLiveText('')
      if (final) {
        setPhase('idle')
        setStatusMsg('Answer recorded. Review and submit.')
      } else {
        setPhase('idle')
        setStatusMsg('No speech detected. Try again.')
      }
    }

    rec.onerror = (e) => {
      console.error('Speech error:', e.error)
      // ✅ FIX 5: aborted error ignore karo (manually stop kiya)
      if (e.error === 'aborted') return
      setPhase('idle')
      setStatusMsg(
        e.error === 'not-allowed'
          ? 'Microphone access denied. Please allow mic access.'
          : 'Speech error. Try again.'
      )
    }

    return rec
  }, [])

  // ✅ FIX 6: startListening - purana rec pehle band karo
  const startListening = () => {
    stopSpeaking()

    // Purana recognition band karo
    if (recognitionRef.current) {
      recognitionRef.current.onend   = null
      recognitionRef.current.onerror = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    const rec = setupRecognition()
    if (!rec) {
      setStatusMsg('Speech recognition not supported. Use Chrome.')
      return
    }

    recognitionRef.current = rec
    setTranscript('')
    setLiveText('')
    finalTranscriptRef.current = ''

    try {
      rec.start()
    } catch (e) {
      console.error('Recognition start error:', e)
      setStatusMsg('Mic error. Try again.')
      setPhase('idle')
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  const retryRecording = () => {
    // Purana recognition band karo
    if (recognitionRef.current) {
      recognitionRef.current.onend   = null
      recognitionRef.current.onerror = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setTranscript('')
    setLiveText('')
    finalTranscriptRef.current = ''
    setStatusMsg('Press mic to re-record your answer')
    setPhase('idle')
  }

  const submitAnswer = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setPhase('processing')
    setStatusMsg('Submitting...')

    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0

    try {
      const { data } = await voiceInterviewAPI.next({
        sessionId, questionId: current.id, transcript, timeTaken
      })
      if (data.isCompleted) {
        setStatusMsg('All done! Generating analysis...')
        const res = await voiceInterviewAPI.finish({ sessionId })
        setAnalysis(res.data.analysis)
        setCurrent(null)
      } else {
        setCurrent(data.currentQuestion)
        setTranscript('')
        setLiveText('')
        finalTranscriptRef.current = ''
        setPhase('idle')
      }
    } catch (err) {
      setStatusMsg(err.response?.data?.message || 'Error submitting answer')
      setPhase('idle')
    } finally {
      setLoading(false)
    }
  }

  // ── No session ────────────────────────────────────────────────────────────────
  if (!sessionData) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-4">No session found</p>
        <button onClick={() => navigate('/voice-interview')} className="btn-primary">Start Voice Interview</button>
      </div>
    </div>
  )

  // ── Analysis view ─────────────────────────────────────────────────────────────
  if (analysis) return <VoiceAnalysisView analysis={analysis} navigate={navigate} />

  // ── Loading analysis ──────────────────────────────────────────────────────────
  if (loading && !current) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400">Analyzing your voice interview...</p>
      <p className="text-slate-600 text-sm">Checking content, fluency, filler words ☕</p>
    </div>
  )

  // ── Interview UI ──────────────────────────────────────────────────────────────
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-slate-400 text-sm">
          Q <span className="text-white font-bold">{current?.questionNumber}</span> / {sessionData.totalQuestions}
        </div>
        <div className={`font-mono text-lg font-bold ${timeLeft < 120 ? 'text-red-400' : 'text-brand-400'}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-dark-600 rounded-full h-1.5 mb-6">
        <div className="bg-brand-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((current?.questionNumber - 1) / sessionData.totalQuestions) * 100}%` }} />
      </div>

      {/* Question card */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-md font-mono
            ${current?.difficulty === 'easy' ? 'bg-green-900/30 text-green-400'
              : current?.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400'
              : 'bg-red-900/30 text-red-400'}`}>
            {current?.difficulty}
          </span>
          {current?.topic && <span className="text-slate-500 text-sm">{current.topic}</span>}
          <span className="ml-auto">
            <button onClick={() => speak(current?.question)}
              className="text-slate-500 hover:text-brand-400 text-xs transition-colors">
              🔊 Replay
            </button>
          </span>
        </div>
        <p className="text-white text-lg leading-relaxed">{current?.question}</p>
      </div>

      {/* Mic zone */}
      <div className="card flex flex-col items-center gap-4 py-8 mb-4">
        <button
          onClick={phase === 'listening' ? stopListening : startListening}
          disabled={phase === 'speaking' || phase === 'processing'}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all
            ${phase === 'listening'
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40'
              : phase === 'speaking' || phase === 'processing'
              ? 'bg-dark-600 text-slate-600 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-400 shadow-lg shadow-brand-500/30'}`}
        >
          {phase === 'listening' ? '⏹' : '🎙'}
          {phase === 'listening' && (
            <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-60" />
          )}
        </button>

        <p className={`text-sm font-medium ${
          phase === 'listening' ? 'text-red-400'
          : phase === 'speaking' ? 'text-brand-400'
          : 'text-slate-400'}`}>
          {statusMsg || 'Press mic to start recording'}
        </p>

        {(liveText || transcript) && (
          <div className="w-full bg-dark-700/60 rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-xs text-slate-500 mb-1 uppercase font-medium">
              {phase === 'listening' ? 'Live transcript' : 'Your answer'}
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {phase === 'listening' ? liveText : transcript}
            </p>
          </div>
        )}

        {transcript && (
          <p className="text-slate-600 text-xs">
            {transcript.split(/\s+/).filter(Boolean).length} words spoken
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {transcript && (
          <button onClick={retryRecording} className="flex-1 py-3 rounded-xl border border-dark-500 text-slate-400 text-sm hover:border-dark-400 transition-all">
            🔄 Re-record
          </button>
        )}
        <button
          onClick={submitAnswer}
          disabled={loading || !transcript.trim() || phase === 'listening'}
          className={`flex-1 btn-primary py-3 text-sm ${!transcript.trim() ? 'opacity-50' : ''}`}>
          {loading ? 'Submitting...'
            : current?.questionNumber === sessionData.totalQuestions
            ? 'Submit & Finish 🎯'
            : 'Submit Answer →'}
        </button>
      </div>

      {/* Browser support warning */}
      {!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && (
        <div className="mt-4 bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-3 rounded-xl">
          ⚠️ Speech recognition requires Chrome or Edge. Other browsers may not support it.
        </div>
      )}
    </main>
  )
}