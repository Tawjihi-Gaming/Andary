import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const currentLanguage = i18n.language?.split('-')[0] || 'ar'

  const languages = [
    { code: 'ar', label: 'ع', flag: '🇸🇦', title: 'التبديل إلى العربية' },
    { code: 'en', label: 'EN', flag: '🇬🇧', title: 'Switch to English' },
    { code: 'ch', label: '中文', flag: '🇨🇳', title: '切换到中文' },
  ]

  const switchLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode)
    setIsOpen(false)
  }

  const activeLanguage = languages.find((language) => language.code === currentLanguage) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={containerRef} dir="ltr" className="relative">
      <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="app-soft-btn flex items-center gap-2 font-medium px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition-colors duration-300 cursor-pointer"
        title={activeLanguage.title}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-base">{activeLanguage.flag}</span>
        <span>{activeLanguage.label}</span>
        <motion.span
          animate={reduceMotion ? undefined : { rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-[10px] sm:text-xs"
          style={{ color: 'var(--app-text-muted)' }}
        >
          ▶
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, width: 0, x: -6 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, width: 'auto', x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, width: 0, x: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
          <motion.ul
            initial={reduceMotion ? undefined : { opacity: 0.85 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0.85 }}
            transition={{ duration: 0.15 }}
            className="flex items-stretch backdrop-blur-md rounded-xl shadow-lg"
            style={{
              background: 'var(--app-card-bg-strong)',
              border: '1px solid var(--app-card-border)',
            }}
            role="listbox"
          >
            {languages.map((language) => {
              const isActive = currentLanguage === language.code

              return (
                <li key={language.code}>
                  <button
                    type="button"
                    onClick={() => switchLanguage(language.code)}
                    className={`h-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm transition-colors duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-yellow-500 text-white rounded-xl'
                        : 'hover:bg-white/15 rounded-xl text-app-text-soft'
                    }`}
                    style={isActive ? undefined : { color: 'var(--app-text-soft)' }}
                    title={language.title}
                    role="option"
                    aria-selected={isActive}
                  >
                    <span className="text-base">{language.flag}</span>
                    <span>{language.label}</span>
                  </button>
                </li>
              )
            })}
          </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

export default LanguageSwitcher
