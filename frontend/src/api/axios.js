import axios from 'axios'

// create a configured axios instance for cookie-based auth
const api = axios.create({
  baseURL: '/api', // all requests will be prefixed with /api
  withCredentials: true,  // send/receive cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

// Automatic JWT refresh on 401
// When a request fails with 401, try to refresh the token once using
// the refresh-token cookie. If refresh succeeds, retry the original
// request automatically. If it also fails, reject so the app can
// redirect to login.

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error)
    {
      reject(error)
    }
    else
    {
      resolve()
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh for 401 errors, and never for the refresh
    // endpoint itself or login/signup (to avoid infinite loops).
    const skipPaths = ['/auth/refresh-token', '/auth/login', '/auth/signup']
    const isSkipped = skipPaths.some((p) => originalRequest.url?.includes(p))

    if (error.response?.status !== 401 || originalRequest._retry || isSkipped)
    {
      return Promise.reject(error)
    }

    if (isRefreshing)
    {
      // Another refresh is already in flight, queue this request.
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => api(originalRequest))
    }

    originalRequest._retry = true
    isRefreshing = true

    try
    {
      await api.post('/auth/refresh-token')
      processQueue(null)
      // Retry the original request with the new JWT cookie.
      return api(originalRequest)
    }
    catch (refreshError)
    {
      processQueue(refreshError)
      // Refresh failed — clear local auth state so the UI redirects to login.
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userData')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    }
    finally
    {
      isRefreshing = false
    }
  }
)

export default api
