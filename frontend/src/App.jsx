import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LoginPage from './pages/LogginPage.jsx'
import Lobby from './pages/Lobby.jsx'
import Profile from './pages/Profile.jsx'
import CreateRoom from './pages/Create-room.jsx'
import GameRoom from './pages/room/[roomId].jsx'
import Game from './pages/game/[roomId].jsx'
import api from './api/axios'
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
      clientKey: parsedUser.clientKey || createClientKey(),
    }
    if (!parsedUser.clientKey) {
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

    const checkSession = async () => {
      try {
        const res = await api.get('/auth/me')
        const userData = {
          id: res.data.id,
          username: res.data.username,
          email: res.data.email,
          avatar: res.data.avatarImageName || '👤',
          xp: res.data.xp || 0,
          isGuest: false,
          clientKey: createClientKey(),
        }
        handleLogin(userData)
      } catch {
        // No valid session, that's fine
      } finally {
        setLoading(false)
      }
    }

    if (!isAuthenticated) {
      checkSession()
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (userData) => {
    const normalizedUser = {
      ...userData,
      clientKey: userData.clientKey || createClientKey(),
    }
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('userData', JSON.stringify(normalizedUser))
    setUser(normalizedUser)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userData')
    setUser(null)
    setIsAuthenticated(false)
  }

  // Update user data in state and localStorage (used by Profile page edits)
  const handleUpdateUser = (updatedUser) => {
    const normalizedUser = {
      ...updatedUser,
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
              <GameRoom user={user} /> :  // ✅ Change Room to GameRoom
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
