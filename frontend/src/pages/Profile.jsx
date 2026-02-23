import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import AvatarPicker, { AVATARS } from '../components/AvatarPicker'
import LanguageSwitcher from '../components/LanguageSwitcher'

const XP_PER_LEVEL = 100

const getLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1
const getProgress = (xp) => (xp % XP_PER_LEVEL)

const Profile = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Mock XP for frontend testing (replace with user?.xp when backend is ready)
  const MOCK_XP = 720
  const xp = user?.xp || MOCK_XP
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
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // Update username
  // POST /player/:{id}/  {username}
  const handleUpdateUsername = async () => {
    if (!username.trim())
    {
      return
    }
    setLoading(true)
    try
    {
    /*
      API call to update username
      await api.post('/player/:{id}/', {username})
    */
      onUpdateUser?.({ ...user, username })
      showMessage(t('profile.usernameUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update username error:', error)
      showMessage(t('profile.usernameUpdateFailed'), 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update email
  // POST /player/:{id}/  {email}
  const handleUpdateEmail = async () => {
    if (!email.trim())
    {
      return
    }
    setLoading(true)
    try
    {
    /*
      API call to update email
      await api.post('/player/:{id}/', {email})
    */
      onUpdateUser?.({ ...user, email })
      showMessage(t('profile.emailUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update email error:', error)
      showMessage(t('profile.emailUpdateFailed'), 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update avatar
  // POST /player/:{id}/  {avatar: selectedAvatar.emoji}
  const handleUpdateAvatar = async () => {
    setLoading(true)
    try
    {
      /*
      API call to update avatar
      await api.post('/player/:{id}/', {avatar: selectedAvatar.emoji})
      */
      onUpdateUser?.({ ...user, avatar: selectedAvatar.emoji })
      showMessage(t('profile.avatarUpdated'))
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update avatar error:', error)
      showMessage(t('profile.avatarUpdateFailed'), 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  // Update password
  // POST /auth/update-password  {currentPassword, newPassword}
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword)
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
    /*
      API call to update password
      await api.post('/auth/update-password', { currentPassword, newPassword })
    */
      showMessage(t('profile.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setEditingField(null)
    }
    catch (error)
    {
      console.error('Update password error:', error)
      showMessage(t('profile.passwordUpdateFailed'), 'error')
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
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] p-4">
      <div className="max-w-2xl mx-auto">
        {/* back button and language switcher */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/lobby')}
            className="text-white hover:text-game-yellow transition-colors flex items-center gap-2 cursor-pointer text-sm font-medium"
          >
            {t('profile.goBack')}
          </button>
          <LanguageSwitcher />
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
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/20">
          <h1 className="text-4xl font-extrabold text-white mb-8 text-center" style={{ textShadow: '3px 3px 0 #2563EB' }}>
            {t('profile.title')}
          </h1>

          {/* AVATAR SECTION */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div
              className="w-32 h-32 cursor-pointer rounded-full bg-game-yellow flex items-center justify-center border-4 border-white shadow-lg hover:scale-105 transition-transform pt-2"
              onClick={() => setEditingField(editingField === 'avatar' ? null : 'avatar')}
              title={t('profile.clickToChangeAvatar')}
            >
              <span className="text-6xl">{editingField === 'avatar' ? selectedAvatar.emoji : user?.avatar}</span>
            </div>
            <button
              onClick={() => setEditingField(editingField === 'avatar' ? null : 'avatar')}
              className="text-white/60 hover:text-game-yellow text-sm transition-colors cursor-pointer"
            >
              {t('profile.changeAvatar')}
            </button>

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
                      className="text-white/40 hover:text-game-yellow transition-colors text-sm"
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
                      className="text-white/40 hover:text-game-yellow transition-colors text-sm cursor-pointer"
                    >
                      {t('common.edit')}
                    </button>
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
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-xl px-4 py-2.5 outline-none border border-white/20 focus:border-game-yellow transition-colors"
                      placeholder={t('profile.currentPassword')}
                    />
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
                        className="bg-game-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm disabled:opacity-50"
                      >
                        {loading ? '...' : 'تحديث كلمة المرور'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-xl transition-all text-sm cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-white text-lg">••••••••</span>
                    <button
                      onClick={() => setEditingField('password')}
                      className="text-white/40 hover:text-game-yellow transition-colors text-sm cursor-pointer"
                    >
                      {t('profile.changePassword')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LOGOUT BUTTON */}
          <div className="flex justify-center mt-8">
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg cursor-pointer"
            >
              {t('profile.logoutButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
