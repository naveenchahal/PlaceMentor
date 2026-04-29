import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const userNavLinks = [
  { to: '/dashboard',       label: 'Dashboard' },
  { to: '/questions',       label: 'Questions' },
  { to: '/resume',          label: 'Resume' },
  { to: '/interview',       label: 'Interview' },
  { to: '/history',         label: 'History' },
  { to: '/streak',          label: '🔥 Streak' },
  { to: '/company',         label: 'Companies' },
  { to: '/voice-interview', label: '🎙 Voice Interview' },
  { to: '/dsa-solver',      label: '🧩 DSA Solver' },
]

const adminNavLinks = [
  { to: '/admin', label: '⚡ Admin Panel' },
]

export default function Navbar() {
  const { isLoggedIn, logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/') }

  const isAdmin = user?.role === 'ADMIN'
  const links = isAdmin ? adminNavLinks : userNavLinks

  // ✅ Logged in → dashboard, nahi → landing
  const homeLink = isLoggedIn
    ? (isAdmin ? '/admin' : '/dashboard')
    : '/'

  return (
    <nav className="border-b border-dark-600 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        <Link to={homeLink} className="font-heading text-xl font-bold text-white">
          Place<span className="text-brand-400">Mentor</span>
        </Link>

        {isLoggedIn && (
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === l.to
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white hover:bg-dark-700'}`}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-slate-400 hidden md:block">
                Hi, {user?.name?.split(' ')[0]}
                {isAdmin && <span className="ml-1 text-yellow-400 text-xs">(Admin)</span>}
              </span>
              <button onClick={handleLogout} className="btn-outline text-sm py-2 px-4">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}