import Logo from '../components/Logo.jsx'
import Auth from '../components/Auth.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import LegalFooter from '../components/LegalFooter.jsx'
import { motion, useReducedMotion } from 'motion/react'

const floatingOrbs = [
  { className: 'top-8 left-8 w-28 h-28 border-4 border-white/70 rounded-full', duration: 9, delay: 0 },
  { className: 'top-36 right-16 w-20 h-20 border-4 border-game-yellow/80 rounded-2xl', duration: 7.5, delay: 0.3 },
  { className: 'bottom-16 left-1/4 w-16 h-16 border-4 border-game-cyan/80 rounded-full', duration: 8.5, delay: 0.6 },
  { className: 'bottom-1/3 right-1/3 w-12 h-12 bg-game-orange/80 rounded-xl', duration: 6.8, delay: 0.9 },
  { className: 'top-24 right-1/3 w-14 h-14 border-4 border-game-green/80 rounded-full', duration: 7.8, delay: 0.4 },
  { className: 'bottom-36 right-10 w-10 h-10 bg-white/80 rounded-full', duration: 6.2, delay: 0.7 },
]

function LoginPage({ onLogin }) {
  const reduceMotion = useReducedMotion()

  return (
    <>
      <div className="min-h-screen app-page-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Switcher */}
        <div dir="ltr" className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
          <LanguageSwitcher />
        </div>
      {/* Background */}
        <div className="absolute inset-0 opacity-70 pointer-events-none hidden sm:block">
          <motion.div
            className="absolute -top-24 -left-24 w-72 h-72 bg-game-cyan/25 rounded-full blur-3xl"
            animate={reduceMotion ? undefined : { x: [0, 45, -15, 0], y: [0, 18, -22, 0], scale: [1, 1.08, 0.96, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 -right-24 w-80 h-80 bg-game-yellow/20 rounded-full blur-3xl"
            animate={reduceMotion ? undefined : { x: [0, -40, 12, 0], y: [0, -24, 18, 0], scale: [1, 0.95, 1.06, 1] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />

          {floatingOrbs.map((orb, index) => (
            <motion.div
              key={index}
              className={`absolute ${orb.className}`}
              animate={reduceMotion ? undefined : {
                y: [0, -18, 8, 0],
                x: [0, 10, -6, 0],
                rotate: [0, 6, -4, 0],
              }}
              transition={{
                duration: orb.duration,
                delay: orb.delay,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-16 w-full max-w-6xl z-10">
          {/* Logo - Right Side */}
          <div className="flex flex-col items-center gap-8">
            <Logo/>
          </div>

          {/* Auth and Login - Left Side */}
          <Auth onLogin={onLogin} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <LegalFooter />
        </div>
      </div>
    </>
  )
}

export default LoginPage
