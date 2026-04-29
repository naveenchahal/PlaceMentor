import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect } from 'react'

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = () => { logout(); navigate('/') }

  const isAdmin = user?.role === 'ADMIN'
  const links = isAdmin ? adminNavLinks : userNavLinks
  const homeLink = isLoggedIn ? (isAdmin ? '/admin' : '/dashboard') : '/'
  const avatar = user?.name?.charAt(0).toUpperCase() || '?'

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-dark-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
                  {avatar}
                </div>
                <span className="text-sm text-slate-300 hidden md:block">
                  {user?.name?.split(' ')[0]}
                  {isAdmin && <span className="ml-1 text-yellow-400 text-xs">(Admin)</span>}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform hidden md:block ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-dark-600">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                        {avatar}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                        <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
                    >
                      ⚙️ Settings
                    </Link>
                    <button
                      onClick={() => { setDropdownOpen(false); handleLogout() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}