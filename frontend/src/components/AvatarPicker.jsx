import { useState } from 'react'

const AVATARS = [
  { id: 'fox', emoji: '🦊', bg: 'from-orange-400 to-amber-500' },
  { id: 'cat', emoji: '🐱', bg: 'from-yellow-400 to-orange-400' },
  { id: 'dog', emoji: '🐶', bg: 'from-amber-300 to-yellow-500' },
  { id: 'lion', emoji: '🦁', bg: 'from-yellow-500 to-orange-500' },
  { id: 'panda', emoji: '🐼', bg: 'from-gray-300 to-gray-500' },
  { id: 'owl', emoji: '🦉', bg: 'from-amber-600 to-yellow-700' },
  { id: 'unicorn', emoji: '🦄', bg: 'from-pink-400 to-purple-500' },
  { id: 'dragon', emoji: '🐉', bg: 'from-green-400 to-emerald-600' },
  { id: 'robot', emoji: '🤖', bg: 'from-blue-400 to-cyan-500' },
  { id: 'alien', emoji: '👽', bg: 'from-green-300 to-lime-500' },
  { id: 'wizard', emoji: '🧙', bg: 'from-purple-500 to-indigo-600' },
  { id: 'ninja', emoji: '🥷', bg: 'from-gray-600 to-gray-800' },
]

const AvatarPicker = ({ selected, onSelect }) => {
  return (
    <div className="avatar-picker">
      <p className="text-white/80 text-sm text-center mb-3">اختر صورتك الرمزية</p>
      <div className="grid grid-cols-6 gap-2 justify-items-center">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar)}
            className={`avatar-option w-12 h-12 rounded-full bg-linear-to-br ${avatar.bg} flex items-center justify-center text-2xl transition-all duration-200 border-3 ${
              selected?.id === avatar.id
                ? 'border-game-yellow scale-110 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                : 'border-transparent hover:border-white/50 hover:scale-105'
            }`}
            title={avatar.id}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

export { AVATARS }
export default AvatarPicker
