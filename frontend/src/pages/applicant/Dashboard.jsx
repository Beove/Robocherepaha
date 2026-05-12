import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'
import documentsAPI from '../../api/documents'

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

function Dashboard() {
  const [applications, setApplications] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null) // id заявления в процессе подачи
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [appsRes, docsRes] = await Promise.all([
        applicationsAPI.getMy(),
        documentsAPI.getMy(),
      ])
      setApplications(appsRes.data)
      setDocuments(docsRes.data)
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (applicationId) => {
    if (!window.confirm('Подать заявление? После подачи редактирование будет недоступно.')) return

    setSubmitting(applicationId)
    setError(null)
    try {
      await applicationsAPI.submit(applicationId)
      // Обновляем список заявлений локально без перезагрузки
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: 'submitted' } : app
        )
      )
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ошибка при подаче заявления'
      setError(msg)
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.title}>Личный кабинет</h1>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {loading ? (
          <p style={{ color: '#757575' }}>Загрузка...</p>
        ) : (
          <>
            {/* Блок заявлений */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Мои заявления</h2>
                <Link to="/application" style={styles.addBtn}>
                  + Новое заявление
                </Link>
              </div>

              {applications.length === 0 ? (
                <div style={styles.empty}>
                  <p>У вас нет заявлений. Создайте первое заявление.</p>
                </div>
              ) : (
                applications.map((app) => (
                  <div key={app.id} style={styles.card}>
                    <div style={styles.cardRow}>
                      <span style={styles.cardTitle}>{app.direction}</span>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: statusColors[app.status],
                        }}
                      >
                        {statusLabels[app.status]}
                      </span>
                    </div>
                    <p style={styles.cardSub}>{app.education_level}</p>
                    {app.comment && (
                      <p style={styles.comment}>Комментарий: {app.comment}</p>
                    )}
                    {app.status === 'draft' && (
                      <button
                        style={{
                          ...styles.submitBtn,
                          opacity: submitting === app.id ? 0.7 : 1,
                        }}
                        onClick={() => handleSubmit(app.id)}
                        disabled={submitting === app.id}
                      >
                        {submitting === app.id ? 'Отправка...' : 'Подать заявление'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Блок документов */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Мои документы</h2>
                <Link to="/documents" style={styles.addBtn}>
                  + Загрузить документ
                </Link>
              </div>

              {documents.length === 0 ? (
                <div style={styles.empty}>
                  <p>Документы не загружены.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} style={styles.card}>
                    <div style={styles.cardRow}>
                      <span style={styles.cardTitle}>{doc.original_filename}</span>
                      <span style={styles.docSize}>
                        {(doc.file_size / 1024).toFixed(1)} КБ
                      </span>
                    </div>
                    <p style={styles.cardSub}>{doc.mime_type}</p>
                  </div>
                ))
              )}
            </div>
          </>
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: 'clamp(16px, 4vw, 32px) 16px',
  },
  title: {
    fontSize: 'clamp(20px, 5vw, 24px)',
    color: '#2d5016',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#3d3d3d',
    margin: 0,
  },
  addBtn: {
    backgroundColor: '#2d5016',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '14px',
    whiteSpace: 'nowrap',
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
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '16px',
    color: '#3d3d3d',
    fontWeight: '500',
  },
  cardSub: {
    fontSize: '13px',
    color: '#757575',
    margin: '4px 0 0',
  },
  badge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    flexShrink: 0,
  },
  comment: {
    fontSize: '13px',
    color: '#6d4c1f',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  docSize: {
    fontSize: '13px',
    color: '#757575',
    flexShrink: 0,
  },
  empty: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#757575',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  submitBtn: {
    marginTop: '12px',
    backgroundColor: '#2d5016',
    color: 'white',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    border: '1px solid #c62828',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
  },
}

export default Dashboard