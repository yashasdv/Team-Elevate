import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import Login from './pages/auth/Login.jsx'
import ProfileSetup from './pages/auth/ProfileSetup.jsx'
import Dashboard from './pages/student/Dashboard.jsx'
import ProblemPlaceholder from './pages/student/ProblemPlaceholder.jsx'
import './pages/auth/auth.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile-setup"
            element={(
              <RequireAuth needsProfile>
                <ProfileSetup />
              </RequireAuth>
            )}
          />
          <Route
            path="/student/dashboard"
            element={(
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            )}
          />
          <Route
            path="/student/problem/:assignmentId"
            element={(
              <RequireAuth>
                <ProblemPlaceholder />
              </RequireAuth>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
