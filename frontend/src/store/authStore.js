import { create } from 'zustand'

// Хранилище состояния аутентификации
const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  role: localStorage.getItem('role') || null,
  fullName: localStorage.getItem('fullName') || null,

  // Установка данных после входа
  setAuth: (token, role, fullName) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    if (fullName) localStorage.setItem('fullName', fullName)
    set({ token, role, fullName })
  },

  // Очистка данных при выходе
 logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('fullName')
    localStorage.removeItem('chat_messages')
    set({ token: null, role: null, fullName: null })
  },
}))

export default useAuthStore