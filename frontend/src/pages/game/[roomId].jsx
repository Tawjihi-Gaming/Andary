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

const fakeAnswerErrorMap = {
    'مرحلة الإجابات المزيفة انتهت.': 'game.fakeAnswerErrors.phaseEnded',
    'تعذر التعرف على اللاعب.': 'game.fakeAnswerErrors.playerUnrecognized',
    'اللاعب غير موجود في الغرفة.': 'game.fakeAnswerErrors.playerNotInRoom',
    'لا يوجد سؤال حالي.': 'game.fakeAnswerErrors.noCurrentQuestion',
    'اكتب إجابة مزيفة أولاً.': 'game.fakeAnswerErrors.empty',
    'لا يمكنك إرسال الإجابة الصحيحة كإجابة مزيفة.': 'game.fakeAnswerErrors.cannotUseCorrectAnswer',
}

const Game = ({ user: authenticatedUser, onUpdateUser }) => {
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
    // XP award received from server before GameEnded
    const [xpAward, setXpAward] = useState(null)
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
    // Don't reset hasSubmittedFake here — it will be restored from server state on reconnect.
    useEffect(() => {
        if (phase === 'collecting-fakes') {
            setFakeAnswer('')
            setMessage('')
            setFakeSubmitError('')
            // Only reset hasSubmittedFake if NOT already submitted on the server.
            // On reconnect, the server sync will set it correctly before this runs.
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
                // New round — reset fake submission state
                setHasSubmittedFake(false)
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
                    // Reset fake submission state for new round
                    const me = state.players.find(p => p.sessionId === sessionId)
                    setHasSubmittedFake(!!me?.hasSubmittedFake)
                }
                setQuestion(state.currentQuestion?.questionText || null)
                setChoices(state.choices || [])
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

            // Targeted XP award — arrives before GameEnded for logged-in players.
            conn.on('XpAwarded', (data) => {
                setXpAward(data)

                // Sync to localStorage and App-level state
                try {
                    const stored = JSON.parse(localStorage.getItem('userData') || '{}')
                    if (stored && typeof data.totalXp === 'number') {
                        stored.xp = data.totalXp
                        localStorage.setItem('userData', JSON.stringify(stored))
                        if (onUpdateUser) onUpdateUser(stored)
                    }
                } catch { /* storage unavailable */ }
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
                const mappedPhase = mapPhase(state.phase)
                setPhase(mappedPhase)
                setTopics(state.selectedTopics || [])
                setSelectedTopic(state.currentRoundTopic)
                setCurrentTurn(state.currentPlayerSessionId)
                applyTimerState(state)
                if (state.players) {
                    setPlayers(state.players)
                    setScores(state.scores || buildScoresMapFromPlayers(state.players))
                    // Restore hasSubmittedFake from server player data on reconnect
                    const me = state.players.find(p => p.sessionId === sessionId)
                    if (me?.hasSubmittedFake) {
                        setHasSubmittedFake(true)
                        setMessage(t('game.fakeAnswerSent'))
                    } else {
                        setHasSubmittedFake(false)
                    }
                }
                setQuestion(state.currentQuestion?.questionText || null)
                setChoices(state.choices || [])
                // Restore roundResult so the correct answer & explanation are visible
                if (mappedPhase === 'round-result') {
                    setRoundResult(state)
                }
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

            // This event can be broadcast while the shared connection is on the game page.
            // No game-page behavior depends on owner identity, but registering avoids client warnings.
            conn.on('OwnershipTransferred', () => {})

            conn.on('TopicAddFailed', (data) => {
                setMessage(t('game.topicAddFailed'))
            })

            conn.on('GameError', (data) => {
                setMessage(t('game.gameError'))
            })

            conn.on('TopicSelectionFailed', (data) => {
                setMessage(t('game.topicSelectionFailed'))
            })

            conn.on('RoomClosed', () => {
                setPhase('finished')
                setRoundResult(null)
                setWinner(null)
                setPhaseDeadlineUtc(null)
                setSecondsLeft(null)
                clearSession()
                clearRoomSession(roomId)
            })

            // Important: invoke after handlers are registered so the sync event is not missed on refresh.
            try {
                await conn.invoke('RejoinRoom', roomId, sessionId)
                console.log('[Game] ✅ Rejoined room and requested current state')
            } catch (error) {
                console.error('[Game] Rejoin failed:', error)
                clearSession()
                if (savedRoomSession?.sessionId) {
                    navigate(`/room/${roomId}`)
                } else {
                    navigate('/lobby')
                }
                return
            } finally {
                setIsReconnecting(false)
            }

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
                conn.off('XpAwarded')
                conn.off('GameEnded')
                conn.off('TurnChanged')
                conn.off('GameStateSync')
                conn.off('PlayerLeft')
                conn.off('PlayerDisconnected')
                conn.off('OwnershipTransferred')
                conn.off('TopicAddFailed')
                conn.off('GameError')
                conn.off('TopicSelectionFailed')
                conn.off('RoomClosed')
            }
        }
    }, [navigate, roomId, showLeaveNotice, t, applyTimerState])

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
                const backendMessage = typeof result?.message === 'string' ? result.message.trim() : ''
                const mappedKey = fakeAnswerErrorMap[backendMessage]
                const translatedError = mappedKey ? t(mappedKey) : t('game.fakeAnswerError')
                setFakeSubmitError(translatedError)
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
    }, [roomId, fakeAnswer, t])

    const handleChooseAnswer = useCallback(async (answer) => {
        const conn = connRef.current
        if (!conn) return
        try {
            await conn.invoke('ChooseAnswer', roomId, answer)
        } catch (error) {
            console.error('Error choosing answer:', error)
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
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full max-w-md lg:max-w-lg shadow-2xl text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <h2 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white mb-2">
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
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl shadow-2xl">
                    <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white mb-4 sm:mb-6 text-center">{t('game.chooseTopic')}</h1>
                    {isMyTurn ? (
                        <>
                            <p className="text-white/80 text-center mb-4 sm:mb-6">{t('game.yourTurn')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 xl:gap-5">
                                {turnTopicOptions.map((topic) => (
                                    <button
                                        key={topic}
                                        onClick={() => handleTopicSelect(topic)}
                                        className="bg-white/10 hover:bg-white/20 border cursor-pointer border-white/20 hover:border-white/40 text-white hover:text-game-yellow font-bold py-3 sm:py-4 xl:py-5 px-4 sm:px-6 xl:px-8 rounded-2xl transition-all duration-300 text-base sm:text-lg xl:text-xl"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-white/80 text-center text-base sm:text-lg">
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
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl shadow-2xl">
                    <div className="text-center mb-3 sm:mb-4">
                        <span className="px-3 py-1 xl:px-4 xl:py-1.5 bg-white/10 rounded-full text-white/70 text-xs sm:text-sm xl:text-base">🏷️ {selectedTopic}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white mb-4 sm:mb-6 text-center" dir={questionDirection}>{question}</h2>
                    <p className="text-white/70 text-center text-sm sm:text-base xl:text-lg mb-4 sm:mb-6">{t('game.writeFakeAnswer')}</p>
                    {hasSubmittedFake ? (
                        <p className="text-green-300 text-center text-base sm:text-lg font-bold">✅ {message}</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSubmitFake()
                                }}
                                className="flex flex-col gap-4"
                            >
                            <input
                                type="text"
                                value={fakeAnswer}
                                onChange={(e) => setFakeAnswer(e.target.value)}
                                placeholder={t('game.fakeAnswerPlaceholder')}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 xl:px-6 py-2.5 sm:py-3 xl:py-4 text-base sm:text-lg xl:text-xl focus:outline-none focus:border-white/40"
                                dir={questionDirection}
                            />
                            <button
                                onClick={handleSubmitFake}
                                disabled={!fakeAnswer.trim()}
                                className="bg-white/10 cursor-pointer hover:bg-white/20 max-w-full w-full border border-white/20 hover:border-white/40 text-white hover:text-game-yellow font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {t('common.send')}
                            </button>
                            </form>
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
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl shadow-2xl">
                    <div className="text-center mb-3 sm:mb-4">
                        <span className="px-3 py-1 xl:px-4 xl:py-1.5 bg-white/10 rounded-full text-white/70 text-xs sm:text-sm xl:text-base">🏷️ {selectedTopic}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white mb-4 sm:mb-6 text-center" dir={questionDirection}>{question}</h2>
                    <p className="text-white/70 text-center text-sm sm:text-base xl:text-lg mb-3 sm:mb-4">{t('game.chooseCorrectAnswer')}</p>
                    <div className="grid grid-cols-1 gap-3 xl:gap-4">
                        {choices.map((choice, i) => (
                            <button
                                key={i}
                                onClick={() => { setSelectedAnswerIndex(i); handleChooseAnswer(choice) }}
                                className={`border font-semibold py-2.5 sm:py-3 xl:py-4 px-4 sm:px-6 xl:px-8 cursor-pointer hover:bg-game-yellow/10 rounded-xl transition-all duration-300 text-sm sm:text-base xl:text-lg ${
                                    selectedAnswerIndex === i
                                        ? 'bg-game-yellow/20 border-game-yellow shadow-lg shadow-game-yellow/20 text-game-yellow'
                                        : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white hover:text-game-yellow'
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
                    className="absolute cursor-pointer top-4 right-4 z-20 bg-white/10 hover:bg-red-500/20 text-white/85 hover:text-red-300 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/20 hover:border-red-400/40 transition-all duration-300"
                >
                    {t('game.leaveRoom')}
                </button>
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl shadow-2xl text-center">
                    <h2 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-white mb-2">{t('game.leaderboard')}</h2>

                    {roundResult?.currentQuestion && (
                        <div className="mb-4 sm:mb-6 bg-white/10 rounded-2xl px-4 sm:px-6 xl:px-8 py-3 sm:py-4 xl:py-5 border border-white/20">
                            <p className="text-white/60 text-xs sm:text-sm xl:text-base mb-1">{t('game.correctAnswer')}</p>
                            <p className="text-green-300 text-lg sm:text-xl xl:text-2xl font-bold" dir={getTextDirection(roundResult.currentQuestion.correctAnswer)}>{roundResult.currentQuestion.correctAnswer}</p>
                            {roundResult.currentQuestion.explanation && (
                                <div className="text-white/60 text-xs sm:text-sm mt-2">
                                    <p className="font-bold mb-1">{t('game.correctAnswerExplained')}</p>
                                    <p className="whitespace-pre-wrap" dir="auto">{roundResult.currentQuestion.explanation}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Leaderboard */}
                    <div className="flex flex-col gap-2 sm:gap-3 xl:gap-4 mb-6 sm:mb-8">
                        {sortedPlayers.map((p, index) => {
                            const isMe = p.sessionId === sessionId
                            const isFirst = index === 0
                            return (
                                <div
                                    key={p.sessionId}
                                    className={`flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 rounded-2xl border transition-all duration-300
                                        ${isFirst
                                            ? 'bg-game-yellow/20 border-game-yellow shadow-lg shadow-game-yellow/20'
                                            : isMe
                                                ? 'bg-white/15 border-white/40'
                                                : 'bg-white/10 border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 sm:gap-3 xl:gap-4">
                                        <span className="text-xl sm:text-2xl xl:text-3xl">{medals[index] || `#${index + 1}`}</span>
                                        <span className={`font-bold text-base sm:text-lg xl:text-xl ${isFirst ? 'text-game-yellow' : 'text-white'}`}>
                                            {p.displayName}
                                            {isMe && <span className="text-white/50 text-sm font-normal me-2">({t('common.you')})</span>}
                                        </span>
                                    </div>
                                    <span className={`text-base sm:text-xl xl:text-2xl font-extrabold ${isFirst ? 'text-game-yellow' : 'text-white'}`}>
                                        {scores[p.sessionId] || 0} {t('common.point')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
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
                <div className="app-glass-card backdrop-blur-2xl rounded-3xl p-4 sm:p-8 xl:p-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl shadow-2xl text-center">
                    <h1 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold text-white mb-3 sm:mb-4">{t('game.gameOver')}</h1>
                    {winner && <p className="text-yellow-300 text-xl sm:text-2xl xl:text-3xl font-bold mb-4 sm:mb-6">{t('game.winner', { name: winner })}</p>}
                    {xpAward && (
                        <div className="mb-4 sm:mb-6 bg-game-yellow/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-game-yellow/30">
                            <p className="text-game-yellow text-lg sm:text-xl font-bold">+{xpAward.xpAwarded} XP</p>
                            <p className="text-white/60 text-xs sm:text-sm">{t('game.totalXp', { xp: xpAward.totalXp })}</p>
                        </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                        {players.map(p => (
                            <div key={p.sessionId} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white font-bold text-xs sm:text-sm">
                                {p.displayName}: {scores[p.sessionId] || 0}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleRequestLeave}
                        className="bg-white/10 hover:bg-white/20 text-white hover:text-game-yellow font-bold py-3 px-8 cursor-pointer rounded-2xl transition-all duration-300 border border-white/20"
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
