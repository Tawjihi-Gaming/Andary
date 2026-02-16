const Logo = () => {
  return (
    <div className="logo-bounce flex flex-col items-center">
      {/* Beautiful graduation icon */}
      <div className="relative">
        {/* Vibrant glow effect */}
        <div className="absolute inset-0 bg-linear-to-r from-game-cyan via-game-blue to-game-purple opacity-50 blur-3xl rounded-full scale-150 animate-pulse"></div>
        
        {/* Custom graduation cap design */}
        <div className="relative z-10 w-32 h-32 flex items-center justify-center">
          {/* Graduation cap SVG */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))' }}>
            {/* Cap top (mortarboard) */}
            <polygon points="50,15 95,35 50,55 5,35" fill="url(#capGradient)" stroke="#1E3A8A" strokeWidth="2"/>
            {/* Cap base */}
            <ellipse cx="50" cy="55" rx="25" ry="8" fill="#1E3A8A"/>
            <rect x="25" y="55" width="50" height="25" fill="#1E3A8A"/>
            <ellipse cx="50" cy="80" rx="25" ry="8" fill="#0F172A"/>
            {/* Button */}
            <circle cx="50" cy="35" r="5" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1"/>
            {/* Tassel */}
            <path d="M50,35 Q65,45 68,65 Q70,80 62,90" fill="none" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round"/>
            <rect x="58" y="85" width="10" height="12" rx="2" fill="#FBBF24"/>
            <line x1="60" y1="90" x2="60" y2="97" stroke="#F59E0B" strokeWidth="1"/>
            <line x1="63" y1="90" x2="63" y2="97" stroke="#F59E0B" strokeWidth="1"/>
            <line x1="66" y1="90" x2="66" y2="97" stroke="#F59E0B" strokeWidth="1"/>
            {/* Gradient definition */}
            <defs>
              <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB"/>
                <stop offset="100%" stopColor="#1E3A8A"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Bright decorative elements */}
        <div className="absolute -top-4 -right-4 text-game-yellow text-3xl animate-bounce">✨</div>
        <div className="absolute -bottom-2 -left-4 text-game-cyan text-2xl animate-pulse">⭐</div>
        <div className="absolute top-0 -left-8 text-game-blue text-xl">🎓</div>
        <div className="absolute -top-2 right-0 text-game-green text-lg animate-bounce delay-300">✨</div>
      </div>

      {/* Game name */}
      <div className="mt-6 relative">
        <h1 className="text-6xl font-extrabold text-white drop-shadow-2xl" style={{ textShadow: '4px 4px 0 #2563EB, 6px 6px 0 #1E3A8A' }}>
          Andary<span className="text-game-yellow"></span>
        </h1>
      </div>
    </div>
  )
}

export default Logo
