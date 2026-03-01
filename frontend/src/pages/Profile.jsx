import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import { editPlayer } from '../api/auth'
import AvatarPicker, { AVATARS } from '../components/AvatarPicker'
import LegalFooter from '../components/LegalFooter'
import PasswordInput from '../components/PasswordInput'
import Navbar from '../components/Navbar'

const XP_PER_LEVEL = 100

const getLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1
const getProgress = (xp) => (xp % XP_PER_LEVEL)

const profileErrorMap = {
  'Email is already in use by another account': 'profile.emailInUse',
  'Google-registered users cannot modify their email.': 'profile.googleEmailRestriction',
  'New password must be different from the current password': 'profile.passwordSameAsCurrent',
  "Can't update password for OAuth user": 'profile.oauthPasswordRestriction',
  'Password hash missing, cannot update password': 'profile.passwordHashMissing',
}

const Profile = ({ user, onLogout, onUpdateUser }) => {
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
      const res = await api.get('/history/' + user.id, {
        params: { pageNumber: page, pageSize: PAGE_SIZE }
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
      if (error.response?.status === 204)
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


  // Update username
  const handleUpdateUsername = async () => {
    const trimmed = username.trim()
    if (!trimmed)
    {
      return
    }
    if (trimmed.length < 3)
    {
      showMessage(t('profile.usernameMinLength'), 'error')
      return
    }
    if (trimmed.length > 50)
    {
      showMessage(t('profile.usernameMaxLength'), 'error')
      return
    }
    setLoading(true)
    try
    {
      await editPlayer({ username: trimmed })
      onUpdateUser?.({ ...user, username: trimmed })
      showMessage(t('profile.usernameUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update username error:', error)
      const backendMsg = error.response?.data?.msg || ''
      const msg = profileErrorMap[backendMsg] ? t(profileErrorMap[backendMsg]) : t('profile.usernameUpdateFailed')
      showMessage(msg, 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update email
  const handleUpdateEmail = async () => {
    const trimmed = email.trim()
    if (!trimmed)
    {
      return
    }
    if (trimmed.length > 50)
    {
      showMessage(t('profile.emailMaxLength'), 'error')
      return
    }
    setLoading(true)
    try
    {
      await editPlayer({ email: trimmed })
      onUpdateUser?.({ ...user, email: trimmed })
      showMessage(t('profile.emailUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update email error:', error)
      const backendMsg = error.response?.data?.msg || ''
      const msg = profileErrorMap[backendMsg] ? t(profileErrorMap[backendMsg]) : t('profile.emailUpdateFailed')
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
      await editPlayer({ avatarImageName: selectedAvatar.emoji })
      onUpdateUser?.({ ...user, avatar: selectedAvatar.emoji })
      showMessage(t('profile.avatarUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update avatar error:', error)
      const backendMsg = error.response?.data?.msg || ''
      const msg = profileErrorMap[backendMsg] ? t(profileErrorMap[backendMsg]) : t('profile.avatarUpdateFailed')
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
    if (newPassword.length > 100)
    {
      showMessage(t('profile.passwordMaxLength'), 'error')
      return
    }
    setLoading(true)
    try
    {
      await editPlayer({ password: newPassword })
      showMessage(t('profile.passwordUpdated'))
      setNewPassword('')
      setConfirmPassword('')
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update password error:', error)
      const backendMsg = error.response?.data?.msg || ''
      const msg = profileErrorMap[backendMsg] ? t(profileErrorMap[backendMsg]) : t('profile.passwordUpdateFailed')
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

  return (
    <div className="min-h-screen app-page-bg relative overflow-hidden">
      <div className="relative z-10">
        <Navbar user={user} onLogout={onLogout} />
      </div>
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">

        {/* toast message */}
        {message && (
          <div
            className={`mb-4 px-4 py-3  rounded-xl text-center text-sm font-medium animate-fade-in transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* profile card */}
        <div className="app-glass-card-strong m-4 backdrop-blur-xl rounded-3xl p-4 sm:p-8 xl:p-10 shadow-2xl">
          <h1 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold text-white mb-6 sm:mb-8 text-center" style={{ textShadow: '3px 3px 0 #2563EB' }}>
            {t('profile.title')}
          </h1>

          {/* AVATAR SECTION */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div
              className={`w-24 h-24 sm:w-32 sm:h-32 xl:w-40 xl:h-40 rounded-full bg-game-yellow pt-2 flex items-center justify-center border-4 border-white shadow-lg transition-transform ${!user?.isGuest ? 'cursor-pointer hover:scale-105' : ''}`}
              onClick={() => !user?.isGuest && setEditingField(editingField === 'avatar' ? null : 'avatar')}
              title={!user?.isGuest ? t('profile.clickToChangeAvatar') : undefined}
            >
              <span className="text-5xl sm:text-6xl xl:text-7xl">{editingField === 'avatar' ? selectedAvatar.emoji : user?.avatar}</span>
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
            {editingField === 'avatar' && !user?.isGuest && (
              <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 border border-white/20">
                <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
                <div className="flex gap-2 mt-3 justify-center">
                  <button
                    onClick={handleUpdateAvatar}
                    disabled={loading}
                    className="bg-game-green hover:bg-green-600 text-white hover:text-yellow-100 font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? '...' : t('common.save')}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-white/10 hover:bg-white/20 text-white hover:text-game-yellow font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LEVEL & XP BAR */}
          {!user?.isGuest && (
            <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-8">
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
          <div className="space-y-4 max-w-md lg:max-w-lg xl:max-w-xl mx-auto">

            {/* Player ID field */}
            {!user?.isGuest && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">{t('profile.playerId')}</label>
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg font-semibold">{user?.id}</span>
                </div>
              </div>
            )}

            {/* Username field */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">{t('profile.username')}</label>
              {editingField === 'username' ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={username}
                    maxLength={20}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                    placeholder={t('profile.enterNewUsername')}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateUsername}
                      disabled={loading}
                      className="bg-game-green hover:bg-green-600 text-white hover:text-yellow-100 font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? '...' : t('common.save')}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-white/10 hover:bg-white/20 text-white hover:text-game-yellow font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
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
              {editingField === 'email' && !user?.isGoogleUser ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="email"
                    value={email}
                    maxLength={50}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                    placeholder={t('profile.enterNewEmail')}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateEmail}
                      disabled={loading}
                      className="bg-game-green hover:bg-green-600 text-white hover:text-yellow-100 font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? '...' : t('common.save')}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-white/10 hover:bg-white/20 text-white hover:text-game-yellow font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg">{user?.email || t('profile.noEmail')}</span>
                  {!user?.isGuest && !user?.isGoogleUser && (
                    <button
                      onClick={() => setEditingField('email')}
                      className="text-white/40 cursor-pointer hover:text-game-yellow transition-colors text-sm"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                </div>
                {user?.isGoogleUser && (
                  <p className="text-white/30 text-xs mt-2">{t('profile.googleEmailRestriction')}</p>
                )}
                </>
              )}
            </div>

            {/* Change Password field */}
            {!user?.isGuest && !user?.isGoogleUser && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">{t('profile.passwordLabel')}</label>
                {editingField === 'password' ? (
                  <div className="flex flex-col gap-3">
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 pe-12 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                      placeholder={t('profile.newPassword')}
                      minLength={6}
                      maxLength={100}
                    />
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 pe-12 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                      placeholder={t('profile.confirmPassword')}
                      minLength={6}
                      maxLength={100}
                    />
                    <p className="text-white/50 text-xs">{t('auth.passwordPolicy')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdatePassword}
                        disabled={loading}
                        className="bg-game-green hover:bg-green-600 text-white hover:text-yellow-100 font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? '...' : t('common.save')}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-white/10 hover:bg-white/20 text-white hover:text-game-yellow font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
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
            <div className="app-glass-card-strong backdrop-blur-xl rounded-3xl p-8 xl:p-10 shadow-2xl mt-6">
              <h2 className="text-2xl xl:text-3xl font-extrabold text-white mb-6 text-center" style={{ textShadow: '2px 2px 0 #2563EB' }}>
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
                        </div>
                        <div className="flex items-center gap-4 text-white/50 text-xs">
                          <span>🎯 {t('profile.rounds', { count: game.totalRounds })}</span>
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
        </div>
        <LegalFooter />
      </div>
    </div>
  )
}

export default Profile
