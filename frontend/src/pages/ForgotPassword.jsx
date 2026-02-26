import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import LanguageSwitcher from '../components/LanguageSwitcher'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const getForgotPasswordMessage = (msg) => {
    if (!msg) {
      return t('auth.forgotPasswordError')
    }

    if (msg === 'If an account with that email exists, a reset link has been sent') {
      return t('auth.forgotPasswordSuccess')
    }

    if (msg === 'Email is required') {
      return t('auth.forgotPasswordEmailRequired')
    }

    return t('auth.forgotPasswordError')
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

    setLoading(true)
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() })
      showMessage(`✅ ${getForgotPasswordMessage(response.data?.msg)}`, 'success')
      setEmail('')
    }
    catch (error)
    {
      const errorMsg = getForgotPasswordMessage(error.response?.data?.msg)
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

      <div className="w-full max-w-md app-glass-card-strong backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold m-1 text-white text-center mb-2" style={{ textShadow: '3px 3px 0 #2563EB' }}>
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-white/80 text-center text-sm mb-6">{t('auth.forgotPasswordSubtitle')}</p>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              placeholder={t('auth.email')}
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-3 sm:py-4 px-4 sm:px-5 pe-12 border-2 border-white/20 focus:!border-game-cyan focus:!bg-white/20 transition-all duration-200"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <svg className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 text-game-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>

          <button
            type="submit"
            className="btn-game w-full bg-game-yellow text-gray-900 font-bold text-base sm:text-lg py-3 sm:py-4 rounded-xl shadow-[0_4px_0_#D97706] border-0 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? t('common.processing') : t('auth.sendResetLink')}
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

export default ForgotPassword
