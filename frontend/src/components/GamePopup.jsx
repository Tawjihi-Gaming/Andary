const GamePopup = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  showCancel = false,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md app-glass-card backdrop-blur-2xl rounded-3xl p-6 shadow-2xl">
        {title && <h3 className="text-white text-xl font-bold mb-2">{title}</h3>}
        {message && <p className="text-white/80 mb-6 whitespace-pre-line">{message}</p>}
        <div className="flex items-center justify-end gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl cursor-pointer border border-white/20 text-white/80 hover:text-game-yellow hover:bg-white/10 transition-all duration-300"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl cursor-pointer bg-game-yellow text-gray-900 font-bold hover:brightness-110 hover:scale-105 transition-all duration-300"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GamePopup
