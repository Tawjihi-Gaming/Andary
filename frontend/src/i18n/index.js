import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ar from './locales/ar.json'
import en from './locales/en.json'
import ch from './locales/ch.json' 


i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      ch: { translation: ch },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en', 'ch'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

// Set document direction based on language  
const setDirection = (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lng
}

setDirection(i18n.language?.startsWith('ar') ? 'ar' : i18n.language || 'ar')

i18n.on('languageChanged', (lng) => {
  setDirection(lng)
})

export default i18n
