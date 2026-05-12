import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'
import documentsAPI from '../../api/documents'

// Названия статусов на русском
const statusLabels = {
  draft: 'Черновик',
  submitted: 'Подано',
  under_review: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

// Цвета статусов
const statusColors = {
  draft: '#757575',
  submitted: '#1565c0',
  under_review: '#f57f17',
  approved: '#2e7d32',
  rejected: '#c62828',
}

function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [comment, setComment] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const appRes = await applicationsAPI.getById(id)
      setApplication(appRes.data)
      setNewStatus(appRes.data.status)
      setComment(appRes.data.comment || '')
    } catch (err) {
      console.error('Ошибка загрузки заявления:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      await applicationsAPI.updateStatus(id, newStatus, comment)
      setSuccess('Статус успешно обновлён')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка обновления статуса')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}><p>Загрузка...</p></div>
    </div>
  )

  if (!application) return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}><p>Заявление не найдено.</p></div>
    </div>
  )

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <button style={styles.backBtn} onClick={() => navigate('/operator')}>
          ← Назад к списку
        </button>

        <h1 style={styles.title}>Заявление №{application.id}</h1>

        {/* Информация о заявлении */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Информация</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Направление:</span>
            <span style={styles.infoValue}>{application.direction}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Уровень образования:</span>
            <span style={styles.infoValue}>{application.education_level}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>ID пользователя:</span>
            <span style={styles.infoValue}>{application.user_id}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Текущий статус:</span>
            <span style={{
              ...styles.badge,
              backgroundColor: statusColors[application.status],
            }}>
              {statusLabels[application.status]}
            </span>
          </div>
          {application.comment && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Комментарий:</span>
              <span style={styles.infoValue}>{application.comment}</span>
            </div>
          )}
        </div>

        {/* Обновление статуса */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Обновить статус</h2>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Новый статус</label>
            <select
              style={styles.select}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="submitted">Подано</option>
              <option value="under_review">На рассмотрении</option>
              <option value="approved">Одобрено</option>
              <option value="rejected">Отклонено</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Комментарий для абитуриента</label>
            <textarea
              style={styles.textarea}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательный комментарий..."
              rows={3}
            />
          </div>

          <button
            style={{...styles.updateBtn, opacity: updating ? 0.7 : 1}}
            onClick={handleUpdateStatus}
            disabled={updating}
          >
            {updating ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
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
    maxWidth: '700px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  backBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#2d5016',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    color: '#2d5016',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    color: '#3d3d3d',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '12px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#757575',
    minWidth: '180px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#3d3d3d',
  },
  badge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#3d3d3d',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  updateBtn: {
    backgroundColor: '#2d5016',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
}

export default ApplicationDetail