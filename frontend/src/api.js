import axios from 'axios'

// Single source of truth for the backend origin. Override with VITE_API_URL
// in a .env file when the API is not on localhost:8000.
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
