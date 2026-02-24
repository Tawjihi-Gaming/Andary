import { useEffect, useState } from 'react'

const THEME_KEY = 'andary-theme'

const resolveInitialTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const savedTheme = localStorage.getItem(THEME_KEY)
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return 'light'
}

const ThemeSwitcher = ({ className = '' }) => {
  const [theme, setTheme] = useState(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return (
    <button
      type="button"
      onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
      className={`app-theme-switch px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${className}`}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}

export default ThemeSwitcher
