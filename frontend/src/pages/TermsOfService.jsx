import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

const TermsOfService = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen app-page-bg p-4 lg:p-8">
      <div className="max-w-3xl xl:max-w-4xl mx-auto">
        {/* Top bar */}
        <div dir="ltr" className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 mb-6">
          <LanguageSwitcher />
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-game-yellow transition-colors flex items-center gap-2 cursor-pointer text-sm font-medium border border-white/30 hover:border-game-yellow rounded-lg px-4 py-2"
          >
            ← {t('common.back')}
          </button>
        </div>

        {/* Content card */}
        <div className="app-glass-card-strong backdrop-blur-xl rounded-3xl p-4 sm:p-8 xl:p-10 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white mb-2 text-center" style={{ textShadow: '3px 3px 0 #2563EB' }}>
            {t('legal.termsTitle')}
          </h1>
          <p className="text-white/40 text-sm text-center mb-6 sm:mb-8">{t('legal.lastUpdated')}: 2026-02-25</p>

          <div className="space-y-5 sm:space-y-6 text-white/80 text-sm sm:text-base leading-relaxed">
            {/* Acceptance */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.acceptTitle')}</h2>
              <p>{t('terms.acceptText')}</p>
            </section>

            {/* Description of Service */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.descTitle')}</h2>
              <p>{t('terms.descText')}</p>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.accountsTitle')}</h2>
              <p className="mb-2">{t('terms.accountsIntro')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>{t('terms.accountsItem1')}</li>
                <li>{t('terms.accountsItem2')}</li>
                <li>{t('terms.accountsItem3')}</li>
              </ul>
            </section>

            {/* Guest Access */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.guestTitle')}</h2>
              <p>{t('terms.guestText')}</p>
            </section>

            {/* User Conduct */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.conductTitle')}</h2>
              <p className="mb-2">{t('terms.conductIntro')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>{t('terms.conductItem1')}</li>
                <li>{t('terms.conductItem2')}</li>
                <li>{t('terms.conductItem3')}</li>
                <li>{t('terms.conductItem4')}</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.ipTitle')}</h2>
              <p>{t('terms.ipText')}</p>
            </section>

            {/* Game Content */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.contentTitle')}</h2>
              <p>{t('terms.contentText')}</p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.liabilityTitle')}</h2>
              <p>{t('terms.liabilityText')}</p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.terminationTitle')}</h2>
              <p>{t('terms.terminationText')}</p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-game-yellow mb-2">{t('terms.changesTitle')}</h2>
              <p>{t('terms.changesText')}</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
