import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authAPI from '../../api/auth'
import useAuthStore from '../../store/authStore'
import turtleForForm from '../../assets/turtleForForm.png'

function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login(email, password)
      const { access_token, role } = response.data
      setAuth(access_token, role)

      // Редирект в зависимости от роли
      if (role === 'applicant') navigate('/dashboard')
      else if (role === 'operator') navigate('/operator')
      else if (role === 'admin') navigate('/admin/logs')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка входа')
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
        <h1 style={styles.title}>Робочерепаха</h1>
        <h2 style={styles.subtitle}>Вход в систему</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>

          <button
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p style={styles.link}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
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
    backgroundColor: '#0C131E',
  },
  card: {
    backgroundColor: '#18212D',
    padding: '40px',
    borderRadius: '35px',
    boxShadow: '0 2px 10px rgba(94,214,227,0.5)',
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
    filter: 'drop-shadow(0 2px 5px rgba(94,214,227,0.5))',
  },
  title: {
    textAlign: 'center',
    color: '#5ED6E3',
    marginBottom: '5px',
    fontSize: '24px',
    WebkitTextStroke: '0 2px 10px rgba(255, 255, 255, 0.8)',
  },
  subtitle: {
    textAlign: 'center',
    color: '#fff',
    marginBottom: '20px',
    fontSize: '16px',
    fontWeight: 'normal',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  field: {
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#fff',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #313840',
    borderRadius: '15px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'rgba(94, 214, 227, 0.8)',
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
    color: '#fff',
  },
}

export default LoginPage