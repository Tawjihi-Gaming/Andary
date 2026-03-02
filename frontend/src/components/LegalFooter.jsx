import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const LegalFooter = () => {
  const { t } = useTranslation()

  return (
    <footer className="flex flex-col items-center mt-10 w-full max-w-md lg:max-w-lg mx-auto py-4 sm:py-5">
        <div className="flex items-center justify-center gap-3 text-sm text-white/40">
        <Link
          to="/privacy-policy"
          className="hover:text-game-yellow transition-colors duration-200"
        >
          {t('legal.privacyPolicy')}
        </Link>
        <span>•</span>
        <Link
          to="/terms-of-service"
          className="hover:text-game-yellow transition-colors duration-200"
        >
          {t('legal.termsOfService')}
        </Link>
      </div>
      <p className="text-center text-white/25 text-xs mt-2">
        © 2026 Andary. {t('legal.allRightsReserved')}
      </p>
    </footer>
  )
}

export default LegalFooter
