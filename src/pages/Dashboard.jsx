import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatCard, EstadoCita, Avatar, Vacio, SeccionTitulo } from '../components/ui'
import { soles, fechaLarga, hora12, hoyISO, iniciales } from '../utils/format'
import { CalendarDays, Wallet, Users, AlertTriangle, ChevronRight, Plus, CheckCircle2 } from 'lucide-react'

export default function Dashboard() {
  const { perfil } = useAuth()
  const [citasHoy, setCitasHoy] = useState([])
  const [ingresoMes, setIngresoMes] = useState(0)
  const [cargando, setCargando] = useState(true)
  const hoy = hoyISO()

  const cargar = async () => {
    setCargando(true)
    const inicioMes = hoy.slice(0, 8) + '01'

    const [citasRes, ingresosRes] = await Promise.all([
      supabase.from('citas')
        .select('id, fecha, hora, estado, pacientes(nombres, apellidos), servicios_precios(nombre_servicio)')
        .eq('fecha', hoy).order('hora', { ascending: true }),
      supabase.from('ingresos_caja')
        .select('monto, fecha_pago')
        .gte('fecha_pago', inicioMes)
    ])

    setCitasHoy(citasRes.data || [])
    setIngresoMes((ingresosRes.data || []).reduce((s, r) => s + Number(r.monto), 0))
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const marcarAsistida = async (id) => {
    await supabase.from('citas').update({ estado: 'Asistida' }).eq('id', id)
    cargar()
  }

  const pacientesActivos = new Set(
    citasHoy.filter(c => c.estado !== 'Cancelada').map(c => c.pacientes?.nombres + c.pacientes?.apellidos)
  ).size
  const pendientes = citasHoy.filter(c => c.estado === 'Pendiente').length

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="animate-fade-up">
        <p className="text-clinic-400 capitalize">{fechaLarga(hoy)}</p>
        <h2 className="font-display text-2xl font-extrabold text-clinic-800">
          Hola, {(perfil?.nombre || 'Diego').split(' ')[0]} 👋
        </h2>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CalendarDays} label="Citas hoy" value={citasHoy.length}
          hint={`${pendientes} por confirmar`} accent="clinic" />
        <StatCard icon={Users} label="Pacientes activos hoy" value={pacientesActivos} accent="mint" />
        <StatCard icon={Wallet} label="Ingresos del mes" value={soles(ingresoMes)} accent="amber" />
        <StatCard icon={AlertTriangle} label="Cupos limitados" value={Math.max(0, 8 - citasHoy.length)}
          hint="de 8 disponibles" accent="rose" />
      </div>

      {/* Citas del dia */}
      <section>
        <SeccionTitulo accion={
          <Link to="/agenda" className="text-sm font-semibold text-clinic-500 flex items-center gap-1">
            Ver agenda <ChevronRight size={16} />
          </Link>
        }>
          Citas de hoy
        </SeccionTitulo>

        {cargando ? (
          <div className="card p-6 text-center text-clinic-300">Cargando...</div>
        ) : citasHoy.length === 0 ? (
          <Vacio icon={CalendarDays} titulo="Sin citas para hoy"
            descripcion="Disfruta el dia o agenda una nueva atencion."
            accion={<Link to="/agenda" className="btn-primary"><Plus size={18} /> Agendar cita</Link>} />
        ) : (
          <div className="space-y-2.5">
            {citasHoy.map(c => (
              <div key={c.id} className="card p-3.5 flex items-center gap-3 animate-fade-up">
                <div className="grid place-items-center w-14 shrink-0">
                  <span className="font-display font-bold text-clinic-700 text-sm leading-none">{hora12(c.hora).slice(0,5)}</span>
                  <span className="text-[10px] text-clinic-300 mt-0.5">{hora12(c.hora).slice(-4)}</span>
                </div>
                <Avatar texto={iniciales(c.pacientes?.nombres, c.pacientes?.apellidos)} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-clinic-800 truncate">
                    {c.pacientes?.nombres} {c.pacientes?.apellidos}
                  </p>
                  <p className="text-[13px] text-clinic-400 truncate">{c.servicios_precios?.nombre_servicio || 'Atencion'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EstadoCita estado={c.estado} />
                  {c.estado !== 'Asistida' && c.estado !== 'Cancelada' && (
                    <button onClick={() => marcarAsistida(c.id)}
                      className="text-mint-600 text-[12px] font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Asistio
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
