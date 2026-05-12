import { create } from 'zustand'

// Хранилище состояния аутентификации
const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  role: localStorage.getItem('role') || null,

  // Установка данных после входа
  setAuth: (token, role) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    set({ token, role })
  },

  // Очистка данных при выходе
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    set({ token: null, role: null })
  },
}))

export default useAuthStore