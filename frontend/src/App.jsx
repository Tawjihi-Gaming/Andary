import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LoginPage from './pages/LogginPage.jsx'
import Lobby from './pages/Lobby.jsx'
import Profile from './pages/Profile.jsx'
import CreateRoom from './pages/Create-room.jsx'
import GameRoom from './pages/room/[roomId].jsx'
import TestRoom from './pages/room/TestRoom.jsx'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true'
  })

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userData')
    return savedUser ? JSON.parse(savedUser) : null
  })

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
      </Routes>
    </BrowserRouter>
  )
}

export default App
