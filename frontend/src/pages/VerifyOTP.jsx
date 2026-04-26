import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function VerifyOTP() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''
  const [otp, setOtp]       = useState('')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await authAPI.verifyOTP({ email, otp })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setError(''); setSuccess('')
    try {
      await authAPI.resendOTP({ email })
      setSuccess('OTP resent successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md card">
        <h2 className="font-heading text-2xl font-bold text-white mb-1">Verify Email</h2>
        <p className="text-slate-400 text-sm mb-6">OTP sent to <span className="text-brand-400">{email}</span></p>

        {error   && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
        {success && <div className="bg-emerald-900/30 border border-emerald-500/40 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4">{success}</div>}

        <form onSubmit={handleVerify} className="space-y-4">
          <input className="input text-center text-2xl tracking-widest" type="text"
            placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)}
            maxLength={6} required />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <button onClick={handleResend} className="text-brand-400 text-sm hover:underline mt-4 block text-center w-full">
          Resend OTP
        </button>
      </div>
    </div>
  )
}
