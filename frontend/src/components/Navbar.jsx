import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import api from '../api/axios'
import GamePopup from './GamePopup'


const Navbar = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false)
  const [isBurgerOpen, setIsBurgerOpen] = useState(false)
  const burgerRef = useRef(null)

  // Close burger menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (burgerRef.current && !burgerRef.current.contains(e.target)) {
        setIsBurgerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setIsBurgerOpen(false)
    setIsLogoutPopupOpen(true)
  }

  const confirmLogout = async () => {
    setIsLogoutPopupOpen(false)
    if (user?.isGuest) {
      if (onLogout) {
        onLogout()
      }
      navigate('/login')
      return
    }
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
    <div className="relative z-50">
        <nav dir="rtl" className="relative px-3 sm:px-6 xl:px-8 py-3 xl:py-4">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between">
          {/* Logo + language switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/lobby')}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 bg-linear-to-br from-game-yellow to-game-orange rounded-xl flex items-center justify-center shadow-lg shadow-game-yellow/20 group-hover:scale-105 transition-transform">
                <span className="text-xl sm:text-2xl xl:text-3xl pt-1 sm:pt-2">🎓</span>
              </div>
              <h1 className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-white">
                Andary
              </h1>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Desktop: user info & logout */}
          <div className="hidden sm:flex items-center gap-3">
            {/* user profile */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 app-soft-btn border border-transparent hover:bg-game-yellow/20 hover:border-game-yellow/30 font-semibold px-4 py-2.5 rounded-2xl transition-all duration-300 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-3xl bg-linear-to-br from-game-yellow to-game-orange flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-game-yellow/20 transition-all">
                <span className="text-xl pt-1">{user?.avatar}</span>
              </div>
              <span className="text-white/90 group-hover:text-game-yellow truncate transition-colors">{user?.username || 'Player'}</span>
            </button>

            {/* friends button */}
            <button
              onClick={() => navigate('/friends')}
              className="app-soft-btn border border-transparent hover:bg-game-purple/20 hover:text-game-yellow hover:border-game-purple/30 font-semibold px-5 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer"
            >
              👥 {t('friends.navButton')}
            </button>

            {/* logout button */}
            <button
              onClick={handleLogout}
              className="app-soft-btn border border-transparent hover:bg-red-500/20 hover:text-game-yellow hover:border-red-500/30 font-semibold px-5 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer"
            >
              {t('lobby.logout')}
            </button>
          </div>

          {/* Mobile: burger menu */}
          <div className="sm:hidden relative" ref={burgerRef}>
            <button
              onClick={() => setIsBurgerOpen(!isBurgerOpen)}
              className="app-soft-btn border border-transparent hover:bg-game-yellow/20 hover:border-game-yellow/30 p-2.5 rounded-xl transition-all duration-300 cursor-pointer"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1.5 w-6">
                <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${isBurgerOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${isBurgerOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${isBurgerOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>

            {/* Dropdown menu */}
            {isBurgerOpen && (
              <div className="absolute left-0 sm:right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-game-dark/95 backdrop-blur-md shadow-xl shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* user profile */}
                <button
                  onClick={() => { setIsBurgerOpen(false); navigate('/profile') }}
                  className="group flex items-center gap-3 w-full px-4 py-3 hover:bg-game-yellow/15 hover:pl-5 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-game-yellow to-game-orange flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-game-yellow/20 group-hover:scale-105 transition-all duration-200">
                    <span className="text-lg pt-0.5">{user?.avatar}</span>
                  </div>
                  <span className="text-white/90 font-semibold truncate group-hover:text-game-yellow transition-colors duration-200">{user?.username || 'Player'}</span>
                </button>

                <div className="h-px bg-white/10 mx-3" />

                {/* friends */}
                <button
                  onClick={() => { setIsBurgerOpen(false); navigate('/friends') }}
                  className="group flex items-center gap-3 w-full px-4 py-3 hover:bg-game-purple/15 hover:pl-5 transition-all duration-200 cursor-pointer"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform duration-200">👥</span>
                  <span className="text-white/90 font-semibold group-hover:text-game-yellow transition-colors duration-200">{t('friends.navButton')}</span>
                </button>

                <div className="h-px bg-white/10 mx-3" />

                {/* logout */}
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-3 w-full px-4 py-3 hover:bg-red-500/15 hover:pl-5 transition-all duration-200 cursor-pointer"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform duration-200">🚪</span>
                  <span className="text-red-400 font-semibold group-hover:text-red-300 transition-colors duration-200">{t('lobby.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
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

export default Navbar;