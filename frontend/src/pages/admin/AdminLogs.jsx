import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import adminAPI from '../../api/admin'

const eventColors = {
  LOGIN_SUCCESS: '#2e7d32',
  LOGIN_FAIL: '#c62828',
  REGISTER: '#1565c0',
  IDOR_ATTEMPT: '#b71c1c',
  DOCUMENT_UPLOADED: '#4a7c2f',
  DOCUMENT_DELETED: '#c62828',
  APPLICATION_CREATED: '#1565c0',
  APPLICATION_SUBMITTED: '#2e7d32',
  APPLICATION_UPDATED: '#f57f17',
  APPLICATION_DELETED: '#c62828',
  APPLICATION_STATUS_CHANGED: '#f57f17',
  USER_CREATED_BY_ADMIN: '#2e7d32',
  USER_ROLE_CHANGED: '#f57f17',
  USER_DELETED_BY_ADMIN: '#c62828',
}

const eventTypes = [
  'all', 'LOGIN_SUCCESS', 'LOGIN_FAIL', 'REGISTER', 'IDOR_ATTEMPT',
  'DOCUMENT_UPLOADED', 'APPLICATION_CREATED', 'APPLICATION_SUBMITTED',
  'APPLICATION_STATUS_CHANGED',
]

const roleLabels = { applicant: 'Абитуриент', operator: 'Оператор', admin: 'Администратор' }
const roleColors = { applicant: '#1565c0', operator: '#f57f17', admin: '#b71c1c' }

function AdminLogs() {
  const [tab, setTab] = useState('logs') // 'logs' | 'users'

  // Журнал
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [idorOnly, setIdorOnly] = useState(false)

  // Пользователи
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'operator' })
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => { fetchLogs() }, [idorOnly])
  useEffect(() => { if (tab === 'users') fetchUsers() }, [tab, roleFilter])

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = idorOnly ? await adminAPI.getIdorAttempts() : await adminAPI.getLogs()
      setLogs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await adminAPI.getUsers(roleFilter || undefined)
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError('')
    try {
      await adminAPI.createUser(newUser)
      setShowCreateForm(false)
      setNewUser({ email: '', password: '', full_name: '', role: 'operator' })
      fetchUsers()
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Ошибка создания пользователя')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRoleChange = async (id, role) => {
    try {
      await adminAPI.updateUserRole(id, role)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка смены роли')
    }
  }

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`Удалить пользователя ${email}? Это действие необратимо.`)) return
    try {
      await adminAPI.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l.event_type === filter)

  const formatDate = (d) => new Date(d).toLocaleString('ru-RU')

  const formatDetails = (details) => {
    if (!details) return '—'
    try {
      return Object.entries(JSON.parse(details)).map(([k, v]) => `${k}: ${v}`).join(' · ')
    } catch { return details }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Панель администратора</h1>

        {/* Вкладки */}
        <div style={styles.tabs}>
          {[['logs', 'Журнал аудита'], ['users', 'Пользователи']].map(([key, label]) => (
            <button key={key} style={{
              ...styles.tab,
              borderBottom: tab === key ? '2px solid #5ED6E3' : '2px solid transparent',
              color: tab === key ? '#5ED6E3' : 'rgba(255,255,255,0.4)',
            }} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ЖУРНАЛ ── */}
        {tab === 'logs' && (
          <>
            <div style={styles.toolbar}>
              <button style={{
                ...styles.idorBtn,
                backgroundColor: idorOnly ? 'rgba(183,28,28,0.3)' : 'transparent',
                borderColor: '#b71c1c',
                color: idorOnly ? '#ef5350' : 'rgba(255,255,255,0.6)',
              }} onClick={() => { setIdorOnly(!idorOnly); setFilter('all') }}>
                ⚠ {idorOnly ? 'Показать все' : 'Только IDOR'}
              </button>
              <span style={styles.count}>{filtered.length} записей</span>
            </div>

            {!idorOnly && (
              <div style={styles.filters}>
                {eventTypes.map(type => (
                  <button key={type} style={{
                    ...styles.filterBtn,
                    backgroundColor: filter === type ? 'rgba(94,214,227,0.15)' : 'transparent',
                    borderColor: filter === type ? 'rgba(94,214,227,0.6)' : 'rgba(255,255,255,0.1)',
                    color: filter === type ? '#5ED6E3' : 'rgba(255,255,255,0.5)',
                  }} onClick={() => setFilter(type)}>
                    {type === 'all' ? 'Все' : type}
                  </button>
                ))}
              </div>
            )}

            {logsLoading ? (
              <p style={{ color: '#5ED6E3' }}>Загрузка...</p>
            ) : filtered.length === 0 ? (
              <div style={styles.empty}>Записей не найдено</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Время', 'Событие', 'Пользователь', 'Объект', 'IP', 'Детали'].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(log => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: `${eventColors[log.event_type] || '#757575'}33`,
                            color: eventColors[log.event_type] || '#757575',
                            border: `1px solid ${eventColors[log.event_type] || '#757575'}66`,
                          }}>{log.event_type}</span>
                        </td>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.7)' }}>{log.user_id || '—'}</td>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.7)' }}>
                          {log.object_type ? `${log.object_type} #${log.object_id}` : '—'}
                        </td>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                          {log.ip_address || '—'}
                        </td>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                          {formatDetails(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── ПОЛЬЗОВАТЕЛИ ── */}
        {tab === 'users' && (
          <>
            <div style={styles.toolbar}>
              <div style={styles.filters}>
                {[['', 'Все'], ['applicant', 'Абитуриенты'], ['operator', 'Операторы'], ['admin', 'Администраторы']].map(([val, label]) => (
                  <button key={val} style={{
                    ...styles.filterBtn,
                    backgroundColor: roleFilter === val ? 'rgba(94,214,227,0.15)' : 'transparent',
                    borderColor: roleFilter === val ? 'rgba(94,214,227,0.6)' : 'rgba(255,255,255,0.1)',
                    color: roleFilter === val ? '#5ED6E3' : 'rgba(255,255,255,0.5)',
                  }} onClick={() => setRoleFilter(val)}>
                    {label}
                  </button>
                ))}
              </div>
              <button style={styles.createBtn} onClick={() => setShowCreateForm(!showCreateForm)}>
                + Создать пользователя
              </button>
            </div>

            {/* Форма создания */}
            {showCreateForm && (
              <div style={styles.createForm}>
                <h3 style={styles.createTitle}>Новый пользователь</h3>
                {createError && <div style={styles.errorBanner}>{createError}</div>}
                <form onSubmit={handleCreateUser}>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Email</label>
                      <input style={styles.input} type="email" required
                        value={newUser.email}
                        onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Пароль</label>
                      <input style={styles.input} type="password" required
                        value={newUser.password}
                        onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>ФИО</label>
                      <input style={styles.input} type="text"
                        value={newUser.full_name}
                        onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Роль</label>
                      <select style={styles.select} value={newUser.role}
                        onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                        <option value="operator">Оператор</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button type="submit" style={styles.submitBtn} disabled={createLoading}>
                      {createLoading ? 'Создание...' : 'Создать'}
                    </button>
                    <button type="button" style={styles.cancelBtn} onClick={() => setShowCreateForm(false)}>
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            )}

            {usersLoading ? (
              <p style={{ color: '#5ED6E3' }}>Загрузка...</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['ID', 'Email', 'ФИО', 'Роль', 'Дата регистрации', 'Действия'].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.4)' }}>{user.id}</td>
                        <td style={{ ...styles.td, color: '#fff' }}>{user.email}</td>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.7)' }}>{user.full_name || '—'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: `${roleColors[user.role]}33`,
                            color: roleColors[user.role],
                            border: `1px solid ${roleColors[user.role]}66`,
                          }}>{roleLabels[user.role]}</span>
                        </td>
                        <td style={{ ...styles.td, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                          {user.created_at ? formatDate(user.created_at) : '—'}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <select style={styles.roleSelect}
                              value={user.role}
                              onChange={e => handleRoleChange(user.id, e.target.value)}>
                              <option value="applicant">Абитуриент</option>
                              <option value="operator">Оператор</option>
                              <option value="admin">Администратор</option>
                            </select>
                            <button style={styles.deleteBtn}
                              onClick={() => handleDeleteUser(user.id, user.email)}>
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh' },
  content: { maxWidth: '1400px', margin: '40px auto', padding: '0 16px' },
  pageTitle: { fontSize: '28px', color: '#5ED6E3', margin: '0 0 24px' },
  tabs: { display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  tab: {
    padding: '10px 24px', background: 'transparent', border: 'none',
    cursor: 'pointer', fontSize: '15px', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  idorBtn: {
    padding: '8px 16px', border: '1px solid', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '500',
  },
  count: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' },
  filters: { display: 'flex', gap: '8px', marginBottom: '0', flexWrap: 'wrap' },
  filterBtn: {
    padding: '5px 12px', border: '1px solid', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px',
  },
  createBtn: {
    marginLeft: 'auto', padding: '8px 16px',
    backgroundColor: 'rgba(94,214,227,0.8)', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  },
  createForm: {
    backgroundColor: '#18212D', borderRadius: '15px', padding: '24px',
    border: '1px solid rgba(94,214,227,0.3)', marginBottom: '20px',
  },
  createTitle: { color: '#5ED6E3', fontSize: '16px', margin: '0 0 16px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: 'rgba(255,255,255,0.7)' },
  input: {
    padding: '10px 12px', border: '1px solid rgba(94,214,227,0.3)',
    borderRadius: '8px', fontSize: '14px', backgroundColor: '#0C131E',
    color: 'rgba(255,255,255,0.85)', outline: 'none',
  },
  select: {
    padding: '10px 12px', border: '1px solid rgba(94,214,227,0.3)',
    borderRadius: '8px', fontSize: '14px', backgroundColor: '#0C131E',
    color: 'rgba(255,255,255,0.85)', outline: 'none', cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 24px', backgroundColor: 'rgba(94,214,227,0.8)',
    color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
  },
  cancelBtn: {
    padding: '10px 24px', backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
  },
  tableWrapper: {
    backgroundColor: '#18212D', borderRadius: '15px',
    border: '1px solid rgba(94,214,227,0.3)', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: '11px',
    color: 'rgba(255,255,255,0.4)', fontWeight: '500',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', verticalAlign: 'middle' },
  badge: {
    display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
    fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap',
  },
  roleSelect: {
    padding: '4px 8px', border: '1px solid rgba(94,214,227,0.3)',
    borderRadius: '6px', fontSize: '12px', backgroundColor: '#0C131E',
    color: 'rgba(255,255,255,0.85)', cursor: 'pointer', outline: 'none',
  },
  deleteBtn: {
    padding: '4px 12px', backgroundColor: 'rgba(198,40,40,0.15)',
    color: '#c62828', border: '1px solid rgba(198,40,40,0.3)',
    borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
  },
  empty: {
    backgroundColor: '#18212D', padding: '32px', borderRadius: '15px',
    textAlign: 'center', color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(94,214,227,0.15)', fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#ffebee', border: '1px solid #c62828',
    color: '#c62828', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px',
  },
}

export default AdminLogs