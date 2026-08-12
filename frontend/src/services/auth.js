import axios from 'axios'

export const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/api',
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
})
