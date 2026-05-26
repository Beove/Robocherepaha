import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import documentsAPI from '../../api/documents'
import turtleLogo from '../../assets/turtleLogo.png'

// ─── Данные по типам документов ───────────────────────────────────────────────

export const docTypes = {
  'Бакалавриат / Специалитет': {
    required: [
      'Заявление поступающего по программам бакалавриата и специалитета',
      'Заявление о согласии на обработку персональных данных',
      'Документ, удостоверяющий личность и гражданство',
      'Документ об образовании (аттестат или диплом) со всеми приложениями',
    ],
    optional: [
      'СНИЛС (при наличии)',
      'Фотография поступающего',
      'Документы, подтверждающие индивидуальные достижения и (или) особые права (при наличии)',
    ],
  },
  'Магистратура': {
    required: [
      'Заявление поступающего по программам магистратуры',
      'Заявление о согласии на обработку персональных данных',
      'Документ, удостоверяющий личность и гражданство',
      'Документ об образовании (диплом) со всеми приложениями',
      'Фотография поступающего',
    ],
    optional: [
      'СНИЛС (при наличии)',
      'Документы, подтверждающие индивидуальные достижения (при наличии)',
    ],
  },
  'Аспирантура': {
    required: [
      'Заявление поступающего по программам аспирантуры',
      'Заявление о согласии на обработку персональных данных',
      'Документ, удостоверяющий личность и гражданство',
      'Документ об образовании (диплом) со всеми приложениями или их копии',
      'Фотография поступающего',
    ],
    optional: [
      'СНИЛС (при наличии)',
      'Публикации в изданиях Web of Science / Scopus (при наличии)',
      'Публикации в изданиях перечня ВАК / патенты / авторские свидетельства (при наличии)',
      'Статьи / тезисы докладов международных или всероссийских конференций (при наличии)',
      'Прочие публикации (при наличии)',
      'Диплом победителя Всероссийского инженерного конкурса (при наличии)',
      'Диплом олимпиады «Я — профессионал» (при наличии)',
      'Диплом победителя международного / всероссийского конкурса (при наличии)',
      'Диплом победителя регионального конкурса (при наличии)',
      'Удостоверение о сдаче кандидатских экзаменов (при наличии)',
      'Диплом магистра или специалиста с отличием (при наличии)',
      'Рекомендательное письмо от потенциального научного руководителя (при наличии)',
      'Документы об участии в профориентационных мероприятиях (при наличии)',
    ],
  },
}

// ─── Утилита проверки — экспортируется в ApplicationForm ──────────────────────

export function getMissingDocs(documents, eduLevel) {
  const levelMap = {
    'Бакалавриат': 'Бакалавриат / Специалитет',
    'Специалитет': 'Бакалавриат / Специалитет',
    'Магистратура': 'Магистратура',
    'Аспирантура': 'Аспирантура',
  }
  const key = levelMap[eduLevel] || eduLevel
  const required = docTypes[key]?.required || []
  const uploaded = documents.filter(d => d.edu_level === key).map(d => d.doc_type)
  return required.filter(r => !uploaded.includes(r))
}

// ─── Константы ────────────────────────────────────────────────────────────────

const statusLabels = { pending: 'На проверке', accepted: 'Принят', rejected: 'Отклонён' }
const statusColors = { pending: '#f57f17', accepted: '#2e7d32', rejected: '#c62828' }

// ─── Компонент ────────────────────────────────────────────────────────────────

function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [eduLevel, setEduLevel] = useState('')
  const [docType, setDocType] = useState('')

  const [deletingId, setDeletingId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      const res = await documentsAPI.getMy()
      setDocuments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!eduLevel) { setError('Выберите уровень образования'); e.target.value = ''; return }
    if (!docType) { setError('Выберите тип документа'); e.target.value = ''; return }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      await documentsAPI.upload(file, docType, eduLevel)
      setSuccess(`Документ «${docType}» успешно загружен`)
      setDocType('')
      fetchDocuments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки файла')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDownload = async (id, filename) => {
    try {
      const res = await documentsAPI.getDownloadUrl(id)
      const a = document.createElement('a')
      a.href = res.data.download_url
      a.download = filename || 'document'
      a.click()
    } catch {
      setError('Ошибка получения ссылки для скачивания')
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await documentsAPI.delete(deletingId)
      setDocuments(prev => prev.filter(d => d.id !== deletingId))
      setDeletingId(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при удалении')
      setDeletingId(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const currentDocTypes = eduLevel ? docTypes[eduLevel] : null

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Документы</h1>

        <div style={styles.grid}>

          {/* ── Левая колонка — загрузка ── */}
          <div>
            <h2 style={styles.sectionTitle}>Загрузить документ</h2>
            <div style={styles.card}>
              <p style={styles.hint}>Форматы: PDF, JPEG, PNG. Максимум: 10 МБ.</p>

              {error && <div style={styles.errorBanner}>{error}</div>}
              {success && <div style={styles.successBanner}>{success}</div>}

              <div style={styles.field}>
                <label style={styles.label}>Уровень образования</label>
                <select style={styles.select} value={eduLevel}
                  onChange={e => { setEduLevel(e.target.value); setDocType('') }}>
                  <option value="">Выберите уровень</option>
                  {Object.keys(docTypes).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {eduLevel && (
                <div style={styles.field}>
                  <label style={styles.label}>Тип документа</label>
                  <select style={styles.select} value={docType} onChange={e => setDocType(e.target.value)}>
                    <option value="">Выберите тип</option>
                    <optgroup label="Обязательные">
                      {currentDocTypes.required.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                    <optgroup label="Необязательные">
                      {currentDocTypes.optional.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  </select>
                </div>
              )}

              <label style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Загрузка...' : '+ Выбрать файл'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUpload} disabled={uploading}
                  style={{ display: 'none' }} />
              </label>

              {eduLevel && (
                <div style={styles.requireList}>
                  <p style={styles.requireTitle}>Обязательные</p>
                  {currentDocTypes.required.map((t, i) => {
                    const uploaded = documents.some(d => d.edu_level === eduLevel && d.doc_type === t)
                    return (
                      <div key={t} style={styles.requireItem}>
                        <span style={{
                          ...styles.requireNum,
                          backgroundColor: uploaded ? 'rgba(46,125,50,0.3)' : 'var(--accent-btn-back)',
                          color: uploaded ? '#4caf50' : 'var(--accent)',
                        }}>
                          {uploaded ? '✓' : i + 1}
                        </span>
                        <span style={{
                          ...styles.requireText,
                          color: uploaded ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}>
                          {t}
                        </span>
                      </div>
                    )
                  })}

                  <p style={{ ...styles.requireTitle, marginTop: '12px' }}>Необязательные</p>
                  {currentDocTypes.optional.map(t => {
                    const uploaded = documents.some(d => d.edu_level === eduLevel && d.doc_type === t)
                    return (
                      <div key={t} style={styles.requireItem}>
                        <span style={{
                          ...styles.requireNum,
                          backgroundColor: uploaded ? 'rgba(46,125,50,0.3)' : 'var(--row-divider)',
                          color: uploaded ? '#4caf50' : 'var(--border)',
                        }}>
                          {uploaded ? '✓' : '—'}
                        </span>
                        <span style={{
                          ...styles.requireText,
                          color: 'var(--text-muted)',
                        }}>
                          {t}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Правая колонка — загруженные документы ── */}
          <div>
            <h2 style={styles.sectionTitle}>
              Загруженные документы
              {documents.length > 0 && <span style={styles.count}> ({documents.length})</span>}
            </h2>

            {loading ? (
              <p style={{ color: '#5ED6E3' }}>Загрузка...</p>
            ) : documents.length === 0 ? (
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
                      ...styles.badge,
                      backgroundColor: statusColors[doc.status] || '#757575',
                    }}>
                      {statusLabels[doc.status] || doc.status}
                    </span>
                  </div>
                  <div style={styles.docActions}>
                    <button style={styles.downloadBtn} onClick={() => handleDownload(doc.id, doc.original_filename)}>
                      Скачать
                    </button>
                    <button style={styles.deleteBtn} onClick={() => setDeletingId(doc.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Попап удаления ── */}
      {deletingId && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <h3 style={styles.popupTitle}>Удалить документ?</h3>
            <p style={styles.popupText}>
              «{documents.find(d => d.id === deletingId)?.doc_type || 'Документ'}» будет удалён безвозвратно.
            </p>
            <div style={styles.popupActions}>
              <button style={styles.popupDelete} onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Удаление...' : 'Удалить'}
              </button>
              <button style={styles.popupCancel} onClick={() => setDeletingId(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <Link to="/ai-consultant" style={styles.aiBtn}>
        <img src={turtleLogo} alt="" style={{ height: '60px', objectFit: 'contain' }} />
        <span style={styles.aiText}>Готова помочь!</span>
      </Link>
    </div>
  )
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const styles = {
  page: { minHeight: '100vh' },
  content: { maxWidth: '1240px', margin: '40px auto', padding: '0 16px' },
  pageTitle: { fontSize: '28px', color: 'var(--accent)', margin: '0 0 24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' },
  sectionTitle: { fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: '400' },
  card: { backgroundColor: 'var(--bg-card)', borderRadius: '15px', padding: '24px', border: '1px solid var(--border)' },
  hint: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontSize: '14px' },
  count: { color: 'var(--accent)', fontSize: '13px' },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--accent-border)',
    borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
    backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
  },
  uploadBtn: {
    display: 'inline-block', backgroundColor: 'var(--accent-btn)',
    color: 'white', padding: '10px 20px', borderRadius: '10px',
    cursor: 'pointer', fontSize: '14px', marginBottom: '20px',
  },
  requireList: { borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' },
  requireTitle: {
    fontSize: '11px', color: 'var(--text-muted)',
    marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  requireItem: { display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' },
  requireNum: {
    minWidth: '20px', height: '20px', borderRadius: '50%', fontSize: '11px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  requireText: { fontSize: '13px', lineHeight: '1.4' },
  empty: {
    backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
    textAlign: 'center', color: 'var(--text-muted)',
    border: '1px solid var(--border)', fontSize: '14px',
  },
  docCard: {
    backgroundColor: 'var(--bg-card)', padding: '16px 20px',
    borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--border)',
  },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' },
  docName: { fontSize: '14px', color: 'var(--text-ptimary)', fontWeight: '500', marginBottom: '4px' },
  docMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' },
  eduTag: { backgroundColor: 'var(--accent-btn-back)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' },
  badge: { color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', flexShrink: 0 },
  docActions: { display: 'flex', gap: '8px' },
  downloadBtn: {
    backgroundColor: 'transparent', border: '1px solid var(--border)',
    color: 'var(--accent)', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  },
  deleteBtn: {
    backgroundColor: 'rgba(198,40,40,0.1)', border: '1px solid rgba(198,40,40,0.3)',
    color: '#c62828', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  },
  errorBanner: {
    backgroundColor: '#ffebee', border: '1px solid #c62828',
    color: '#c62828', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px',
  },
  successBanner: {
    backgroundColor: 'rgba(46,125,50,0.2)', border: '1px solid #2e7d32',
    color: '#4caf50', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px',
  },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  popup: {
    backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '32px',
    maxWidth: '400px', width: '90%', border: '1px solid var(--border)',
  },
  popupTitle: { color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 12px' },
  popupText: { color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' },
  popupActions: { display: 'flex', gap: '12px' },
  popupDelete: {
    backgroundColor: 'rgba(198,40,40,0.8)', color: 'white',
    border: 'none', padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
  },
  popupCancel: {
    backgroundColor: 'transparent', color: 'var(--text-secondary)',
    border: '1px solid var(--text-secondary)', padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
  },
  aiBtn: {
    position: 'fixed',
    bottom: '35px',
    right: '35px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRadius: '50px',
    padding: '10px 20px 10px 10px',
    textDecoration: 'none',
    zIndex: 99,
  },
  aiText: {
    color: 'var(--text-primary)',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid var(--accent-border)',
    boxShadow: '0 0 2px var(--accent-border)',
    borderRadius: '10px',
    padding: '10px 20px',
  },
}

export default DocumentsPage