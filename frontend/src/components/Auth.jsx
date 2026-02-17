import { useState } from 'react'
import api from '../api/axios'
import AvatarPicker, { AVATARS } from './AvatarPicker'

const Auth = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('guest')
  const [guestName, setGuestName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [message, setMessage] = useState(null) // { text, type: 'success' | 'error' }
  const [loading, setLoading] = useState(false)

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleGoogleLogin = async () => {
    if (loading)
    {
      return;
    }
    setLoading(true);

    try
    {
      const res = await api.get('/auth/google-login')
      window.location.href = res.data.url
    }
    catch (error)
    {
      console.error('Google login error:', error)
      showMessage('❌ حدث خطأ أثناء تسجيل الدخول بجوجل.', 'error')
      setLoading(false);
    }
  }

  const handleGuestPlay = (e) => {
    e.preventDefault()
    // Pass guest user data
    const userData = {
      id: null, // No real ID for guests
      username: guestName,
      avatar: selectedAvatar.emoji,
      xp: 0,
      isGuest: true
    }
    onLogin?.(userData)
  }

  // handle sign in
  const handleAuth = async (e) => {
    e.preventDefault()
    if (loading)
    {
      return;
    }
    setLoading(true)

    try
    {
      if (isSignUp)
      {
        await api.post('/auth/signup', {
          username: displayName,
          email,
          password,
          avatar: selectedAvatar.emoji,
        })
        showMessage('✅ تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success')
      }
      else
      {
        /*
        Login API
        */
        const response = await api.post('/auth/login', {
          email,
          password
        })
        showMessage('✅ تم تسجيل الدخول بنجاح!', 'success')
        // Build user object from the backend response to pass to Lobby
        const userData = {
          id: response.data.user?.id,
          username: response.data.user?.displayName || email.split('@')[0],
          email: email,
          avatar: response.data.user?.avatar || '👤',
          xp: response.data.user?.xp || 0,
          isGuest: false
        }
        setTimeout(() => onLogin?.(userData), 1000)
      }
    }
    catch (error)
    {
      console.error('Auth error:', error)
      showMessage('❌ حدث خطأ أثناء العملية. يرجى المحاولة مرة أخرى.', 'error')
    }
    finally
    {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card bg-white/10 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-white/20">
      {/* Toast Message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium animate-fade-in transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}
          dir="rtl"
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="mr-2 text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs (Guest or Loggin)*/}
      <div className="flex rounded-xl overflow-hidden mb-5 bg-white/10 p-1">
        <button
          onClick={() => setActiveTab('guest')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
            activeTab === 'guest' ? 'tab-active' : 'tab-inactive hover:bg-white/20'
          }`}
        >
          العب كضيف
        </button>
        <button
          onClick={() => setActiveTab('signin')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
            activeTab === 'signin' ? 'tab-active' : 'tab-inactive hover:bg-white/20'
          }`}
        >
          تسجيل الدخول
        </button>
      </div>

      {/* Guest Tab Content */}
      {activeTab === 'guest' && (
        <form onSubmit={handleGuestPlay} className="space-y-4">
          <div className="selected-avatar mb-4">
            {/* Selected avatar preview */}
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 border-4 shadow-lg transition-all duration-300 ${
              selectedAvatar
                ? `bg-linear-to-br ${selectedAvatar.bg} border-game-yellow`
                : 'bg-game-blue border-white/30'
            }`}>
              {selectedAvatar ? (
                <span className="text-4xl">{selectedAvatar.emoji}</span>
              ) : (
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <p className="text-white/80 text-center text-sm">ادخل اسمك واختر صورتك</p>
          </div>

          {/* Avatar Picker */}
          <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />

          <div className="relative">
            <input
              type="text"
              placeholder="اسم اللاعب"
              value={guestName}
              required
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-4 px-5 pr-12 border-2 border-white/20 focus:border-game-yellow focus:bg-white/20 transition-all duration-200"
              dir="rtl"
            />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>

          <button
            type="submit"
            className="btn-game w-full bg-game-yellow text-gray-900 font-bold text-lg py-4 rounded-xl shadow-[0_4px_0_#D97706] border-0 mt-4"
          >
            🎮 ابدأ اللعب
          </button>
        </form>
      )}

      {/* Sign In Tab Content */}
      {activeTab === 'signin' && (
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Toggle Sign In / Sign Up */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                !isSignUp ? 'text-game-yellow border-game-yellow' : 'text-white/60 border-transparent hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                isSignUp ? 'text-game-yellow border-game-yellow' : 'text-white/60 border-transparent hover:text-white'
              }`}
            >
              حساب جديد
            </button>
          </div>

          <div className="relative">
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-4 px-5 pr-12 border-2 border-white/20 focus:border-game-cyan focus:bg-white/20 transition-all duration-200"
              dir="rtl"
            />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-game-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-4 px-5 pr-12 border-2 border-white/20 focus:border-game-blue focus:bg-white/20 transition-all duration-200"
              dir="rtl"
            />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-game-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Display Name & Avatar - Only shown for sign up */}
          {isSignUp && (
            <>
              <div className="relative">
                <input
                  type="text"
                  placeholder="اسم العرض (مطلوب)"
                  value={displayName}
                  required
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl py-4 px-5 pr-12 border-2 border-white/20 focus:border-game-green focus:bg-white/20 transition-all duration-200"
                  dir="rtl"
                />
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-game-green" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>

              {/* Avatar Picker for Sign Up */}
              <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            </>
          )}

          <button
            type="submit"
            className="btn-game w-full bg-game-yellow text-gray-900 font-bold text-lg py-4 rounded-xl shadow-[0_4px_0_#D97706] border-0 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? '...جاري المعالجة' : (isSignUp ? '📝 انشاء حساب' : '🔐 دخول')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="text-white/50 text-sm font-medium">أو</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          {/* Social Login */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex-1 bg-white hover:bg-gray-300 text-gray-800 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 font-medium shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> جاري المعالجة</span>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Auth
