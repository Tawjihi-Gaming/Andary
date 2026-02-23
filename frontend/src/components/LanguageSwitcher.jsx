import { useTranslation } from 'react-i18next'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar'
    i18n.changeLanguage(newLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white font-medium px-3 py-1.5 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20 text-sm cursor-pointer"
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <span className="text-base">{isArabic ? '🇬🇧' : '🇸🇦'}</span>
      <span>{isArabic ? 'EN' : 'ع'}</span>
    </button>
  )
}

export default LanguageSwitcher
