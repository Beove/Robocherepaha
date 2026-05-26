import { useState, useRef, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import aiAPI, { connectToAIResult } from '../../api/ai'
import useChatStore from '../../store/chatStore'

function AIConsultant() {
  const { messages, addMessage, updateLastMessage } = useChatStore()
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

    addMessage({ role: 'user', text: question })
    addMessage({ role: 'assistant', text: 'Обрабатываю Ваш запрос...', loading: true })

    try {
      const res = await aiAPI.ask(question)
      const taskId = res.data.task_id

      const ws = connectToAIResult(
        taskId,
        (data) => {
          if (data.status === 'completed') {
            updateLastMessage(() => ({ role: 'assistant', text: data.answer }))
            setLoading(false)
            ws.close()
          } else if (data.status === 'queued' || data.status === 'processing') {
            updateLastMessage(() => ({ role: 'assistant', text: data.message, loading: true }))
          } else if (data.status === 'error') {
            updateLastMessage(() => ({ role: 'assistant', text: 'Произошла ошибка. Пожалуйста, попробуйте ещё раз.' }))
            setLoading(false)
            ws.close()
          }
        },
        () => {
          updateLastMessage(() => ({ role: 'assistant', text: 'Сервис временно недоступен. Обратитесь в приёмную комиссию.' }))
          setLoading(false)
        }
      )
    } catch (err) {
      updateLastMessage(() => ({ role: 'assistant', text: 'Ошибка отправки запроса. Попробуйте позже.' }))
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
                color: msg.loading ? 'var(--text-muted)' : 'var(--text-primary)',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

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
    color: 'var(--accent)',
    margin: '0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-primary)',
    margin: 0,
  },
  chatBox: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '15px',
    padding: '20px',
    height: '500px',
    overflowY: 'auto',
    border: '1px solid var(--border)',
    marginBottom: '20px',
  },
  message: {
    marginBottom: '20px',
    padding: '10px 15px',
    borderRadius: '10px',
  },
  userMessage: {
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid var(--accent-border)',
    marginLeft: '80px',
  },
  assistantMessage: {
    backgroundColor: 'var(--row-alt)',
    border: '1px solid var(--row-divider)',
    marginRight: '80px',
  },
  messageRole: {
    fontSize: '14px',
    color: 'var(--accent)',
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
    border: '1px solid var(--border)',
    borderRadius: '15px',
    fontSize: '16px',
    resize: 'none',
    fontFamily: 'inherit',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    outline: 'none',
    height: '100px',
  },
  sendBtn: {
    backgroundColor: 'var(--accent-btn)',
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