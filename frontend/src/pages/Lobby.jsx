const Lobby = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-2xl w-full shadow-2xl border-2 border-white/20 text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4" style={{ textShadow: '3px 3px 0 #2563EB' }}>
          🎮 Lobby
        </h1>
        <p className="text-white/80 text-xl mb-6">
          مرحباً بك في قاعة اللعب!
        </p>
        <button
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg"
        >
          تسجيل الخروج / Logout
        </button>
      </div>
    </div>
  )
}

export default Lobby
