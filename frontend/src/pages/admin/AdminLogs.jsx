import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import adminAPI from '../../api/admin'

// Цвета типов событий
const eventColors = {
  LOGIN_SUCCESS: '#2e7d32',
  LOGIN_FAIL: '#c62828',
  REGISTER: '#1565c0',
  IDOR_ATTEMPT: '#b71c1c',
  DOCUMENT_UPLOADED: '#4a7c2f',
  APPLICATION_CREATED: '#2d5016',
  APPLICATION_STATUS_CHANGED: '#f57f17',
}

function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [idorOnly, setIdorOnly] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [idorOnly])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let res
      if (idorOnly) {
        res = await adminAPI.getIdorAttempts()
      } else {
        res = await adminAPI.getLogs()
      }
      setLogs(res.data)
    } catch (err) {
      console.error('Ошибка загрузки журнала:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? logs
    : logs.filter((log) => log.event_type === filter)

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('ru-RU')
  }

  const formatDetails = (details) => {
    if (!details) return '—'
    try {
      const parsed = JSON.parse(details)
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    } catch {
      return details
    }
  }

  const eventTypes = [
    'all',
    'LOGIN_SUCCESS',
    'LOGIN_FAIL',
    'REGISTER',
    'IDOR_ATTEMPT',
    'DOCUMENT_UPLOADED',
    'APPLICATION_CREATED',
    'APPLICATION_STATUS_CHANGED',
  ]

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.title}>Журнал аудита</h1>

        {/* Переключатель IDOR */}
        <div style={styles.idorToggle}>
          <button
            style={{
              ...styles.idorBtn,
              backgroundColor: idorOnly ? '#b71c1c' : 'white',
              color: idorOnly ? 'white' : '#b71c1c',
            }}
            onClick={() => setIdorOnly(!idorOnly)}
          >
            {idorOnly ? '⚠ Показать все события' : '⚠ Только IDOR попытки'}
          </button>
        </div>

        {/* Фильтр по типу события */}
        {!idorOnly && (
          <div style={styles.filters}>
            {eventTypes.map((type) => (
              <button
                key={type}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: filter === type ? '#2d5016' : 'white',
                  color: filter === type ? 'white' : '#3d3d3d',
                }}
                onClick={() => setFilter(type)}
              >
                {type === 'all' ? 'Все' : type}
              </button>
            ))}
          </div>
        )}

        {/* Таблица логов */}
        {loading ? (
          <p>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            <p>Записей не найдено.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Время</th>
                  <th style={styles.th}>Событие</th>
                  <th style={styles.th}>Пользователь</th>
                  <th style={styles.th}>Объект</th>
                  <th style={styles.th}>IP адрес</th>
                  <th style={styles.th}>Детали</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} style={styles.tr}>
                    <td style={styles.td}>{formatDate(log.created_at)}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.eventBadge,
                        backgroundColor: eventColors[log.event_type] || '#757575',
                      }}>
                        {log.event_type}
                      </span>
                    </td>
                    <td style={styles.td}>{log.user_id || '—'}</td>
                    <td style={styles.td}>
                      {log.object_type ? `${log.object_type} #${log.object_id}` : '—'}
                    </td>
                    <td style={styles.td}>{log.ip_address || '—'}</td>
                    <td style={styles.td}>{formatDetails(log.details)}</td>
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
  page: {
    minHeight: '100vh',
    backgroundColor: '#f4f1eb',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  title: {
    fontSize: '24px',
    color: '#2d5016',
    marginBottom: '24px',
  },
  idorToggle: {
    marginBottom: '16px',
  },
  idorBtn: {
    padding: '8px 16px',
    border: '1px solid #b71c1c',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thead: {
    backgroundColor: '#f4f1eb',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    color: '#757575',
    fontWeight: '500',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f5f5f5',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#3d3d3d',
    verticalAlign: 'top',
  },
  eventBadge: {
    color: 'white',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
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

export default AdminLogs