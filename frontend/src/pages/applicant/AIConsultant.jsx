import { useState, useRef, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import aiAPI, { connectToAIResult } from '../../api/ai'

function AIConsultant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Здравствуйте! Я Робочерепаха - ИИ-консультант приёмной комиссии Московского Политеха. Готова ответить на Ваши вопросы о поступлении.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setLoading(true)

    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setMessages((prev) => [...prev, { role: 'assistant', text: 'Обрабатываю Ваш запрос...', loading: true }])

    try {
      const res = await aiAPI.ask(question)
      const taskId = res.data.task_id

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
        () => {
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

        <div style={styles.header}>
          <h1 style={styles.title}>Чат с Робочерепахой</h1>
          <p style={styles.subtitle}>
            Консультация на основе информации с официального сайта Московского политехнического университета.
          </p>
        </div>

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
                {msg.role === 'user' ? 'Вы' : 'Робочерепаха'}
              </div>
              <div style={{
                ...styles.messageText,
                fontStyle: msg.loading ? 'italic' : 'normal',
                color: msg.loading ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
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
            style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
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
  },
  content: {
    maxWidth: '1240px',
    margin: '40px auto',
    padding: '0 16px',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    color: '#5ED6E3',
    margin: '0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.85)',
    margin: 0,
  },
  chatBox: {
    backgroundColor: '#18212D',
    borderRadius: '15px',
    padding: '20px',
    height: '500px',
    overflowY: 'auto',
    border: '1px solid rgba(94,214,227,0.3)',
    marginBottom: '20px',
  },
  message: {
    marginBottom: '20px',
    padding: '10px 15px',
    borderRadius: '10px',
  },
  userMessage: {
    backgroundColor: 'rgba(94,214,227,0.08)',
    border: '1px solid rgba(94,214,227,0.2)',
    marginLeft: '80px',
  },
  assistantMessage: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    marginRight: '80px',
  },
  messageRole: {
    fontSize: '14px',
    color: '#5ED6E3',
    marginBottom: '5px',
    fontWeight: '500',
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  inputRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  textarea: {
    flex: 1,
    padding: '20px',
    border: '1px solid rgba(94,214,227,0.3)',
    borderRadius: '15px',
    fontSize: '16px',
    resize: 'none',
    fontFamily: 'inherit',
    backgroundColor: '#18212D',
    color: 'rgba(255,255,255,0.85)',
    outline: 'none',
    height: '100px',
  },
  sendBtn: {
    backgroundColor: 'rgba(94, 214, 227, 0.8)',
    color: '#fff',
    border: 'none',
    padding: '0 15px',
    borderRadius: '15px',
    cursor: 'pointer',
    fontSize: '16px',
    whiteSpace: 'nowrap',
    height: '100px',
  },
}

export default AIConsultant