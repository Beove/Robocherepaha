import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'
import documentsAPI from '../../api/documents'
import useAuthStore from '../../store/authStore'
import iconFile from '../../assets/file.png'
import iconDocs from '../../assets/docs.png'
import iconBot from '../../assets/bot.png'
import iconLock from '../../assets/lock.png'
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

function Dashboard() {
  const { fullName } = useAuthStore()
  const [applications, setApplications] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null)
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
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: 'submitted' } : app
        )
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при подаче заявления')
    } finally {
      setSubmitting(null)
    }
  }

  const lastApp = applications[applications.length - 1] || null
  const submittedCount = applications.filter(a => a.status !== 'draft').length

  const getNextStep = () => {
    if (applications.length === 0) return { text: 'Подайте первое заявление на поступление', link: '/application', btn: 'Подать заявление' }
    if (lastApp?.status === 'draft') return { text: 'У вас есть неподанное заявление — не забудьте его отправить', link: null, btn: null }
    if (lastApp?.status === 'submitted' || lastApp?.status === 'under_review') return { text: 'Ваше заявление на рассмотрении. Ожидайте решения приёмной комиссии', link: null, btn: null }
    if (lastApp?.status === 'approved') return { text: 'Поздравляем! Ваше заявление одобрено', link: null, btn: null }
    if (lastApp?.status === 'rejected') return { text: 'Ваше заявление отклонено. Вы можете подать новое', link: '/application', btn: 'Подать новое заявление' }
    return null
  }

  const nextStep = getNextStep()

  // Берём только имя (второе слово из ФИО — имя)
  const firstName = fullName ? fullName.split(' ')[1] || fullName : null

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>

        {/* Приветствие */}
        <div style={styles.user}>
          <h1 style={styles.userTitle}>
            {firstName ? `Добро пожаловать, ${firstName}!` : 'Добро пожаловать!'}
          </h1>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {loading ? (
          <p style={{ color: '#5ED6E3' }}>Загрузка...</p>
        ) : (
          <>
            {/* Счётчики */}
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={styles.statNum}>{applications.length}</div>
                <div style={styles.statLabel}>Заявлений всего</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNum}>{submittedCount}</div>
                <div style={styles.statLabel}>Подано</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNum}>{documents.length}</div>
                <div style={styles.statLabel}>Документов загружено</div>
              </div>
              {lastApp && (
                <div style={styles.statCard}>
                  <div style={{ ...styles.statNum, color: statusColors[lastApp.status], fontSize: '16px', fontWeight: '600' }}>
                    {statusLabels[lastApp.status]}
                  </div>
                  <div style={styles.statLabel}>Статус последнего заявления</div>
                </div>
              )}
            </div>

            {/* Что дальше */}
            {nextStep && (
              <div style={styles.nextStepCard}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={styles.nextStepDot} />
                    <p style={styles.nextStepText}>{nextStep.text}</p>
                  </div>
                </div>
                {nextStep.link && (
                  <Link to={nextStep.link} style={styles.nextStepBtn}>
                    {nextStep.btn}
                  </Link>
                )}
              </div>
            )}

            {/* Черновик — показываем с кнопкой подать */}
            {lastApp && lastApp.status === 'draft' && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Неподанное заявление</h2>
                <div style={styles.card}>
                  <div style={styles.cardRow}>
                    <span style={styles.cardTitle}>{lastApp.direction}</span>
                    <span style={{ ...styles.badge, backgroundColor: statusColors[lastApp.status] }}>
                      {statusLabels[lastApp.status]}
                    </span>
                  </div>
                  <p style={styles.cardSub}>{lastApp.education_level}</p>
                  <button
                    style={{ ...styles.submitBtn, opacity: submitting === lastApp.id ? 0.7 : 1 }}
                    onClick={() => handleSubmit(lastApp.id)}
                    disabled={submitting === lastApp.id}
                  >
                    {submitting === lastApp.id ? 'Отправка...' : 'Подать заявление'}
                  </button>
                </div>
              </div>
            )}

            {/* О проекте */}
            <div style={styles.aboutCard}>
              <h2 style={styles.aboutTitle}>О проекте «Робочерепаха»</h2>
              <p style={styles.aboutText}>
                Робочерепаха - интеллектуальная система Московского политехнического университета, созданная для сопровождения абитуриентов в ходе приёмной кампании. Мобильный робот на базе бионической черепахи курсирует по кампусу, а данный портал - его цифровой интерфейс: здесь можно подать заявление, загрузить документы и получить консультацию от ИИ-ассистента. Все данные надёжно защищены и передаются по зашифрованным каналам.
              </p>
              <div style={styles.featureRow}>
                {[
                  { icon: iconFile, text: 'Подача заявлений онлайн' },
                  { icon: iconDocs, text: 'Загрузка документов' },
                  { icon: iconBot, text: 'ИИ-консультант' },
                  { icon: iconLock, text: 'Защита данных' },
                ].map((f) => (
                  <div key={f.text} style={styles.featureItem}>
                    <img src={f.icon} alt="" style={{ height: '20px', objectFit: 'contain' }} />
                    <span style={styles.featureText}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <Link to="/ai-consultant" style={styles.aiBtn}>
        <img src={turtleLogo} alt="" style={{ height: '60px', objectFit: 'contain' }} />
        <span style={styles.aiText}>Готова помочь!</span>
      </Link>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
  },
  content: {
    maxWidth: '1240px',
    margin: '40px auto',
    padding: '0',
  },
  user: {
    marginBottom: '20px',
  },
  userTitle: {
    fontSize: '28px',
    color: '#5ED6E3',
    margin: '0 0 10px',
  },
  userSub: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  statsRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#18212D',
    borderRadius: '15px',
    padding: '20px',
    flex: '1 1 140px',
    border: '1px solid rgba(94,214,227,0.3)',
  },
  statNum: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#5ED6E3',
    lineHeight: 1,
    marginBottom: '10px',
  },
  statLabel: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.85)',
  },
  nextStepCard: {
    backgroundColor: '#18212D',
    borderRadius: '15px',
    padding: '20px ',
    marginBottom: '40px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid rgba(94,214,227,0.3)',
    fontSize: '16px',
  },
  nextStepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#5ED6E3',
    margin: '0',
    flexShrink: 0,
  },
  nextStepText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '16px',
    margin: '0',
  },
  nextStepBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(94,214,227,0.8)',
    color: '#fff',
    padding: '7px 15px',
    borderRadius: '10px',
    fontSize: '14px',
    textDecoration: 'none',
    margin: '0',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '10px',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#18212D',
    padding: '20px',
    borderRadius: '15px',
    border: '1px solid rgba(94,214,227,0.3)'
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '5px',
  },
  cardTitle: {
    fontSize: '16px',
    color: '#fff',
    fontWeight: '500',
  },
  cardSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
  },
  badge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '14px',
    flexShrink: 0,
  },
  submitBtn: {
    marginTop: '5px',
    backgroundColor: 'rgba(94,214,227,0.8)',
    color: 'white',
    border: 'none',
    padding: '7px 15px',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    border: '1px solid #c62828',
    color: '#c62828',
    padding: '7px 15px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  aboutCard: {
    backgroundColor: '#18212D',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid rgba(94,214,227,0.3)',
  },
  aboutTitle: {
    color: '#5ED6E3',
    fontSize: '20px',
    margin: '0 0 10px',
    fontWeight: '500',
  },
  aboutText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '16px',
    lineHeight: '1.7',
    margin: '0 0 20px',
  },
  featureRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(94,214,227,0.08)',
    padding: '10px 16px',
    borderRadius: '10px',
    flex: '1 1 160px',
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
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
    color: 'rgba(255,255,255,0.85)',
    backgroundColor:'red',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    backgroundColor:'rgba(94,214,227,0.08)',
    border: '1px solid rgba(94,214,227,0.4)',
    boxShadow: '0 0 2px rgba(94,214,227,0.25)',
    borderRadius:'10px',
    padding:'10px 20px',
  },
}

export default Dashboard