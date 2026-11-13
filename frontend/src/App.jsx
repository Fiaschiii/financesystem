import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import IdleLogout from './components/IdleLogout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import MfaVerify from './pages/MfaVerify.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'
import Profile from './pages/Profile.jsx'
import { RouteLoadingProvider } from './hooks/useRouteLoading.jsx'
import './App.css'

function App() {
  return (
    <RouteLoadingProvider>
      <div className="app-shell">
        <Header />
        <IdleLogout />
        <main className="app-content">
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mfa" element={<MfaVerify />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          </Routes>
        </main>
      </div>
    </RouteLoadingProvider>
  )
}

export default App
