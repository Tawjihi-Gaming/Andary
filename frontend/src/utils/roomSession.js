const ROOM_SESSION_KEY = 'andary_room_session'

export const loadRoomSession = (roomId) => {
  try {
    const raw = localStorage.getItem(ROOM_SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed) return null
    if (roomId && parsed.roomId !== roomId) return null

    return parsed
  } catch {
    return null
  }
}

export const saveRoomSession = (data) => {
  localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(data))
}

export const clearRoomSession = () => {
  localStorage.removeItem(ROOM_SESSION_KEY)
}
