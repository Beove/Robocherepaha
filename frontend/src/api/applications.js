import client from './client'

const applicationsAPI = {
  // Создание нового заявления
  create: (data) => client.post('/applications', data),

  // Получение заявлений текущего пользователя
  getMy: () => client.get('/applications/me'),

  // Получение заявления по ID
  getById: (id) => client.get(`/applications/${id}`),

  // Подача заявления абитуриентом (draft → submitted)
  submit: (id) => client.post(`/applications/${id}/submit`),

  // Редактирование черновика
  update: (id, data) => client.patch(`/applications/${id}`, data),

  // Удаление черновика
  delete: (id) => client.delete(`/applications/${id}`),

  // Все заявления — для операторов и администраторов
  getAll: (status, userId) => client.get('/applications/all', {
    params: { status, user_id: userId }
  }),

  // Обновление статуса заявления (для операторов)
  updateStatus: (id, status, comment) =>
    client.put(`/applications/${id}/status`, { status, comment }),
}

export default applicationsAPI