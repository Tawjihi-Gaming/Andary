import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LoginPage from './pages/LogginPage.jsx'
import Lobby from './pages/Lobby.jsx'
import Profile from './pages/Profile.jsx'
import CreateRoom from './pages/Create-room.jsx'
import GameRoom from './pages/room/[roomId].jsx'
import Game from './pages/game/[roomId].jsx'
import TestRoom from './pages/room/TestRoom.jsx'
import api from './api/axios'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true'
  })

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userData')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [loading, setLoading] = useState(true)

  // On app load, check if user has a valid session (JWT cookie)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get('/auth/me')
        const userData = {
          id: res.data.id,
          username: res.data.username,
          email: res.data.email,
          avatar: res.data.avatarImageName || '👤',
          xp: res.data.xp || 0,
          isGuest: false
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
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('userData', JSON.stringify(userData))
    setUser(userData)
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
    localStorage.setItem('userData', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center">
        <span className="text-white text-2xl animate-pulse">...جاري التحميل</span>
      </div>
    )
  }

  return (
    <BrowserRouter>
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
          path="/test-room" 
          element={<TestRoom />} 
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
