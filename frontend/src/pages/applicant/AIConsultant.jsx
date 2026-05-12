import { useState, useRef, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import aiAPI, { connectToAIResult } from '../../api/ai'

function AIConsultant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Здравствуйте! Я ИИ-консультант приёмной комиссии Московского Политеха. Готов ответить на Ваши вопросы о поступлении1',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Прокрутка вниз при новом сообщении
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setLoading(true)

    // Добавляем сообщение пользователя
    setMessages((prev) => [...prev, { role: 'user', text: question }])

    // Добавляем placeholder пока ждём ответ
    setMessages((prev) => [...prev, { role: 'assistant', text: 'Обрабатываю Ваш запрос...', loading: true }])

    try {
      // Отправляем вопрос в очередь
      const res = await aiAPI.ask(question)
      const taskId = res.data.task_id

      // Подключаемся к WebSocket для получения ответа
      const ws = connectToAIResult(
        taskId,
        (data) => {
          if (data.status === 'completed') {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === prev.length - 1
                  ? { role: 'assistant', text: data.answer }
                  : msg
              )
            )
            setLoading(false)
            ws.close()
          } else if (data.status === 'queued' || data.status === 'processing') {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === prev.length - 1
                  ? { role: 'assistant', text: data.message, loading: true }
                  : msg
              )
            )
          } else if (data.status === 'error') {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === prev.length - 1
                  ? { role: 'assistant', text: 'Произошла ошибка. Пожалуйста, попробуйте ещё раз.' }
                  : msg
              )
            )
            setLoading(false)
            ws.close()
          }
        },
        (error) => {
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? { role: 'assistant', text: 'Сервис временно недоступен. Обратитесь в приёмную комиссию.' }
                : msg
            )
          )
          setLoading(false)
        }
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === prev.length - 1
            ? { role: 'assistant', text: 'Ошибка отправки запроса. Попробуйте позже.' }
            : msg
        )
      )
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.title}>ИИ-консультант</h1>
        <p style={styles.subtitle}>
          Задайте вопрос о поступлении — я отвечу на основе официальной информации приёмной комиссии.
        </p>

        {/* Область сообщений */}
        <div style={styles.chatBox}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageRole}>
                {msg.role === 'user' ? 'Вы' : 'AI Консультант'}
              </div>
              <div style={{
                ...styles.messageText,
                fontStyle: msg.loading ? 'italic' : 'normal',
                color: msg.loading ? '#757575' : 'inherit',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода */}
        <div style={styles.inputRow}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите Ваш вопрос... (Enter — отправить)"
            rows={3}
            disabled={loading}
          />
          <button
            style={{...styles.sendBtn, opacity: loading || !input.trim() ? 0.6 : 1}}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f4f1eb',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  title: {
    fontSize: '24px',
    color: '#2d5016',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#757575',
    marginBottom: '24px',
  },
  chatBox: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    minHeight: '400px',
    maxHeight: '500px',
    overflowY: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px',
  },
  message: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
  },
  userMessage: {
    backgroundColor: '#f4f1eb',
    marginLeft: '40px',
  },
  assistantMessage: {
    backgroundColor: '#e8f0e8',
    marginRight: '40px',
  },
  messageRole: {
    fontSize: '12px',
    color: '#757575',
    marginBottom: '4px',
    fontWeight: '500',
  },
  messageText: {
    fontSize: '14px',
    color: '#3d3d3d',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    backgroundColor: '#2d5016',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    height: '80px',
  },
}

export default AIConsultant