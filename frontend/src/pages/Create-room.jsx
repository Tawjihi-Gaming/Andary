import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/axios' 
import { saveRoomSession } from '../utils/roomSession'
import LegalFooter from '../components/LegalFooter'
import Navbar from '../components/Navbar'

const CreateRoom = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [topicsError, setTopicsError] = useState('')
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [availableTopics, setAvailableTopics] = useState([])
  const [timer, setTimer] = useState(30)
  const [rounds, setRounds] = useState(5)
  const navigate = useNavigate()
  const userAvatar = user?.avatarImageName || user?.avatar || ''

  // Fetch available topics from the backend
  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true)
      setTopicsError('')
      try {
        const res = await api.get('/room/topics')
        const normalizedTopics = Array.isArray(res.data)
          ? res.data
              .map((topic) => {
                if (typeof topic === 'string') return topic.trim()
                if (topic && typeof topic === 'object') {
                  return (topic.name || topic.topic || '').toString().trim()
                }
                return ''
              })
              .filter(Boolean)
          : []
        setAvailableTopics(normalizedTopics)

        if (normalizedTopics.length === 0) {
          setTopicsError('No topics found in database.')
        }
      } catch (err) {
        console.error('Error fetching topics:', err)
        setAvailableTopics([])
        const backendMsg = err?.response?.data?.details || err?.response?.data?.error || err?.message
        setTopicsError(`Failed to load topics from database. ${backendMsg || ''}`.trim())
      } finally {
        setTopicsLoading(false)
      }
    }
    fetchTopics()
  }, [])

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
    setError('')

    if (availableTopics.length === 0) {
      setError(t('createRoom.noTopicsError'))
      return
    }
    
    if (selectedTopics.length === 0) {
      setError(t('createRoom.selectTopicError'))
      return
    }
  
    if (selectedTopics.length > 8) {
      setError(t('createRoom.maxTopicsError'))
      return
    }

    try {
      const response = await api.post('/room/create', { 
        name: roomName,
        isPrivate: isPrivate,
        questions: rounds || 10, 
        playerName: user?.username || 'Guest',
        avatarImageName: userAvatar,
        playerId: user?.id || null,
        clientKey: user?.clientKey || null,
        selectedTopics: selectedTopics,
        answerTimeSeconds: timer,
      })
      console.log('Room created:', response.data)
      const { roomId, code, sessionId, playerName, answerTimeSeconds } = response.data
      const syncedTimer = Number(answerTimeSeconds) > 0 ? Number(answerTimeSeconds) : timer
      console.log('user room with ID:', user?.id, 'to room:', roomId)
      
     
      console.log('User joined room successfully')
      saveRoomSession({
        roomId,
        roomName: roomName || `Room ${roomId}`,
        code,
        isPrivate,
        sessionId,
        ownerId: sessionId,
        ownerName: playerName || user?.username || 'Guest',
        timer: syncedTimer,
        rounds,
      })

      navigate(`/room/${roomId}`, {
        state: { 
          user: user,
          roomId: roomId, 
          code: code,
          isPrivate: isPrivate,
          sessionId: sessionId,
          ownerId: sessionId,
          ownerName: playerName || user?.username || 'Guest',
          roomName: roomName || `Room ${roomId}`,
          timer: syncedTimer,
          answerTimeSeconds: syncedTimer,
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
    <div className="min-h-screen app-page-bg relative flex flex-col overflow-hidden">
      <div className="relative z-10">
        <Navbar user={user} onLogout={onLogout} />
      </div>
     <div className="flex-grow flex items-center justify-center px-4 py-8"> 
      <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 w-full sm:w-3/4 max-w-4xl shadow-2xl">
        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-game-yellow to-game-orange rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-game-yellow/20">
          <span className="text-2xl sm:text-4xl pt-2">➕</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 text-center">{t('createRoom.title')}</h1>
        <p className="text-white/80 text-center mb-5 sm:mb-8 text-base sm:text-lg">{t('createRoom.subtitle')}</p>
        
        <form onSubmit={handleCreateRoom} className="space-y-5">
          
          {/* Room Name Input */}
          <div>
            <label className="block text-white/90 font-semibold mb-2 text-base sm:text-lg">{t('createRoom.roomName')}</label>
            <input
              type="text"
              placeholder={t('createRoom.roomNamePlaceholder')}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-white/10 text-white text-base sm:text-lg placeholder:text-white/50 rounded-2xl py-3 px-4 sm:py-4 sm:px-6 border border-white/15 focus:border-game-yellow/50 focus:bg-white/15 focus:shadow-lg focus:shadow-game-yellow/10 transition-all duration-300 focus:outline-none"
              required
            />
          </div>

          {/* Room Type Buttons */}
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">{t('createRoom.roomType')}</label>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Public Button */}
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`group relative p-3 sm:p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  !isPrivate
                    ? 'bg-gradient-to-br from-game-green/30 to-emerald-500/30 border-game-green/50 shadow-lg shadow-game-green/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <span className="text-2xl sm:text-4xl">🌍</span>
                  <span className={`font-bold text-base sm:text-lg ${!isPrivate ? 'text-game-green' : 'text-white/70'}`}>
                    {t('createRoom.public')}
                  </span>
                  <span className={`text-xs sm:text-sm ${!isPrivate ? 'text-game-green/70' : 'text-white/60'}`}>
                    Public
                  </span>
                </div>
                {!isPrivate && (
                  <div className="absolute top-2 end-2 w-5 h-5 bg-game-green rounded-full flex items-center justify-center">
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
                className={`group relative p-3 sm:p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  isPrivate
                    ? 'bg-gradient-to-br from-game-orange/30 to-red-500/30 border-game-orange/50 shadow-lg shadow-game-orange/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <span className="text-2xl sm:text-4xl">🔒</span>
                  <span className={`font-bold text-base sm:text-lg ${isPrivate ? 'text-game-orange' : 'text-white/70'}`}>
                    {t('createRoom.private')}
                  </span>
                  <span className={`text-xs sm:text-sm ${isPrivate ? 'text-game-orange/70' : 'text-white/60'}`}>
                    Private
                  </span>
                </div>
                {isPrivate && (
                  <div className="absolute top-2 end-2 w-5 h-5 bg-game-orange rounded-full flex items-center justify-center">
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
              {t('createRoom.selectTopics')}
              <span className="text-xs sm:text-sm block text-white/70 mt-1">
                {t('createRoom.topicsCount', { count: selectedTopics.length })}
              </span>
            </label>
            
            <div className="bg-white/5 rounded-2xl p-4 max-h-60 overflow-y-auto border border-white/10">
              {topicsLoading ? (
                <p className="text-white/70 text-sm text-center py-6">{t('createRoom.loadingTopics')}</p>
              ) : topicsError ? (
                <p className="text-red-300 text-sm text-center py-6">{topicsError}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {availableTopics.map((topic, index) => (
                    <div
                      key={`${topic}-${index}`}
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
                        <div className="absolute top-2 end-2 w-5 h-5 bg-game-yellow rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">{t('createRoom.numberOfRounds')}</label>
            <div className="flex gap-4">
              {roundOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRounds(option)}
                  className={`flex-1 px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 border-2 cursor-pointer ${
                    rounds === option
                      ? 'bg-game-yellow/20 border-game-yellow text-game-yellow shadow-lg shadow-game-yellow/20'
                      : 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {option} {t('common.rounds')}
                </button>
              ))}
            </div>
          </div>

          {/* Answer Timer Slider */}
          <div>
            <label className="block font-semibold mb-3 text-base sm:text-lg" style={{ color: 'var(--app-text-soft)' }}>
              {t('createRoom.answerTime')}
              <span className="text-game-yellow font-bold ms-2">{timer} {t('common.second')}</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={timer}
                onChange={(e) => setTimer(Number(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(${isRTL ? 'to left' : 'to right'}, var(--color-game-yellow) 0%, var(--color-game-yellow) ${((timer - 10) / 110) * 100}%, var(--app-card-bg-strong) ${((timer - 10) / 110) * 100}%, var(--app-card-bg-strong) 100%)`
                }}
              />
              <div className="flex justify-between text-xs sm:text-sm mt-2" style={{ color: 'var(--app-text-muted)' }}>
                <span>10 {t('common.seconds')}</span>
                <span>120 {t('common.seconds')}</span>
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
            className="w-full cursor-pointer bg-gradient-to-r from-game-yellow to-game-orange hover:from-game-yellow hover:to-game-orange text-white font-bold py-4 sm:py-5 text-base sm:text-lg rounded-2xl transition-all duration-300 shadow-lg shadow-game-yellow/20 hover:shadow-game-yellow/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t('createRoom.createButton')}
          </button>

          {/* Back to Lobby */}
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="w-full bg-white/5 hover:bg-white/10 text-white/90 font-bold py-3 sm:py-4 text-base sm:text-lg rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
          >
            {t('common.back')}
          </button>
        </form>
        <div className="w-full sm:w-3/4 max-w-4xl mx-auto mt-6 pb-6">
          <LegalFooter />
        </div>
      </div>
      </div>
    </div>
  )
}

export default CreateRoom
