import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSignalR } from '../../context/SignalRContext'
import { getConnection as getSignalRConnection, startConnection } from '../../api/signalr'
import { loadRoomSession, clearRoomSession } from '../../utils/roomSession'
import GamePopup from '../../components/GamePopup'

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

const buildScoresMapFromPlayers = (playersList = []) => {
    return playersList.reduce((acc, player) => {
        if (player?.sessionId) {
            acc[player.sessionId] = player.score || 0
        }
        return acc
    }, {})
}

const arabicCharsRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
const latinCharsRegex = /[A-Za-z]/

const getTextDirection = (value) => {
    const text = (value || '').toString().trim()
    if (!text) return 'rtl'
    if (arabicCharsRegex.test(text)) return 'rtl'
    if (latinCharsRegex.test(text)) return 'ltr'
    return 'rtl'
}

const getSecondsLeftFromDeadline = (deadlineUtc) => {
    if (!deadlineUtc) return null
    const deadlineMs = Date.parse(deadlineUtc)
    if (Number.isNaN(deadlineMs)) return null
    return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
}

const PHASE_DURATION_SECONDS = 15
const TIMED_PHASES = ['topic-selection', 'collecting-fakes', 'choosing-answer', 'round-result']

const Game = ({ user: authenticatedUser }) => {
    const { roomId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { stopConnection } = useSignalR()
    const connRef = useRef(null)
    const hasSetup = useRef(false)
    const leaveNoticeTimeoutRef = useRef(null)

    // Try location.state first, fall back to localStorage on refresh
    const savedSession = loadSession()
    const savedRoomSession = loadRoomSession(roomId)
    const sessionId = location.state?.sessionId || savedSession?.sessionId || savedRoomSession?.sessionId
    const initialGameState = location.state?.gameState || savedSession?.gameState
    const user = location.state?.user || savedSession?.user || authenticatedUser
    const initialAnswerTimeSeconds =
        location.state?.answerTimeSeconds ||
        savedRoomSession?.answerTimeSeconds ||
        savedRoomSession?.timer ||
        PHASE_DURATION_SECONDS

    const [phase, setPhase] = useState(initialGameState ? mapPhase(initialGameState.phase) : 'topic-selection')
    const [topics, setTopics] = useState(initialGameState?.selectedTopics || [])
    const [selectedTopic, setSelectedTopic] = useState(initialGameState?.currentRoundTopic || null)
    const [currentTurn, setCurrentTurn] = useState(initialGameState?.currentPlayerSessionId || null)
    const [players, setPlayers] = useState(initialGameState?.players || [])
    const [question, setQuestion] = useState(initialGameState?.currentQuestion?.questionText || null)
    const [choices, setChoices] = useState(initialGameState?.choices || [])
    const [scores, setScores] = useState(
        initialGameState?.scores || buildScoresMapFromPlayers(initialGameState?.players || [])
    )
    const [message, setMessage] = useState('')
    const [fakeSubmitError, setFakeSubmitError] = useState('')
    const [roundResult, setRoundResult] = useState(null)
    const [winner, setWinner] = useState(null)
    const [fakeAnswer, setFakeAnswer] = useState('')
    const [connectionReady, setConnectionReady] = useState(false)
    const [isReconnecting, setIsReconnecting] = useState(false)
    const [hasSubmittedFake, setHasSubmittedFake] = useState(false)
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null)
    const [isLeavePopupOpen, setIsLeavePopupOpen] = useState(false)
    const [turnTopicOptions, setTurnTopicOptions] = useState([])
    const [leaveNotice, setLeaveNotice] = useState('')
    const [answerTimeSeconds, setAnswerTimeSeconds] = useState(
        initialGameState?.answerTimeSeconds || initialAnswerTimeSeconds
    )
    const [phaseDeadlineUtc, setPhaseDeadlineUtc] = useState(initialGameState?.phaseDeadlineUtc || null)
    const [secondsLeft, setSecondsLeft] = useState(
        getSecondsLeftFromDeadline(initialGameState?.phaseDeadlineUtc)
    )

    const isMyTurn = currentTurn === sessionId
    const questionDirection = getTextDirection(question)

    const showLeaveNotice = useCallback((noticeText) => {
        if (!noticeText) return

        setLeaveNotice(noticeText)
        if (leaveNoticeTimeoutRef.current) {
            clearTimeout(leaveNoticeTimeoutRef.current)
        }
        leaveNoticeTimeoutRef.current = setTimeout(() => {
            setLeaveNotice('')
        }, 3500)
    }, [])

    const getRandomTopics = useCallback((list = [], count = 4) => {
        const unique = [...new Set(list.filter(Boolean))]
        if (unique.length <= count) return unique

        const shuffled = [...unique]
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled.slice(0, count)
    }, [])

    const applyTimerState = useCallback((state) => {
        if (!state) return

        if (typeof state.answerTimeSeconds === 'number' && state.answerTimeSeconds > 0) {
            setAnswerTimeSeconds(state.answerTimeSeconds)
        }

        if (Object.prototype.hasOwnProperty.call(state, 'phaseDeadlineUtc')) {
            setPhaseDeadlineUtc(state.phaseDeadlineUtc || null)
        }
    }, [])

    // New round/new question: clear previous fake-answer UI state.
    useEffect(() => {
        if (phase === 'collecting-fakes') {
            setFakeAnswer('')
            setMessage('')
            setFakeSubmitError('')
            setHasSubmittedFake(false)
        }
        if (phase === 'choosing-answer') {
            setSelectedAnswerIndex(null)
        }
    }, [phase, question, selectedTopic])

    useEffect(() => {
        if (phase !== 'topic-selection' || !isMyTurn) {
            setTurnTopicOptions([])
            return
        }
        setTurnTopicOptions(getRandomTopics(topics, 4))
    }, [phase, isMyTurn, currentTurn, topics, getRandomTopics])

    useEffect(() => {
        if (!phaseDeadlineUtc) {
            setSecondsLeft(null)
            return
        }

        const tick = () => setSecondsLeft(getSecondsLeftFromDeadline(phaseDeadlineUtc))
        tick()
        const intervalId = setInterval(tick, 250)
        return () => clearInterval(intervalId)
    }, [phaseDeadlineUtc])

    useEffect(() => {
        return () => {
            if (leaveNoticeTimeoutRef.current) {
                clearTimeout(leaveNoticeTimeoutRef.current)
            }
        }
    }, [])

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
                answerTimeSeconds,
                phaseDeadlineUtc,
            }
        })
    }, [phase, topics, selectedTopic, currentTurn, players, question, choices, scores, answerTimeSeconds, phaseDeadlineUtc])

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
                    if (savedRoomSession?.sessionId) {
                        navigate(`/room/${roomId}`)
                    } else {
                        navigate('/lobby')
                    }
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
                applyTimerState(state)
                if (state.players) {
                    setPlayers(state.players)
                    setScores(state.scores || buildScoresMapFromPlayers(state.players))
                }
            })

            conn.on('GameStarted', (state) => {
                setPhase(mapPhase(state.phase))
                setSelectedTopic(state.currentRoundTopic)
                setCurrentTurn(state.currentPlayerSessionId)
                applyTimerState(state)
                if (state.players) {
                    setPlayers(state.players)
                    setScores(state.scores || buildScoresMapFromPlayers(state.players))
                }
                if (state.currentQuestion) setQuestion(state.currentQuestion.questionText)
                if (state.choices?.length > 0) setChoices(state.choices)
            })

            conn.on('ShowChoices', (payload) => {
                setPhase('choosing-answer')
                const incomingChoices = Array.isArray(payload) ? payload : (payload?.choices || [])
                setChoices(incomingChoices)

                if (!Array.isArray(payload)) {
                    applyTimerState(payload)
                }
            })

            conn.on('RoundEnded', (state) => {
                setPhase('round-result')
                setRoundResult(state)
                applyTimerState(state)
                if (state.players) {
                    setPlayers(state.players)
                    setScores(state.scores || buildScoresMapFromPlayers(state.players))
                }
            })

            conn.on('GameEnded', (state) => {
                setPhase('finished')
                clearSession() // Game over — clear saved session
                applyTimerState(state)
                if (state.players) {
                    setPlayers(state.players)
                    setScores(state.scores || buildScoresMapFromPlayers(state.players))
                }
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
                applyTimerState(state)
                if (state.players) {
                    setPlayers(state.players)
                    setScores(state.scores || buildScoresMapFromPlayers(state.players))
                }
                if (state.currentQuestion) setQuestion(state.currentQuestion.questionText)
                if (state.choices?.length > 0) setChoices(state.choices)
            })

            conn.on('PlayerLeft', (data) => {
                const departedSessionId = data?.sessionId
                const departedName = data?.name || t('common.player')

                if (departedSessionId) {
                    setPlayers(prev => prev.filter(p => p.sessionId !== departedSessionId))
                }

                showLeaveNotice(t('game.playerLeftRoomNotice', { name: departedName }))
            })

            conn.on('PlayerDisconnected', (data) => {
                const departedSessionId = data?.sessionId
                const departedName = data?.name || t('common.player')

                if (data?.temporary) {
                    showLeaveNotice(t('game.playerDisconnectedTemporaryNotice', { name: departedName }))
                    return
                }

                if (departedSessionId) {
                    setPlayers(prev => prev.filter(p => p.sessionId !== departedSessionId))
                }

                showLeaveNotice(t('game.playerDisconnectedFinalNotice', { name: departedName }))
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
                conn.off('PlayerLeft')
                conn.off('PlayerDisconnected')
            }
        }
    }, [navigate, showLeaveNotice, t, applyTimerState])

    const leaveNoticeBanner = leaveNotice ? (
        <div
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-lg"
            style={{
                border: '1px solid color-mix(in srgb, var(--color-game-yellow) 45%, transparent)',
                background: 'color-mix(in srgb, var(--app-card-bg-strong) 92%, transparent)',
                color: 'color-mix(in srgb, var(--color-game-yellow) 70%, var(--app-text))',
            }}
        >
            {leaveNotice}
        </div>
    ) : null
    const showPhaseTimer = TIMED_PHASES.includes(phase) && secondsLeft !== null
    const phaseTimerBanner = showPhaseTimer ? (
        <div
            className="absolute top-4 left-4 z-20 rounded-xl px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-lg sm:text-sm"
            style={{
                border: '1px solid color-mix(in srgb, var(--color-game-cyan) 45%, transparent)',
                background: 'color-mix(in srgb, var(--app-card-bg-strong) 92%, transparent)',
                color: 'color-mix(in srgb, var(--color-game-cyan) 75%, var(--app-text))',
            }}
        >
            {t('game.timeLeft')}: {secondsLeft} {secondsLeft === 1 ? t('common.second') : t('common.seconds')}
        </div>
    ) : null

    const handleTopicSelect = useCallback(async (topic) => {
        const conn = connRef.current
        if (!conn) return
        try {
            await conn.invoke('SelectRoundTopic', roomId, sessionId, topic)
        } catch (error) {
            console.error('Error selecting topic:', error)
        }
    }, [roomId, sessionId])

    const handleSubmitFake = useCallback(async () => {
        const conn = connRef.current
        const trimmedFakeAnswer = fakeAnswer.trim()
        if (!conn || !trimmedFakeAnswer) return

        setFakeSubmitError('')

        try {
            const result = await conn.invoke('SubmitFakeAnswer', roomId, trimmedFakeAnswer)
            if (!result?.success) {
                setMessage('')
                setHasSubmittedFake(false)
                setFakeSubmitError(result?.message || t('game.fakeAnswerError'))
                return
            }

            setFakeAnswer('')
            setMessage(t('game.fakeAnswerSent'))
            setHasSubmittedFake(true)
        } catch (error) {
            setMessage('')
            setHasSubmittedFake(false)
            setFakeSubmitError(t('game.fakeAnswerConnectionError'))
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
        const conn = connRef.current
        if (conn) {
            try {
                await conn.invoke('LeaveRoom', roomId, sessionId)
            } catch (error) {
                console.error('Error leaving room:', error)
            }
        }

        clearSession()
        clearRoomSession()
        await stopConnection()
        navigate('/lobby')
    }
    
    const handleRequestLeave = () => {
        setIsLeavePopupOpen(true)
    }
    
    const leavePopup = (
        <GamePopup
            open={isLeavePopupOpen}
            title={t('game.leaveRoom')}
            message={t('game.leaveRoomConfirmation')}
            confirmText={t('common.yes')}
            cancelText={t('common.no')}
            showCancel
            onCancel={() => setIsLeavePopupOpen(false)}
            onConfirm={async () => {
                setIsLeavePopupOpen(false)
                await handleLeave()
            }}
        />
    )

    const getCurrentPlayerName = () => {
        return players.find(p => p.sessionId === currentTurn)?.displayName || 'Unknown'
    }

    // ─── RECONNECTING ─────────────────────────────────────────────────────────
    if (isReconnecting || !connectionReady) {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center p-4">
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isReconnecting ? t('game.reconnecting') : t('game.connecting')}
                    </h2>
                    <p className="text-white/70">{t('game.pleaseWait')}</p>
                </div>
            </div>
        )
    }

    // ─── TOPIC SELECTION ──────────────────────────────────────────────────────
    if (phase === 'topic-selection') {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center p-4 relative">
                {leaveNoticeBanner}
                {phaseTimerBanner}
                <button
                    onClick={handleRequestLeave}
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
                    <h1 className="text-3xl font-extrabold text-white mb-6 text-center">{t('game.chooseTopic')}</h1>
                    {isMyTurn ? (
                        <>
                            <p className="text-white/80 text-center mb-6">{t('game.yourTurn')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {turnTopicOptions.map((topic) => (
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
                            ⏳ {t('game.waitingForTopic', { name: getCurrentPlayerName() }).replace('<strong>', '').replace('</strong>', '')}
                        </p>
                    )}
                </div>
                {leavePopup}
            </div>
        )
    }

    // ─── COLLECTING FAKE ANSWERS ──────────────────────────────────────────────
    if (phase === 'collecting-fakes') {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center p-4 relative">
                {leaveNoticeBanner}
                {phaseTimerBanner}
                <button
                    onClick={handleRequestLeave}
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
                    <div className="text-center mb-4">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">🏷️ {selectedTopic}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center" dir={questionDirection}>{question}</h2>
                    <p className="text-white/70 text-center mb-6">{t('game.writeFakeAnswer')}</p>
                    {hasSubmittedFake ? (
                        <p className="text-green-300 text-center text-lg font-bold">✅ {message}</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                value={fakeAnswer}
                                onChange={(e) => setFakeAnswer(e.target.value)}
                                placeholder={t('game.fakeAnswerPlaceholder')}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white/40"
                                dir={questionDirection}
                            />
                            <button
                                onClick={handleSubmitFake}
                                disabled={!fakeAnswer.trim()}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {t('common.send')}
                            </button>
                            {fakeSubmitError && (
                                <p className="text-red-300 text-center font-semibold">{fakeSubmitError}</p>
                            )}
                        </div>
                    )}
                </div>
                {leavePopup}
            </div>
        )
    }

    // ─── CHOOSING ANSWER (from real + fake) ───────────────────────────────────
    if (phase === 'choosing-answer') {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center p-4 relative">
                {leaveNoticeBanner}
                {phaseTimerBanner}
                <button
                    onClick={handleRequestLeave}
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
                    <div className="text-center mb-4">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">🏷️ {selectedTopic}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center" dir={questionDirection}>{question}</h2>
                    <p className="text-white/70 text-center mb-4">{t('game.chooseCorrectAnswer')}</p>
                    <div className="grid grid-cols-1 gap-3">
                        {choices.map((choice, i) => (
                            <button
                                key={i}
                                onClick={() => { setSelectedAnswerIndex(i); handleChooseAnswer(choice) }}
                                className={`border font-semibold py-3 px-6 rounded-xl transition-all duration-300 ${
                                    selectedAnswerIndex === i
                                        ? 'bg-game-yellow/20 border-game-yellow shadow-lg shadow-game-yellow/20 text-game-yellow'
                                        : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white'
                                }`}
                                dir={getTextDirection(choice)}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
                {leavePopup}
            </div>
        )
    }

    // ─── ROUND RESULT ─────────────────────────────────────────────────────────
    if (phase === 'round-result') {
        const sortedPlayers = [...players].sort((a, b) => (scores[b.sessionId] || 0) - (scores[a.sessionId] || 0))
        const medals = ['🥇', '🥈', '🥉']

        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center p-4 relative">
                {leaveNoticeBanner}
                {phaseTimerBanner}
                <button
                    onClick={(handleRequestLeave)}
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">{t('game.leaderboard')}</h2>

                    {roundResult?.currentQuestion && (
                        <div className="mb-6 bg-white/10 rounded-2xl px-6 py-4 border border-white/20">
                            <p className="text-white/60 text-sm mb-1">{t('game.correctAnswer')}</p>
                            <p className="text-green-300 text-xl font-bold" dir={getTextDirection(roundResult.currentQuestion.correctAnswer)}>{roundResult.currentQuestion.correctAnswer}</p>
                        </div>
                    )}

                    {/* Leaderboard */}
                    <div className="flex flex-col gap-3 mb-8">
                        {sortedPlayers.map((p, index) => {
                            const isMe = p.sessionId === sessionId
                            const isFirst = index === 0
                            return (
                                <div
                                    key={p.sessionId}
                                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300
                                        ${isFirst
                                            ? 'bg-game-yellow/20 border-game-yellow shadow-lg shadow-game-yellow/20'
                                            : isMe
                                                ? 'bg-white/15 border-white/40'
                                                : 'bg-white/10 border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{medals[index] || `#${index + 1}`}</span>
                                        <span className={`font-bold text-lg ${isFirst ? 'text-game-yellow' : 'text-white'}`}>
                                            {p.displayName}
                                            {isMe && <span className="text-white/50 text-sm font-normal me-2">({t('common.you')})</span>}
                                        </span>
                                    </div>
                                    <span className={`text-xl font-extrabold ${isFirst ? 'text-game-yellow' : 'text-white'}`}>
                                        {scores[p.sessionId] || 0} {t('common.point')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    <button
                        onClick={handleNextRound}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 border border-white/20 hover:border-white/40"
                    >
                        {t('game.nextRound')}
                    </button>
                </div>
                {leavePopup}
            </div>
        )
    }

    // ─── GAME FINISHED ────────────────────────────────────────────────────────
    if (phase === 'finished') {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center p-4">
                {leaveNoticeBanner}
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl text-center">
                    <h1 className="text-4xl font-extrabold text-white mb-4">{t('game.gameOver')}</h1>
                    {winner && <p className="text-yellow-300 text-2xl font-bold mb-6">{t('game.winner', { name: winner })}</p>}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        {players.map(p => (
                            <div key={p.sessionId} className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-sm">
                                {p.displayName}: {scores[p.sessionId] || 0}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleRequestLeave}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 border border-white/20"
                    >
                        {t('game.backToLobby')}
                    </button>
                </div>
                {leavePopup}
            </div>
        )
    }

    return null
}

export default Game
