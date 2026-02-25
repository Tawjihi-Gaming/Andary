import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

const PrivacyPolicy = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen app-page-bg p-4">
      <div className="max-w-3xl mx-auto">
        {/* Top bar */}
        <div dir="ltr" className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 mb-6">
          <LanguageSwitcher />
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-game-yellow transition-colors flex items-center gap-2 cursor-pointer text-sm font-medium"
          >
            ← {t('common.back')}
          </button>
        </div>

        {/* Content card */}
        <div className="app-glass-card-strong backdrop-blur-xl rounded-3xl p-4 sm:p-8 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 text-center" style={{ textShadow: '3px 3px 0 #2563EB' }}>
            {t('legal.privacyPolicyTitle')}
          </h1>
          <p className="text-white/40 text-sm text-center mb-6 sm:mb-8">{t('legal.lastUpdated')}: 2026-02-25</p>

          <div className="space-y-5 sm:space-y-6 text-white/80 text-sm sm:text-base leading-relaxed">
            {/* Introduction */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.introTitle')}</h2>
              <p>{t('privacy.introText')}</p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.collectTitle')}</h2>
              <p className="mb-2">{t('privacy.collectIntro')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>{t('privacy.collectItem1')}</li>
                <li>{t('privacy.collectItem2')}</li>
                <li>{t('privacy.collectItem3')}</li>
                <li>{t('privacy.collectItem4')}</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.useTitle')}</h2>
              <p className="mb-2">{t('privacy.useIntro')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>{t('privacy.useItem1')}</li>
                <li>{t('privacy.useItem2')}</li>
                <li>{t('privacy.useItem3')}</li>
                <li>{t('privacy.useItem4')}</li>
              </ul>
            </section>

            {/* Data Storage & Security */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.storageTitle')}</h2>
              <p>{t('privacy.storageText')}</p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.cookiesTitle')}</h2>
              <p>{t('privacy.cookiesText')}</p>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.thirdPartyTitle')}</h2>
              <p>{t('privacy.thirdPartyText')}</p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.childrenTitle')}</h2>
              <p>{t('privacy.childrenText')}</p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.rightsTitle')}</h2>
              <p className="mb-2">{t('privacy.rightsIntro')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>{t('privacy.rightsItem1')}</li>
                <li>{t('privacy.rightsItem2')}</li>
                <li>{t('privacy.rightsItem3')}</li>
              </ul>
            </section>

            {/* Contact */}
            {/* <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('privacy.contactTitle')}</h2>
              <p>{t('privacy.contactText')}</p>
            </section> */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
