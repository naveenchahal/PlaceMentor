import { useState } from 'react'
import { questionAPI } from '../services/api'

export default function Questions() {
  const [form, setForm]         = useState({ projectUrl: '', numQuestions: 5, topic: '' })
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]   = useState({})
  const [evaluation, setEval]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [error, setError]       = useState('')

  const generate = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setQuestions([]); setEval(null)
    try {
      const { data } = await questionAPI.generate({ ...form, questionType: 'technical' })
      setQuestions(data.questions)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate')
    } finally { setLoading(false) }
  }

  const evaluate = async () => {
    setEvalLoading(true)
    try {
      const answersArr = questions.map(q => ({
        id: q.id, question: q.question,
        correctAnswer: q.answer, userAnswer: answers[q.id] || ''
      }))
      const { data } = await questionAPI.evaluate({ topic: form.topic, answers: answersArr })
      setEval(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Evaluation failed')
    } finally { setEvalLoading(false) }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">GitHub Questions</h1>
      <p className="text-slate-400 mb-8">Generate technical questions from your GitHub project</p>

      <form onSubmit={generate} className="card mb-8 space-y-4">
        <input className="input" placeholder="GitHub URL (e.g. https://github.com/user/repo)"
          value={form.projectUrl} onChange={e => setForm({...form, projectUrl: e.target.value})} required />
        <input className="input" placeholder="Topic (e.g. authentication, REST API)"
          value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} required />
        <input className="input" type="number" placeholder="Number of questions (1-20)"
          value={form.numQuestions} min={1} max={20}
          onChange={e => setForm({...form, numQuestions: e.target.value})} required />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Generating... (may take 30s)' : 'Generate Questions'}
        </button>
      </form>

      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl mb-6">{error}</div>}

      {questions.length > 0 && (
        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-brand-400 font-mono text-sm">Q{i+1}</span>
                <span className={`badge-${q.difficulty}`}>{q.difficulty}</span>
              </div>
              <p className="text-white mb-4">{q.question}</p>
              <textarea className="input resize-none" rows={4} placeholder="Your answer..."
                value={answers[q.id] || ''}
                onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />
            </div>
          ))}

          <button onClick={evaluate} disabled={evalLoading} className="btn-primary w-full">
            {evalLoading ? 'Evaluating...' : 'Evaluate My Answers'}
          </button>
        </div>
      )}

      {evaluation && (
        <div className="mt-8 card border-brand-500/40">
          <h2 className="font-heading text-xl font-bold text-white mb-2">Results</h2>
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="bg-dark-700 rounded-xl px-4 py-3 text-center">
              <div className="text-3xl font-bold text-brand-400">{evaluation.percentage}%</div>
              <div className="text-slate-400 text-xs mt-1">Score</div>
            </div>
            <div className="bg-dark-700 rounded-xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-white">{evaluation.grade}</div>
              <div className="text-slate-400 text-xs mt-1">Grade</div>
            </div>
          </div>
          <div className="space-y-4">
            {evaluation.evaluations?.map((e, i) => (
              <div key={i} className="bg-dark-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-slate-400 text-sm">Q{i+1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.score >= 7 ? 'bg-emerald-900/40 text-emerald-400' : e.score >= 4 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>
                    {e.score}/10
                  </span>
                </div>
                {e.mistakes && <p className="text-red-400 text-sm mb-1">❌ {e.mistakes}</p>}
                {e.improvements && <p className="text-brand-400 text-sm">💡 {e.improvements}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}