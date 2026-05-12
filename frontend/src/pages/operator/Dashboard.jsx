import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'

// Цвета статусов
const statusColors = {
  draft: '#757575',
  submitted: '#1565c0',
  under_review: '#f57f17',
  approved: '#2e7d32',
  rejected: '#c62828',
}

// Названия статусов на русском
const statusLabels = {
  draft: 'Черновик',
  submitted: 'Подано',
  under_review: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

function OperatorDashboard() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      // Оператор видит все заявления через admin endpoint
      const res = await applicationsAPI.getMy()
      setApplications(res.data)
    } catch (err) {
      console.error('Ошибка загрузки заявлений:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? applications
    : applications.filter((a) => a.status === filter)

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.title}>Панель оператора</h1>

        {/* Фильтр по статусу */}
        <div style={styles.filters}>
          {['all', 'submitted', 'under_review', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              style={{
                ...styles.filterBtn,
                backgroundColor: filter === s ? '#2d5016' : 'white',
                color: filter === s ? 'white' : '#3d3d3d',
              }}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'Все' : statusLabels[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            <p>Заявлений не найдено.</p>
          </div>
        ) : (
          filtered.map((app) => (
            <div key={app.id} style={styles.card}>
              <div style={styles.cardRow}>
                <span style={styles.cardTitle}>{app.direction}</span>
                <span style={{
                  ...styles.badge,
                  backgroundColor: statusColors[app.status],
                }}>
                  {statusLabels[app.status]}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardSub}>
                  ID пользователя: {app.user_id} · {app.education_level}
                </span>
                <Link
                  to={`/operator/applications/${app.id}`}
                  style={styles.detailBtn}
                >
                  Рассмотреть
                </Link>
              </div>
            </div>
          ))
        )}
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  title: {
    fontSize: '24px',
    color: '#2d5016',
    marginBottom: '24px',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  card: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '15px',
    color: '#3d3d3d',
    fontWeight: '500',
  },
  cardSub: {
    fontSize: '13px',
    color: '#757575',
  },
  badge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
  },
  detailBtn: {
    backgroundColor: '#2d5016',
    color: 'white',
    padding: '6px 14px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '13px',
  },
  empty: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#757575',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
}

export default OperatorDashboard