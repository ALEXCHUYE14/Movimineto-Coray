import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatCard, EstadoCita, Avatar, Vacio, SeccionTitulo } from '../components/ui'
import { soles, fechaLarga, hora12, hoyISO, iniciales } from '../utils/format'
import {
  CalendarDays, Wallet, Users, AlertCircle,
  ChevronRight, Plus, CheckCircle2, PackageCheck, UserCheck
} from 'lucide-react'

export default function Dashboard() {
  const { perfil } = useAuth()
  const [citasHoy, setCitasHoy]         = useState([])
  const [ingresoMes, setIngresoMes]     = useState(0)
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [paqPorVencer, setPaqPorVencer] = useState([])
  const [cargando, setCargando]         = useState(true)
  const hoy = hoyISO()

  const cargar = async () => {
    setCargando(true)
    const inicioMes = hoy.slice(0, 8) + '01'

    const [citasRes, ingresosRes, pacCountRes, paqRes] = await Promise.all([
      supabase.from('citas')
        .select('id, fecha, hora, estado, pacientes(nombres, apellidos), servicios_precios(nombre_servicio)')
        .eq('fecha', hoy).order('hora', { ascending: true }),
      supabase.from('ingresos_caja')
        .select('monto')
        .gte('fecha_pago', inicioMes),
      supabase.from('pacientes')
        .select('id', { count: 'exact', head: true }),
      supabase.from('paquetes_adquiridos')
        .select('id, tipo_paquete, sesiones_totales, sesiones_consumidas, pacientes(nombres, apellidos)')
    ])

    setCitasHoy(citasRes.data || [])
    setIngresoMes((ingresosRes.data || []).reduce((s, r) => s + Number(r.monto), 0))
    setTotalPacientes(pacCountRes.count || 0)

    // Paquetes con 1 o 2 sesiones restantes (aún activos)
    setPaqPorVencer(
      (paqRes.data || []).filter(p => {
        const restantes = p.sesiones_totales - p.sesiones_consumidas
        return restantes > 0 && restantes <= 2
      })
    )

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
        <StatCard icon={CalendarDays} label="Citas hoy"           value={citasHoy.length}
          hint={`${pendientes} por confirmar`} accent="clinic" />
        <StatCard icon={Users}        label="Pacientes hoy"       value={pacientesActivos} accent="mint" />
        <StatCard icon={Wallet}       label="Ingresos del mes"    value={soles(ingresoMes)} accent="amber" />
        <StatCard icon={UserCheck}    label="Total pacientes"     value={totalPacientes}
          hint="registrados" accent="rose" />
      </div>

      {/* Alerta: paquetes por vencer */}
      {!cargando && paqPorVencer.length > 0 && (
        <section className="animate-fade-up">
          <SeccionTitulo>
            <span className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              Paquetes por vencer
            </span>
          </SeccionTitulo>
          <div className="space-y-2">
            {paqPorVencer.map(paq => {
              const restantes = paq.sesiones_totales - paq.sesiones_consumidas
              return (
                <div key={paq.id}
                  className="card p-3.5 flex items-center gap-3 border-l-4 border-amber-400 animate-fade-up">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <PackageCheck size={18} className="text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-clinic-800 truncate">
                      {paq.pacientes?.nombres} {paq.pacientes?.apellidos}
                    </p>
                    <p className="text-[13px] text-clinic-400 truncate">{paq.tipo_paquete}</p>
                  </div>
                  <span className="chip bg-amber-50 text-amber-700 font-bold shrink-0">
                    {restantes} sesión{restantes !== 1 ? 'es' : ''} restante{restantes !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Citas del día */}
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
            descripcion="Disfruta el día o agenda una nueva atención."
            accion={<Link to="/agenda" className="btn-primary"><Plus size={18} /> Agendar cita</Link>} />
        ) : (
          <div className="space-y-2.5">
            {citasHoy.map(c => (
              <div key={c.id} className="card p-3.5 flex items-center gap-3 animate-fade-up">
                <div className="grid place-items-center w-14 shrink-0">
                  <span className="font-display font-bold text-clinic-700 text-sm leading-none">
                    {hora12(c.hora).slice(0, 5)}
                  </span>
                  <span className="text-[10px] text-clinic-300 mt-0.5">
                    {hora12(c.hora).slice(-4)}
                  </span>
                </div>
                <Avatar texto={iniciales(c.pacientes?.nombres, c.pacientes?.apellidos)} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-clinic-800 truncate">
                    {c.pacientes?.nombres} {c.pacientes?.apellidos}
                  </p>
                  <p className="text-[13px] text-clinic-400 truncate">
                    {c.servicios_precios?.nombre_servicio || 'Atención'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EstadoCita estado={c.estado} />
                  {c.estado !== 'Asistida' && c.estado !== 'Cancelada' && (
                    <button onClick={() => marcarAsistida(c.id)}
                      className="text-mint-600 text-[12px] font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Asistió
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
