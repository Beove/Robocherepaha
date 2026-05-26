import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authAPI from '../../api/auth'
import useAuthStore from '../../store/authStore'
import turtleForForm from '../../assets/turtleForForm.png'
import dark from '../../assets/dark.png'
import light from '../../assets/light.png'
import applicantsAPI from '../../api/applicants'
import useThemeStore from '../../store/themeStore'

function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { theme, toggle } = useThemeStore()
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

      if (role === 'applicant') {
        try {
          const me = await applicantsAPI.getMe()
          useAuthStore.getState().setAuth(access_token, role, me.data.full_name)
        } catch { }
        navigate('/dashboard')
      } else if (role === 'operator') navigate('/operator')
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
        <h1 style={styles.title}>Робочерепаха <button onClick={toggle} style={styles.themeBtn}><img src={theme === 'dark' ? light : dark} alt="theme" style={styles.themeIcon} /></button></h1>
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
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    gap:'10px',
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

export default LoginPage