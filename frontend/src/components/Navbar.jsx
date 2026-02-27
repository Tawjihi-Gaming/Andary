import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import api from '../api/axios'
import GamePopup from './GamePopup'


const Navbar = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false)



  const handleLogout = () => {
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
        <nav dir="rtl" className="relative px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo + language switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/lobby')}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-game-yellow to-game-orange rounded-xl flex items-center justify-center shadow-lg shadow-game-yellow/20 group-hover:scale-105 transition-transform">
                <span className="text-xl sm:text-2xl pt-1 sm:pt-2">🎓</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Andary
              </h1>
            </div>
            <LanguageSwitcher />
          </div>

          {/* user info & logout */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* user profile */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 sm:gap-3 app-soft-btn border border-transparent hover:bg-game-yellow/20 hover:border-game-yellow/30 font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-3xl bg-linear-to-br from-game-yellow to-game-orange flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-game-yellow/20 transition-all">
                <span className="text-xl pt-1">{user?.avatar}</span>
              </div>
              <span className="text-white/90 group-hover:text-game-yellow max-w-24 sm:max-w-none truncate transition-colors">{user?.username || 'Player'}</span>
            </button>

            {/* friends button */}
            <button
              onClick={() => navigate('/friends')}
              className="app-soft-btn border border-transparent hover:bg-game-purple/20 hover:text-game-yellow hover:border-game-purple/30 font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 cursor-pointer"
            >
              👥 {t('friends.navButton')}
            </button>

            {/* logout button */}
            <button
              onClick={handleLogout}
              className="app-soft-btn border border-transparent hover:bg-red-500/20 hover:text-game-yellow hover:border-red-500/30 font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 cursor-pointer"
            >
              {t('lobby.logout')}
            </button>
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