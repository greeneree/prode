import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = sessionStorage.getItem('prode_auth')
  if (!auth) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<ProjectList />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
      </Route>
    </Routes>
  )
}
