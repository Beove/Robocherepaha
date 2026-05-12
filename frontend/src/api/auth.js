import client from './client'

// API методы аутентификации
const authAPI = {
  // Регистрация нового пользователя
  register: (email, password, fullName) =>
    client.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    }),

  // Вход в систему
  login: (email, password) =>
    client.post('/auth/login', { email, password }),
}

export default authAPI