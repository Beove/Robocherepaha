import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'
import documentsAPI from '../../api/documents'

const statusLabels = {
  draft: 'Черновик', submitted: 'Подано',
  under_review: 'На рассмотрении', approved: 'Одобрено', rejected: 'Отклонено',
}
const statusColors = {
  draft: '#757575', submitted: '#1565c0',
  under_review: '#f57f17', approved: '#2e7d32', rejected: '#c62828',
}
const statusTrack = ['submitted', 'under_review', 'approved']

const docStatusLabels = { pending: 'На проверке', accepted: 'Принят', rejected: 'Отклонён' }
const docStatusColors = { pending: '#f57f17', accepted: '#2e7d32', rejected: '#c62828' }

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

  useEffect(() => { fetchData() }, [id])

  const fetchData = async () => {
    try {
      const appRes = await applicationsAPI.getById(id)
      setApplication(appRes.data)
      setNewStatus(appRes.data.status)
      setComment(appRes.data.comment || '')

      // Загружаем документы абитуриента
      try {
        const docsRes = await documentsAPI.getByUser(appRes.data.user_id)
        setDocuments(docsRes.data)
      } catch {
        // Если нет доступа к чужим документам — пустой массив
        setDocuments([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    setUpdating(true); setError(''); setSuccess('')
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

  const handleDownload = async (docId) => {
    try {
      const res = await documentsAPI.getDownloadUrl(docId)
      window.open(res.data.download_url, '_blank')
    } catch {
      setError('Ошибка получения ссылки для скачивания')
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleString('ru-RU') : '—'

  if (loading) return <div style={styles.page}><Navbar /><div style={styles.content}><p style={{ color: 'var(--accent)' }}>Загрузка...</p></div></div>
  if (!application) return <div style={styles.page}><Navbar /><div style={styles.content}><p style={{ color: '#c62828' }}>Заявление не найдено.</p></div></div>

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>

        <button style={styles.backBtn} onClick={() => navigate('/operator')}>
          ← Назад к списку
        </button>

        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Заявление #{application.id}</h1>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: `${statusColors[application.status]}33`,
            color: statusColors[application.status],
            border: `1px solid ${statusColors[application.status]}66`,
          }}>
            {statusLabels[application.status]}
          </span>
        </div>

        <div style={styles.grid}>

          {/* Левая колонка */}
          <div>
            {/* Информация о заявлении */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Данные заявления</h2>
              <div style={styles.detailsGrid}>
                {[
                  ['Направление', application.direction],
                  ['Уровень образования', application.education_level],
                  ['Факультет / институт', application.faculty || '—'],
                  ['Форма обучения', application.study_form || '—'],
                  ['Финансирование', application.funding || '—'],
                  ['ID абитуриента', application.user_id],
                  ['Дата создания', formatDate(application.created_at)],
                  ['Последнее обновление', formatDate(application.updated_at)],
                ].map(([label, value]) => (
                  <div key={label} style={styles.detailItem}>
                    <span style={styles.detailLabel}>{label}</span>
                    <span style={styles.detailValue}>{value}</span>
                  </div>
                ))}
              </div>
              {application.comment && (
                <div style={styles.commentBox}>
                  <span style={styles.detailLabel}>Текущий комментарий</span>
                  <span style={{ color: '#f57f17', fontSize: '14px' }}>{application.comment}</span>
                </div>
              )}
            </div>

            {/* Трек статусов */}
            {application.status !== 'rejected' && application.status !== 'draft' && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Этапы рассмотрения</h2>
                <div style={styles.trackWrapper}>
                  {statusTrack.map((s, idx) => {
                    const currentIdx = statusTrack.indexOf(application.status)
                    const isPast = idx <= currentIdx
                    const isCurrent = s === application.status
                    return (
                      <div key={s} style={styles.trackItem}>
                        <div style={{
                          ...styles.trackDot,
                          backgroundColor: isPast ? statusColors[s] : 'var(--text-muted)',
                          boxShadow: isCurrent ? `0 0 10px ${statusColors[s]}` : 'none',
                        }} />
                        {idx < statusTrack.length - 1 && (
                          <div style={{
                            ...styles.trackLine,
                            backgroundColor: idx < currentIdx ? statusColors[statusTrack[idx]] : 'var(--text-muted)',
                          }} />
                        )}
                        <span style={{
                          ...styles.trackLabel,
                          color: isPast ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}>{statusLabels[s]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Обновление статуса */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Изменить статус</h2>
              {error && <div style={styles.errorBanner}>{error}</div>}
              {success && <div style={styles.successBanner}>{success}</div>}

              <div style={styles.field}>
                <label style={styles.label}>Новый статус</label>
                <select style={styles.select} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="submitted">Подано</option>
                  <option value="under_review">На рассмотрении</option>
                  <option value="approved">Одобрено</option>
                  <option value="rejected">Отклонено</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Комментарий для абитуриента</label>
                <textarea style={styles.textarea} value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Необязательный комментарий..." rows={3} />
              </div>

              <button style={{ ...styles.updateBtn, opacity: updating ? 0.7 : 1 }}
                onClick={handleUpdateStatus} disabled={updating}>
                {updating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>

          {/* Правая колонка — документы */}
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                Документы абитуриента
                {documents.length > 0 && <span style={styles.docCount}> ({documents.length})</span>}
              </h2>

              {documents.length === 0 ? (
                <div style={styles.empty}>Документы не загружены</div>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} style={styles.docCard}>
                    <div style={styles.docRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.docName}>{doc.doc_type || doc.original_filename}</div>
                        <div style={styles.docMeta}>
                          {doc.edu_level && <span style={styles.eduTag}>{doc.edu_level}</span>}
                          <span>{(doc.file_size / 1024).toFixed(1)} КБ · {doc.mime_type}</span>
                        </div>
                      </div>
                      <span style={{
                        ...styles.docBadge,
                        backgroundColor: `${docStatusColors[doc.status] || '#757575'}33`,
                        color: docStatusColors[doc.status] || '#757575',
                        border: `1px solid ${docStatusColors[doc.status] || '#757575'}66`,
                      }}>
                        {docStatusLabels[doc.status] || doc.status}
                      </span>
                    </div>
                    <button style={styles.downloadBtn} onClick={() => handleDownload(doc.id)}>
                      Скачать
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh' },
  content: { maxWidth: '1240px', margin: '40px auto', padding: '0 16px' },
  backBtn: {
    background: 'transparent', border: 'none', color: 'var(--accent)',
    cursor: 'pointer', fontSize: '14px', padding: '0', marginBottom: '16px',
  },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
  pageTitle: { fontSize: '28px', color: 'var(--accent)', margin: 0 },
  statusBadge: {
    padding: '6px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' },
  card: {
    backgroundColor: 'var(--bg-card)', borderRadius: '15px', padding: '24px',
    border: '1px solid var(--border)', marginBottom: '20px',
  },
  cardTitle: { color: 'var(--accent)', fontSize: '16px', margin: '0 0 16px', fontWeight: '500' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '3px' },
  detailLabel: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  detailValue: { fontSize: '14px', color: 'var(--text-primary)' },
  commentBox: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  trackWrapper: { display: 'flex', alignItems: 'flex-start' },
  trackItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  trackDot: { width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, zIndex: 1 },
  trackLine: { position: 'absolute', top: '7px', left: '50%', right: '-50%', height: '2px', zIndex: 0 },
  trackLabel: { fontSize: '11px', marginTop: '8px', textAlign: 'center', lineHeight: '1.3' },
  field: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontSize: '14px' },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
    borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
    backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
  },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
    borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
    fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)', outline: 'none',
  },
  updateBtn: {
    backgroundColor: 'var(--accent-btn)', color: 'white', border: 'none',
    padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#ffebee', border: '1px solid #c62828', color: '#c62828',
    padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px',
  },
  successBanner: {
    backgroundColor: 'rgba(46,125,50,0.2)', border: '1px solid #2e7d32', color: '#4caf50',
    padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px',
  },
  docCount: { color: 'var(--text-muted)', fontSize: '14px' },
  docCard: {
    backgroundColor: 'var(--text-muted)', borderRadius: '10px',
    padding: '14px', marginBottom: '10px', border: '1px solid var(--text-secondary)',
  },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' },
  docName: { fontSize: '14px', color: '', fontWeight: '500', marginBottom: '4px' },
  docMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' },
  eduTag: { backgroundColor: 'var(--accent-btn-back)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' },
  docBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 },
  downloadBtn: {
    backgroundColor: 'transparent', border: '1px solid var(--accent-btn-back)',
    color: 'var(--accent)', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  },
  empty: {
    padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px',
  },
}

export default ApplicationDetail