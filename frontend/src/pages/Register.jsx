import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

// ✅ Frontend email format check
const isValidEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return regex.test(email)
}

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)  // ✅ OTP form toggle
  const [otp, setOtp]         = useState('')
  const [verifying, setVerifying] = useState(false)
  const navigate = useNavigate()

  // ✅ Step 1 — Register karo, OTP form turant kholo
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Frontend validation
    if (!form.name.trim()) return setError('Name is required')
    if (!isValidEmail(form.email)) return setError('Please enter a valid email address')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)
    try {
      await authAPI.register(form)
      setOtpSent(true)  // ✅ Turant OTP form dikha do
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Step 2 — OTP verify karo
  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')

    if (!otp.trim() || otp.length < 4) return setError('Please enter a valid OTP')

    setVerifying(true)
    try {
      await authAPI.verifyOTP({ email: form.email, otp })
      navigate('/login', { state: { message: 'Account verified! Please login.' } })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setVerifying(false)
    }
  }

  // ✅ Resend OTP
  const handleResend = async () => {
    setError('')
    try {
      await authAPI.resendOTP({ email: form.email })
      setError('') // clear any error
      alert('OTP resent successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">

          {!otpSent ? (
            // ── Step 1: Register Form ──────────────────────────────────
            <>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Create account</h2>
              <p className="text-slate-400 text-sm mb-6">Start your placement journey</p>

              {error && (
                <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  className="input"
                  type="text"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  required
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  required
                  minLength={8}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending OTP...
                      </span>
                    : 'Create Account'
                  }
                </button>
              </form>

              <p className="text-slate-400 text-sm text-center mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-400 hover:underline">Login</Link>
              </p>
            </>
          ) : (
            // ── Step 2: OTP Form — turant dikhe ───────────────────────
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📧</div>
                <h2 className="font-heading text-2xl font-bold text-white mb-1">Verify your email</h2>
                <p className="text-slate-400 text-sm">
                  OTP bheja ja raha hai{' '}
                  <span className="text-brand-400 font-medium">{form.email}</span>{' '}
                  pe — thodi der mein aayega
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  className="input text-center text-2xl font-mono tracking-widest"
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={verifying}
                  className="btn-primary w-full"
                >
                  {verifying
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </span>
                    : 'Verify OTP'
                  }
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={handleResend}
                  className="text-sm text-brand-400 hover:underline"
                >
                  Resend OTP
                </button>
                <button
                  onClick={() => { setOtpSent(false); setError(''); setOtp('') }}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  ← Change email
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}