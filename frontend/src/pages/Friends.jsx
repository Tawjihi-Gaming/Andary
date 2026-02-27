import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import LegalFooter from '../components/LegalFooter'
import GamePopup from '../components/GamePopup'
import {
  getFriends,
  sendFriendRequest,
  cancelFriendRequest,
  getIncomingRequests,
  getSentRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../api/friends'

const Friends = ({ user }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Tab state: 'friends' | 'incoming' | 'sent'
  const [activeTab, setActiveTab] = useState('friends')

  // Data
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [sent, setSent] = useState([])

  // Loading
  const [loading, setLoading] = useState(true)

  // Add friend input
  const [addFriendId, setAddFriendId] = useState('')
  const [addFriendLoading, setAddFriendLoading] = useState(false)

  // Messages
  const [message, setMessage] = useState(null)

  // Remove friend popup
  const [removePopup, setRemovePopup] = useState({ open: false, friendshipId: null, name: '' })

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [friendsRes, incomingRes, sentRes] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getSentRequests(),
      ])
      setFriends(friendsRes.data)
      setIncoming(incomingRes.data)
      setSent(sentRes.data)
    } catch (err) {
      console.error('Failed to load friends data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id && !user?.isGuest) {
      fetchAll()
    } else {
      setLoading(false)
    }
  }, [user?.id, user?.isGuest, fetchAll])

  // Send friend request
  const handleSendRequest = async () => {
    const id = parseInt(addFriendId, 10)
    if (!id || isNaN(id)) {
      showMessage(t('friends.invalidId'), 'error')
      return
    }
    if (id === user?.id) {
      showMessage(t('friends.cannotAddSelf'), 'error')
      return
    }
    setAddFriendLoading(true)
    try {
      await sendFriendRequest(id)
      showMessage(t('friends.requestSent'))
      setAddFriendId('')
      fetchAll()
    } catch (err) {
      const msg = err?.response?.data?.msg || t('friends.requestFailed')
      showMessage(`❌ ${msg}`, 'error')
    } finally {
      setAddFriendLoading(false)
    }
  }

  // Accept request
  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId)
      showMessage(t('friends.requestAccepted'))
      fetchAll()
    } catch (err) {
      const msg = err?.response?.data?.msg || t('friends.acceptFailed')
      showMessage(`❌ ${msg}`, 'error')
    }
  }

  // Reject request
  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId)
      showMessage(t('friends.requestRejected'))
      fetchAll()
    } catch (err) {
      const msg = err?.response?.data?.msg || t('friends.rejectFailed')
      showMessage(`❌ ${msg}`, 'error')
    }
  }

  // Cancel sent request
  const handleCancel = async (receiverId) => {
    try {
      await cancelFriendRequest(receiverId)
      showMessage(t('friends.requestCanceled'))
      fetchAll()
    } catch (err) {
      const msg = err?.response?.data?.msg || t('friends.cancelFailed')
      showMessage(`❌ ${msg}`, 'error')
    }
  }

  // Remove friend
  const handleRemoveFriend = async () => {
    if (!removePopup.friendshipId) return
    try {
      await removeFriend(removePopup.friendshipId)
      showMessage(t('friends.friendRemoved'))
      setRemovePopup({ open: false, friendshipId: null, name: '' })
      fetchAll()
    } catch (err) {
      const msg = err?.response?.data?.msg || t('friends.removeFailed')
      showMessage(`❌ ${msg}`, 'error')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
  }

  // Tab button classes
  const tabClass = (tab) =>
    `px-4 sm:px-6 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
      activeTab === tab
        ? 'bg-game-purple/30 text-white border border-game-purple/50 shadow-lg shadow-game-purple/10'
        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
    }`

    const handleFriendInputChange = (e) => {
      if (e.target.value.length > 6) return
      if (!/^\d*$/.test(e.target.value)) return
    setAddFriendId(e.target.value)
  }


  return (
    <div className="min-h-screen app-page-bg relative overflow-hidden">
      {/* Navbar */}
      <nav dir="rtl" className="relative z-10 app-glass-card backdrop-blur-2xl px-3 sm:px-6 py-3 border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/lobby')}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-game-yellow to-game-orange rounded-xl flex items-center justify-center shadow-lg shadow-game-yellow/20 group-hover:scale-105 transition-transform">
                <span className="text-xl sm:text-2xl pt-1 sm:pt-2">🎓</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">Andary</h1>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 sm:gap-3 app-soft-btn px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-game-yellow to-game-orange flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-game-yellow/20 transition-all">
                <span className="text-xl pt-1">{user?.avatar}</span>
              </div>
              <span className="text-white/90 font-semibold max-w-24 sm:max-w-none truncate">{user?.username || 'Player'}</span>
            </button>
            <button
              onClick={() => navigate('/lobby')}
              className="app-soft-btn font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 cursor-pointer"
            >
              {t('friends.backToLobby')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-2">
            {t('friends.title')} 👥
          </h2>
          <p className="text-white/50 text-base sm:text-lg">{t('friends.subtitle')}</p>
        </div>

        {/* Message toast */}
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-2xl text-sm border ${
            message.type === 'error'
              ? 'bg-red-500/20 border-red-400/40 text-red-100'
              : 'bg-green-500/20 border-green-400/40 text-green-100'
          }`}>
            {message.text}
          </div>
        )}

        {/* Guest restriction */}
        {user?.isGuest ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-5xl mb-4 block">🔒</span>
            <p className="text-white/50 text-lg">{t('friends.guestRestriction')}</p>
          </div>
        ) : (
          <>
            {/* Add friend section */}
            <div className="mb-6 p-4 sm:p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">{t('friends.addFriend')}</h3>
              <div className="flex gap-3">
                <form onSubmit={(e) => { e.preventDefault(); handleSendRequest(); }} className="flex gap-3 flex-1">
                <input
                  type="text"
                  placeholder={t('friends.enterPlayerId')}
                  value={addFriendId}
                  onChange={handleFriendInputChange}
                  className="flex-1 bg-white/10 text-white placeholder:text-white/30 rounded-2xl py-3 px-4 border border-white/15 focus:border-game-purple/50 focus:bg-white/15 focus:shadow-lg focus:shadow-game-purple/10 transition-all duration-300"
                  dir="ltr"
                  min="1"
                />
                <button
                  disabled={addFriendLoading || !addFriendId.trim()}
                  className="bg-linear-to-r from-game-purple to-game-blue hover:from-purple-400 hover:to-blue-500 text-white font-bold px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-game-purple/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                >
                  {addFriendLoading ? t('common.processing') : t('common.send')}
                </button>
              </form>
              </div>
              <p className="text-white/30 text-xs mt-2">{t('friends.yourId')}: <span className="text-game-yellow font-bold">{user?.id}</span></p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button className={tabClass('friends')} onClick={() => setActiveTab('friends')}>
                {t('friends.friendsList')}
                {friends.length > 0 && (
                  <span className="ms-2 bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{friends.length}</span>
                )}
              </button>
              <button className={tabClass('incoming')} onClick={() => setActiveTab('incoming')}>
                {t('friends.incomingRequests')}
                {incoming.length > 0 && (
                  <span className="ms-2 bg-game-green/20 text-game-green text-xs px-2 py-0.5 rounded-full font-bold">{incoming.length}</span>
                )}
              </button>
              <button className={tabClass('sent')} onClick={() => setActiveTab('sent')}>
                {t('friends.sentRequests')}
                {sent.length > 0 && (
                  <span className="ms-2 bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{sent.length}</span>
                )}
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 text-white/60">
                {t('common.loading')}
              </div>
            ) : (
              <>
                {/* Friends list */}
                {activeTab === 'friends' && (
                  <div className="space-y-3">
                    {friends.length === 0 ? (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <span className="text-4xl mb-3 block">🤝</span>
                        <p className="text-white/50">{t('friends.noFriends')}</p>
                      </div>
                    ) : (
                      friends.map((f) => (
                        <div
                          key={f.friendshipId}
                          className="group bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all duration-300 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-game-purple to-game-blue flex items-center justify-center text-xl shadow-md">
                              {f.player.avatarImageName || '👤'}
                            </div>
                            <div>
                              <p className="text-white font-bold">{f.player.username}</p>
                              <p className="text-white/40 text-xs">
                                {t('friends.since')} {formatDate(f.since)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 text-xs me-2">ID: {f.player.id}</span>
                            <button
                              onClick={() => setRemovePopup({ open: true, friendshipId: f.friendshipId, name: f.player.username })}
                              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all duration-300 text-sm cursor-pointer"
                            >
                              {t('friends.remove')}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Incoming requests */}
                {activeTab === 'incoming' && (
                  <div className="space-y-3">
                    {incoming.length === 0 ? (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <span className="text-4xl mb-3 block">📭</span>
                        <p className="text-white/50">{t('friends.noIncoming')}</p>
                      </div>
                    ) : (
                      incoming.map((req) => (
                        <div
                          key={req.id}
                          className="group bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all duration-300 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-game-green to-emerald-500 flex items-center justify-center text-xl shadow-md">
                              {req.sender.avatarImageName || '👤'}
                            </div>
                            <div>
                              <p className="text-white font-bold">{req.sender.username}</p>
                              <p className="text-white/40 text-xs">
                                ID: {req.sender.id} • {formatDate(req.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(req.id)}
                              className="bg-game-green/20 hover:bg-game-green/30 text-game-green font-semibold px-4 py-2 rounded-xl border border-game-green/30 transition-all duration-300 text-sm cursor-pointer"
                            >
                              {t('friends.accept')}
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-4 py-2 rounded-xl border border-red-500/20 transition-all duration-300 text-sm cursor-pointer"
                            >
                              {t('friends.reject')}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sent requests */}
                {activeTab === 'sent' && (
                  <div className="space-y-3">
                    {sent.length === 0 ? (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <span className="text-4xl mb-3 block">📤</span>
                        <p className="text-white/50">{t('friends.noSent')}</p>
                      </div>
                    ) : (
                      sent.map((req) => (
                        <div
                          key={req.id}
                          className="group bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all duration-300 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-game-orange to-game-yellow flex items-center justify-center text-xl shadow-md">
                              {req.receiver.avatarImageName || '👤'}
                            </div>
                            <div>
                              <p className="text-white font-bold">{req.receiver.username}</p>
                              <p className="text-white/40 text-xs">
                                ID: {req.receiver.id} • {formatDate(req.createdAt)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancel(req.receiver.id)}
                            className="text-white/40 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all duration-300 text-sm border border-white/10 hover:border-red-500/20 cursor-pointer"
                          >
                            {t('friends.cancelRequest')}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-6">
        <LegalFooter />
      </div>

      {/* Remove friend confirmation */}
      <GamePopup
        open={removePopup.open}
        title={t('friends.removeTitle')}
        message={t('friends.removeConfirm', { name: removePopup.name })}
        confirmText={t('friends.remove')}
        cancelText={t('common.cancel')}
        showCancel
        onCancel={() => setRemovePopup({ open: false, friendshipId: null, name: '' })}
        onConfirm={handleRemoveFriend}
      />
    </div>
  )
}

export default Friends
