import { useState } from 'react'

const TestRoom = () => {
    // Mock data
    const mockUser = {
        id: 1,
        username: 'محمد',
        avatar: '🎮'
    }
    
    const mockRoomId = '12345'
    const mockCode = 'ABC123'
    const mockRoomOwnerId = 1
    
    // Mock players list
    const [players, setPlayers] = useState([
        { id: 1, username: 'محمد', avatar: '🎮', isReady: false }, // Owner
        { id: 2, username: 'أحمد', avatar: '🦁', isReady: true },
        { id: 3, username: 'فاطمة', avatar: '🌸', isReady: true },
        { id: 4, username: 'علي', avatar: '⚡', isReady: false },
    ])
    
    const [isCopied, setIsCopied] = useState(false)

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(mockCode)
            setIsCopied(true)
            console.log('✅ Code copied:', mockCode)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (error) {
            console.error('Error copying code:', error)
            alert('Failed to copy. Error: ' + error.message)
        }
    }

    const addPlayer = () => {
        const newPlayer = {
            id: players.length + 1,
            username: `لاعب ${players.length + 1}`,
            avatar: ['🐱', '🐶', '🐼', '🦊', '🐯'][Math.floor(Math.random() * 5)],
            isReady: false
        }
        setPlayers([...players, newPlayer])
    }

    const removePlayer = () => {
        if (players.length > 1) {
            setPlayers(players.slice(0, -1))
        }
    }

    const toggleReady = (playerId) => {
        setPlayers(players.map(p => 
            p.id === playerId ? { ...p, isReady: !p.isReady } : p
        ))
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] relative overflow-hidden flex items-center justify-center p-6">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-3/4 max-w-6xl shadow-2xl border border-white/15">
                <h1 className="text-3xl font-extrabold text-white mb-2 text-center">اختبار غرفة اللعب</h1>
                <p className="text-white/50 text-center mb-4">
                    Room ID: {mockRoomId} | Code: {mockCode}
                </p>
                <p className="text-white/50 text-center mb-6">
                    صاحب الغرفة: {mockUser.username}
                </p>

                {/* Players List */}
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-4 text-center">اللاعبون ({players.length})</h3>
                    <div className="grid grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                        {players.map((player) => (
                            <div 
                                key={player.id}
                                onClick={() => player.id !== mockRoomOwnerId && toggleReady(player.id)}
                                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-5 border-2 ${
                                    player.id === mockRoomOwnerId 
                                        ? 'border-yellow-400/50 bg-yellow-500/10' 
                                        : player.isReady 
                                        ? 'border-green-400/50 bg-green-500/10'
                                        : 'border-white/20'
                                } transition-all duration-300 cursor-pointer hover:scale-105`}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-6xl">{player.avatar}</span>
                                    <p className="text-white text-base font-semibold truncate w-full text-center">
                                        {player.username}
                                        {player.id === mockRoomOwnerId && ' 👑'}
                                    </p>
                                    {player.isReady && player.id !== mockRoomOwnerId && (
                                        <span className="text-green-400 text-sm font-bold">✓ جاهز</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Copy Code Button */}
                <button
                    onClick={handleCopyCode}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                    {isCopied ? (
                        <>
                            <span>✓</span>
                            <span>تم النسخ!</span>
                        </>
                    ) : (
                        <>
                            <span>📋</span>
                            <span>نسخ كود الغرفة: {mockCode}</span>
                        </>
                    )}
                </button>

                {/* Test Controls */}
                <div className="mt-6 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <p className="text-purple-400 font-bold mb-3 text-center">أدوات الاختبار:</p>
                    <div className="flex gap-2">
                        <button
                            onClick={addPlayer}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-2 rounded-lg transition-all border border-green-500/30"
                        >
                            ➕ إضافة لاعب
                        </button>
                        <button
                            onClick={removePlayer}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 rounded-lg transition-all border border-red-500/30"
                        >
                            ➖ حذف لاعب
                        </button>
                    </div>
                    <p className="text-purple-300 text-xs mt-3 text-center">
                        اضغط على اللاعبين لتغيير حالة الجاهزية
                    </p>
                </div>

                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
                    <p className="text-blue-300 text-sm">
                        👑 = صاحب الغرفة | 🟢 = جاهز
                    </p>
                </div>
            </div>
        </div>
    )
}

export default TestRoom
