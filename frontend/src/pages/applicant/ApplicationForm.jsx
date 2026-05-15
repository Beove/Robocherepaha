import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'
import documentsAPI from '../../api/documents'
import { getMissingDocs } from './DocumentsPage'
import { levels, getFaculties, getForms, getDirections } from '../../data/directions'
import turtleLogo from '../../assets/turtleLogo.png'

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

const statusTrack = ['draft', 'submitted', 'under_review', 'approved']

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ApplicationForm() {
  // ── Форма создания ──
  const [level, setLevel] = useState('')
  const [faculty, setFaculty] = useState('Все')
  const [form, setForm] = useState('Все')
  const [direction, setDirection] = useState('')
  const [funding, setFunding] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // ── История ──
  const [applications, setApplications] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  // ── Редактирование ──
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [editLoading, setEditLoading] = useState(false)

  // ── Документы и попап ──
  const [allDocuments, setAllDocuments] = useState([])
  const [missingDocs, setMissingDocs] = useState([])
  const [showMissingPopup, setShowMissingPopup] = useState(false)
  const [pendingSubmitApp, setPendingSubmitApp] = useState(null)

  const faculties = level ? getFaculties(level) : []
  const forms = level ? getForms(level, faculty) : []
  const directions = level ? getDirections(level, faculty, form === 'Все' ? null : form) : []

  const loadApplications = () => {
    setHistoryLoading(true)
    applicationsAPI.getMy()
      .then(res => setApplications(res.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }

  useEffect(() => {
    loadApplications()
    documentsAPI.getMy().then(res => setAllDocuments(res.data)).catch(() => {})
  }, [])

  const handleLevelChange = (val) => { setLevel(val); setFaculty('Все'); setForm('Все'); setDirection('') }
  const handleFacultyChange = (val) => { setFaculty(val); setForm('Все'); setDirection('') }
  const handleFormChange = (val) => { setForm(val); setDirection('') }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!direction) { setError('Выберите направление подготовки'); return }
    if (!funding) { setError('Выберите форму финансирования'); return }
    setLoading(true)
    setError('')
    try {
      await applicationsAPI.create({
        direction,
        education_level: level,
        faculty: faculty === 'Все' ? null : faculty,
        study_form: form === 'Все' ? null : form,
        funding,
      })
      setSuccess(true)
      setLevel(''); setFaculty('Все'); setForm('Все'); setDirection(''); setFunding('')
      loadApplications()
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при создании заявления')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить черновик? Это действие необратимо.')) return
    try {
      await applicationsAPI.delete(id)
      setApplications(prev => prev.filter(a => a.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка при удалении')
    }
  }

  const startEdit = (app) => {
    setEditingId(app.id)
    setEditData({
      direction: app.direction,
      education_level: app.education_level,
      faculty: app.faculty || '',
      study_form: app.study_form || '',
      funding: app.funding || '',
    })
  }

  const handleEdit = async (id) => {
    setEditLoading(true)
    try {
      const res = await applicationsAPI.update(id, editData)
      setApplications(prev => prev.map(a => a.id === id ? res.data : a))
      setEditingId(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка при редактировании')
    } finally {
      setEditLoading(false)
    }
  }

  // ── Подача с проверкой документов ──
  const handleSubmitApp = async (app) => {
    const missing = getMissingDocs(allDocuments, app.education_level)
    if (missing.length > 0) {
      setMissingDocs(missing)
      setPendingSubmitApp(app)
      setShowMissingPopup(true)
      return
    }
    doSubmit(app.id)
  }

  const doSubmit = async (id) => {
    if (!window.confirm('Подать заявление? После подачи редактирование будет недоступно.')) return
    try {
      const res = await applicationsAPI.submit(id)
      setApplications(prev => prev.map(a => a.id === id ? res.data : a))
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка при подаче')
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Заявления</h1>

        <div style={styles.grid}>

          {/* ── Левая колонка — форма создания ── */}
          <div>
            <h2 style={styles.sectionTitle}>Новое заявление</h2>
            <div style={styles.card}>
              {success && <div style={styles.successBanner}>Заявление создано! Не забудьте его подать.</div>}
              {error && <div style={styles.errorBanner}>{error}</div>}

              <form onSubmit={handleCreate}>
                <div style={styles.field}>
                  <label style={styles.label}>Уровень образования</label>
                  <select style={styles.select} value={level} onChange={e => handleLevelChange(e.target.value)} required>
                    <option value="">Выберите уровень</option>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {level && (
                  <div style={styles.field}>
                    <label style={styles.label}>Факультет / институт</label>
                    <select style={styles.select} value={faculty} onChange={e => handleFacultyChange(e.target.value)}>
                      {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                )}

                {level && (
                  <div style={styles.field}>
                    <label style={styles.label}>Форма обучения</label>
                    <select style={styles.select} value={form} onChange={e => handleFormChange(e.target.value)}>
                      {forms.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                )}

                {level && (
                  <div style={styles.field}>
                    <label style={styles.label}>
                      Направление подготовки
                      {directions.length > 0 && <span style={styles.count}> ({directions.length})</span>}
                    </label>
                    <select style={styles.select} value={direction} onChange={e => setDirection(e.target.value)} required>
                      <option value="">Выберите направление</option>
                      {directions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    {directions.length === 0 && <p style={styles.hint}>Нет направлений для выбранных фильтров</p>}
                  </div>
                )}

                {level && (
                  <div style={styles.field}>
                    <label style={styles.label}>Форма финансирования</label>
                    <div style={styles.radioRow}>
                      {['Бюджет', 'Платно'].map(opt => (
                        <label key={opt} style={styles.radioLabel}>
                          <input type="radio" name="funding" value={opt}
                            checked={funding === opt} onChange={() => setFunding(opt)}
                            style={{ accentColor: '#5ED6E3' }} />
                          <span style={styles.radioText}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit"
                  style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
                  disabled={loading || !level}>
                  {loading ? 'Создание...' : 'Создать заявление'}
                </button>
              </form>
            </div>
          </div>

          {/* ── Правая колонка — история ── */}
          <div>
            <h2 style={styles.sectionTitle}>
              История заявлений
              {applications.length > 0 && <span style={styles.count}> ({applications.length})</span>}
            </h2>

            {historyLoading ? (
              <p style={{ color: '#5ED6E3' }}>Загрузка...</p>
            ) : applications.length === 0 ? (
              <div style={styles.empty}>У вас пока нет заявлений</div>
            ) : (
              applications.map(app => (
                <div key={app.id} style={styles.appCard}>

                  {/* Заголовок карточки */}
                  <div style={styles.appHeader}
                    onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.appDirection}>{app.direction}</div>
                      <div style={styles.appMeta}>{app.education_level}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ ...styles.badge, backgroundColor: statusColors[app.status] }}>
                        {statusLabels[app.status]}
                      </span>
                      <span style={styles.chevron}>{expandedId === app.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Раскрытые детали */}
                  {expandedId === app.id && (
                    <div style={styles.appDetails}>

                      {editingId === app.id ? (
                        // ── Форма редактирования ──
                        <div style={styles.editForm}>
                          <div style={styles.field}>
                            <label style={styles.label}>Направление</label>
                            <input style={styles.input} value={editData.direction}
                              onChange={e => setEditData(p => ({ ...p, direction: e.target.value }))} />
                          </div>
                          <div style={styles.field}>
                            <label style={styles.label}>Уровень образования</label>
                            <input style={styles.input} value={editData.education_level}
                              onChange={e => setEditData(p => ({ ...p, education_level: e.target.value }))} />
                          </div>
                          <div style={styles.field}>
                            <label style={styles.label}>Факультет</label>
                            <input style={styles.input} value={editData.faculty}
                              onChange={e => setEditData(p => ({ ...p, faculty: e.target.value }))} />
                          </div>
                          <div style={styles.field}>
                            <label style={styles.label}>Форма обучения</label>
                            <input style={styles.input} value={editData.study_form}
                              onChange={e => setEditData(p => ({ ...p, study_form: e.target.value }))} />
                          </div>
                          <div style={styles.field}>
                            <label style={styles.label}>Финансирование</label>
                            <div style={styles.radioRow}>
                              {['Бюджет', 'Платно'].map(opt => (
                                <label key={opt} style={styles.radioLabel}>
                                  <input type="radio" name="editFunding" value={opt}
                                    checked={editData.funding === opt}
                                    onChange={() => setEditData(p => ({ ...p, funding: opt }))}
                                    style={{ accentColor: '#5ED6E3' }} />
                                  <span style={styles.radioText}>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={styles.saveBtn} onClick={() => handleEdit(app.id)} disabled={editLoading}>
                              {editLoading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button style={styles.cancelBtn} onClick={() => setEditingId(null)}>Отмена</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ── Детали ── */}
                          <div style={styles.detailsGrid}>
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Факультет</span>
                              <span style={styles.detailValue}>{app.faculty || '—'}</span>
                            </div>
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Форма обучения</span>
                              <span style={styles.detailValue}>{app.study_form || '—'}</span>
                            </div>
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Финансирование</span>
                              <span style={styles.detailValue}>{app.funding || '—'}</span>
                            </div>
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Дата создания</span>
                              <span style={styles.detailValue}>{formatDate(app.created_at)}</span>
                            </div>
                            {app.updated_at && (
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Обновлено</span>
                                <span style={styles.detailValue}>{formatDate(app.updated_at)}</span>
                              </div>
                            )}
                            {app.comment && (
                              <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                                <span style={styles.detailLabel}>Комментарий оператора</span>
                                <span style={{ ...styles.detailValue, color: '#f57f17' }}>{app.comment}</span>
                              </div>
                            )}
                          </div>

                          {/* ── Трек статусов ── */}
                          <div style={styles.trackWrapper}>
                            {app.status !== 'rejected' ? (
                              statusTrack.map((s, idx) => {
                                const currentIdx = statusTrack.indexOf(app.status)
                                const isPast = idx <= currentIdx
                                const isCurrent = s === app.status
                                return (
                                  <div key={s} style={styles.trackItem}>
                                    <div style={{
                                      ...styles.trackDot,
                                      backgroundColor: isPast ? statusColors[s] : 'rgba(255,255,255,0.15)',
                                      border: isCurrent ? `2px solid ${statusColors[s]}` : '2px solid transparent',
                                      boxShadow: isCurrent ? `0 0 8px ${statusColors[s]}` : 'none',
                                    }} />
                                    {idx < statusTrack.length - 1 && (
                                      <div style={{
                                        ...styles.trackLine,
                                        backgroundColor: idx < currentIdx
                                          ? statusColors[statusTrack[idx]]
                                          : 'rgba(255,255,255,0.1)',
                                      }} />
                                    )}
                                    <span style={{
                                      ...styles.trackLabel,
                                      color: isPast ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                                    }}>
                                      {statusLabels[s]}
                                    </span>
                                  </div>
                                )
                              })
                            ) : (
                              <div style={{ color: '#c62828', fontSize: '13px' }}>Заявление отклонено</div>
                            )}
                          </div>

                          {/* ── Кнопки для черновика ── */}
                          {app.status === 'draft' && (
                            <div style={styles.actionRow}>
                              <button style={styles.submitAppBtn} onClick={() => handleSubmitApp(app)}>
                                Подать заявление
                              </button>
                              <button style={styles.editBtn} onClick={() => startEdit(app)}>
                                Редактировать
                              </button>
                              <button style={styles.deleteBtn} onClick={() => handleDelete(app.id)}>
                                Удалить
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Попап: не хватает документов ── */}
      {showMissingPopup && (
        <div style={styles.overlay}>
          <div style={{ ...styles.popup, border: '1px solid rgba(198,40,40,0.4)' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px' }}>
              Не все документы загружены
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 16px' }}>
              Для подачи заявления загрузите следующие обязательные документы:
            </p>
            <ul style={{ margin: '0 0 24px', padding: '0 0 0 16px' }}>
              {missingDocs.map(d => (
                <li key={d} style={{ color: '#ef5350', fontSize: '14px', marginBottom: '6px' }}>{d}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/documents" style={{
                backgroundColor: 'rgba(94,214,227,0.8)', color: 'white',
                padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px',
              }}>
                Загрузить документы
              </Link>
              <button onClick={() => setShowMissingPopup(false)} style={{
                backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px',
                borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
              }}>
                Закрыть
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

const styles = {
  page: { minHeight: '100vh' },
  content: { maxWidth: '1240px', margin: '40px auto', padding: '0 16px' },
  pageTitle: { fontSize: '28px', color: '#5ED6E3', margin: '0 0 24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' },
  sectionTitle: { fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontWeight: '400' },
  card: { backgroundColor: '#18212D', borderRadius: '15px', padding: '24px', border: '1px solid rgba(94,214,227,0.3)' },
  field: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.85)', fontSize: '14px' },
  count: { color: '#5ED6E3', fontSize: '13px' },
  hint: { color: '#f57f17', fontSize: '13px', marginTop: '6px' },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid rgba(94,214,227,0.3)',
    borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
    backgroundColor: '#0C131E', color: 'rgba(255,255,255,0.85)', outline: 'none', cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid rgba(94,214,227,0.3)',
    borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
    backgroundColor: '#0C131E', color: 'rgba(255,255,255,0.85)', outline: 'none',
  },
  radioRow: { display: 'flex', gap: '24px', marginTop: '4px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  radioText: { color: 'rgba(255,255,255,0.85)', fontSize: '14px' },
  submitBtn: {
    width: '100%', padding: '10px', backgroundColor: 'rgba(94,214,227,0.8)',
    color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', marginTop: '8px',
  },
  successBanner: {
    backgroundColor: 'rgba(46,125,50,0.2)', border: '1px solid #2e7d32',
    color: '#4caf50', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#ffebee', border: '1px solid #c62828',
    color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
  },
  empty: {
    backgroundColor: '#18212D', padding: '24px', borderRadius: '12px',
    textAlign: 'center', color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(94,214,227,0.15)', fontSize: '14px',
  },
  appCard: {
    backgroundColor: '#18212D', borderRadius: '12px',
    marginBottom: '12px', border: '1px solid rgba(94,214,227,0.3)', overflow: 'hidden',
  },
  appHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer' },
  appDirection: { fontSize: '14px', color: '#fff', fontWeight: '500', marginBottom: '2px' },
  appMeta: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' },
  badge: { color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '12px' },
  chevron: { color: 'rgba(255,255,255,0.4)', fontSize: '10px' },
  appDetails: { padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', marginBottom: '20px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  detailLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue: { fontSize: '13px', color: 'rgba(255,255,255,0.85)' },
  trackWrapper: { display: 'flex', alignItems: 'flex-start', marginBottom: '20px', overflow: 'hidden' },
  trackItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  trackDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, zIndex: 1 },
  trackLine: { position: 'absolute', top: '6px', left: '50%', right: '-50%', height: '2px', zIndex: 0 },
  trackLabel: { fontSize: '11px', marginTop: '6px', textAlign: 'center', lineHeight: '1.3' },
  actionRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  submitAppBtn: {
    backgroundColor: 'rgba(94,214,227,0.8)', color: 'white',
    border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  deleteBtn: {
    backgroundColor: 'rgba(198,40,40,0.15)', color: '#c62828',
    border: '1px solid rgba(198,40,40,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  editForm: { marginTop: '16px' },
  saveBtn: {
    backgroundColor: 'rgba(94,214,227,0.8)', color: 'white',
    border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  cancelBtn: {
    backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.15)', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  popup: {
    backgroundColor: '#18212D', borderRadius: '20px', padding: '32px',
    maxWidth: '480px', width: '90%',
  },
  aiBtn: {
    position: 'fixed', bottom: '35px', right: '35px',
    display: 'flex', alignItems: 'center', gap: '10px',
    borderRadius: '50px', padding: '10px 20px 10px 10px', textDecoration: 'none', zIndex: 99,
  },
  aiText: {
    color: 'rgba(255,255,255,0.85)', fontSize: '14px', whiteSpace: 'nowrap',
    backgroundColor: 'rgba(94,214,227,0.08)', border: '1px solid rgba(94,214,227,0.4)',
    boxShadow: '0 0 2px rgba(94,214,227,0.25)', borderRadius: '10px', padding: '10px 20px',
  },
}

export default ApplicationForm