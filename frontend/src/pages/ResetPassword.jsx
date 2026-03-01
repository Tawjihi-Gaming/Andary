import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resetPassword as resetPasswordApi } from '../api/auth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import PasswordInput from '../components/PasswordInput'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const getResetPasswordMessage = (msg) => {
    if (!msg) {
      return t('auth.resetPasswordError')
    }

    if (msg === 'Password has been reset') {
      return t('auth.resetPasswordSuccess')
    }

    if (msg === 'Invalid or expired token') {
      return t('auth.resetPasswordInvalidToken')
    }

    return t('auth.resetPasswordError')
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) {
      return
    }

    if (!token) {
      showMessage(`❌ ${t('auth.resetPasswordMissingToken')}`, 'error')
      return
    }

    if (newPassword.length < 6) {
      showMessage(`❌ ${t('auth.resetPasswordMinLength')}`, 'error')
      return
    }

    if (newPassword.length > 100) {
      showMessage(`❌ ${t('auth.resetPasswordMaxLength')}`, 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showMessage(`❌ ${t('auth.resetPasswordMismatch')}`, 'error')
      return
    }

    setLoading(true)
    try {
      const response = await resetPasswordApi(token, newPassword)
      showMessage(`✅ ${getResetPasswordMessage(response.data?.msg)}`, 'success')
      setNewPassword('')
      setConfirmPassword('')
    }
    catch (error)
    {
      const errorMsg = getResetPasswordMessage(error.response?.data?.msg)
      showMessage(`❌ ${errorMsg}`, 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-page-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div dir="ltr" className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md lg:max-w-lg app-glass-card-strong backdrop-blur-xl rounded-3xl p-4 sm:p-6 xl:p-8 shadow-2xl z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white m-1 text-center mb-2" style={{ textShadow: '3px 3px 0 #2563EB' }}>
          {t('auth.resetPasswordTitle')}
        </h1>
        <p className="text-white/80 text-center text-sm mb-6">{t('auth.resetPasswordSubtitle')}</p>

        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium animate-fade-in transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ms-2 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {!token && (
          <div className="mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30" dir={isRTL ? 'rtl' : 'ltr'}>
            ❌ {t('auth.resetPasswordMissingToken')}
          </div>
        )}

        <p className="text-white/50 text-xs text-center mb-4">{t('auth.passwordPolicy')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
              placeholder={t('auth.newPassword')}
              value={newPassword}
              required
              minLength={6}
              maxLength={100}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-3 sm:py-4 px-4 sm:px-5 pe-12 border-2 border-white/20 focus:!border-game-blue focus:!bg-white/20 transition-all duration-200"
              dir={isRTL ? 'rtl' : 'ltr'}
            />

          <PasswordInput
              placeholder={t('auth.confirmNewPassword')}
              value={confirmPassword}
              required
              minLength={6}
              maxLength={100}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-3 sm:py-4 px-4 sm:px-5 pe-12 border-2 border-white/20 focus:!border-game-blue focus:!bg-white/20 transition-all duration-200"
              dir={isRTL ? 'rtl' : 'ltr'}
            />

          <button
            type="submit"
            className="btn-game w-full bg-game-yellow text-gray-900 hover:text-black font-bold text-base sm:text-lg py-3 sm:py-4 rounded-xl shadow-[0_4px_0_#D97706] border-0 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading || !token}
          >
            {loading ? t('common.processing') : t('auth.resetPasswordButton')}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link
            to="/login"
            className="text-white/80 hover:text-game-yellow text-sm transition-colors"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
