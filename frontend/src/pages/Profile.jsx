import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import AvatarPicker, { AVATARS } from '../components/AvatarPicker'
import LanguageSwitcher from '../components/LanguageSwitcher'
import GamePopup from '../components/GamePopup'
import LegalFooter from '../components/LegalFooter'

const XP_PER_LEVEL = 100

const getLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1
const getProgress = (xp) => (xp % XP_PER_LEVEL)

const Profile = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const xp = user?.xp || 0
  const level = getLevel(xp)
  const progress = getProgress(xp)
  const progressPercent = (progress / XP_PER_LEVEL) * 100

  // Editable fields state
  const [editingField, setEditingField] = useState(null) // 'username' | 'email' | 'avatar' | 'password'
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [selectedAvatar, setSelectedAvatar] = useState(
    AVATARS.find(a => a.emoji === user?.avatar) || AVATARS[0]
  )
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false)

  // Game history state
  const [gameHistory, setGameHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [historyInitialized, setHistoryInitialized] = useState(false)
  const historyObserverRef = useRef(null)
  const PAGE_SIZE = 10

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // Fetch game history
  const fetchGameHistory = useCallback(async (page) => {
    if (!user?.id || historyLoading) return
    setHistoryLoading(true)
    try
    {
      const res = await api.get('/room/player-game-history', {
        params: { playerId: user.id, pageNumber: page, pageSize: PAGE_SIZE }
      })
      const data = res.data
      if (page === 1)
      {
        setGameHistory(data)
      }
      else
      {
        setGameHistory(prev => [...prev, ...data])
      }
      setHasMoreHistory(data.length === PAGE_SIZE)
    }
    catch (error)
    {
      if (error.response?.status === 404)
      {
        setHasMoreHistory(false)
      }
      else
      {
        console.error('Fetch game history error:', error)
      }
    }
    finally
    {
      setHistoryLoading(false)
    }
  }, [user?.id, historyLoading])

  // Load first page on mount
  useEffect(() => {
    if (user?.id && !user?.isGuest && !historyInitialized)
    {
      setHistoryInitialized(true)
      fetchGameHistory(1)
    }
  }, [user?.id, user?.isGuest, historyInitialized])

  // Infinite scroll observer
  const lastHistoryRef = useCallback((node) => {
    if (historyLoading)
    {
      return
    }
    if (historyObserverRef.current)
    {
      historyObserverRef.current.disconnect()
    }
    historyObserverRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreHistory)
      {
        const nextPage = historyPage + 1
        setHistoryPage(nextPage)
        fetchGameHistory(nextPage)
      }
    })
    if (node)
    {
      historyObserverRef.current.observe(node)
    }
  }, [historyLoading, hasMoreHistory, historyPage, fetchGameHistory])

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatDuration = (start, end) => {
    if (!start || !end)
    {
      return '-'
    }
    const ms = new Date(end) - new Date(start)
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return `${Math.floor(ms / 1000)}s`
    return `${mins}m`
  }

  // Update username
  const handleUpdateUsername = async () => {
    if (!username.trim())
    {
      return
    }
    setLoading(true)
    try
    {
      await api.post('/auth/edit', { username })
      onUpdateUser?.({ ...user, username })
      showMessage(t('profile.usernameUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update username error:', error)
      const msg = error.response?.data?.msg || t('profile.usernameUpdateFailed')
      showMessage(msg, 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update email
  const handleUpdateEmail = async () => {
    if (!email.trim())
    {
      return
    }
    setLoading(true)
    try
    {
      await api.post('/auth/edit', { email })
      onUpdateUser?.({ ...user, email })
      showMessage(t('profile.emailUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update email error:', error)
      const msg = error.response?.data?.msg || t('profile.emailUpdateFailed')
      showMessage(msg, 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update avatar
  const handleUpdateAvatar = async () => {
    setLoading(true)
    try
    {
      await api.post('/auth/edit', { avatarImageName: selectedAvatar.emoji })
      onUpdateUser?.({ ...user, avatar: selectedAvatar.emoji })
      showMessage(t('profile.avatarUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update avatar error:', error)
      const msg = error.response?.data?.msg || t('profile.avatarUpdateFailed')
      showMessage(msg, 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update password
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword)
    {
      showMessage(t('profile.fillAllPasswordFields'), 'error')
      return
    }

    if (newPassword !== confirmPassword)
    {
      showMessage(t('profile.passwordsDoNotMatch'), 'error')
      return
    }
    if (newPassword.length < 6)
    {
      showMessage(t('profile.passwordMinLength'), 'error')
      return
    }
    setLoading(true)
    try
    {
      await api.post('/auth/edit', { password: newPassword })
      showMessage(t('profile.passwordUpdated'))
      setNewPassword('')
      setConfirmPassword('')
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update password error:', error)
      const msg = error.response?.data?.msg || t('profile.passwordUpdateFailed')
      showMessage(msg, 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditingField(null)
    setUsername(user?.username || '')
    setEmail(user?.email || '')
    setSelectedAvatar(AVATARS.find(a => a.emoji === user?.avatar) || AVATARS[0])
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleLogout = () => {
    setIsLogoutPopupOpen(true)
  }

  const confirmLogout = async () => {
    setIsLogoutPopupOpen(false)
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
    if (onLogout) {
      onLogout()
    }
    navigate('/login')
  }


  return (
    <div className="min-h-screen app-page-bg p-4">
      <div className="max-w-2xl mx-auto">
        {/* back button and language switcher */}
        <div dir="ltr" className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 mb-4">
          <LanguageSwitcher />
          <button
            onClick={() => navigate('/lobby')}
            className="text-white hover:text-game-yellow transition-colors flex items-center gap-2 cursor-pointer text-sm font-medium"
          >
            {t('profile.goBack')}
          </button>
        </div>

        {/* toast message */}
        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium animate-fade-in transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* profile card */}
        <div className="app-glass-card-strong backdrop-blur-xl rounded-3xl p-4 sm:p-8 shadow-2xl">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-6 sm:mb-8 text-center" style={{ textShadow: '3px 3px 0 #2563EB' }}>
            {t('profile.title')}
          </h1>

          {/* AVATAR SECTION */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 cursor-pointer rounded-full bg-game-yellow pt-2 flex items-center justify-center border-4 border-white shadow-lg hover:scale-105 transition-transform"
              onClick={() => setEditingField(editingField === 'avatar' ? null : 'avatar')}
              title={t('profile.clickToChangeAvatar')}
            >
              <span className="text-5xl sm:text-6xl">{editingField === 'avatar' ? selectedAvatar.emoji : user?.avatar}</span>
            </div>
            {!user?.isGuest && (
              <button
                onClick={() => setEditingField(editingField === 'avatar' ? null : 'avatar')}
                className="text-white/60 hover:text-game-yellow text-sm transition-colors cursor-pointer"
              >
                {t('profile.changeAvatar')}
              </button>
            )}

            {/* Avatar picker dropdown */}
            {editingField === 'avatar' && (
              <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 border border-white/20">
                <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
                <div className="flex gap-2 mt-3 justify-center">
                  <button
                    onClick={handleUpdateAvatar}
                    disabled={loading}
                    className="bg-game-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? '...' : t('common.save')}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LEVEL & XP BAR */}
          {!user?.isGuest && (
            <div className="w-full max-w-md mx-auto mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold text-lg">{t('profile.level', { level })}</span>
                <span className="text-white/70 text-sm">{t('profile.xpProgress', { progress, max: XP_PER_LEVEL })}</span>
              </div>
              <div className="w-full h-5 bg-white/10 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-linear-to-r from-game-yellow to-game-orange rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-white/50 text-xs text-center mt-1">{t('profile.totalXp', { xp })}</p>
            </div>
          )}

          {/* USER INFO FIELDS */}
          <div className="space-y-4 max-w-md mx-auto">

            {/* Username field */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">{t('profile.username')}</label>
              {editingField === 'username' ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                    placeholder={t('profile.enterNewUsername')}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateUsername}
                      disabled={loading}
                      className="bg-game-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? '...' : t('common.save')}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg font-semibold">{user?.username || t('common.guest')}</span>
                  {!user?.isGuest && (
                    <button
                      onClick={() => setEditingField('username')}
                      className="text-white/40 cursor-pointer hover:text-game-yellow transition-colors text-sm"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Email field */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">{t('profile.emailLabel')}</label>
              {editingField === 'email' ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                    placeholder={t('profile.enterNewEmail')}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateEmail}
                      disabled={loading}
                      className="bg-game-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? '...' : t('common.save')}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg">{user?.email || t('profile.noEmail')}</span>
                  {!user?.isGuest && (
                    <button
                      onClick={() => setEditingField('email')}
                      className="text-white/40 cursor-pointer hover:text-game-yellow transition-colors text-sm"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                  {user?.isGoogleUser && (
                    <span className="text-white/30 text-xs text-center mr-10">{t('profile.googleEmailRestriction')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Change Password field */}
            {!user?.isGuest && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">{t('profile.passwordLabel')}</label>
                {editingField === 'password' ? (
                  <div className="flex flex-col gap-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                      placeholder={t('profile.newPassword')}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                      placeholder={t('profile.confirmPassword')}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdatePassword}
                        disabled={loading}
                        className="bg-game-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? '...' : t('common.save')}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-white text-lg">••••••••</span>
                    <button
                      onClick={() => setEditingField('password')}
                      className="text-white/40 cursor-pointer hover:text-game-yellow transition-colors text-sm"
                    >
                      {t('profile.changePassword')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* GAME HISTORY SECTION */}
          {!user?.isGuest && (
            <div className="app-glass-card-strong backdrop-blur-xl rounded-3xl p-8 shadow-2xl mt-6">
              <h2 className="text-2xl font-extrabold text-white mb-6 text-center" style={{ textShadow: '2px 2px 0 #2563EB' }}>
                {t('profile.gameHistory')}
              </h2>
  
              {gameHistory.length === 0 && !historyLoading ? (
                <p className="text-white/50 text-center text-sm">{t('profile.noGameHistory')}</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {gameHistory.map((game, index) => {
                    const isLast = index === gameHistory.length - 1
                    const rankEmoji = game.finalRank === 1 ? '🥇' : game.finalRank === 2 ? '🥈' : game.finalRank === 3 ? '🥉' : `#${game.finalRank}`
                    return (
                      <div
                        key={game.gameSessionId}
                        ref={isLast ? lastHistoryRef : null}
                        className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{rankEmoji}</span>
                            <span className="text-white font-bold text-lg">
                              {game.finalScore} {t('common.point')}
                            </span>
                          </div>
                          <span className="text-white/40 text-xs">{formatDate(game.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-white/50 text-xs">
                          <span>🎯 {t('profile.rounds', { count: game.totalRounds })}</span>
                          <span>⏱️ {formatDuration(game.startDate, game.endDate)}</span>
                        </div>
                      </div>
                    )
                  })}
                  {historyLoading && (
                    <div className="text-center py-3">
                      <span className="text-white/40 text-sm">{t('common.loading')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LOGOUT BUTTON */}
          <div className="flex justify-center mt-6 sm:mt-8">
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg cursor-pointer"
            >
              {t('profile.logoutButton')}
            </button>
          </div>
        </div>
        <LegalFooter />
      </div>
      <GamePopup
        open={isLogoutPopupOpen}
        title={t('lobby.logoutTitle')}
        message={t('lobby.logoutMessage')}
        confirmText={t('lobby.confirmLogout')}
        cancelText={t('lobby.cancelLogout')}
        showCancel
        onCancel={() => setIsLogoutPopupOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  )
}

export default Profile
