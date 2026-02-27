import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LoginPage from './pages/LogginPage.jsx'
import Lobby from './pages/Lobby.jsx'
import Profile from './pages/Profile.jsx'
import CreateRoom from './pages/Create-room.jsx'
import GameRoom from './pages/room/[roomId].jsx'
import Game from './pages/game/[roomId].jsx'
import Friends from './pages/Friends.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import api from './api/axios'
import { logout as apiLogout, getMe } from './api/auth'
import ThemeSwitcher from './components/ThemeSwitcher'

const createClientKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function App() {
  const { t } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true'
  })

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userData')
    if (!savedUser) return null
    const parsedUser = JSON.parse(savedUser)
    const normalizedUser = {
      ...parsedUser,
      avatar: parsedUser.avatar || parsedUser.avatarImageName || '👤',
      avatarImageName: parsedUser.avatarImageName || parsedUser.avatar || '',
      clientKey: parsedUser.clientKey || createClientKey(),
    }
    if (!parsedUser.clientKey || !parsedUser.avatar || !parsedUser.avatarImageName) {
      localStorage.setItem('userData', JSON.stringify(normalizedUser))
    }
    return normalizedUser
  })

  const [loading, setLoading] = useState(true)

  // On app load, check if user has a valid session (JWT cookie)
  useEffect(() => {
    const savedTheme = localStorage.getItem('andary-theme')
    const activeTheme = savedTheme === 'dark' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', activeTheme)

    const searchParams = new URLSearchParams(window.location.search)
    const isOAuthLoginCallback = searchParams.get('login') === 'oauth'

    if (!isOAuthLoginCallback || isAuthenticated) {
      setLoading(false)
      return
    }

    const checkSession = async () => {
      try {
        const res = await getMe()
        const userData = {
          id: res.data.id,
          username: res.data.username,
          email: res.data.email,
          avatar: res.data.avatarImageName || '👤',
          xp: res.data.xp || 0,
          isGuest: false,
          isGoogleUser: res.data.isGoogleUser || false,
          clientKey: createClientKey(),
        }
        handleLogin(userData)
      } catch {
        // No valid session, that's fine
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const handleLogin = (userData) => {
    const normalizedUser = {
      ...userData,
      avatar: userData.avatar || userData.avatarImageName || '👤',
      avatarImageName: userData.avatarImageName || userData.avatar || '',
      xp: userData.xp  || 0,
      clientKey: userData.clientKey || createClientKey(),
    }
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('userData', JSON.stringify(normalizedUser))
    setUser(normalizedUser)
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch {
      // If logout fails (e.g. already expired), still clear local state
    }
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userData')
    setUser(null)
    setIsAuthenticated(false)
  }

  // Update user data in state and localStorage (used by Profile page edits)
  const handleUpdateUser = (updatedUser) => {
    const normalizedUser = {
      ...updatedUser,
      avatar: updatedUser.avatar || updatedUser.avatarImageName || '👤',
      avatarImageName: updatedUser.avatarImageName || updatedUser.avatar || '',
      clientKey: updatedUser.clientKey || user?.clientKey || createClientKey(),
    }
    localStorage.setItem('userData', JSON.stringify(normalizedUser))
    setUser(normalizedUser)
  }

  if (loading) {
    return (
      <div className="min-h-screen app-page-bg flex items-center justify-center">
        <span className="text-white text-2xl animate-pulse">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ThemeSwitcher className="fixed bottom-4 left-4 z-50" />
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
              <Navigate to="/lobby" replace /> : 
              <LoginPage onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/lobby" replace /> : 
              <LoginPage onLogin={handleLogin} />
          } 
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ?
              <Navigate to="/lobby" replace /> :
              <ForgotPassword />
          }
        />
        <Route
          path="/reset-password"
          element={
            isAuthenticated ?
              <Navigate to="/lobby" replace /> :
              <ResetPassword />
          }
        />
        <Route 
          path="/lobby" 
          element={
            isAuthenticated ? 
              <Lobby user={user} onLogout={handleLogout} /> : 
              <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/profile" 
          element={
            isAuthenticated ? 
              <Profile user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> : 
              <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/friends" 
          element={
            isAuthenticated ? 
              <Friends user={user} onLogout={handleLogout} /> : 
              <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/create-room" 
          element={
            isAuthenticated ? 
              <CreateRoom user={user} onLogout={handleLogout} /> : 
              <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/room/:roomId" 
          element={
            isAuthenticated ? 
              <GameRoom user={user} /> : 
              <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/game/:roomId" 
          element={
            isAuthenticated ? 
              <Game user={user} /> :
              <Navigate to="/" replace />
          } 
        />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
