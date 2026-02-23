import Logo from '../components/Logo.jsx'
import Auth from '../components/Auth.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

function LoginPage({ onLogin }) {
  return (
    <>
      <div className="min-h-screen bg-linear-to-br from-[#2563EB] via-[#3B82F6] to-[#38BDF8] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Switcher */}
        <div className="absolute top-4 end-4 z-20">
          <LanguageSwitcher />
        </div>
      {/* Background */}
        <div className="absolute inset-0 opacity-65">
          <div className="absolute top-10 left-10 w-24 h-24 border-4 border-white rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-20 h-20 border-4 border-game-yellow rounded-lg rotate-45 animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 border-4 border-game-cyan rounded-full animate-bounce"></div>
          <div className="absolute bottom-1/3 right-1/3 w-10 h-10 bg-game-orange rounded-lg rotate-12 animate-bounce"></div>
          <div className="absolute top-20 right-1/3 w-14 h-14 border-4 border-game-green rounded-full animate-bounce"></div>
          <div className="absolute bottom-40 right-10 w-8 h-8 bg-white rounded-full animate-pulse"></div>
        </div>
      
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 w-full max-w-6xl z-10">
          {/* Logo - Right Side */}
          <div className="flex flex-col items-center gap-8">
            <Logo/>
          </div>

          {/* Auth and Login - Left Side */}
          <Auth onLogin={onLogin} />
        </div>
      </div>
    </>
  )
}

export default LoginPage
