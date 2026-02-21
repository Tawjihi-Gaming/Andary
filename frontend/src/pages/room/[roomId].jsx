import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSignalR } from '../../context/SignalRContext'

const GameRoom = ({ user }) => {
    const { roomId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { startConnection, stopConnection, getConnection } = useSignalR()
    const code = location.state?.code
    const isPrivateRoom = Boolean(location.state?.isPrivate)
    const roomName = location.state?.roomName
    const sessionId = location.state?.sessionId
    const timer = location.state?.timer || 30
    const calcTimer = location.state?.calcTimer || 20
    const rounds = location.state?.rounds || 5

    const [connectionStatus, setConnectionStatus] = useState('connecting')
    const [players, setPlayers] = useState([])
    const [gameState, setGameState] = useState(null)
    const [roomOwnerId, setRoomOwnerId] = useState(location.state?.ownerId)
    const [roomOwnerName, setRoomOwnerName] = useState(location.state?.ownerName)
    const [isReady, setIsReady] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

    // The current user is the owner if their sessionId matches the room owner
    const isOwner = sessionId && sessionId === roomOwnerId
    const roomTypeLabel = isPrivateRoom ? 'خاصة' : 'عامة'
    const displayedCode = isPrivateRoom && !isOwner ? 'Hidden' : (code || 'N/A')
    const canCopyCode = Boolean(code) && (!isPrivateRoom || isOwner)

    // Check if all non-owner players are ready and there's at least one other player
    const allPlayersReady = players.length > 1 && players
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
            await stopConnection()
            navigate('/lobby')
        } catch (error) {
            console.error('Error leaving room:', error)
            await stopConnection()
            navigate('/lobby')
        }
    }

    useEffect(() => {
        if (!sessionId) {
            console.error('No sessionId found — cannot connect to room')
            navigate('/lobby')
            return
        }

        let connection = null

        const setupSignalR = async () => {
            try {
                connection = await startConnection()
                setConnectionStatus('connected')

                // Player joined notification
                connection.on('PlayerConnected', (playerName) => {
                    console.log('Player joined:', playerName)
                })

                // Lobby state updated (player list with ready status)
                connection.on('LobbyUpdated', (lobbyState) => {
                    console.log('Lobby updated:', lobbyState)
                    setPlayers(lobbyState.map(p => ({
                        avatarUrl: p.avatarUrl,
                        sessionId: p.sessionId,
                        name: p.name,
                        isReady: p.isReady
                    })))
                })

                // All players ready
                connection.on('AllPlayersReady', () => {
                    console.log('All players ready!')
                })

                // Game started
                connection.on('GameStarted', (state) => {
                    console.log('Game started:', state)
                    setGameState(state)
                    navigate(`/game/${roomId}`, {
                        state: {
                            ...location.state,  // passes timer, calcTimer, rounds, sessionId, user etc.
                            gameState: state,
                        }
                    })
                })

                // Choose round topic
                connection.on('ChooseRoundTopic', (state) => {
                    console.log('Choose round topic:', state)
                    setGameState(state)
                    navigate(`/game/${roomId}`, {
                        state: { user, roomId, code, sessionId, gameState: state }
                    })
                })

                // Show answer choices
                connection.on('ShowChoices', (choices) => {
                    console.log('Answer choices:', choices)
                    setGameState(prev => ({ ...prev, choices }))
                })

                // Round ended
                connection.on('RoundEnded', (state) => {
                    console.log('Round ended:', state)
                    setGameState(state)
                })

                // Game ended
                connection.on('GameEnded', (state) => {
                    console.log('Game ended:', state)
                    setGameState(state)
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
                    setPlayers(prev => prev.filter(p => p.sessionId !== data.sessionId))
                })

                // Room state
                connection.on('RoomState', (state) => {
                    console.log('Room state received:', state)
                    setGameState(state)
                    if (state.players) {
                        setPlayers(state.players)
                    }
                })

                // Room closed
                connection.on('RoomClosed', (data) => {
                    console.log('Room closed:', data)
                    alert(`${data.message}\nReason: ${data.reason}`)
                    stopConnection()
                    navigate('/lobby')
                })

                // Connect to room using sessionId
                await connection.invoke('ConnectToRoom', roomId, sessionId)
                console.log('✅ Connected to room:', roomId, 'with session:', sessionId)


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
                conn.off('PlayerConnected')
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
                conn.off('RoomClosed')
            }
        }
    }, [roomId, sessionId])
   
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] relative overflow-hidden flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-4 sm:p-8 w-full sm:w-3/4 max-w-6xl shadow-2xl border border-white/15">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white mb-2 text-center">{roomName}</h1>
                <p className="text-white/80 text-center mb-4 text-xs sm:text-sm">
                    النوع: {roomTypeLabel}
                </p>
                <p className="text-white/80 text-center mb-4 sm:mb-6 text-xs sm:text-sm">
                    {roomOwnerName ? `صاحب الغرفة: ${roomOwnerName}` : 'صاحب الغرفة غير معروف'}
                </p>
                
                {/* Connection Status */}
                <div className="mb-4 sm:mb-6 flex justify-center">
                    <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${
                        connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                        connectionStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                        {connectionStatus === 'connected' ? '🟢 متصل' : 
                         connectionStatus === 'error' ? '🔴 خطأ في الاتصال' : 
                         '🟡 جاري الاتصال...'}
                    </span>
                </div>

                {/* Players List */}
                <div className="mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-4 text-center">اللاعبون ({players.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 max-h-64 overflow-y-auto">
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
                                    <span className="text-4xl sm:text-6xl">👤</span>
                                    <p className="text-white text-xs sm:text-base font-semibold truncate w-full text-center">
                                        {player.name}
                                        {player.sessionId === roomOwnerId && ' 👑'}
                                    </p>
                                    {player.isReady && player.sessionId !== roomOwnerId && (
                                        <span className="text-green-400 text-xs sm:text-sm font-bold">✓ جاهز</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {canCopyCode && (
                    <button
                        onClick={handleCopyCode}
                        className="mt-4 sm:mt-6 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        {isCopied ? (
                            <>
                                <span>✓</span>
                                <span>تم النسخ!</span>
                            </>
                        ) : (
                            <>
                                <span>📋</span>
                                <span>نسخ كود الغرفة: {code}</span>
                            </>
                        )}
                    </button>
                )}

                {
                    isOwner && (
                        <>
                            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
                                <p className="text-blue-400 font-bold text-sm sm:text-base">أنت صاحب الغرفة</p>
                                <p className="text-blue-300 text-xs sm:text-sm">يمكنك بدء اللعبة عندما يكون الجميع جاهزًا!</p>
                            </div>
                            <button
                                onClick={startGame}
                                disabled={!allPlayersReady}
                                className={`mt-3 sm:mt-4 w-full font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 ${
                                    allPlayersReady
                                        ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                                        : 'bg-gray-500/30 text-white/40 cursor-not-allowed'
                                }`}
                            >
                                {allPlayersReady ? 'بدء اللعبة' : 'في انتظار جاهزية جميع اللاعبين...'}
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
                                    className="mt-3 sm:mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300"
                                >
                                    جاهز
                                </button>
                            ) : (
                                <>
                                    <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
                                        <p className="text-green-400 font-bold text-base sm:text-lg">✓ أنت جاهز!</p>
                                        <p className="text-green-300 text-xs sm:text-sm mt-1 sm:mt-2">في انتظار صاحب الغرفة لبدء اللعبة...</p>
                                    </div>
                                    <button
                                        onClick={handleUnready}
                                        className="mt-3 sm:mt-4 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 text-sm sm:text-base rounded-2xl transition-all duration-300 border border-red-500/30"
                                    >
                                        إلغاء الجاهزية
                                    </button>
                                </>
                            )}
                        </>
                    )

                }

                {/* Back Button */}
                <button
                    onClick={handleBackToLobby}
                    className="mt-4 sm:mt-6 w-full bg-white/5 hover:bg-white/10 text-white/90 font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                    العودة للردهة
                </button>
            </div>
        </div>
    )
}

export default GameRoom
