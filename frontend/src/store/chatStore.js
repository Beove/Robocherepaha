import { create } from 'zustand'

const STORAGE_KEY = 'chat_messages'

const defaultMessages = [
  {
    role: 'assistant',
    text: 'Здравствуйте! Я Робочерепаха - ИИ-консультант приёмной комиссии Московского Политеха. Готова ответить на Ваши вопросы о поступлении.',
  },
]

const loadMessages = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : defaultMessages
  } catch {
    return defaultMessages
  }
}

const saveMessages = (messages) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {}
}

const useChatStore = create((set) => ({
  messages: loadMessages(),

  addMessage: (message) =>
    set((state) => {
      const messages = [...state.messages, message]
      saveMessages(messages)
      return { messages }
    }),

  updateLastMessage: (updater) =>
    set((state) => {
      const messages = state.messages.map((msg, idx) =>
        idx === state.messages.length - 1 ? updater(msg) : msg
      )
      saveMessages(messages)
      return { messages }
    }),

  clearMessages: () => {
    saveMessages(defaultMessages)
    set({ messages: defaultMessages })
  },
}))

export default useChatStore