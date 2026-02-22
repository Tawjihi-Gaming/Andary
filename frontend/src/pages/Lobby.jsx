import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../api/axios'

const Lobby = ({ user, onLogout }) => {
  const navigate = useNavigate()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [lobbies, setLobbies] = useState([])
  const [lobbiesLoading, setLobbiesLoading] = useState(true)

  useEffect(() => {
    const fetchLobbies = async () => {
      try {
        setLobbiesLoading(true)
        const response = await api.get('/room/lobbies')
        const list = Array.isArray(response.data) ? response.data : []
        setLobbies(list)
      } catch (error) {
        console.error('Error fetching lobbies:', error)
        setLobbies([])
      } finally {
        setLobbiesLoading(false)
      }
    }

    fetchLobbies()
    const intervalId = setInterval(fetchLobbies, 5000)
    return () => clearInterval(intervalId)
  }, [])

  const handleJoinLobby = async (roomId) => {
    setJoinError('')
    try {
      const response = await api.post('/room/join', {
        roomId: roomId,
        playerId: user?.id || null,
        playerName: user?.username || 'Guest',
        avatarImageName: user?.avatarImageName || '',
        clientKey: user?.clientKey || null,
      })
      console.log('Joined room:', response.data)
      const { roomId: joinedRoomId, code, sessionId, playerName, isPrivate, name } = response.data
      navigate(`/room/${joinedRoomId}`, {
        state: {
          user: user,
          roomId: joinedRoomId,
          roomName: name,
          code: code,
          isPrivate: isPrivate,
          sessionId: sessionId,
          ownerName: playerName,
        }
      })
    } catch (err) {
      console.error('Error joining room:', err)
      setJoinError(err?.response?.data?.error || 'Unable to join room.')
    }
  }

  const handleCreateRoom = () => {
    navigate('/create-room')
  }

  const handleJoinByCode = () => {
    setJoinError('')
    setShowJoinModal(true)
  }

  const handleJoinSubmit = async () => {
    const normalizedCode = roomCode.replace(/\D/g, '').slice(0, 6)
    if (normalizedCode) {
      setJoinError('')
      try {
        const response = await api.post('/room/join', {
          code: normalizedCode,
          playerId: user?.id || null,
          playerName: user?.username || 'Guest',
          avatarImageName: user?.avatarImageName || '',
          clientKey: user?.clientKey || null,
        })
        console.log('Joined room:', response.data)
        setShowJoinModal(false)
        setRoomCode('')
        const { roomId, code, sessionId, playerName, isPrivate, name } = response.data
        navigate(`/room/${roomId}`, {
          state: {
            code: code,
            isPrivate: isPrivate,
            sessionId: sessionId,
            ownerName: playerName,
            user: user,
            roomId: roomId,
            roomName: name,
          }
        })
      } catch (err) {
        console.error('Error joining room:', err)
        setJoinError(err?.response?.data?.error || 'Unable to join room.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] relative overflow-hidden">

      {/* Navbar */}
      <nav className="relative z-10 bg-white/5 backdrop-blur-2xl border-b border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/lobby')}>
            <div className="w-12 h-12 bg-linear-to-br from-game-yellow to-game-orange rounded-xl flex items-center justify-center shadow-lg shadow-game-yellow/20 group-hover:scale-105 transition-transform">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Andary
            </h1>
          </div>

          {/* user info & logout */}
          <div className="flex items-center gap-3">
            {/* user profile */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20 group"
            >
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-game-yellow to-game-orange flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-game-yellow/20 transition-all">
                <span className="text-xl">{user?.avatar}</span>
              </div>
              <span className="text-white/90 font-semibold">{user?.username || 'Player'}</span>
              <svg className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* logout button */}
            <button
              onClick={onLogout}
              className="bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 font-semibold px-5 py-2.5 rounded-2xl transition-all duration-300 border border-white/10 hover:border-red-500/30"
            >
              خروج
            </button>
          </div>
        </div>
      </nav>

      {/* main content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* welcome section */}
        <div className="mb-8">
          <h2 className="text-4xl font-extrabold text-white mb-2">
            مرحباً، <span className="text-game-yellow">{user?.username || 'Player'}</span> 👋
          </h2>
          <p className="text-white/50 text-lg">ابدأ لعبة جديدة أو انضم لغرفة موجودة</p>
        </div>

        {/* action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* create room card */}
          <button
            onClick={handleCreateRoom}
            className="group relative bg-linear-to-br from-game-yellow/20 to-game-orange/20 hover:from-game-yellow/30 hover:to-game-orange/30 backdrop-blur-xl p-6 rounded-2xl border border-game-yellow/30 hover:border-game-yellow/50 transition-all duration-300 text-right overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-game-yellow/10 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 bg-linear-to-br from-game-yellow to-game-orange rounded-2xl flex items-center justify-center shadow-lg shadow-game-yellow/20 group-hover:scale-110 transition-transform">
                <span className="text-3xl">➕</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">إنشاء غرفة</h3>
                <p className="text-white/50 text-sm">Create a new game room</p>
              </div>
            </div>
          </button>

          {/* join by code card */}
          <button
            onClick={handleJoinByCode}
            className="group relative bg-linear-to-br from-game-cyan/20 to-game-blue/20 hover:from-game-cyan/30 hover:to-game-blue/30 backdrop-blur-xl p-6 rounded-2xl border border-game-cyan/30 hover:border-game-cyan/50 transition-all duration-300 text-right overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-game-cyan/10 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 bg-linear-to-br from-game-cyan to-game-blue rounded-2xl flex items-center justify-center shadow-lg shadow-game-cyan/20 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🔗</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">الانضمام بالكود</h3>
                <p className="text-white/50 text-sm">Join a room with a code</p>
              </div>
            </div>
          </button>
        </div>

        {/* lobbies section */}
        <div>
          {joinError && (
            <div className="mb-4 bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-2xl text-sm">
              {joinError}
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              🎮 الغرف المتاحة
              <span className="text-sm font-medium bg-white/10 text-white/60 px-3 py-1 rounded-full">{lobbies.length} lobbies</span>
            </h2>
          </div>

          {lobbiesLoading ? (
            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 text-white/60">
              جاري تحميل الغرف...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lobbies.map((lobby) => {
                const isFull = lobby.players >= lobby.maxPlayers
                const fillPercent = lobby.maxPlayers > 0 ? (lobby.players / lobby.maxPlayers) * 100 : 0

                return (
                  <div
                    key={lobby.roomId || lobby.id}
                    className="group bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all duration-300"
                  >
                    {/* header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-game-yellow transition-colors">{lobby.name}</h3>
                        <span className="text-white/40 text-sm">{lobby.topic}</span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-game-green/20 text-game-green border border-game-green/30">
                        🟢 انتظار
                      </span>
                    </div>

                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-white/55">كود الغرفة</span>
                      <span className="text-game-cyan font-bold tracking-widest">{lobby.code || 'N/A'}</span>
                    </div>

                    {/* player count bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/50 text-sm">اللاعبون</span>
                        <span className="text-white/70 text-sm font-semibold">{lobby.players} / {lobby.maxPlayers} 👥</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull ? 'bg-red-500' : fillPercent > 60 ? 'bg-game-orange' : 'bg-game-green'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Join Button */}
                    <button
                      onClick={() => handleJoinLobby(lobby.roomId || lobby.id)}
                      className={`w-full font-bold py-3 rounded-xl transition-all duration-300 ${
                        isFull
                          ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
                          : 'bg-linear-to-r from-game-green to-emerald-500 hover:from-game-green hover:to-emerald-400 text-white shadow-lg shadow-game-green/20 hover:shadow-game-green/30 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      disabled={isFull}
                    >
                      {isFull ? '🔒 ممتلئة' : '🎯 انضم الآن'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!lobbiesLoading && lobbies.length === 0 && (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-6xl mb-4 block">🏠</span>
              <p className="text-white/50 text-xl mb-2">لا توجد غرف متاحة حالياً</p>
              <p className="text-white/30">No lobbies available — create one to start playing!</p>
            </div>
          )}
        </div>
      </div>

      {/* join by code modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-linear-to-br from-[#2563EB]/90 to-[#1E3A8A]/90 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/15">
            <div className="w-16 h-16 bg-linear-to-br from-game-cyan to-game-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-game-cyan/20">
              <span className="text-3xl">🔗</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              الانضمام بالكود
            </h2>
            <p className="text-white/50 text-center mb-6">
              أدخل كود الغرفة (6 أرقام)
            </p>
            
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="000000"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
                className="w-full bg-white/10 text-white text-center text-2xl font-bold placeholder:text-white/30 rounded-2xl py-4 px-5 border border-white/15 focus:border-game-cyan/50 focus:bg-white/15 focus:shadow-lg focus:shadow-game-cyan/10 transition-all duration-300 tracking-[0.3em]"
                dir="ltr"
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setRoomCode('')
                }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 font-bold py-3.5 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
              >
                إلغاء
              </button>
              <button
                onClick={handleJoinSubmit}
                disabled={!roomCode.trim()}
                className="flex-1 bg-linear-to-r from-game-cyan to-game-blue hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-game-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                انضم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Lobby
