import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LoginPage from './pages/LogginPage.jsx'
import Lobby from './pages/Lobby.jsx'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // check if user is already logged in (for mock)
    return localStorage.getItem('isAuthenticated') === 'true'
  })

  const handleLogin = () => {
    localStorage.setItem('isAuthenticated', 'true')
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    setIsAuthenticated(false)
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
              <Lobby onLogout={handleLogout} /> : 
              <Navigate to="/" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
