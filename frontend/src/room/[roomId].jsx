

const Room = ({ user, roomId, code }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#0EA5E9] relative overflow-hidden flex items-center justify-center p-6">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/15">
                <h1 className="text-3xl font-extrabold text-white mb-2 text-center">غرفة اللعب</h1>
                <p className="text-white/50 text-center mb-6">Room ID: {roomId} | Code: {code}</p>
                <div className="flex flex-col items-center gap-4">
                    <span className="text-5xl">{user.avatar}</span>
                    <h2 className="text-xl font-bold text-white">{user.username}</h2>
                </div>
            </div>
        </div>
    )
}

export default Room