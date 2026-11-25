import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import Login from './pages/auth/Login.jsx'
import ProfileSetup from './pages/auth/ProfileSetup.jsx'
import Dashboard from './pages/student/Dashboard.jsx'
import Assignments from './pages/student/Assignments.jsx'
import Leaderboard from './pages/student/Leaderboard.jsx'
import Progress from './pages/student/Progress.jsx'
import ProblemView from './pages/student/ProblemView.jsx'
import PwaNotifications from './components/common/PwaNotifications.jsx'
import './pages/auth/auth.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PwaNotifications />
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
            path="/student/leaderboard"
            element={(
              <RequireAuth>
                <Leaderboard />
              </RequireAuth>
            )}
          />
          <Route
            path="/student/assignments"
            element={(
              <RequireAuth>
                <Assignments />
              </RequireAuth>
            )}
          />
          <Route
            path="/student/progress"
            element={(
              <RequireAuth>
                <Progress />
              </RequireAuth>
            )}
          />
          <Route
            path="/student/problem/:assignmentId"
            element={(
              <RequireAuth>
                <ProblemView />
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
