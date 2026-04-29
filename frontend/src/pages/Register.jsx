import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

// ✅ Email validation
const isValidEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return regex.test(email)
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const navigate = useNavigate()

  // ⏳ Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // ✅ Register
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Name is required')
    if (!isValidEmail(form.email)) return setError('Enter a valid email')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)
    try {
      await authAPI.register(form)

      setOtpSent(true)
      setCooldown(60)

      alert('OTP sent successfully! Check inbox or spam folder.')

    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')

    if (!otp.trim() || otp.length < 4) {
      return setError('Enter valid OTP')
    }

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

  // 🔁 Resend OTP
  const handleResend = async () => {
    if (cooldown > 0) return

    setError('')
    try {
      await authAPI.resendOTP({ email: form.email })
      setCooldown(60)
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
            <>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Create account</h2>
              <p className="text-slate-400 text-sm mb-6">Start your placement journey</p>

              {error && <div className="error-box">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input className="input" type="text" placeholder="Full Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />

                <input className="input" type="email" placeholder="Email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />

                <input className="input" type="password" placeholder="Password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />

                <button className="btn-primary w-full" disabled={loading}>
                  {loading ? "Sending OTP..." : "Create Account"}
                </button>
              </form>

              <p className="text-sm mt-4 text-center">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2">Verify Email</h2>
              <p className="text-sm text-gray-400 mb-4">
                OTP sent to <b>{form.email}</b><br />
                It may take a few seconds. Check spam folder also.
              </p>

              {error && <div className="error-box">{error}</div>}

              <form onSubmit={handleVerify}>
                <input
                  className="input text-center"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                />

                <button className="btn-primary w-full mt-3" disabled={verifying}>
                  {verifying ? "Verifying..." : "Verify OTP"}
                </button>
              </form>

              <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className="mt-3 text-sm text-blue-400"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}