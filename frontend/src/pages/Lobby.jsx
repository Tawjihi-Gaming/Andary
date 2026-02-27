import { useNavigate } from 'react-router-dom'
import { useState, useEffect,useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import { saveRoomSession } from '../utils/roomSession'
import LegalFooter from '../components/LegalFooter'
import Navbar from '../components/Navbar.jsx'
import GamePopup from '../components/GamePopup'

const Lobby = ({ user, onLogout }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [lobbies, setLobbies] = useState([])
  const [lobbiesLoading, setLobbiesLoading] = useState(true)
  const userAvatar = user?.avatarImageName || user?.avatar || ''

  const fetchRoomOwnerInfo = async (joinedRoomId) => {
    try {
      const roomResponse = await api.get(`/room/${joinedRoomId}`)
      const roomData = roomResponse?.data || {}
      const ownerId = roomData?.ownerSessionId || null
      const ownerPlayer = (roomData?.players || []).find((p) => p?.sessionId === ownerId)
      return {
        ownerId,
        ownerName: ownerPlayer?.name || null,
      }
    } catch (error) {
      console.error('Error fetching owner info:', error)
      return {
        ownerId: null,
        ownerName: null,
      }
    }
  }

  const firstLoadRef = useRef(true);

  useEffect(() => {
    let isMounted = true;
    const onBeforeUnload = () => { isMounted = false; };
    window.addEventListener('beforeunload', onBeforeUnload);

    const fetchLobbies = async () => {
      try {
        const response = await api.get('/room/lobbies', {
          params: { wait: firstLoadRef.current ? false : true },
        });

        // mark that first load has completed (use ref so effect doesn't re-run)
        firstLoadRef.current = false;

        if (response.status === 204) {
          // server says "no change" -> don't mutate current lobbies
        } else {
          const list = Array.isArray(response.data) ? response.data : [];
          if (isMounted) {
            // replace state with server payload (empty array clears all rooms)
            setLobbies(list);
          }
        }
      } catch (error) {
        // ignore aborts/cancels, log others
        const isAbort =
          error?.name === 'CanceledError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message?.toLowerCase()?.includes('aborted');
        if (!isAbort) console.error('Error fetching lobbies:', error);
      } finally {
        if (isMounted) {
          setLobbiesLoading(false);
          // schedule next long-poll only while mounted
          setTimeout(() => { if (isMounted) fetchLobbies(); }, 300);
        }
      }
    };

    fetchLobbies();
    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const handleJoinLobby = async (roomId) => {
    setJoinError('')
    try {
      const response = await api.post('/room/join', {
        roomId: roomId,
        playerId: user?.id || null,
        playerName: user?.username || 'Guest',
        avatarImageName: userAvatar,
        clientKey: user?.clientKey || null,
      })
      console.log('Joined room:', response.data)
      const { roomId: joinedRoomId, code, sessionId, isPrivate, name, answerTimeSeconds } = response.data
      const { ownerId, ownerName } = await fetchRoomOwnerInfo(joinedRoomId)
      saveRoomSession({
        roomId: joinedRoomId,
        roomName: name,
        code,
        isPrivate,
        sessionId,
        ownerId,
        ownerName,
        timer: answerTimeSeconds || 30,
        answerTimeSeconds: answerTimeSeconds || 30,
      })
      navigate(`/room/${joinedRoomId}`, {
        state: {
          user: user,
          roomId: joinedRoomId,
          roomName: name,
          code: code,
          isPrivate: isPrivate,
          sessionId: sessionId,
          ownerId,
          ownerName,
          timer: answerTimeSeconds || 30,
          answerTimeSeconds: answerTimeSeconds || 30,
        }
      })
    } catch (err) {
      if (err?.response?.status === 404) {
        setJoinError(t('lobby.roomNotFound'))
      } else if (err?.response?.data?.error?.toLowerCase()?.includes('full')) {
        setJoinError(t('lobby.roomFullError'))
      } else {
        setJoinError(err?.response?.data?.error || t('lobby.unableToJoin'))
      }
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
    if (!/^\d{6}$/.test(normalizedCode)) {
      setJoinError(t('lobby.invalidCode'))
      return
    }
    if (normalizedCode) {
      setJoinError('')
      try {
        const response = await api.post('/room/join', {
          code: normalizedCode,
          playerId: user?.id || null,
          playerName: user?.username || 'Guest',
          avatarImageName: userAvatar,
          clientKey: user?.clientKey || null,
        })
        console.log('Joined room:', response.data)
        setShowJoinModal(false)
        setRoomCode('')
        const { roomId, code, sessionId, isPrivate, name, answerTimeSeconds } = response.data
        const { ownerId, ownerName } = await fetchRoomOwnerInfo(roomId)
        saveRoomSession({
          roomId,
          roomName: name,
          code,
          isPrivate,
          sessionId,
          ownerId,
          ownerName,
          timer: answerTimeSeconds || 30,
          answerTimeSeconds: answerTimeSeconds || 30,
        })
        navigate(`/room/${roomId}`, {
          state: {
            code: code,
            isPrivate: isPrivate,
            sessionId: sessionId,
            ownerId,
            ownerName,
            user: user,
            roomId: roomId,
            roomName: name,
            timer: answerTimeSeconds || 30,
            answerTimeSeconds: answerTimeSeconds || 30,
          }
        })
      } catch (err) {
        //console.error('Error joining room:', err)
        if (err?.response?.data?.error?.toLowerCase()?.includes('full')) {
          setJoinError(t('lobby.roomFullError'))
        } else if (err?.response?.status === 404) {
          setJoinError(t('lobby.roomNotFound'))
        } else if (err?.response?.data?.error?.toLowerCase()?.includes('code')) {
          setJoinError(t('lobby.roomCodeError'))
        } else {
          setJoinError(err?.response?.data?.error || t('lobby.unableToJoin'))
        }
      }
    }
  }

  return (
    <div className="min-h-screen app-page-bg relative overflow-hidden">

      {/* Navbar */}
      <Navbar user={user} onLogout={onLogout} />
      {/* main content */}
      <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-6">
        {/* welcome section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-2">
            {t('lobby.welcome')} <span className="text-game-yellow">{user?.username || 'Player'}</span> 👋
          </h2>
          <p className="text-white/50 text-base sm:text-lg">{t('lobby.subtitle')}</p>
        </div>

        {/* action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 ">
          {/* create room card */}
          <button
            onClick={handleCreateRoom}
            className="group relative bg-linear-to-br from-game-yellow/20 to-game-orange/20 hover:from-game-yellow/30 hover:to-game-orange/30 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-game-yellow/30 hover:border-game-yellow/50 transition-all cursor-pointer duration-300 text-start overflow-hidden"
          >
            <div className="absolute top-0 end-0 w-32 h-32 bg-game-yellow/10 rounded-full blur-2xl -translate-y-8 ltr:translate-x-8 rtl:-translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-game-yellow to-game-orange rounded-2xl flex items-center justify-center shadow-lg shadow-game-yellow/20 group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl pt-2">➕</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{t('lobby.createRoom')}</h3>
                <p className="text-white/50 text-xs sm:text-sm">{t('lobby.createRoomSub')}</p>
              </div>
            </div>
          </button>

          {/* join by code card */}
          <button
            onClick={handleJoinByCode}
            className="group relative bg-linear-to-br from-game-cyan/20 to-game-blue/20 hover:from-game-cyan/30 hover:to-game-blue/30 backdrop-blur-xl p-4 sm:p-6 rounded-2xl cursor-pointer border border-game-cyan/30 hover:border-game-cyan/50 transition-all duration-300 text-start overflow-hidden"
          >
            <div className="absolute top-0 end-0 w-32 h-32 bg-game-cyan/10 rounded-full blur-2xl -translate-y-8 ltr:translate-x-8 rtl:-translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-game-cyan to-game-blue rounded-2xl flex items-center justify-center shadow-lg shadow-game-cyan/20 group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl pt-2">🔗</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{t('lobby.joinByCode')}</h3>
                <p className="text-white/50 text-xs sm:text-sm">{t('lobby.joinByCodeSub')}</p>
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
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
              {t('lobby.availableRooms')}
              <span className="text-sm font-medium bg-white/10 text-white/60 px-3 py-1 rounded-full">{lobbies.length} {t('lobby.lobbies')}</span>
            </h2>
          </div>

          {lobbiesLoading ? (
            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 text-white/60">
              {t('lobby.loadingRooms')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lobbies.map((lobby) => {
                const isFull = lobby.players >= lobby.maxPlayers
                const fillPercent = lobby.maxPlayers > 0 ? (lobby.players / lobby.maxPlayers) * 100 : 0

                return (
                  <div
                    key={lobby.roomId || lobby.id}
                    className="group bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all duration-300"
                  >
                    {/* header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-game-yellow transition-colors">{lobby.name}</h3>
                        <span className="text-white/40 text-sm">{lobby.topic}</span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-game-green/20 text-game-green border border-game-green/30">
                        🟢 {t('lobby.waiting')}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-white/55">{t('lobby.roomCode')}</span>
                      <span className="text-white font-bold tracking-widest">{lobby.code || 'N/A'}</span>
                    </div>

                    {/* player count bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/50 text-sm">{t('lobby.players')}</span>
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
                      className={`w-full font-bold py-3 rounded-xl transition-all duration-300  ${
                        isFull
                          ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
                          : 'bg-linear-to-r from-game-green to-emerald-500 hover:from-game-green hover:to-emerald-400 cursor-pointer text-white shadow-lg shadow-game-green/20 shadow-game-green/30 scale-[1.02] active:scale-[0.98]'
                      }`}
                      disabled={isFull}
                    >
                      {isFull ? t('lobby.roomFull') : t('lobby.joinNow')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!lobbiesLoading && lobbies.length === 0 && (
            <div className="text-center py-10 sm:py-16 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-4xl sm:text-6xl mb-4 block">🏠</span>
              <p className="text-white/50 text-lg sm:text-xl mb-2">{t('lobby.noRooms')}</p>
              <p className="text-white/30">{t('lobby.noRoomsSub')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6">
        <LegalFooter />
      </div>

      {/* join by code modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="app-modal-card backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-linear-to-br from-game-cyan to-game-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-game-cyan/20">
              <span className="text-3xl">🔗</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              {t('lobby.joinByCode')}
            </h2>
            <p className="text-white/50 text-center mb-6">
              {t('lobby.enterCode')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleJoinSubmit}
                disabled={!roomCode.trim()}
                className="flex-1 bg-linear-to-r from-game-cyan to-game-blue hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-game-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {t('common.join')}
              </button>
            </div>
          </div>
        </div>
      )}
      <GamePopup
        open={!!joinError}
        title={t('lobby.errorTitle')}
        message={joinError}
        confirmText={t('lobby.ok')}
        showCancel={false}
        onConfirm={() => setJoinError('')}
      />
    </div>
  )
}

export default Lobby
