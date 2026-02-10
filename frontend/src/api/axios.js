import axios from 'axios'

// create a configured axios instance for cookie-based auth
const api = axios.create({
  baseURL: '/api', // all requests will be prefixed with /api
  withCredentials: true,  // send/receive cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
