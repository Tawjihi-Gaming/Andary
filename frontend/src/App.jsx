import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LoginPage from './pages/LogginPage.jsx'
import Lobby from './pages/Lobby.jsx'
import Profile from './pages/Profile.jsx'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // check if user is already logged in (for mock)
    return localStorage.getItem('isAuthenticated') === 'true'
  })

  const [user, setUser] = useState(() => {
    // Load user data from localStorage
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
