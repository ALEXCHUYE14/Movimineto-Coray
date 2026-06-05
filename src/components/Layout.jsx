import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutGrid, CalendarDays, Users, PackageCheck, Wallet, Tags,
  Menu, LogOut, X
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/',          label: 'Inicio',    icon: LayoutGrid,   end: true },
  { to: '/agenda',    label: 'Agenda',    icon: CalendarDays },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/paquetes',  label: 'Paquetes',  icon: PackageCheck },
  { to: '/caja',      label: 'Caja',      icon: Wallet },
  { to: '/servicios', label: 'Servicios', icon: Tags }
]

// Barra inferior: 5 accesos mas usados (estilo app nativa)
const navInferior = nav.slice(0, 5)

export default function Layout() {
  const [drawer, setDrawer] = useState(false)
  const { perfil, logout } = useAuth()
  const { pathname } = useLocation()

  const tituloActual =
    nav.find(n => n.end ? pathname === n.to : pathname.startsWith(n.to) && n.to !== '/')?.label || 'Inicio'

  return (
    <div className="min-h-screen flex">
      {/* ===== SIDEBAR ESCRITORIO ===== */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-clinic-100 bg-white/70 backdrop-blur sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-6 h-20">
          <Logo size={40} />
          <div className="leading-tight">
            <p className="font-display font-extrabold text-clinic-800">Movimiento</p>
            <p className="font-display font-extrabold text-mint-500 -mt-1">Koray</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 h-12 rounded-xl2 font-semibold text-[15px] transition ${
                  isActive ? 'bg-clinic-500 text-white shadow-soft' : 'text-clinic-600 hover:bg-clinic-50'
                }`}>
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-clinic-100">
          <button onClick={logout} className="btn-ghost w-full">
            <LogOut size={18} /> Cerrar sesion
          </button>
        </div>
      </aside>

      {/* ===== DRAWER MOVIL ===== */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-clinic-900/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-card flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 h-20">
              <div className="flex items-center gap-3">
                <Logo size={40} />
                <div className="leading-tight">
                  <p className="font-display font-extrabold text-clinic-800">Movimiento</p>
                  <p className="font-display font-extrabold text-mint-500 -mt-1">Koray</p>
                </div>
              </div>
              <button onClick={() => setDrawer(false)} className="grid place-items-center w-10 h-10 rounded-full hover:bg-clinic-50 text-clinic-400">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {nav.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setDrawer(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 h-[52px] rounded-xl2 font-semibold transition ${
                      isActive ? 'bg-clinic-500 text-white shadow-soft' : 'text-clinic-600 hover:bg-clinic-50'
                    }`}>
                  <Icon size={22} /> {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-clinic-100">
              <button onClick={logout} className="btn-ghost w-full"><LogOut size={18} /> Cerrar sesion</button>
            </div>
          </aside>
        </div>
      )}

      {/* ===== CONTENIDO ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabecera */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-clinic-100">
          <div className="flex items-center gap-3 h-16 px-4 lg:px-8">
            <button onClick={() => setDrawer(true)}
              className="lg:hidden grid place-items-center w-11 h-11 rounded-xl2 hover:bg-clinic-50 text-clinic-600"
              aria-label="Abrir menu">
              <Menu size={22} />
            </button>
            <div className="lg:hidden"><Logo size={36} /></div>
            <h1 className="font-display text-lg lg:text-xl font-bold text-clinic-800 flex-1">{tituloActual}</h1>
            <div className="hidden sm:flex items-center gap-2.5 pl-3">
              <div className="text-right leading-tight">
                <p className="text-[13px] font-semibold text-clinic-700">{perfil?.nombre || 'Especialista'}</p>
                <p className="text-[11px] text-clinic-400 capitalize">{perfil?.rol || 'fisioterapeuta'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-clinic-500 to-mint-500 grid place-items-center text-white font-bold text-sm">
                {(perfil?.nombre || 'D')[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Vista */}
        <main className="flex-1 px-4 lg:px-8 py-5 pb-28 lg:pb-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ===== BARRA INFERIOR MOVIL ===== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-t border-clinic-100"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5">
          {navInferior.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-h-[60px] text-[11px] font-semibold transition ${
                  isActive ? 'text-clinic-500' : 'text-clinic-300'
                }`}>
              {({ isActive }) => (
                <>
                  <span className={`grid place-items-center w-10 h-7 rounded-full transition ${isActive ? 'bg-clinic-50' : ''}`}>
                    <Icon size={20} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
