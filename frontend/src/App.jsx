import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyOTP from './pages/VerifyOTP'
import ForgotPassword from './pages/ForgotPassword'
import ProtectedRoute from "./components/ProtectedRoute"
import AdminDashboard from "./pages/AdminDashboard"
import UserDashboard from "./pages/UserDashboard"
import Questions from './pages/Questions'
import ResumeAnalyzer from './pages/ResumeAnalyzer'
import Interview from './pages/Interview'
import InterviewSession from './pages/InterviewSession'
import History from './pages/History'
import CompanyPrep from './pages/CompanyPrep'
import Streak from './pages/Streak'
import DSASolver from './pages/DSASolver'
import VoiceInterview from './pages/VoiceInterview'
import VoiceInterviewSession from './pages/VoiceInterviewSession'
import Settings from './pages/Settings'



const PrivateRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-400">Loading...</div>
  return isLoggedIn ? children : <Navigate to="/login" />
}

const PublicRoute = ({ children }) => {
  const { isLoggedIn, user } = useAuth()
  if (!isLoggedIn) return children
  return user?.role === "ADMIN" ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
}
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-dark-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/company" element={<PrivateRoute><CompanyPrep /></PrivateRoute>} />
            <Route path="/questions" element={<PrivateRoute><Questions /></PrivateRoute>} />
            <Route path="/resume" element={<PrivateRoute><ResumeAnalyzer /></PrivateRoute>} />
            <Route path="/interview" element={<PrivateRoute><Interview /></PrivateRoute>} />
            <Route path="/interview/session" element={<PrivateRoute><InterviewSession /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/streak" element={<PrivateRoute><Streak /></PrivateRoute>} />
            <Route path="/dsa-solver" element={<PrivateRoute><DSASolver /></PrivateRoute>} />
            <Route path="/voice-interview" element={<PrivateRoute><VoiceInterview /></PrivateRoute>} />
            <Route path="/voice-interview/session" element={<PrivateRoute><VoiceInterviewSession /></PrivateRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}