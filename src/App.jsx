import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Pacientes from './pages/Pacientes'
import PacienteDetalle from './pages/PacienteDetalle'
import Paquetes from './pages/Paquetes'
import Caja from './pages/Caja'
import Servicios from './pages/Servicios'
import Tratamientos from './pages/Tratamientos'
import Splash from './components/Splash'

function Privado({ children }) {
  const { session, cargando } = useAuth()
  if (cargando) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { session, cargando } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={cargando ? <Splash /> : session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={<Privado><Layout /></Privado>}
      >
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id" element={<PacienteDetalle />} />
        <Route path="tratamientos" element={<Tratamientos />} />
        <Route path="paquetes" element={<Paquetes />} />
        <Route path="caja" element={<Caja />} />
        <Route path="servicios" element={<Servicios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
