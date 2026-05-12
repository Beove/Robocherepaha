import client from './client'

// API методы для работы с заявлениями
const applicationsAPI = {
  // Создание нового заявления
  create: (direction, educationLevel) =>
    client.post('/applications', {
      direction,
      education_level: educationLevel,
    }),

  // Получение заявлений текущего пользователя
  getMy: () => client.get('/applications/me'),

  // Получение заявления по ID
  getById: (id) => client.get(`/applications/${id}`),

  // Обновление статуса заявления (для операторов)
  updateStatus: (id, status, comment) =>
    client.put(`/applications/${id}/status`, { status, comment }),
}

export default applicationsAPI