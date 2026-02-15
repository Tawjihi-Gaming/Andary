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

                // Connect to the room
                await connection.invoke('ConnectToRoom', roomId, user?.username || 'Guest')
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

                {/* Back Button */}
                <button
                    onClick={() => navigate('/lobby')}
                    className="mt-6 w-full bg-white/5 hover:bg-white/10 text-white/70 font-bold py-3 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                    العودة للردهة
                </button>
            </div>
        </div>
    )
}

export default GameRoom