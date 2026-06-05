// Pequenos componentes de presentacion reutilizables.
import { Link } from 'react-router-dom'

export function StatCard({ icon: Icon, label, value, hint, accent = 'clinic' }) {
  const tones = {
    clinic: 'from-clinic-500 to-clinic-600',
    mint:   'from-mint-500 to-mint-600',
    amber:  'from-amber-400 to-amber-500',
    rose:   'from-rose-400 to-rose-500'
  }
  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-clinic-400">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-clinic-800 leading-none">{value}</p>
          {hint && <p className="mt-1.5 text-[12px] text-clinic-400">{hint}</p>}
        </div>
        <div className={`grid place-items-center w-11 h-11 rounded-xl2 text-white bg-gradient-to-br ${tones[accent]} shadow-soft`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export function EstadoCita({ estado }) {
  const map = {
    Pendiente:  'bg-amber-50 text-amber-600',
    Confirmada: 'bg-clinic-50 text-clinic-600',
    Asistida:   'bg-mint-50 text-mint-600',
    Cancelada:  'bg-rose-50 text-rose-500'
  }
  return <span className={`chip ${map[estado] || 'bg-clinic-50 text-clinic-500'}`}>{estado}</span>
}

export function Avatar({ texto, size = 44 }) {
  return (
    <div
      className="grid place-items-center rounded-full bg-clinic-100 text-clinic-700 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {texto}
    </div>
  )
}

export function Vacio({ icon: Icon, titulo, descripcion, accion }) {
  return (
    <div className="card p-10 text-center flex flex-col items-center gap-3">
      <div className="grid place-items-center w-14 h-14 rounded-2xl bg-clinic-50 text-clinic-300">
        <Icon size={26} />
      </div>
      <div>
        <p className="font-display font-bold text-clinic-700">{titulo}</p>
        {descripcion && <p className="text-sm text-clinic-400 mt-1">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}

export function SeccionTitulo({ children, accion }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-lg font-bold text-clinic-800">{children}</h2>
      {accion}
    </div>
  )
}

export function LinkCard({ to, children }) {
  return <Link to={to} className="block card p-4 hover:shadow-float transition-shadow">{children}</Link>
}
