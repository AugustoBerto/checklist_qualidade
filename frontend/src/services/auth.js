import axios from 'axios'
import { AUTH_API_URL } from './endpoints'

export const authApi = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
})
