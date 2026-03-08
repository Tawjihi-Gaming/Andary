import { ReactSVG } from 'react-svg';

const Logo = () => {
  return (
    <div className="logo-bounce flex flex-col items-center">
      {/* Beautiful graduation icon */}
      <div className="relative">
        {/* Vibrant glow effect */}
        <div className="absolute inset-0 bg-linear-to-r from-game-cyan via-game-blue to-game-purple opacity-50 blur-3xl rounded-full scale-150 animate-pulse"></div>
        
        {/* Custom graduation cap design */}
        <div className="relative z-10 w-20 h-20 sm:w-32 sm:h-32 xl:w-40 xl:h-40 flex items-center justify-center">
          {/* Graduation cap*/}
          <ReactSVG
            src="/logo.svg"
            beforeInjection={svg => {
              svg.setAttribute('class', 'w-full h-full drop-shadow-2xl');
            }}
          />
        </div>
        
        {/* Bright decorative elements */}
        <div className="absolute -top-4 -right-4 text-game-yellow text-xl sm:text-3xl animate-bounce">✨</div>
        <div className="absolute -bottom-2 -left-4 text-game-cyan text-lg sm:text-2xl animate-pulse">⭐</div>
        <div className="absolute top-0 -left-8 text-game-blue text-base sm:text-xl">🎓</div>
        <div className="absolute -top-2 right-0 text-game-green text-sm sm:text-lg animate-bounce delay-300">✨</div>
      </div>

      {/* Game name */}
      <div className="mt-6 relative">
        <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold text-white drop-shadow-2xl" style={{ textShadow: '4px 4px 0 #2563EB, 6px 6px 0 #1E3A8A' }}>
          Andary<span className="text-game-yellow"></span>
        </h1>
      </div>
    </div>
  )
}

export default Logo
