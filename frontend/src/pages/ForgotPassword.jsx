import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function ForgotPassword() {
  const [step, setStep]     = useState(1)
  const [email, setEmail]   = useState('')
  const [otp, setOtp]       = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const sendOTP = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  const resetPass = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp, newPassword })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md card">
        <h2 className="font-heading text-2xl font-bold text-white mb-1">Reset Password</h2>
        <p className="text-slate-400 text-sm mb-6">{step === 1 ? 'Enter your email to receive OTP' : 'Enter OTP and new password'}</p>

        {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

        {step === 1 ? (
          <form onSubmit={sendOTP} className="space-y-4">
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPass} className="space-y-4">
            <input className="input text-center tracking-widest text-xl" type="text"
              placeholder="OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
            <input className="input" type="password" placeholder="New Password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} required minLength={8} />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}