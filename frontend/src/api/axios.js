import axios from 'axios'
import { API_BASE_URL } from './config'

// create a configured axios instance for cookie-based auth
const api = axios.create({
  baseURL: API_BASE_URL, // all requests will be prefixed with /api
  withCredentials: true,  // send/receive cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
