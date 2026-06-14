import client from './client'

const documentsAPI = {
  // Загрузка документа с типом и уровнем образования
  upload: (file, docType, eduLevel) => {
    const formData = new FormData()
    formData.append('file', file)
    if (docType) formData.append('doc_type', docType)
    if (eduLevel) formData.append('edu_level', eduLevel)
    return client.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Получение документов текущего пользователя
  getMy: () => client.get('/documents/me'),

  // Получение документов конкретного пользователя (для операторов)
  getByUser: (userId) => client.get(`/documents/user/${userId}`),

  // Получение ссылки для скачивания
  getDownloadUrl: (id) => client.get(`/documents/${id}/download`),

  // Удаление документа
  delete: (id) => client.delete(`/documents/${id}`),

  // Обновление статуса документа (для операторов)
  updateStatus: (id, status, rejectReason = null) =>
    client.patch(`/documents/${id}/status`, { status, reject_reason: rejectReason }),
}

export default documentsAPI