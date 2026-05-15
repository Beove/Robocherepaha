import client from './client'

const adminAPI = {
  // Журнал аудита
  getLogs: (eventType, userId, limit, offset) =>
    client.get('/admin/logs', {
      params: { event_type: eventType, user_id: userId, limit, offset },
    }),
  getIdorAttempts: () => client.get('/admin/logs/idor'),

  // Управление пользователями
  getUsers: (role) => client.get('/admin/users', { params: { role } }),
  createUser: (data) => client.post('/admin/users', data),
  updateUserRole: (id, role) => client.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
}

export default adminAPI