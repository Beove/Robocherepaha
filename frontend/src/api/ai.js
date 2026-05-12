import client from './client'

// API методы для работы с AI консультантом
const aiAPI = {
  // Отправка вопроса в очередь
  ask: (question) => client.post('/ai/ask', { question }),

  // Получение статуса задачи
  getStatus: (taskId) => client.get(`/ai/status/${taskId}`),
}

// WebSocket подключение для получения ответа в реальном времени
export const connectToAIResult = (taskId, onMessage, onError) => {
  const wsUrl = `ws://localhost:8000/ws/ai/${taskId}`
  const ws = new WebSocket(wsUrl)

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    onMessage(data)
  }

  ws.onerror = (error) => {
    onError(error)
  }

  ws.onclose = () => {
    console.log('WebSocket закрыт')
  }

  return ws
}

export default aiAPI