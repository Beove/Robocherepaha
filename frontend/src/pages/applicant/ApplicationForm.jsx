import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import applicationsAPI from '../../api/applications'

// Доступные направления подготовки
const directions = [
  'Информационные системы и технологии (09.03.02)',
  'Информационная безопасность (10.03.01)',
  'Прикладная информатика (09.03.03)',
  'Программная инженерия (09.03.04)',
]

// Уровни образования
const educationLevels = [
  'Бакалавриат',
  'Магистратура',
]

function ApplicationForm() {
  const navigate = useNavigate()
  const [direction, setDirection] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await applicationsAPI.create(direction, educationLevel)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при подаче заявления')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.title}>Подача заявления</h1>

        {success ? (
          <div style={styles.success}>
            Заявление успешно подано! Перенаправление...
          </div>
        ) : (
          <div style={styles.card}>
            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={styles.field}>
                <label style={styles.label}>Направление подготовки</label>
                <select
                  style={styles.select}
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  required
                >
                  <option value="">Выберите направление</option>
                  {directions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Уровень образования</label>
                <select
                  style={styles.select}
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  required
                >
                  <option value="">Выберите уровень</option>
                  {educationLevels.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div style={styles.buttons}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => navigate('/dashboard')}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{...styles.submitBtn, opacity: loading ? 0.7 : 1}}
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Подать заявление'}
                </button>
              </div>
            </form>
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
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  title: {
    fontSize: '24px',
    color: '#2d5016',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '16px',
  },
  field: {
    marginBottom: '20px',
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
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  cancelBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3d3d3d',
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#2d5016',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
}

export default ApplicationForm