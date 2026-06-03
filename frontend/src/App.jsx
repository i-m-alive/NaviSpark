import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import ThemePicker from './components/ThemePicker'
import NotificationPermissionModal from './components/NotificationPermissionModal'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/admin/AdminRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import CustomUploadPage from './pages/CustomUploadPage'
import CustomResultsPage from './pages/CustomResultsPage'
import HowItWorksPage from './pages/HowItWorksPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminSessionsPage from './pages/admin/AdminSessionsPage'
import AdminTokenUsagePage from './pages/admin/AdminTokenUsagePage'
import AdminActivityPage from './pages/admin/AdminActivityPage'

// Inner component so it can consume ThemeContext + NotificationContext
function AppRoutes() {
  const { showPicker } = useTheme()
  const { showModal: showNotifModal } = useNotifications()
  return (
    <>
      {/* First-login theme picker */}
      {showPicker && <ThemePicker />}
      {/* First-login notification permission prompt */}
      {showNotifModal && <NotificationPermissionModal />}

      <Routes>
        {/* ── Public auth routes ──────────────────────────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* OAuth + password-reset redirects from Supabase land here */}
        <Route path="/auth/callback"       element={<AuthCallbackPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* ── Protected routes ────────────────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute><UploadPage /></ProtectedRoute>
        } />
        <Route path="/results/:sessionId" element={
          <ProtectedRoute><ResultsPage /></ProtectedRoute>
        } />
        <Route path="/custom-upload" element={
          <ProtectedRoute><CustomUploadPage /></ProtectedRoute>
        } />
        <Route path="/custom-results/:sessionId" element={
          <ProtectedRoute><CustomResultsPage /></ProtectedRoute>
        } />
        <Route path="/how-it-works" element={
          <ProtectedRoute><HowItWorksPage /></ProtectedRoute>
        } />

        {/* ── Admin routes ────────────────────────────────────────── */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute><AdminUsersPage /></AdminRoute>
        } />
        <Route path="/admin/sessions" element={
          <AdminRoute><AdminSessionsPage /></AdminRoute>
        } />
        <Route path="/admin/token-usage" element={
          <AdminRoute><AdminTokenUsagePage /></AdminRoute>
        } />
        <Route path="/admin/activity" element={
          <AdminRoute><AdminActivityPage /></AdminRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
