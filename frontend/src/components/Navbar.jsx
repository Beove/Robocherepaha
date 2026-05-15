import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import logo from '../assets/turtleLogo.png'

function Navbar() {
  const { role, logout } = useAuthStore()
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
          {role === 'admin' && (
            <Link style={styles.link} to="/admin/logs">Журнал аудита</Link>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
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
    backgroundColor: '#18212D',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80px',
    boxShadow: '0 2px 5px rgba(94,214,227,0.5)',
    borderRadius: '0 0 35px 35px'
  },
  content: {
    width: '1240px',
    display: 'flex',
    alignItems: 'center',
  },
  brand: {
    color: '#5ED6E3',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems:'center',
    gap: '10px',
  },
  links: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  link: {
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: '14px',
  },
  logoutBtn: {
    backgroundColor: 'rgba(94, 214, 227, 0.8)',
    border: '1px solid  rgba(94,214,227,0.5)',
    color: '#fff',
    padding: '7px 15px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
}

export default Navbar