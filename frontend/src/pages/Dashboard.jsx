import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../services/api'

const cards = [
  { to: '/questions', icon: '💡', title: 'GitHub Questions',  desc: 'Generate questions from your GitHub projects',        color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' },
  { to: '/resume',    icon: '📄', title: 'Resume Analyzer',   desc: 'Analyze resume against company requirements',         color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' },
  { to: '/interview', icon: '🎤', title: 'Mock Interview',    desc: 'Timed interview with real-time feedback',             color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' },
  { to: '/voice-interview', icon: '🎙', title: 'Voice Interview', desc: 'Answer verbally — get content & communication feedback', color: 'from-rose-500/20 to-orange-500/20 border-rose-500/30' },
  { to: '/company',   icon: '🏢', title: 'Company-wise Prep', desc: 'Google, Amazon, Microsoft — targeted questions',      color: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30' },
  { to: '/history',   icon: '📊', title: 'Interview History', desc: 'Review past sessions and track your progress',        color: 'from-red-500/20 to-pink-500/20 border-red-500/30' },
    { to: '/dsa-solver', icon: '🧩', title: 'DSA / CP Solver', desc: 'LeetCode, GFG, Codeforces — explain, hints & full code', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30' },
]

// ─── Streak Heatmap ───────────────────────────────────────────────────────────

function StreakHeatmap({ streak }) {
  // Build last 365 days grid
  const today = new Date()
  const days = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }

  // completedDates: set of "YYYY-MM-DD" strings user completed
  const completedSet = new Set(streak?.completedDates || [])

  // Group into weeks
  const weeks = []
  let week = []
  // Pad first week
  const firstDay = new Date(days[0])
  const startPad = firstDay.getDay() // 0=Sun
  for (let i = 0; i < startPad; i++) week.push(null)
  days.forEach(d => {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  })
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const monthLabels = []
  weeks.forEach((w, wi) => {
    const firstReal = w.find(d => d)
    if (firstReal) {
      const dt = new Date(firstReal)
      if (dt.getDate() <= 7) {
        monthLabels[wi] = dt.toLocaleString('default', { month: 'short' })
      }
    }
  })

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading font-semibold text-white text-lg">Daily Streak</h2>
          <p className="text-slate-500 text-xs mt-0.5">Keep answering daily to build your streak</p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-orange-400">{streak?.currentStreak ?? 0} 🔥</div>
            <div className="text-slate-500 text-xs">Current</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{streak?.longestStreak ?? 0}</div>
            <div className="text-slate-500 text-xs">Longest</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{streak?.totalCompleted ?? 0}</div>
            <div className="text-slate-500 text-xs">Total Days</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1 pt-5">
            {dayLabels.map((d, i) => (
              <div key={d} className={`h-3 text-slate-600 text-[10px] leading-3 ${i % 2 === 0 ? 'opacity-0' : ''}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex flex-col">
            {/* Month labels */}
            <div className="flex gap-1 mb-1 h-4">
              {weeks.map((_, wi) => (
                <div key={wi} className="w-3 text-[10px] text-slate-500 leading-4">
                  {monthLabels[wi] || ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="w-3 h-3" />
                    const done = completedSet.has(day)
                    const isToday = day === today.toISOString().split('T')[0]
                    return (
                      <div
                        key={day}
                        title={`${day}${done ? ' ✅' : ''}`}
                        className={`w-3 h-3 rounded-[2px] transition-all
                          ${done
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                            : 'bg-dark-600'}
                          ${isToday ? 'ring-1 ring-brand-400' : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-slate-600 text-xs">Less</span>
        <div className="w-3 h-3 rounded-[2px] bg-dark-600" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-700" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-400" />
        <span className="text-slate-600 text-xs">More</span>
        <Link to="/streak" className="ml-4 text-brand-400 text-xs hover:underline">View Streak →</Link>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const [streak, setStreak] = useState(null)

  useEffect(() => {
    // Fetch streak info for heatmap
    api.get('/streak/info')
      .then(({ data }) => setStreak(data.streak))
      .catch(() => {})
  }, [])

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-white">
          Welcome back, <span className="text-brand-400">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-400 mt-2">Ready to ace your placement? Choose a module to get started.</p>
      </div>

      {/* Streak Heatmap */}
      <StreakHeatmap streak={streak} />

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(c => (
          <Link key={c.to} to={c.to}
            className={`card bg-gradient-to-br ${c.color} hover:scale-[1.02] transition-transform cursor-pointer`}>
            <div className="text-4xl mb-3">{c.icon}</div>
            <h3 className="font-heading text-xl font-semibold text-white mb-2">{c.title}</h3>
            <p className="text-slate-400 text-sm">{c.desc}</p>
            <div className="mt-4 text-brand-400 text-sm font-medium">Get started →</div>
          </Link>
        ))}
      </div>
    </main>
  )
}
