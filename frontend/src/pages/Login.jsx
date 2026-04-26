import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authAPI.login(form)
      login(data.token, data.user)
if (data.user.role === "ADMIN") {
  navigate("/admin")
} else {
  navigate("/dashboard")
}
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h2 className="font-heading text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">Login to continue your prep</p>

          {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="input" type="email" placeholder="Email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
            <input className="input" type="password" placeholder="Password" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} required />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-brand-400 text-sm hover:underline">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-slate-400 text-sm text-center mt-4">
            Don't have an account? <Link to="/register" className="text-brand-400 hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}