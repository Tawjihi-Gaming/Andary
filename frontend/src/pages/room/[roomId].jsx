import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { startConnection, stopConnection, getConnection } from '../../api/signalr'

const GameRoom = ({ user }) => {
    const { roomId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const code = location.state?.code
    
    const [connectionStatus, setConnectionStatus] = useState('connecting')
    const [players, setPlayers] = useState([])
    const [gameState, setGameState] = useState(null)
    const [roomOwnerId, setRoomOwnerId] = useState(location.state?.ownerId)
    const [roomOwnerName, setRoomOwnerName] = useState(location.state?.ownerName)
    const [isReady, setIsReady] = useState(false)


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
                connection.on('PlayerConnected', (playerName) => {
                    console.log('Player joined:', playerName)
                    // You can update players list here
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
                    // Update players count or list
                    // You can show a notification that a player left
                })

                connection.on('PlayerDisconnected', (data) => {
                    console.log('Player disconnected:', data)
                    // Handle unexpected disconnection
                })

                connection.on('RoomState', (state) => {
                    console.log('Room state received:', state)
                    setGameState(state)
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
                    // Update players list or show notification
                })

                // Connect to the room
               // await connection.invoke('ConnectToRoom', roomId, user?.id || -1)
                console.log('✅ Connected to room:', roomId)

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
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] relative overflow-hidden flex items-center justify-center p-6">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/15">
                <h1 className="text-3xl font-extrabold text-white mb-2 text-center">غرفة اللعب</h1>
                <p className="text-white/50 text-center mb-4">
                    Room ID: {roomId} | Code: {code || 'N/A'}
                </p>
                <p className="text-white/50 text-center mb-6">
                    {roomOwnerName ? `صاحب الغرفة: ${roomOwnerName}` : 'صاحب الغرفة غير معروف'}
                </p>
                
                {/* Connection Status */}
                <div className="mb-6 flex justify-center">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                        connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                        connectionStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                        {connectionStatus === 'connected' ? '🟢 متصل' : 
                         connectionStatus === 'error' ? '🔴 خطأ في الاتصال' : 
                         '🟡 جاري الاتصال...'}
                    </span>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <span className="text-5xl">{user?.avatar}</span>
                    <h2 className="text-xl font-bold text-white">{user?.username}</h2>
                </div>
                {
                    roomOwnerId === user?.id && (
                        <>
                            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
                                <p className="text-blue-400 font-bold">أنت صاحب الغرفة</p>
                                <p className="text-blue-300 text-sm">يمكنك بدء اللعبة عندما يكون الجميع جاهزًا!</p>
                            </div>
                            <button
                                onClick={startGame}
                                className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-2xl transition-all duration-300"
                            >
                                بدء اللعبة
                            </button>
                        </>
                    )
                }
                {
                    roomOwnerId !== user?.id && (
                        <>
                            {!isReady ? (
                                <button
                                    onClick={handleReadyUp}
                                    className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition-all duration-300"
                                >
                                    جاهز
                                </button>
                            ) : (
                                <>
                                    <div className="mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
                                        <p className="text-green-400 font-bold text-lg">✓ أنت جاهز!</p>
                                        <p className="text-green-300 text-sm mt-2">في انتظار صاحب الغرفة لبدء اللعبة...</p>
                                    </div>
                                    <button
                                        onClick={() => setIsReady(false)}
                                        className="mt-4 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 rounded-2xl transition-all duration-300 border border-red-500/30"
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
                    className="mt-6 w-full bg-white/5 hover:bg-white/10 text-white/70 font-bold py-3 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                    العودة للردهة
                </button>
            </div>
        </div>
    )
}

export default GameRoom