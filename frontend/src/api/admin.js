import client from './client'

// API методы для административной панели
const adminAPI = {
  // Получение журнала аудита
  getLogs: (eventType, userId, limit, offset) =>
    client.get('/admin/logs', {
      params: { event_type: eventType, user_id: userId, limit, offset },
    }),

  // Получение IDOR попыток
  getIdorAttempts: () => client.get('/admin/logs/idor'),
}

export default adminAPI