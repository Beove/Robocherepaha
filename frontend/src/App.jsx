import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

// Страницы аутентификации
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Страницы абитуриента
import ApplicantDashboard from './pages/applicant/Dashboard'
import ApplicationForm from './pages/applicant/ApplicationForm'
import DocumentsPage from './pages/applicant/DocumentsPage'
import AIConsultant from './pages/applicant/AIConsultant'

// Страницы оператора
import OperatorDashboard from './pages/operator/Dashboard'
import ApplicationDetail from './pages/operator/ApplicationDetail'

// Страницы админа
import AdminLogs from './pages/admin/AdminLogs'

// Защищённый маршрут — редирект на логин если не авторизован
const PrivateRoute = ({ children, allowedRoles }) => {
  const { token, role } = useAuthStore()

  if (!token) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" />

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Маршруты абитуриента */}
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={['applicant']}>
            <ApplicantDashboard />
          </PrivateRoute>
        } />
        <Route path="/application" element={
          <PrivateRoute allowedRoles={['applicant']}>
            <ApplicationForm />
          </PrivateRoute>
        } />
        <Route path="/documents" element={
          <PrivateRoute allowedRoles={['applicant']}>
            <DocumentsPage />
          </PrivateRoute>
        } />
        <Route path="/ai-consultant" element={
          <PrivateRoute allowedRoles={['applicant']}>
            <AIConsultant />
          </PrivateRoute>
        } />

        {/* Маршруты оператора */}
        <Route path="/operator" element={
          <PrivateRoute allowedRoles={['operator', 'admin']}>
            <OperatorDashboard />
          </PrivateRoute>
        } />
        <Route path="/operator/applications/:id" element={
          <PrivateRoute allowedRoles={['operator', 'admin']}>
            <ApplicationDetail />
          </PrivateRoute>
        } />

        {/* Маршруты админа */}
        <Route path="/admin/logs" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLogs />
          </PrivateRoute>
        } />

        {/* Редирект с главной */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App