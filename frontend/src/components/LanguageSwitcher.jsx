import { useTranslation } from 'react-i18next'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language?.split('-')[0] || 'ar'

  const languages = [
    { code: 'ar', label: 'ع', flag: '🇸🇦', title: 'التبديل إلى العربية' },
    { code: 'en', label: 'EN', flag: '🇬🇧', title: 'Switch to English' },
    { code: 'ch', label: '中文', flag: '🇨🇳', title: '切换到中文' },
  ]

  const switchLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode)
  }

  return (
    <div dir="ltr" className="flex items-center gap-1 sm:gap-2 flex-wrap">
      {languages.map((language) => {
        const isActive = currentLanguage === language.code

        return (
          <button
            key={language.code}
            onClick={() => switchLanguage(language.code)}
            className={`flex items-center gap-1 sm:gap-1.5 font-medium px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-all duration-300 border text-xs sm:text-sm cursor-pointer ${
              isActive
                ? 'bg-yellow-500 text-white border-yellow-500'
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/10 hover:border-white/20'
            }`}
            title={language.title}
          >
            <span className="text-base">{language.flag}</span>
            <span className="hidden sm:inline">{language.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
