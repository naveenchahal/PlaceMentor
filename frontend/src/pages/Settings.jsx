import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

export default function Settings() {
  const { user, login, token } = useAuth()
  const [name, setName]         = useState(user?.name || '')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') !== 'light'
  )

  const avatar = user?.name?.charAt(0).toUpperCase() || '?'

  // ✅ Page load pe saved theme apply karo
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      document.documentElement.classList.add('light')
      setDarkMode(false)
    } else {
      document.documentElement.classList.remove('light')
      setDarkMode(true)
    }
  }, [])

  const handleNameUpdate = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!name.trim()) return setError('Name cannot be empty')
    setLoading(true)
    try {
      const res = await authAPI.updateName({ name: name.trim() })
      login(token, { ...user, name: res.data.name })
      setSuccess('Name updated successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update name')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Toggle fix
  const handleThemeToggle = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-white mb-8">⚙️ Settings</h1>

      {/* ── Profile ── */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">👤 Profile</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold">
            {avatar}
          </div>
          <div>
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
          </div>
        </div>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleNameUpdate} className="space-y-3">
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1">Display Name</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter new name"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary py-2 px-6 text-sm">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* ── Appearance ── */}
      <div className="card">
        <h2 className="text-white font-semibold text-lg mb-4">🎨 Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">
              {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">Switch between dark and light theme</p>
          </div>
          {/* ✅ Toggle button */}
          <button
            onClick={handleThemeToggle}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300
              ${darkMode ? 'bg-brand-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow
                              transition-transform duration-300
                              ${darkMode ? 'translate-x-7' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>
    </main>
  )
}