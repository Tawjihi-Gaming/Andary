import { BrowserRouter, useNavigate, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../api/axios'

const Lobby = ({ user, onLogout }) => {
  const navigate = useNavigate()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomCode, setRoomCode] = useState('')

  // This is mock data to test front
  const [lobbies, setLobbies] = useState([
    { id: 1, name: 'Game 1', players: 3, maxPlayers: 6, topic: '🔬 علوم', status: 'waiting', owner_id: '123' },
    { id: 2, name: 'Game 2', players: 2, maxPlayers: 4, topic: '📚 تاريخ', status: 'waiting', owner_id: '456' },
    { id: 3, name: 'Game 3', players: 5, maxPlayers: 8, topic: '🌍 جغرافيا', status: 'playing', owner_id: '789' },
    { id: 4, name: 'Game 4', players: 1, maxPlayers: 6, topic: '🎭 ثقافة عامة', status: 'waiting', owner_id: '101' },
  ])

  /*
  This is the API for requesting lobbies from backend
  
  GET /lobby
  
  Response:
  {
    "lobby1": [ { "id": "1", "owner_id": "123", "status": "waiting" } ],
    "lobby2": [ { "id": "2", "owner_id": "456", "status": "waiting" } ],
  }
  
  // Code:
    useEffect(() => {
      const fetchLobbies = async () => {
        try {
          const response = await api.get('/lobby')
          const list = Object.entries(response.data).map(([name, items]) => ({
            name,
            ...items[0],
          }))
          setLobbies(list)
        } catch (error) {
          console.error('Error fetching lobbies:', error)
        }
      }
      fetchLobbies()
    }, [])
  */

  const handleJoinLobby = (roomId) => {
    navigate(`/room/${roomId}`, {
      state: {
        user: user,
        roomId: roomId
      }
    })
  }

  const handleCreateRoom = () => {
    navigate('/create-room')
  }

  const handleJoinByCode = () => {
    setShowJoinModal(true)
  }

  const handleJoinSubmit = async () => {
    const roomId = '12345' // Mock room ID for testing
    if (roomCode.trim()) {
      try {
        // const response = await api.post(`/room/join`,
        //   { code: roomCode },
        //   {PlayerId: user?.id || -1}
        // )
        // console.log('Joined room:', response.data)
        setShowJoinModal(false)
        // setRoomCode('')
        navigate(`/room/${roomId}`, {
          state: {
            code: roomCode,
            ownerId: 12345, // Mock owner ID for testing
            ownerName: 'Mock Owner', // Mock owner name for testing
            user: user
          }
        })
      } catch (err) {
        console.error('Error joining room:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] relative overflow-hidden">

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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              🎮 الغرف المتاحة
              <span className="text-sm font-medium bg-white/10 text-white/60 px-3 py-1 rounded-full">{lobbies.length} lobbies</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lobbies.map((lobby) => {
              const isFull = lobby.players >= lobby.maxPlayers
              const isPlaying = lobby.status === 'playing'
              const fillPercent = (lobby.players / lobby.maxPlayers) * 100

              return (
                <div
                  key={lobby.id}
                  className="group bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all duration-300"
                >
                  {/* header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-game-yellow transition-colors">{lobby.name}</h3>
                      <span className="text-white/40 text-sm">{lobby.topic}</span>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isPlaying
                        ? 'bg-game-orange/20 text-game-orange border border-game-orange/30'
                        : 'bg-game-green/20 text-game-green border border-game-green/30'
                    }`}>
                      {isPlaying ? '🟡 يلعبون' : '🟢 انتظار'}
                    </span>
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
                    onClick={() => handleJoinLobby(lobby.id)}
                    className={`w-full font-bold py-3 rounded-xl transition-all duration-300 ${
                      isFull || isPlaying
                        ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
                        : 'bg-linear-to-r from-game-green to-emerald-500 hover:from-game-green hover:to-emerald-400 text-white shadow-lg shadow-game-green/20 hover:shadow-game-green/30 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    disabled={isFull || isPlaying}
                  >
                    {isFull ? '🔒 ممتلئة' : isPlaying ? '⏳ جارية' : '🎯 انضم الآن'}
                  </button>
                </div>
              )
            })}
          </div>

          {lobbies.length === 0 && (
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
          <div className="bg-linear-to-br from-[#1E3A8A]/90 to-[#0F172A]/90 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/15">
            <div className="w-16 h-16 bg-linear-to-br from-game-cyan to-game-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-game-cyan/20">
              <span className="text-3xl">🔗</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              الانضمام بالكود
            </h2>
            <p className="text-white/50 text-center mb-6">
              Enter the room code to join a game
            </p>
            
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="أدخل الكود"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
                className="w-full bg-white/10 text-white text-center text-2xl font-bold placeholder:text-white/30 rounded-2xl py-4 px-5 border border-white/15 focus:border-game-cyan/50 focus:bg-white/15 focus:shadow-lg focus:shadow-game-cyan/10 transition-all duration-300 tracking-[0.3em]"
                dir="ltr"
                maxLength={8}
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
