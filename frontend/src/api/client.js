import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.95:8000'

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Автоматическое добавление токена к каждому запросу
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Если токен истёк — редирект на логин
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client