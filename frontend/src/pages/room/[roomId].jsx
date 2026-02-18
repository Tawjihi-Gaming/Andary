import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { startConnection, stopConnection, getConnection } from '../../api/signalr'

const GameRoom = ({ user }) => {
    const { roomId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const code = location.state?.code
    const roomName = location.state?.roomName
    
    const [connectionStatus, setConnectionStatus] = useState('connecting')
    const [players, setPlayers] = useState([])
    const [gameState, setGameState] = useState(null)
    const [roomOwnerId, setRoomOwnerId] = useState(location.state?.ownerId)
    const [roomOwnerName, setRoomOwnerName] = useState(location.state?.ownerName)
    const [isReady, setIsReady] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
     const roomMockOwnerId = null// Mock owner ID for testing


    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(code)
            setIsCopied(true)
            // Reset after 2 seconds
            setTimeout(() => setIsCopied(false), 2000)
        } catch (error) {
            console.error('Error copying code:', error)
        }
    }

    

    const handleReadyUp = async () => {
        try {
            const connection = getConnection()
            await connection.invoke('ReadyUp', roomId, user?.id || -1)
            setIsReady(true)
        } catch (error) {
            console.error('Error readying up:', error)
            // Still set ready state locally even if backend call fails
            setIsReady(true)
        }
    }
    const startGame = async () => {
        try {
            const connection = getConnection()
            await connection.invoke('StartGame', roomId)
            navigate(`/game/${roomId}`, {
                state: {
                    user,
                    roomId,
                    code,
                    roomOwnerId,
                    roomOwnerName
                }
            })
        } catch (error) {
            console.error('Error starting game:', error)
        }
    }
    const handleBackToLobby = async () => {
        try {
            const connection = getConnection()
            
            // Notify backend that we're leaving (backend handles ownership transfer)
            await connection.invoke('LeaveRoom', roomId, user?.id || -1)
            
            // Stop SignalR connection
            await stopConnection()
            
            // Navigate back to lobby
            navigate('/lobby')
        } catch (error) {
            console.error('Error leaving room:', error)
            // Still navigate even if there's an error
            await stopConnection()
            navigate('/lobby')
        }
    }

    useEffect(() => {
        let connection = null

        const setupSignalR = async () => {
            try {
                // Start SignalR connection
                connection = await startConnection()
                setConnectionStatus('connected')

                // Register event handlers
                connection.on('PlayerConnected', (playerData) => {
                    console.log('Player joined:', playerData)
                    // Add new player to the list
                    setPlayers(prev => {
                        // Avoid duplicates
                        if (prev.some(p => p.id === playerData.id)) {
                            return prev
                        }
                        return [...prev, playerData]
                    })
                })

                connection.on('TopicSelected', (topic) => {
                    console.log('Topic selected:', topic)
                    setGameState(prev => ({ ...prev, topic }))
                })

                connection.on('GameStarted', (state) => {
                    console.log('Game started:', state)
                    setGameState(state)
                })

                connection.on('ShowChoices', (choices) => {
                    console.log('Answer choices:', choices)
                    setGameState(prev => ({ ...prev, choices }))
                })

                connection.on('RoundEnded', (state) => {
                    console.log('Round ended:', state)
                    setGameState(state)
                })

                connection.on('GameEnded', (state) => {
                    console.log('Game ended:', state)
                    setGameState(state)
                })

                connection.on('OwnershipTransferred', (data) => {
                    console.log('Ownership transferred:', data)
                    setRoomOwnerId(data.newOwnerId)
                    setRoomOwnerName(data.newOwnerName)
                    // Optionally show a notification
                    alert(data.message)
                })

                connection.on('PlayerLeft', (data) => {
                    console.log('Player left:', data)
                    // Remove player from the list
                    setPlayers(prev => prev.filter(p => p.id !== data.playerId))
                })

                connection.on('PlayerDisconnected', (data) => {
                    console.log('Player disconnected:', data)
                    // Remove disconnected player
                    setPlayers(prev => prev.filter(p => p.id !== data.playerId))
                })

                connection.on('RoomState', (state) => {
                    console.log('Room state received:', state)
                    setGameState(state)
                    // Update players list from room state if available
                    if (state.players) {
                        setPlayers(state.players)
                    }
                })

                connection.on('RoomClosed', (data) => {
                    console.log('Room closed:', data)
                    alert(`${data.message}\nReason: ${data.reason}`)
                    // Room is closed, navigate back to lobby
                    stopConnection()
                    navigate('/lobby')
                })

                connection.on('PlayerReady', (data) => {
                    console.log('Player ready:', data)
                    // Update player's ready status
                    setPlayers(prev => prev.map(p => 
                        p.id === data.playerId 
                            ? { ...p, isReady: true } 
                            : p
                    ))
                })

                // Connect to the room
               // await connection.invoke('ConnectToRoom', roomId, user?.id || -1)
                console.log('✅ Connected to room:', roomId)
                
                // Add current user to players list initially
                if (user) {
                    setPlayers([{ 
                        id: user.id, 
                        username: user.username, 
                        avatar: user.avatar,
                        isReady: false 
                    }])
                }

            } catch (err) {
                console.error('SignalR connection failed:', err)
                setConnectionStatus('error')
            }
        }

        setupSignalR()

        // Cleanup on unmount
        return () => {
            if (connection) {
                stopConnection()
            }
        }
    }, [roomId, user])
   
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] relative overflow-hidden flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-4 sm:p-8 w-full sm:w-3/4 max-w-6xl shadow-2xl border border-white/15">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white mb-2 text-center">{roomName}</h1>
                <p className="text-white/50 text-center mb-4 text-xs sm:text-sm">
                    Room ID: {roomId} | Code: {code || 'N/A'}
                </p>
                <p className="text-white/50 text-center mb-4 sm:mb-6 text-xs sm:text-sm">
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
                                key={player.id}
                                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-5 border-2 ${
                                    player.id === roomMockOwnerId 
                                        ? 'border-yellow-400/50 bg-yellow-500/10' 
                                        : player.isReady 
                                        ? 'border-green-400/50 bg-green-500/10'
                                        : 'border-white/20'
                                } transition-all duration-300`}
                            >
                                <div className="flex flex-col items-center gap-1 sm:gap-3">
                                    <span className="text-4xl sm:text-6xl">{player.avatar}</span>
                                    <p className="text-white text-xs sm:text-base font-semibold truncate w-full text-center">
                                        {player.username}
                                        {player.id === roomMockOwnerId && ' 👑'}
                                    </p>
                                    {player.isReady && player.id !== roomOwnerId && (
                                        <span className="text-green-400 text-xs sm:text-sm font-bold">✓ جاهز</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {
                    roomMockOwnerId === user?.id && (
                        <>
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
                            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
                                <p className="text-blue-400 font-bold text-sm sm:text-base">أنت صاحب الغرفة</p>
                                <p className="text-blue-300 text-xs sm:text-sm">يمكنك بدء اللعبة عندما يكون الجميع جاهزًا!</p>
                            </div>
                            <button
                                onClick={startGame}
                                className="mt-3 sm:mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300"
                            >
                                بدء اللعبة
                            </button>
                        </>
                    )
                }
                {
                    roomMockOwnerId !== user?.id && (
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
                                        onClick={() => setIsReady(false)}
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
                    className="mt-4 sm:mt-6 w-full bg-white/5 hover:bg-white/10 text-white/70 font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                    العودة للردهة
                </button>
            </div>
        </div>
    )
}

export default GameRoom