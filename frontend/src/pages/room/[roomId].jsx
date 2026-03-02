import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSignalR } from '../../context/SignalRContext'
import api from '../../api/axios'
import { loadRoomSession, saveRoomSession, clearRoomSession } from '../../utils/roomSession'
import GamePopup from '../../components/GamePopup'

const normalizePlayer = (player) => {
    const rawAvatar =
        player?.avatar ||
        player?.avatarImageName ||
        player?.avatarUrl ||
        player?.Avatar ||
        player?.AvatarImageName ||
        player?.AvatarUrl ||
        ''

    const legacyAvatarMap = {
        'avatar1.png': '🦊',
        'avatar2.png': '🐱',
    }

    const mappedAvatar = legacyAvatarMap[rawAvatar] || rawAvatar
    const normalizedAvatar = /\.(png|jpe?g|webp|gif|svg)$/i.test(mappedAvatar) ? '👤' : mappedAvatar

    return {
        avatar: normalizedAvatar,
        avatarUrl: normalizedAvatar,
        sessionId: player?.sessionId || player?.SessionId || '',
        name: player?.name || player?.displayName || player?.DisplayName || 'Player',
        isReady: Boolean(player?.isReady ?? player?.IsReady),
    }
}

const saveGameSessionSnapshot = ({ roomId, sessionId, user, state }) => {
    if (!roomId || !sessionId || !state) return
    localStorage.setItem('andary_game_session', JSON.stringify({
        roomId,
        sessionId,
        user,
        gameState: state,
    }))
}

const GameRoom = ({ user }) => {
    const { roomId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { startConnection, stopConnection, getConnection } = useSignalR()
    const savedRoomSession = loadRoomSession(roomId)
    const roomState = { ...(savedRoomSession || {}), ...(location.state || {}) }
    const code = roomState.code
    const isPrivateRoom = Boolean(roomState.isPrivate)
    const roomName = roomState.roomName || `Room ${roomId}`
    const sessionId = roomState.sessionId
    const timer = roomState.timer || roomState.answerTimeSeconds || 30
    const rounds = roomState.rounds || 5

    const [connectionStatus, setConnectionStatus] = useState('connecting')
    const [players, setPlayers] = useState([])
    const [roomOwnerId, setRoomOwnerId] = useState(roomState.ownerId)
    const [roomOwnerName, setRoomOwnerName] = useState(roomState.ownerName)
    const [isReady, setIsReady] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [roomError, setRoomError] = useState('')
    const [closedRoomPopup, setClosedRoomPopup] = useState({
        open: false,
        message: '',
        reason: '',
    })

    // The current user is the owner if their sessionId matches the room owner
    const isOwner = sessionId && sessionId === roomOwnerId
    const roomTypeLabel = isPrivateRoom ? t('room.private') : t('room.public')
    const canCopyCode = Boolean(code) && (!isPrivateRoom || isOwner)

    // Need at least 2 players, and all non-owner players must be ready.
    const allPlayersReady = players.length >= 2 &&
        players
            .filter(p => p.sessionId !== roomOwnerId)
            .every(p => p.isReady)

    const handleCopyCode = async () => {
        if (!canCopyCode)
            return

        try {
            await navigator.clipboard.writeText(code)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (error) {
            console.error('Error copying code:', error)
        }
    }

    const handleReadyUp = async () => {
        try {
            const connection = getConnection()
            await connection.invoke('SetReady', roomId, sessionId, true)
            setIsReady(true)
        } catch (error) {
            console.error('Error readying up:', error)
        }
    }

    const handleUnready = async () => {
        try {
            const connection = getConnection()
            await connection.invoke('SetReady', roomId, sessionId, false)
            setIsReady(false)
        } catch (error) {
            console.error('Error unreadying:', error)
        }
    }

    const startGame = async () => {
        try {
            const connection = getConnection()
            await connection.invoke('StartGame', roomId, sessionId)
            // Don't navigate here — the 'GameStarted' event will handle navigation for all players
        } catch (error) {
            console.error('Error starting game:', error)
        }
    }


    const handleBackToLobby = async () => {
        try {
            
            const connection = getConnection()
            if (connection) {
                await connection.invoke('LeaveRoom', roomId, sessionId)
            }
            clearRoomSession()
            await stopConnection()
            navigate('/lobby')
        } catch (error) {
            console.error('Error leaving room:', error)
            clearRoomSession()
            await stopConnection()
            navigate('/lobby')
        }
    }

    useEffect(() => {
        if (!roomId || !sessionId) return
        saveRoomSession({
            roomId,
            code,
            isPrivate: isPrivateRoom,
            roomName,
            sessionId,
            ownerId: roomOwnerId,
            ownerName: roomOwnerName,
            timer,
            rounds,
        })
    }, [roomId, sessionId, code, isPrivateRoom, roomName, roomOwnerId, roomOwnerName, timer, rounds])

    useEffect(() => {
        if (!roomId) return

        const syncOwnerFromBackend = async () => {
            try {
                const response = await api.get(`/room/${roomId}`)
                const room = response?.data || {}
                const ownerId = room?.ownerSessionId || ''
                const owner = (room?.players || []).find((player) => player?.sessionId === ownerId)

                if (ownerId) {
                    setRoomOwnerId(ownerId)
                }
                if (owner?.name) {
                    setRoomOwnerName(owner.name)
                }
            } catch (error) {
                console.error('Failed to sync room owner:', error)
            }
        }

        syncOwnerFromBackend()
    }, [roomId])

    useEffect(() => {
        if (!sessionId) {
            console.error('No sessionId found — cannot connect to room')
            clearRoomSession()
            navigate('/lobby')
            return
        }

        let connection = null

        const setupSignalR = async () => {
            try {
                connection = await startConnection()
                setConnectionStatus('connected')

                // Lobby state updated (player list with ready status)
                connection.on('LobbyUpdated', (lobbyState) => {
                    console.log('Lobby updated:', lobbyState)
                    setPlayers((lobbyState || []).map(normalizePlayer))
                    const me = (lobbyState || []).find(p => p.sessionId === sessionId)
                    if (me) {
                        setIsReady(Boolean(me.isReady))
                    }
                })

                // All players ready
                connection.on('AllPlayersReady', () => {
                    console.log('All players ready!')
                })

                // Game started
                connection.on('GameStarted', (state) => {
                    console.log('Game started:', state)
                    saveGameSessionSnapshot({ roomId, sessionId, user, state })
                    const syncedTimer = state?.answerTimeSeconds || timer
                    navigate(`/game/${roomId}`, {
                        state: {
                            ...roomState,
                            timer: syncedTimer,
                            answerTimeSeconds: syncedTimer,
                            gameState: state,
                        }
                    })
                })

                // Choose round topic
                connection.on('ChooseRoundTopic', (state) => {
                    console.log('Choose round topic:', state)
                    saveGameSessionSnapshot({ roomId, sessionId, user, state })
                    const syncedTimer = state?.answerTimeSeconds || timer
                    navigate(`/game/${roomId}`, {
                        state: {
                            ...roomState,
                            user,
                            roomId,
                            code,
                            sessionId,
                            timer: syncedTimer,
                            answerTimeSeconds: syncedTimer,
                            gameState: state
                        }
                    })
                })

                // Show answer choices
                connection.on('ShowChoices', (payload) => {
                    const choices = Array.isArray(payload) ? payload : (payload?.choices || [])
                    console.log('Answer choices:', choices)
                })

                // Round ended
                connection.on('RoundEnded', (state) => {
                    console.log('Round ended:', state)
                })

                // Game ended
                connection.on('GameEnded', (state) => {
                    console.log('Game ended:', state)
                })

                // Ownership transferred
                connection.on('OwnershipTransferred', (data) => {
                    console.log('Ownership transferred:', data)
                    setRoomOwnerId(data.newOwnerSessionId)
                    setRoomOwnerName(data.newOwnerName)
                })

                // Player left
                connection.on('PlayerLeft', (data) => {
                    console.log('Player left:', data)
                    setPlayers(prev => prev.filter(p => p.sessionId !== data.sessionId))
                })

                // Player disconnected
                connection.on('PlayerDisconnected', (data) => {
                    console.log('Player disconnected:', data)
                    if (!data?.temporary) {
                        setPlayers(prev => prev.filter(p => p.sessionId !== data.sessionId))
                    }
                })

                // Room state
                connection.on('RoomState', (state) => {
                    console.log('Room state received:', state)
                    if (state?.ownerSessionId) {
                        setRoomOwnerId(state.ownerSessionId)
                    }
                    if (state?.ownerName) {
                        setRoomOwnerName(state.ownerName)
                    } else if (state?.ownerSessionId && Array.isArray(state.players)) {
                        const owner = state.players.find((player) => player?.sessionId === state.ownerSessionId)
                        if (owner?.name || owner?.displayName) {
                            setRoomOwnerName(owner.name || owner.displayName)
                        }
                    }
                    if (state.players) {
                        setPlayers(state.players.map(normalizePlayer))
                    }
                })

                connection.on('GameStateSync', (state) => {
                    // If the game has already started (phase is not Lobby),
                    // redirect the player to the game page instead of staying in the waiting room.
                    if (state?.phase && state.phase !== 'Lobby') {
                        console.log('Game already in progress — redirecting to game page. Phase:', state.phase)
                        saveGameSessionSnapshot({ roomId, sessionId, user, state })
                        const syncedTimer = state?.answerTimeSeconds || timer
                        navigate(`/game/${roomId}`, {
                            state: {
                                ...roomState,
                                user,
                                roomId,
                                code,
                                sessionId,
                                timer: syncedTimer,
                                answerTimeSeconds: syncedTimer,
                                gameState: state,
                            }
                        })
                        return
                    }
                    if (state?.players) {
                        setPlayers(state.players.map(normalizePlayer))
                    }
                })

                connection.on('TopicAddFailed', () => {
                    setRoomError(t('room.topicAddFailed'))
                })

                connection.on('GameError', () => {
                    setRoomError(t('room.gameStartError'))
                })

                connection.on('TopicSelectionFailed', () => {
                    setRoomError(t('room.topicSelectionFailed'))
                })

                // Room closed
                connection.on('RoomClosed', (data) => {
                    console.log('Room closed:', data)
                    setClosedRoomPopup({
                        open: true,
                        message: t('room.closedFallbackMessage'),
                        reason: data?.reason ? t('room.allPlayersLeft') : '',
                    })
                })

                connection.onreconnecting(() => {
                    setConnectionStatus('connecting')
                })

                connection.onreconnected(async () => {
                    try {
                        setConnectionStatus('connected')
                        await connection.invoke('RejoinRoom', roomId, sessionId)
                    } catch (error) {
                        console.error('Rejoin after reconnect failed:', error)
                    }
                })

                await connection.invoke('RejoinRoom', roomId, sessionId)
                console.log('✅ Connected/Rejoined room:', roomId, 'with session:', sessionId)


            } catch (err) {
                console.error('SignalR connection failed:', err)
                setConnectionStatus('error')
            }
        }

        setupSignalR()

        // Don't stop the connection on unmount — it stays alive for the game page
        return () => {
            const conn = getConnection()
            if (conn) {
                //conn.off('PlayerConnected')
                conn.off('LobbyUpdated')
                conn.off('AllPlayersReady')
                conn.off('GameStarted')
                conn.off('ChooseRoundTopic')
                conn.off('ShowChoices')
                conn.off('RoundEnded')
                conn.off('GameEnded')
                conn.off('OwnershipTransferred')
                conn.off('PlayerLeft')
                conn.off('PlayerDisconnected')
                conn.off('RoomState')
                conn.off('GameStateSync')
                conn.off('TopicAddFailed')
                conn.off('GameError')
                conn.off('TopicSelectionFailed')
                conn.off('RoomClosed')
            }
        }
    }, [roomId, sessionId])
   
    return (
        <div className="min-h-screen app-page-bg relative overflow-hidden flex items-center justify-center p-3 sm:p-6 lg:p-8">
            <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full sm:w-3/4 max-w-6xl 2xl:max-w-7xl shadow-2xl">
                <h1 className="text-xl sm:text-3xl xl:text-4xl font-extrabold text-white mb-2 text-center">{roomName}</h1>
                <p className="text-white/80 text-center mb-4 text-xs sm:text-sm">
                    {t('room.type')} {roomTypeLabel}
                </p>
                <p className="text-white/80 text-center mb-4 sm:mb-6 text-xs sm:text-sm">
                    {roomOwnerName ? t('room.roomOwner', { name: roomOwnerName }) : t('room.roomOwnerUnknown')}
                </p>
                
                {/* Connection Status */}
                <div className="mb-4 sm:mb-6 flex justify-center">
                    <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${
                        connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                        connectionStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                        {connectionStatus === 'connected' ? t('room.connected') : 
                         connectionStatus === 'error' ? t('room.connectionError') : 
                         t('room.connecting')}
                    </span>
                </div>

                {/* Room Error */}
                {roomError && (
                    <div className="mb-4 sm:mb-6 flex justify-center">
                        <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            ❌ {roomError}
                        </span>
                    </div>
                )}

                {/* Players List */}
                <div className="mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-2xl xl:text-3xl font-bold text-white mb-3 sm:mb-4 text-center">{t('room.playersCount', { count: players.length })}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4 lg:gap-5 max-h-64 lg:max-h-80 overflow-y-auto">
                        {players.map((player) => (
                            <div 
                                key={player.sessionId}
                                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-5 border-2 ${
                                    player.sessionId === roomOwnerId 
                                        ? 'border-yellow-400/50 bg-yellow-500/10' 
                                        : player.isReady 
                                        ? 'border-green-400/50 bg-green-500/10'
                                        : 'border-white/20'
                                } transition-all duration-300`}
                            >
                                <div className="flex flex-col items-center gap-1 sm:gap-3">
                                    <span className="text-4xl sm:text-6xl xl:text-7xl">{player?.avatar || '👤'}</span>
                                    <p className="text-white text-xs sm:text-base font-semibold truncate w-full text-center">
                                        {player.name}
                                        {player.sessionId === roomOwnerId && ' 👑'}
                                    </p>
                                    {player.isReady && player.sessionId !== roomOwnerId && (
                                        <span className="text-green-400 text-xs sm:text-sm font-bold">✓ {t('common.ready')}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {players.length < 2 && (
                        <p className="text-yellow-400/80 text-xs sm:text-sm text-center mt-3 animate-pulse">
                            ⚠️ {t('room.minimumPlayers')}
                        </p>
                    )}
                    {players.length >= 6 && (
                        <p className="text-red-400/80 text-xs sm:text-sm text-center mt-3 animate-pulse">
                            🚫 {t('room.roomIsFull')}
                        </p>
                    )}
                </div>

                {canCopyCode && (
                    <button
                        onClick={handleCopyCode}
                        className="mt-4 cursor-pointer sm:mt-6 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:text-yellow-100 font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        {isCopied ? (
                            <>
                                <span>✓</span>
                                <span>{t('room.copied')}</span>
                            </>
                        ) : (
                            <>
                                <span>📋</span>
                                <span>{t('room.copyRoomCode', { code })}</span>
                            </>
                        )}
                    </button>
                )}

                {
                    isOwner && (
                        <>
                            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
                                <p className="text-blue-400 font-bold text-sm sm:text-base">{t('room.youAreOwner')}</p>
                                <p className="text-blue-300 text-xs sm:text-sm">{t('room.ownerCanStart')}</p>
                            </div>
                            <button
                                onClick={startGame}
                                disabled={!allPlayersReady}
                                className={`mt-3 sm:mt-4 w-full font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 ${
                                    allPlayersReady
                                        ? 'bg-blue-500 hover:bg-blue-600 text-white hover:text-yellow-100 cursor-pointer'
                                        : 'bg-gray-500/30 text-white/40 cursor-not-allowed'
                                }`}
                            >
                                {allPlayersReady ? t('room.startGame') : t('room.waitingForPlayers')}
                            </button>
                        </>
                    )
                }
                {
                    !isOwner && (
                        <>
                            {!isReady ? (
                                <button
                                    onClick={handleReadyUp}
                                    className="mt-3 cursor-pointer sm:mt-4 w-full bg-green-500 hover:bg-green-600 text-white hover:text-yellow-100 font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300"
                                >
                                    {t('common.ready')}
                                </button>
                            ) : (
                                <>
                                    <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
                                        <p className="text-green-400 font-bold text-base sm:text-lg">{t('room.youAreReady')}</p>
                                        <p className="text-green-300 text-xs sm:text-sm mt-1 sm:mt-2">{t('room.waitingForOwner')}</p>
                                    </div>
                                    <button
                                        onClick={handleUnready}
                                        className="mt-3 cursor-pointer sm:mt-4 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 font-bold py-2 text-sm sm:text-base rounded-2xl transition-all duration-300 border border-red-500/30"
                                    >
                                        {t('room.cancelReady')}
                                    </button>
                                </>
                            )}
                        </>
                    )

                }

                {/* Back Button */}
                <button
                    onClick={handleBackToLobby}
                    className="mt-4 cursor-pointer sm:mt-6 w-full bg-white/5 hover:bg-white/10 text-white/90 hover:text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                    {t('room.backToLobby')}
                </button>
            </div>
            <GamePopup
                open={closedRoomPopup.open}
                title={t('room.closedTitle')}
                message={closedRoomPopup.reason
                    ? `${closedRoomPopup.message}\n${t('room.reasonPrefix')} ${closedRoomPopup.reason}`
                    : closedRoomPopup.message}
                confirmText={t('common.close')}
                onConfirm={async () => {
                    setClosedRoomPopup({ open: false, message: '', reason: '' })
                    clearRoomSession()
                    await stopConnection()
                    navigate('/lobby')
                }}
            />
        </div>
    )
}

export default GameRoom
