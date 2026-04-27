import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register:       (data) => api.post('/auth/register', data),
  verifyOTP:      (data) => api.post('/auth/verify-otp', data),
  resendOTP:      (data) => api.post('/auth/resend-otp', data),
  login:          (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
}

export const questionAPI = {
  generate: (data) => api.post('/questions/generate', data),
  evaluate: (data) => api.post('/questions/evaluate', data),
}

export const resumeAPI = {
  analyze: (formData) => api.post('/resume/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const interviewAPI = {
  start:      (data) => api.post('/interview/start', data),
  next:       (data) => api.post('/interview/next', data),
  finish:     (data) => api.post('/interview/finish', data),
  getHistory: ()     => api.get('/interview/history'),
  getSession: (id)   => api.get(`/interview/session/${id}`),
}

export const streakAPI = {
  getToday:    () => api.get('/streak/today'),
  submit:      (data) => api.post('/streak/submit', data),
  getInfo:     () => api.get('/streak/info'),
  getHistory:  (date) => api.get(`/streak/history/${date}`),
}

// ✅ FIX 3: plain axios → api instance use karo
// Pehle plain axios tha jisme auth token nahi jaata tha
// → backend 401 deta tha → session crash → black screen
export const voiceInterviewAPI = {
  start:   (data) => api.post('/voice-interview/start',  data),
  next:    (data) => api.post('/voice-interview/next',   data),
  finish:  (data) => api.post('/voice-interview/finish', data),
  history: ()     => api.get('/voice-interview/history'),
}

export default api