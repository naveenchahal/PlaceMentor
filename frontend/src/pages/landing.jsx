import { Link } from 'react-router-dom'

const features = [
  { icon: '🎯', title: 'GitHub Questions',    desc: 'Paste your GitHub repo — AI generates technical questions about your own project.' },
  { icon: '📄', title: 'Resume Analyzer',     desc: 'Upload your resume + job requirements. Get ATS score & exact words to add.' },
  { icon: '🧠', title: 'Mock Interview',      desc: 'DSA, Backend, React, HR — timed interviews with real-time question flow.' },
  { icon: '📊', title: 'Deep Analysis',       desc: 'Topic-wise strength/weakness, English quality, score & improvement tips.' },
]

export default function Landing() {
  return (
    <main className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="text-center py-24">
        <div className="inline-block bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm px-4 py-1.5 rounded-full mb-6">
          AI-Powered Placement Preparation
        </div>
        <h1 className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Ace Your<br />
          <span className="text-brand-400">Placement</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
          Practice with AI-generated questions from your own projects, analyze your resume, and take timed mock interviews — all in one place.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/register" className="btn-primary text-base px-8 py-3">Start for Free</Link>
          <Link to="/login"    className="btn-outline text-base px-8 py-3">Login</Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
        {features.map(f => (
          <div key={f.title} className="card hover:border-brand-500/50 transition-colors">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-heading text-lg font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}