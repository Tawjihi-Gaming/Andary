import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useSignalR } from '../../context/SignalRContext'
import { getConnection as getSignalRConnection, startConnection } from '../../api/signalr'

const mapPhase = (backendPhase) => {
    switch (backendPhase) {
        case 'ChoosingRoundTopic': return 'topic-selection'
        case 'CollectingAns': return 'collecting-fakes'
        case 'ChoosingAns': return 'choosing-answer'
        case 'ShowingRanking': return 'round-result'
        case 'GameEnded': return 'finished'
        default: return 'topic-selection'
    }
}

// Save game session to localStorage so refresh doesn't lose it
const saveSession = (data) => {
    localStorage.setItem('andary_game_session', JSON.stringify(data))
}

const loadSession = () => {
    try {
        const data = localStorage.getItem('andary_game_session')
        return data ? JSON.parse(data) : null
    } catch { return null }
}

const clearSession = () => {
    localStorage.removeItem('andary_game_session')
}

const Game = () => {
    const { roomId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { stopConnection } = useSignalR()
    const connRef = useRef(null)
    const hasSetup = useRef(false)

    // Try location.state first, fall back to localStorage on refresh
    const savedSession = loadSession()
    const sessionId = location.state?.sessionId || savedSession?.sessionId
    const initialGameState = location.state?.gameState || savedSession?.gameState
    const user = location.state?.user || savedSession?.user

    const [phase, setPhase] = useState(initialGameState ? mapPhase(initialGameState.phase) : 'topic-selection')
    const [topics, setTopics] = useState(initialGameState?.selectedTopics || [])
    const [selectedTopic, setSelectedTopic] = useState(initialGameState?.currentRoundTopic || null)
    const [currentTurn, setCurrentTurn] = useState(initialGameState?.currentPlayerSessionId || null)
    const [players, setPlayers] = useState(initialGameState?.players || [])
    const [question, setQuestion] = useState(initialGameState?.currentQuestion?.questionText || null)
    const [choices, setChoices] = useState(initialGameState?.choices || [])
    const [scores, setScores] = useState(initialGameState?.scores || {})
    const [message, setMessage] = useState('')
    const [roundResult, setRoundResult] = useState(null)
    const [winner, setWinner] = useState(null)
    const [fakeAnswer, setFakeAnswer] = useState('')
    const [connectionReady, setConnectionReady] = useState(false)
    const [isReconnecting, setIsReconnecting] = useState(false)

    const isMyTurn = currentTurn === sessionId

    // Save session to localStorage whenever key data changes
    useEffect(() => {
        if (!sessionId || !roomId) return
        saveSession({
            sessionId,
            roomId,
            user,
            gameState: {
                phase: Object.entries({
                    'topic-selection': 'ChoosingRoundTopic',
                    'collecting-fakes': 'CollectingAns',
                    'choosing-answer': 'ChoosingAns',
                    'round-result': 'ShowingRanking',
                    'finished': 'GameEnded',
                }).find(([k]) => k === phase)?.[1] || 'ChoosingRoundTopic',
                selectedTopics: topics,
                currentRoundTopic: selectedTopic,
                currentPlayerSessionId: currentTurn,
                players,
                currentQuestion: question ? { questionText: question } : null,
                choices,
                scores,
            }
        })
    }, [phase, topics, selectedTopic, currentTurn, players, question, choices, scores])

    // Setup connection — handles both first load and page refresh
    useEffect(() => {
        if (hasSetup.current) return

        const setup = async () => {
            let conn = getSignalRConnection()

            // If no connection (page was refreshed), reconnect
            if (!conn || conn.state !== 'Connected') {
                if (!sessionId || !roomId) {
                    console.error('[Game] No session data — redirecting to lobby')
                    clearSession()
                    navigate('/lobby')
                    return
                }

                try {
                    setIsReconnecting(true)
                    console.log('[Game] Reconnecting to SignalR...')
                    conn = await startConnection(roomId, sessionId)

                    if (!conn || conn.state !== 'Connected') {
                        throw new Error('Failed to reconnect')
                    }

                    // Rejoin the room after reconnect
                    await conn.invoke('RejoinRoom', roomId, sessionId)
                    console.log('[Game] ✅ Rejoined room after refresh')
                    setIsReconnecting(false)
                } catch (err) {
                    console.error('[Game] Reconnect failed:', err)
                    clearSession()
                    navigate('/lobby')
                    return
                }
            }

            hasSetup.current = true
            connRef.current = conn

            // Register all event handlers
            conn.on('ChooseRoundTopic', (state) => {
                setPhase('topic-selection')
                setTopics(state.selectedTopics || [])
                setCurrentTurn(state.currentPlayerSessionId)
                if (state.players) setPlayers(state.players)
                if (state.scores) setScores(state.scores)
            })

            conn.on('GameStarted', (state) => {
                setPhase(mapPhase(state.phase))
                setSelectedTopic(state.currentRoundTopic)
                setCurrentTurn(state.currentPlayerSessionId)
                if (state.players) setPlayers(state.players)
                if (state.scores) setScores(state.scores)
                if (state.currentQuestion) setQuestion(state.currentQuestion.questionText)
                if (state.choices?.length > 0) setChoices(state.choices)
            })

            conn.on('ShowChoices', (data) => {
                setPhase('choosing-answer')
                setChoices(data)
            })

            conn.on('RoundEnded', (state) => {
                setPhase('round-result')
                setRoundResult(state)
                if (state.scores) setScores(state.scores)
                if (state.players) setPlayers(state.players)
            })

            conn.on('GameEnded', (state) => {
                setPhase('finished')
                clearSession() // Game over — clear saved session
                if (state.scores) setScores(state.scores)
                if (state.players) setPlayers(state.players)
                if (state.players?.length > 0) {
                    const topPlayer = state.players.reduce((best, p) =>
                        p.score > (best?.score || 0) ? p : best, state.players[0])
                    setWinner(topPlayer.displayName)
                }
            })

            conn.on('TurnChanged', (data) => {
                setCurrentTurn(data.currentPlayerSessionId)
            })

            // Server sends full current state on rejoin
            conn.on('GameStateSync', (state) => {
                console.log('[Game] State synced after reconnect:', state)
                setPhase(mapPhase(state.phase))
                setTopics(state.selectedTopics || [])
                setSelectedTopic(state.currentRoundTopic)
                setCurrentTurn(state.currentPlayerSessionId)
                if (state.players) setPlayers(state.players)
                if (state.scores) setScores(state.scores)
                if (state.currentQuestion) setQuestion(state.currentQuestion.questionText)
                if (state.choices?.length > 0) setChoices(state.choices)
            })

            setConnectionReady(true)
        }

        setup()

        return () => {
            hasSetup.current = false
            const conn = connRef.current
            if (conn) {
                conn.off('ChooseRoundTopic')
                conn.off('GameStarted')
                conn.off('ShowChoices')
                conn.off('RoundEnded')
                conn.off('GameEnded')
                conn.off('TurnChanged')
                conn.off('GameStateSync')
            }
        }
    }, [navigate])

    const handleTopicSelect = useCallback(async (topic) => {
        const conn = connRef.current
        if (!conn) return
        try {
            await conn.invoke('SelectRoundTopic', roomId, topic)
        } catch (error) {
            console.error('Error selecting topic:', error)
        }
    }, [roomId])

    const handleSubmitFake = useCallback(async () => {
        const conn = connRef.current
        if (!conn || !fakeAnswer.trim()) return
        try {
            await conn.invoke('SubmitFakeAnswer', roomId, fakeAnswer.trim())
            setFakeAnswer('')
            setMessage('تم إرسال إجابتك المزيفة!')
        } catch (error) {
            console.error('Error submitting fake answer:', error)
        }
    }, [roomId, fakeAnswer])

    const handleChooseAnswer = useCallback(async (answer) => {
        const conn = connRef.current
        if (!conn) return
        try {
            await conn.invoke('ChooseAnswer', roomId, answer)
        } catch (error) {
            console.error('Error choosing answer:', error)
        }
    }, [roomId])

    const handleNextRound = useCallback(async () => {
        const conn = connRef.current
        if (!conn) return
        try {
            await conn.invoke('NextRound', roomId)
        } catch (error) {
            console.error('Error advancing round:', error)
        }
    }, [roomId])

    const handleLeave = async () => {
        clearSession()
        await stopConnection()
        navigate('/lobby')
    }

    const getCurrentPlayerName = () => {
        return players.find(p => p.sessionId === currentTurn)?.displayName || 'Unknown'
    }

    // ─── RECONNECTING ─────────────────────────────────────────────────────────
    if (isReconnecting || !connectionReady) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/15 text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isReconnecting ? '🔄 إعادة الاتصال...' : 'جاري الاتصال...'}
                    </h2>
                    <p className="text-white/70">يرجى الانتظار</p>
                </div>
            </div>
        )
    }

    // ─── TOPIC SELECTION ──────────────────────────────────────────────────────
    if (phase === 'topic-selection') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/15">
                    <h1 className="text-3xl font-extrabold text-white mb-6 text-center">🎯 اختر الموضوع</h1>
                    {isMyTurn ? (
                        <>
                            <p className="text-white/80 text-center mb-6">دورك! اختر موضوعًا للجولة:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {topics.map((topic) => (
                                    <button
                                        key={topic}
                                        onClick={() => handleTopicSelect(topic)}
                                        className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 text-lg"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-white/80 text-center text-lg">
                            ⏳ في انتظار <strong>{getCurrentPlayerName()}</strong> لاختيار الموضوع...
                        </p>
                    )}
                    {/* Scoreboard */}
                    <div className="mt-8">
                        <h3 className="text-white font-bold text-center mb-3">النقاط</h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            {players.map(p => (
                                <div key={p.sessionId} className={`px-4 py-2 rounded-xl text-sm font-bold ${p.sessionId === currentTurn ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/40' : 'bg-white/10 text-white/80'}`}>
                                    {p.displayName}: {scores[p.sessionId] || 0}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ─── COLLECTING FAKE ANSWERS ──────────────────────────────────────────────
    if (phase === 'collecting-fakes') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/15">
                    <div className="text-center mb-4">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">🏷️ {selectedTopic}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">{question}</h2>
                    <p className="text-white/70 text-center mb-6">اكتب إجابة مزيفة مقنعة لخداع اللاعبين الآخرين!</p>
                    {message ? (
                        <p className="text-green-300 text-center text-lg font-bold">✅ {message}</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                value={fakeAnswer}
                                onChange={(e) => setFakeAnswer(e.target.value)}
                                placeholder="اكتب إجابتك المزيفة..."
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white/40"
                                dir="rtl"
                            />
                            <button
                                onClick={handleSubmitFake}
                                disabled={!fakeAnswer.trim()}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                إرسال
                            </button>
                        </div>
                    )}
                    {/* Scoreboard */}
                    <div className="mt-8">
                        <h3 className="text-white font-bold text-center mb-3">النقاط</h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            {players.map(p => (
                                <div key={p.sessionId} className="px-4 py-2 rounded-xl bg-white/10 text-white/80 text-sm font-bold">
                                    {p.displayName}: {scores[p.sessionId] || 0}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ─── CHOOSING ANSWER (from real + fake) ───────────────────────────────────
    if (phase === 'choosing-answer') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/15">
                    <div className="text-center mb-4">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">🏷️ {selectedTopic}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">{question}</h2>
                    <p className="text-white/70 text-center mb-4">اختر الإجابة الصحيحة من بين الخيارات:</p>
                    <div className="grid grid-cols-1 gap-3">
                        {choices.map((choice, i) => (
                            <button
                                key={i}
                                onClick={() => handleChooseAnswer(choice)}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // ─── ROUND RESULT ─────────────────────────────────────────────────────────
    if (phase === 'round-result') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/15 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">نتيجة الجولة</h2>
                    {roundResult?.currentQuestion && (
                        <div className="mb-6">
                            <p className="text-white/60 text-sm mb-1">الإجابة الصحيحة:</p>
                            <p className="text-green-300 text-xl font-bold">{roundResult.currentQuestion.correctAnswer}</p>
                        </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                        {players.map(p => (
                            <div key={p.sessionId} className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-sm">
                                {p.displayName}: {scores[p.sessionId] || 0}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleNextRound}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 border border-white/20"
                    >
                        الجولة التالية ➡️
                    </button>
                </div>
            </div>
        )
    }

    // ─── GAME FINISHED ────────────────────────────────────────────────────────
    if (phase === 'finished') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/15 text-center">
                    <h1 className="text-4xl font-extrabold text-white mb-4">🏆 انتهت اللعبة!</h1>
                    {winner && <p className="text-yellow-300 text-2xl font-bold mb-6">الفائز: {winner}</p>}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        {players.map(p => (
                            <div key={p.sessionId} className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-sm">
                                {p.displayName}: {scores[p.sessionId] || 0}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleLeave}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 border border-white/20"
                    >
                        العودة للردهة
                    </button>
                </div>
            </div>
        )
    }

    return null
}

export default Game