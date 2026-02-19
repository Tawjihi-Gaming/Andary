import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios' 

const CreateRoom = ({ user }) => {
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [selectedTopics, setSelectedTopics] = useState([])
  const [availableTopics, setAvailableTopics] = useState([])
  const [timer, setTimer] = useState(30)
  const [calcTimer, setCalcTimer] = useState(20)
  const [rounds, setRounds] = useState(5)
  const navigate = useNavigate()

  // Fetch available topics from the backend
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await api.get('/room/topics')
        setAvailableTopics(res.data)
      } catch (err) {
        console.error('Error fetching topics:', err)
      }
    }
    fetchTopics()
  }, [])

  console.log("user data", user)

  const toggleTopicSelection = (topic) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic)
      } else {
        return [...prev, topic]
      }
    })
  }

  const roundOptions = [5, 10, 15]

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    
    // Validate topic selection
    if (selectedTopics.length < 5) {
      setError('يجب اختيار 5 مواضيع على الأقل (Please select at least 5 topics)')
      return
    }

    if (selectedTopics.length > 8) {
      setError('يجب اختيار 8 مواضيع كحد أقصى (Please select no more than 8 topics)')
      return
    }

    // const roomId = Math.floor(Math.random() * 1000000) // Mock room ID generation
    // const code = '12345'// Mock room code generation
    // const roomOwnerId = user?.id || -1
    // const roomOwnerName = user?.username || 'Guest'
    // const finalRoomName = roomName || `Room ${roomId}`
    try {
      const response = await api.post('/room/create', { 
        name: roomName,
        isPrivate: isPrivate,
        questions: rounds || 10, 
        playerName: user?.username || 'Guest',
        avatarImageName: user?.avatarImageName || '',
        playerId: user?.id || null,
        selectedTopics: selectedTopics
      })
      console.log('Room created:', response.data)
      const { roomId, code, sessionId, playerName } = response.data
      console.log('user room with ID:', user?.id, 'to room:', roomId)
      
      // Join the room (use -1 for guest players)
      // await api.post(`/room/join`, { 
      //   RoomId: roomId, 
      //   PlayerId: user?.id || -1,
      // })
     
      console.log('User joined room successfully')

      navigate(`/room/${roomId}`, {
        state: { 
          user: user,
          roomId: roomId, 
          code: code,
          sessionId: sessionId,
          ownerId: sessionId,
          ownerName: playerName || user?.username || 'Guest',
          roomName: roomName || `Room ${roomId}`,
          timer: timer,
          calcTimer: calcTimer,
          rounds: rounds,
          topics: selectedTopics
        }
      })
    } catch (err) {
      console.error('Error creating room:', err)
      setError('Failed to create room. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] relative overflow-hidden flex items-center justify-center p-3 sm:p-6">
      
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-4 sm:p-8 w-full sm:w-3/4 max-w-4xl shadow-2xl border border-white/15">
        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-game-yellow to-game-orange rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-game-yellow/20">
          <span className="text-2xl sm:text-4xl">➕</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 text-center">إنشاء غرفة</h1>
        <p className="text-white/80 text-center mb-5 sm:mb-8 text-base sm:text-lg">Create a new game room</p>
        
        <form onSubmit={handleCreateRoom} className="space-y-5">
          
          {/* Room Name Input */}
          <div>
            <label className="block text-white/90 font-semibold mb-2 text-base sm:text-lg">اسم الغرفة</label>
            <input
              type="text"
              placeholder="Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-white/10 text-white text-base sm:text-lg placeholder:text-white/50 rounded-2xl py-3 px-4 sm:py-4 sm:px-6 border border-white/15 focus:border-game-yellow/50 focus:bg-white/15 focus:shadow-lg focus:shadow-game-yellow/10 transition-all duration-300 focus:outline-none"
              required
            />
          </div>

          {/* Room Type Buttons */}
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">نوع الغرفة</label>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Public Button */}
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`group relative p-3 sm:p-6 rounded-2xl border-2 transition-all duration-300 ${
                  !isPrivate
                    ? 'bg-gradient-to-br from-game-green/30 to-emerald-500/30 border-game-green/50 shadow-lg shadow-game-green/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <span className="text-2xl sm:text-4xl">🌍</span>
                  <span className={`font-bold text-base sm:text-lg ${!isPrivate ? 'text-game-green' : 'text-white/70'}`}>
                    عامة
                  </span>
                  <span className={`text-xs sm:text-sm ${!isPrivate ? 'text-game-green/70' : 'text-white/60'}`}>
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
                className={`group relative p-3 sm:p-6 rounded-2xl border-2 transition-all duration-300 ${
                  isPrivate
                    ? 'bg-gradient-to-br from-game-orange/30 to-red-500/30 border-game-orange/50 shadow-lg shadow-game-orange/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <span className="text-2xl sm:text-4xl">🔒</span>
                  <span className={`font-bold text-base sm:text-lg ${isPrivate ? 'text-game-orange' : 'text-white/70'}`}>
                    خاصة
                  </span>
                  <span className={`text-xs sm:text-sm ${isPrivate ? 'text-game-orange/70' : 'text-white/60'}`}>
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

          {/* Topics Selection */}
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">
              اختر المواضيع (اختر 5 على الأقل)
              <span className="text-xs sm:text-sm block text-white/70 mt-1">
                Select topics ({selectedTopics.length}/5 minimum, maximum 8 topics)
              </span>
            </label>
            
            <div className="bg-white/5 rounded-2xl p-4 max-h-60 overflow-y-auto border border-white/10">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {availableTopics.map((topic, index) => (
                  <div
                    key={index}
                    onClick={() => toggleTopicSelection(topic)}
                    className={`relative p-3 sm:p-5 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                      selectedTopics.includes(topic)
                        ? 'bg-game-yellow/20 border-game-yellow shadow-lg shadow-game-yellow/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className={`font-semibold text-center block text-xs sm:text-base ${
                      selectedTopics.includes(topic) ? 'text-game-yellow' : 'text-white/90'
                    }`}>
                      {topic}
                    </span>
                    {selectedTopics.includes(topic) && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-game-yellow rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">عدد الجولات</label>
            <div className="flex gap-4">
              {roundOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRounds(option)}
                  className={`flex-1 px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 border-2 ${
                    rounds === option
                      ? 'bg-game-yellow/20 border-game-yellow text-game-yellow shadow-lg shadow-game-yellow/20'
                      : 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {option} جولات
                </button>
              ))}
            </div>
          </div>

          {/* Answer Timer Slider */}
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">
              وقت الإجابة على السؤال
              <span className="text-game-yellow font-bold ml-2">{timer} ثانية</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={timer}
                onChange={(e) => setTimer(Number(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to left, #FACC15 0%, #FACC15 ${((timer - 10) / 50) * 100}%, rgba(255,255,255,0.1) ${((timer - 10) / 50) * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <div className="flex justify-between text-white/70 text-xs sm:text-sm mt-2">
                <span>10 ثواني</span>
                <span>60 ثانية</span>
              </div>
            </div>
          </div>

          {/* Calculation Timer Slider */}
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">
              وقت حساب النتيجة
              <span className="text-game-orange font-bold ml-2">{calcTimer} ثانية</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={calcTimer}
                onChange={(e) => setCalcTimer(Number(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to left, #F97316 0%, #F97316 ${((calcTimer - 5) / 25) * 100}%, rgba(255,255,255,0.1) ${((calcTimer - 5) / 25) * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <div className="flex justify-between text-white/70 text-xs sm:text-sm mt-2">
                <span>5 ثواني</span>
                <span>30 ثانية</span>
              </div>
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
            className="w-full bg-gradient-to-r from-game-yellow to-game-orange hover:from-game-yellow hover:to-game-orange text-white font-bold py-4 sm:py-5 text-base sm:text-lg rounded-2xl transition-all duration-300 shadow-lg shadow-game-yellow/20 hover:shadow-game-yellow/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            إنشاء الغرفة
          </button>

          {/* Back to Lobby */}
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="w-full bg-white/5 hover:bg-white/10 text-white/90 font-bold py-3 sm:py-4 text-base sm:text-lg rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
          >
            رجوع
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateRoom
