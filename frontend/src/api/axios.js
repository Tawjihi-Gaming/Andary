import axios from 'axios'

// create a configured axios instance for cookie-based auth
const api = axios.create({
  baseURL: '/api', // all requests will be prefixed with /api
  withCredentials: true,  // send/receive cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

// mock API responses for testing without backend
api.interceptors.request.use((config) => {
  const mockMode = true // Set to false when backend is ready
  if (!mockMode) return config

  const data = config.data && typeof config.data === 'string' ? JSON.parse(config.data) : config.data

  // Mock signup
  if (config.url === '/auth/signup' && config.method === 'post') {
    console.log('🧪 MOCK: Signup successful', data)
    config.adapter = () =>
      Promise.resolve({
        data: { message: 'Account created successfully!' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config
      })
  }

  // Mock login
  if (config.url === '/auth/login' && config.method === 'post') {
    console.log('🧪 MOCK: Login successful', data)
    config.adapter = () =>
      Promise.resolve({
        data: {
          message: 'Login successful!',
          user: { username: data.email.split('@')[0], email: data.email, avatar: '🎮' }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
  }

  // Mock Google login
  if (config.url === '/auth/google-login' && config.method === 'get') {
    console.log('🧪 MOCK: Google login initiated')
    config.adapter = () =>
      Promise.resolve({
        data: { url: 'https://accounts.google.com/mock-oauth' }, // hahhah
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
  }

  return config
}, (error) => Promise.reject(error))

export default api
