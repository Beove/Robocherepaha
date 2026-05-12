import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import documentsAPI from '../../api/documents'

function DocumentsPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await documentsAPI.getMy()
      setDocuments(res.data)
    } catch (err) {
      console.error('Ошибка загрузки документов:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      await documentsAPI.upload(file)
      setSuccess('Документ успешно загружен')
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
      window.open(res.data.download_url, '_blank')
    } catch (err) {
      setError('Ошибка получения ссылки для скачивания')
    }
  }

  const statusLabels = {
    pending: 'На проверке',
    accepted: 'Принят',
    rejected: 'Отклонён',
  }

  const statusColors = {
    pending: '#f57f17',
    accepted: '#2e7d32',
    rejected: '#c62828',
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.title}>Мои документы</h1>

        {/* Блок загрузки */}
        <div style={styles.uploadCard}>
          <h2 style={styles.sectionTitle}>Загрузить документ</h2>
          <p style={styles.hint}>Допустимые форматы: PDF, JPEG, PNG. Максимальный размер: 10 МБ.</p>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <label style={{...styles.uploadBtn, opacity: uploading ? 0.7 : 1}}>
            {uploading ? 'Загрузка...' : '+ Выбрать файл'}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Список документов */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Загруженные документы</h2>

          {loading ? (
            <p>Загрузка...</p>
          ) : documents.length === 0 ? (
            <div style={styles.empty}>
              <p>Документы не загружены.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} style={styles.card}>
                <div style={styles.cardRow}>
                  <span style={styles.cardTitle}>{doc.original_filename}</span>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: statusColors[doc.status] || '#757575',
                  }}>
                    {statusLabels[doc.status] || doc.status}
                  </span>
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.cardSub}>
                    {(doc.file_size / 1024).toFixed(1)} КБ · {doc.mime_type}
                  </span>
                  <button
                    style={styles.downloadBtn}
                    onClick={() => handleDownload(doc.id, doc.original_filename)}
                  >
                    Скачать
                  </button>
                </div>
              </div>
            ))
          )}
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  title: {
    fontSize: '24px',
    color: '#2d5016',
    marginBottom: '24px',
  },
  uploadCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#3d3d3d',
    marginBottom: '12px',
  },
  hint: {
    fontSize: '13px',
    color: '#757575',
    marginBottom: '16px',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  uploadBtn: {
    display: 'inline-block',
    backgroundColor: '#2d5016',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
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
  downloadBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #2d5016',
    color: '#2d5016',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
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

export default DocumentsPage