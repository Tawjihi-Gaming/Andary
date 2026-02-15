import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios' 

const CreateRoom = ({ user }) => {
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/room/create', { 
        isPrivate: isPrivate,
        questions: 10, 
      })
      console.log('Room created:', response.data)
      const { roomId, code } = response.data
      
      navigate(`/room/${roomId}`, {
        state: { 
          user: user,
          roomId: roomId, 
          code: code 
        }
      })
    } catch (err) {
      console.error('Error creating room:', err)
      setError('Failed to create room. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] relative overflow-hidden flex items-center justify-center p-6">
      
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/15">
        <div className="w-16 h-16 bg-gradient-to-br from-game-yellow to-game-orange rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-game-yellow/20">
          <span className="text-3xl">➕</span>
        </div>
        
        <h1 className="text-3xl font-extrabold text-white mb-2 text-center">إنشاء غرفة</h1>
        <p className="text-white/50 text-center mb-6">Create a new game room</p>
        
        <form onSubmit={handleCreateRoom} className="space-y-5">
          
          {/* Room Name Input */}
          <div>
            <label className="block text-white/70 font-semibold mb-2">اسم الغرفة</label>
            <input
              type="text"
              placeholder="Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/30 rounded-2xl py-3 px-5 border border-white/15 focus:border-game-yellow/50 focus:bg-white/15 focus:shadow-lg focus:shadow-game-yellow/10 transition-all duration-300 focus:outline-none"
              required
            />
          </div>

          {/* Room Type Buttons */}
          <div>
            <label className="block text-white/70 font-semibold mb-3">نوع الغرفة</label>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Public Button */}
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                  !isPrivate
                    ? 'bg-gradient-to-br from-game-green/30 to-emerald-500/30 border-game-green/50 shadow-lg shadow-game-green/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">🌍</span>
                  <span className={`font-bold ${!isPrivate ? 'text-game-green' : 'text-white/40'}`}>
                    عامة
                  </span>
                  <span className={`text-xs ${!isPrivate ? 'text-game-green/70' : 'text-white/40'}`}>
                    Public
                  </span>
                </div>
                {!isPrivate && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-game-green rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Private Button */}
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                  isPrivate
                    ? 'bg-gradient-to-br from-game-orange/30 to-red-500/30 border-game-orange/50 shadow-lg shadow-game-orange/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">🔒</span>
                  <span className={`font-bold ${isPrivate ? 'text-game-orange' : 'text-white/40'}`}>
                    خاصة
                  </span>
                  <span className={`text-xs ${isPrivate ? 'text-game-orange/70' : 'text-white/40'}`}>
                    Private
                  </span>
                </div>
                {isPrivate && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-game-orange rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-game-yellow to-game-orange hover:from-game-yellow hover:to-game-orange text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-game-yellow/20 hover:shadow-game-yellow/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            إنشاء الغرفة
          </button>

          {/* Back to Lobby */}
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="w-full bg-white/5 hover:bg-white/10 text-white/70 font-bold py-3 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
          >
            رجوع
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateRoom
