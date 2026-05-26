import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import logo from '../assets/turtleLogo.png'
import dark from '../assets/dark.png'
import light from '../assets/light.png'
import useThemeStore from '../store/themeStore'

function Navbar() {
  const { role, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.content}>
        <div style={styles.brand}>
          <img src={logo} alt="" style={{ height: '40px', objectFit: 'contain' }} />
          Робочерепаха
        </div>

        <div style={styles.links}>
          {role === 'applicant' && (
            <>
              <Link style={styles.link} to="/dashboard">Главная</Link>
              <Link style={styles.link} to="/application">Заявления</Link>
              <Link style={styles.link} to="/documents">Документы</Link>
            </>
          )}
          {role === 'operator' && (
            <Link style={styles.link} to="/operator">Заявления</Link>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
          <button onClick={toggle} style={styles.themeBtn}><img src={theme === 'dark' ? light : dark} alt="theme" style={styles.themeIcon} /></button>
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'var(--bg-card)',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80px',
    boxShadow: '0 1px 5px var(--accent-btn)',
    borderRadius: '0 0 35px 35px'
  },
  content: {
    width: '1240px',
    display: 'flex',
    alignItems: 'center',
  },
  brand: {
    color: 'var(--accent-btn)',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  links: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  themeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
  },
  themeIcon: {
    width: '24px',
    height: '24px',
    display: 'block',
  },
  link: {
    color: 'var(--text-primary)',
    textDecoration: 'none',
    fontSize: '14px',
  },
  logoutBtn: {
    backgroundColor: 'var(--accent-btn)',
    border: 'none',
    color: '#fff',
    padding: '7px 15px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
}

export default Navbar