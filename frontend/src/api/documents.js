import client from './client'

// API методы для работы с документами
const documentsAPI = {
  // Загрузка документа
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Получение документов текущего пользователя
  getMy: () => client.get('/documents/me'),

  // Получение ссылки для скачивания документа
  getDownloadUrl: (id) => client.get(`/documents/${id}/download`),
}

export default documentsAPI