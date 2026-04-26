import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function Register() {
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.register(form)
      navigate('/verify-otp', { state: { email: form.email } })
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h2 className="font-heading text-2xl font-bold text-white mb-1">Create account</h2>
          <p className="text-slate-400 text-sm mb-6">Start your placement journey</p>

          {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="input" type="text" placeholder="Full Name" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} required />
            <input className="input" type="email" placeholder="Email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
            <input className="input" type="password" placeholder="Password (min 8 chars)" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} required minLength={8} />

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP...' : 'Create Account'}
            </button>
          </form>

          <p className="text-slate-400 text-sm text-center mt-4">
            Already have an account? <Link to="/login" className="text-brand-400 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}