import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authAPI from '../../api/auth'
import useAuthStore from '../../store/authStore'
import turtleForForm from '../../assets/turtleForForm.png'
import dark from '../../assets/dark.png'
import light from '../../assets/light.png'
import useThemeStore from '../../store/themeStore'

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Очень слабый', color: '#c62828' }
  if (score === 2) return { score, label: 'Слабый', color: '#e65100' }
  if (score === 3) return { score, label: 'Средний', color: '#f57f17' }
  if (score === 4) return { score, label: 'Хороший', color: '#2e7d32' }
  return { score, label: 'Отличный', color: '#1b5e20' }
}

function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }
    if (strength.score < 2) {
      setError('Пароль слишком слабый. Добавьте цифры, заглавные буквы или символы')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.register(email, password, fullName)
      const { access_token, role } = response.data
      setAuth(access_token, role, fullName)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.turtleWrapper}>
        <img src={turtleForForm} alt="Черепаха" style={styles.turtle} />
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>
          Робочерепаха
          <button type="button" onClick={toggle} style={styles.themeBtn}>
            <img src={theme === 'dark' ? light : dark} alt="theme" style={styles.themeIcon} />
          </button>
        </h1>
        <h2 style={styles.subtitle}>Регистрация</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>ФИО</label>
            <input
              style={styles.input}
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError('') }}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="example@mail.ru"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Минимум 8 символов"
              required
            />

            {/* Индикатор надёжности */}
            {password && (
              <div style={styles.strengthWrapper}>
                <div style={styles.strengthBars}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      ...styles.strengthBar,
                      backgroundColor: i <= strength.score ? strength.color : 'var(--border)',
                    }} />
                  ))}
                </div>
                <span style={{ ...styles.strengthLabel, color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}

            {/* Подсказки */}
            {password && (
              <div style={styles.hints}>
                {[
                  { ok: password.length >= 8, text: '8 символов' },
                  { ok: /[A-Z]/.test(password), text: 'Заглавные буквы' },
                  { ok: /[0-9]/.test(password), text: 'Цифры' },
                  { ok: /[^A-Za-z0-9]/.test(password), text: 'Спецсимволы' },
                ].map(({ ok, text }) => (
                  <div key={text} style={{ ...styles.hint, color: ok ? '#4caf50' : 'var(--text-muted)' }}>
                    {ok ? '✓' : '○'} {text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p style={styles.link}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-page)',
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    padding: '40px',
    borderRadius: '35px',
    boxShadow: '0 2px 10px var(--accent-border)',
    width: '100%',
    maxWidth: '400px',
    zIndex: 1,
  },
  turtleWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '0',
    zIndex: 0,
  },
  turtle: {
    width: '100%',
    maxWidth: '280px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 5px var(--accent-border))',
  },
  title: {
    textAlign: 'center',
    color: 'var(--accent)',
    marginBottom: '5px',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  themeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
    width: '24px',
    height: '24px',
  },
  themeIcon: {
    width: '24px',
    height: '24px',
    display: 'block',
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--text-primary)',
    marginBottom: '20px',
    fontSize: '16px',
    fontWeight: 'normal',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  field: {
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border-input)',
    borderRadius: '15px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  strengthWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '8px',
  },
  strengthBars: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    transition: 'background-color 0.3s',
  },
  strengthLabel: {
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  hints: {
    marginTop: '8px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px',
  },
  hint: {
    fontSize: '12px',
    transition: 'color 0.2s',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'var(--accent-btn)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '18px',
  },
  link: {
    textAlign: 'center',
    marginTop: '10px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
}

export default RegisterPage