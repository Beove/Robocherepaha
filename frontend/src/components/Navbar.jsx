import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

function Navbar() {
  const { role, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        Робочерепаха
      </div>

      <div style={styles.links}>
        {role === 'applicant' && (
          <>
            <Link style={styles.link} to="/dashboard">Главная</Link>
            <Link style={styles.link} to="/application">Заявление</Link>
            <Link style={styles.link} to="/documents">Документы</Link>
          </>
        )}
        {role === 'operator' && (
          <Link style={styles.link} to="/operator">Заявления</Link>
        )}
        {role === 'admin' && (
          <Link style={styles.link} to="/admin/logs">Журнал аудита</Link>
        )}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    backgroundColor: '#0C131E',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  brand: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '500',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  link: {
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: '14px',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.5)',
    color: 'white',
    padding: '6px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
}

export default Navbar