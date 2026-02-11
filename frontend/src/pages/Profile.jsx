import { useNavigate } from 'react-router-dom'

const Profile = ({ user, onLogout }) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-linear-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] p-4">
      <div className="max-w-4xl mx-auto">
        {/* back button */}
        <button
          onClick={() => navigate('/lobby')}
          className="mb-4 text-white hover:text-game-yellow transition-colors flex items-center gap-2"
        >
          ← Back to Lobby
        </button>

        {/* profile card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/20">
          <h1 className="text-4xl font-extrabold text-white mb-8 text-center" style={{ textShadow: '3px 3px 0 #2563EB' }}>
            User Information
          </h1>

          <div className="flex flex-col items-center gap-6">
            {/* avatar */}
            <div className="w-32 h-32 rounded-full bg-game-yellow flex items-center justify-center border-4 border-white shadow-lg">
              <span className="text-6xl">{user?.avatar}</span>
            </div>

            {/* user info */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">{user?.username || 'Guest'}</h2>
              {user?.email && (
                <p className="text-white/70 text-lg">{user.email}</p>
              )}
            </div>

            {/* logout button */}
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg mt-4"
            >
              تسجيل الخروج / Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
