import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, firebaseConfigured } from '../lib/firebase.js'
import { getProfile, saveProfile as saveProfileRequest } from '../services/profileApi.js'

const AuthContext = createContext(null)
const localPreviewMode = import.meta.env.DEV || import.meta.env.MODE === 'demo'
const demoLoginAvailable = localPreviewMode && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'
const demoSessionKey = 'codementor-local-dashboard-preview'
const demoStudent = {
  uid: 'local-demo-student',
  displayName: 'Demo Student',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isDemoUser, setIsDemoUser] = useState(false)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileStatus, setProfileStatus] = useState('checking')
  const [profileError, setProfileError] = useState('')

  const refreshProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      setProfileStatus('signed-out')
      setProfileError('')
      return 'signed-out'
    }

    setProfileStatus('checking')
    setProfileError('')
    try {
      const result = await getProfile(currentUser)
      setProfile(result)
      const nextStatus = result.role === 'student'
        ? 'complete'
        : result.role === 'teacher'
          ? 'other-role'
          : 'needs-setup'
      setProfileStatus(nextStatus)
      return nextStatus
    } catch (error) {
      setProfileError(error.message || 'We could not check your profile. Please try again.')
      setProfileStatus('error')
      return 'error'
    }
  }, [])

  useEffect(() => {
    if (demoLoginAvailable && window.sessionStorage.getItem(demoSessionKey) === 'true') {
      setUser(demoStudent)
      setIsDemoUser(true)
      setProfile({ displayName: demoStudent.displayName, role: 'student' })
      setProfileStatus('complete')
      setAuthLoading(false)
      return undefined
    }

    if (!firebaseConfigured || !auth) {
      setAuthLoading(false)
      setProfileStatus('signed-out')
      return undefined
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      setIsDemoUser(false)
      if (!nextUser) {
        setProfile(null)
        setProfileStatus('signed-out')
        setProfileError('')
        setAuthLoading(false)
        return
      }

      setAuthLoading(true)
      await refreshProfile(nextUser)
      setAuthLoading(false)
    })
  }, [refreshProfile])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase is not configured yet. Add your web app settings to .env.local.')
    await signInWithPopup(auth, new GoogleAuthProvider())
  }, [])

  const signInWithGitHub = useCallback(async () => {
    if (!auth) throw new Error('Firebase is not configured yet. Add your web app settings to .env.local.')
    const provider = new GithubAuthProvider()
    provider.addScope('user:email')
    await signInWithPopup(auth, provider)
  }, [])

  const startDemoSession = useCallback(() => {
    if (!demoLoginAvailable) throw new Error('Local dashboard preview is turned off.')
    window.sessionStorage.setItem(demoSessionKey, 'true')
    setUser(demoStudent)
    setIsDemoUser(true)
    setProfile({ displayName: demoStudent.displayName, role: 'student' })
    setProfileStatus('complete')
    setProfileError('')
    setAuthLoading(false)
  }, [])

  const saveStudentProfile = useCallback(async (profileValues) => {
    if (!user) throw new Error('Please sign in again before saving your profile.')
    const result = await saveProfileRequest(user, { ...profileValues, role: 'student' })
    setProfile({ ...profileValues, role: result.role || 'student' })
    setProfileStatus('complete')
    setProfileError('')
    return result
  }, [user])

  const signOut = useCallback(async () => {
    if (demoLoginAvailable) window.sessionStorage.removeItem(demoSessionKey)
    if (auth) await firebaseSignOut(auth)
    setUser(null)
    setIsDemoUser(false)
    setProfile(null)
    setProfileStatus('signed-out')
  }, [])

  const value = useMemo(() => ({
    user,
    isDemoUser,
    profile,
    authLoading,
    profileStatus,
    profileError,
    firebaseConfigured,
    signInWithGoogle,
    signInWithGitHub,
    demoLoginAvailable,
    startDemoSession,
    signOut,
    refreshProfile,
    saveStudentProfile,
  }), [
    user,
    isDemoUser,
    profile,
    authLoading,
    profileStatus,
    profileError,
    signInWithGoogle,
    signInWithGitHub,
    startDemoSession,
    signOut,
    refreshProfile,
    saveStudentProfile,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
