import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'

const statusColors = {
  draft: '#757575',
  submitted: '#1565c0',
  under_review: '#f57f17',
  approved: '#2e7d32',
  rejected: '#c62828',
}

const statusLabels = {
  draft: 'Черновик',
  submitted: 'Подано',
  under_review: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

const statusFilters = ['all', 'submitted', 'under_review', 'approved', 'rejected']

function OperatorDashboard() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('submitted') // по умолчанию — поданные

  useEffect(() => { fetchApplications() }, [])

  const fetchApplications = async () => {
    try {
      const res = await applicationsAPI.getAll()
      setApplications(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? applications
    : applications.filter(a => a.status === filter)

  // Считаем по статусам для бейджей
  const counts = statusFilters.reduce((acc, s) => {
    acc[s] = s === 'all' ? applications.length : applications.filter(a => a.status === s).length
    return acc
  }, {})

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) : '—'

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Панель оператора</h1>

        {/* Счётчики */}
        <div style={styles.statsRow}>
          {[
            { label: 'Всего', key: 'all', color: 'var(--accent)' },
            { label: 'Подано', key: 'submitted', color: statusColors.submitted },
            { label: 'На рассмотрении', key: 'under_review', color: statusColors.under_review },
            { label: 'Одобрено', key: 'approved', color: statusColors.approved },
            { label: 'Отклонено', key: 'rejected', color: statusColors.rejected },
          ].map(({ label, key, color }) => (
            <div key={key} style={styles.statCard} onClick={() => setFilter(key)}>
              <div style={{ ...styles.statNum, color }}>{counts[key]}</div>
              <div style={styles.statLabel}>{label}</div>
              {filter === key && <div style={{ ...styles.statActive, backgroundColor: color }} />}
            </div>
          ))}
        </div>

        {/* Список заявлений */}
        {loading ? (
          <p style={{ color: 'var(--accent)' }}>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>Заявлений не найдено</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['№', 'Направление', 'Уровень', 'Факультет', 'Финансирование', 'Дата подачи', 'Статус', ''].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: 'var(--text-muted)' }}>#{app.id}</td>
                    <td style={{ ...styles.td, maxWidth: '260px' }}>
                      <div style={styles.direction}>{app.direction}</div>
                    </td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {app.education_level}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)', maxWidth: '180px' }}>
                      {app.faculty || '—'}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {app.funding || '—'}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDate(app.created_at)}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: `${statusColors[app.status]}33`,
                        color: statusColors[app.status],
                        border: `1px solid ${statusColors[app.status]}66`,
                      }}>
                        {statusLabels[app.status]}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <Link to={`/operator/applications/${app.id}`} style={styles.reviewBtn}>
                        Рассмотреть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh' },
  content: { maxWidth: '1400px', margin: '40px auto', padding: '0 16px' },
  pageTitle: { fontSize: '28px', color: 'var(--accent)', margin: '0 0 24px' },
  statsRow: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' },
  statCard: {
    backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px 24px',
    flex: '1 1 120px', border: '1px solid var(--border)',
    cursor: 'pointer', position: 'relative', overflow: 'hidden',
  },
  statNum: { fontSize: '28px', fontWeight: '700', lineHeight: 1, marginBottom: '6px' },
  statLabel: { fontSize: '13px', color: 'var(--text-secondary)' },
  statActive: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px' },
  tableWrapper: {
    backgroundColor: 'var(--bg-card)', borderRadius: '15px',
    border: '1px solid var(--border)', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: '11px',
    color: 'var(--text-muted)', fontWeight: '500',
    borderBottom: '1px solid var(--text-secondary)',
    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  tr: { borderBottom: '1px solid var(--text-muted)' },
  td: { padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', verticalAlign: 'middle' },
  direction: { fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.4' },
  badge: {
    display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
    fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
  },
  reviewBtn: {
    display: 'inline-block', padding: '6px 14px',
    backgroundColor: 'var(--accent-btn-back)', color: 'var(--accent)',
    border: '1px solid var(--accent)', borderRadius: '8px',
    textDecoration: 'none', fontSize: '13px', whiteSpace: 'nowrap',
  },
  empty: {
    backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '15px',
    textAlign: 'center', color: 'var(--text-muted)',
    border: '1px solid var(--border)', fontSize: '14px',
  },
}

export default OperatorDashboard