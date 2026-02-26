const backendUri = (import.meta.env.VITE_BACKEND_URI || import.meta.env.BACKEND_URI || '')
  .trim()
  .replace(/\/+$/, '')

export const API_BASE_URL = backendUri ? `${backendUri}/api` : '/api'
export const GAME_HUB_URL = backendUri ? `${backendUri}/gamehub` : '/gamehub'
