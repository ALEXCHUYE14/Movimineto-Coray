import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatCard, EstadoCita, Avatar, Vacio, SeccionTitulo } from '../components/ui'
import {
  soles, fechaLarga, fechaCorta, hora12, hoyISO, iniciales, inicioMesISO,
  linkRecordatorioCita, linkWhatsAppPaciente
} from '../utils/format'
import {
  CalendarDays, Wallet, Users, AlertCircle, ChevronRight, Plus, CheckCircle2,
  PackageCheck, UserCheck, MessageCircle, TrendingUp, TrendingDown, Scale, CalendarClock
} from 'lucide-react'

const DIAS_PROXIMAS = 7

export default function Dashboard() {
  const { perfil } = useAuth()
  const [citasHoy, setCitasHoy]             = useState([])
  const [proximas, setProximas]             = useState([])
  const [ingresoMes, setIngresoMes]         = useState(0)
  const [egresoMes, setEgresoMes]           = useState(0)
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [paqPorVencer, setPaqPorVencer]     = useState([])
  const [cargando, setCargando]             = useState(true)
  const [marcando, setMarcando]             = useState(null)
  const [errorCarga, setErrorCarga]         = useState(null)
  const montado = useRef(true)
  const hoy = hoyISO()

  useEffect(() => {
    montado.current = true
    return () => { montado.current = false }
  }, [])

  const cargar = async () => {
    setCargando(true)
    setErrorCarga(null)
    const inicioMes = inicioMesISO()
    const manana    = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    const limite    = format(addDays(new Date(), DIAS_PROXIMAS), 'yyyy-MM-dd')
    try {
      const [citasRes, ingresosRes, egresosRes, pacCountRes, paqRes, proxRes] = await Promise.all([
        supabase.from('citas')
          .select('id, paciente_id, fecha, hora, estado, pacientes(nombres, apellidos, celular), servicios_precios(nombre_servicio)')
          .eq('fecha', hoy).order('hora', { ascending: true }),
        supabase.from('ingresos_caja')
          .select('monto')
          .gte('fecha_pago', inicioMes),
        supabase.from('egresos_caja')
          .select('monto')
          .gte('fecha_egreso', inicioMes),
        supabase.from('pacientes')
          .select('id', { count: 'exact', head: true }),
        supabase.from('paquetes_adquiridos')
          .select('id, paciente_id, tipo_paquete, sesiones_totales, sesiones_consumidas, pacientes(nombres, apellidos, celular)'),
        supabase.from('citas')
          .select('id, paciente_id, fecha, hora, estado, pacientes(nombres, apellidos, celular), servicios_precios(nombre_servicio)')
          .gte('fecha', manana).lte('fecha', limite)
          .neq('estado', 'Cancelada')
          .order('fecha', { ascending: true }).order('hora', { ascending: true })
          .limit(10)
      ])
      if (!montado.current) return
      const fallo = [citasRes, ingresosRes, egresosRes, pacCountRes, paqRes, proxRes].find(r => r.error)
      if (fallo) throw fallo.error
      const suma = (rows) => (rows || []).reduce((s, r) => s + Number(r.monto || 0), 0)
      setCitasHoy(citasRes.data || [])
      setProximas(proxRes.data || [])
      setIngresoMes(suma(ingresosRes.data))
      setEgresoMes(suma(egresosRes.data))
      setTotalPacientes(pacCountRes.count || 0)
      setPaqPorVencer(
        (paqRes.data || []).filter(p => {
          const restantes = p.sesiones_totales - p.sesiones_consumidas
          return restantes > 0 && restantes <= 2
        })
      )
    } catch (e) {
      if (montado.current) setErrorCarga(mensajeError(e, 'cargar la información'))
    } finally {
      if (montado.current) setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const marcarAsistida = async (id) => {
    setMarcando(id)
    try {
      const { error } = await supabase.from('citas').update({ estado: 'Asistida' }).eq('id', id)
      if (error) throw error
      if (montado.current) await cargar()
    } catch (e) {
      alert(mensajeError(e, 'actualizar la cita'))
    } finally {
      if (montado.current) setMarcando(null)
    }
  }

  const pacientesActivos = new Set(
    citasHoy.filter(c => c.estado !== 'Cancelada').map(c => c.paciente_id)
  ).size
  const pendientes = citasHoy.filter(c => c.estado === 'Pendiente').length
  const neto = ingresoMes - egresoMes

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="animate-fade-up">
        <p className="text-clinic-400 first-letter:uppercase">{fechaLarga(hoy)}</p>
        <h2 className="font-display text-2xl font-extrabold text-clinic-800">
          Hola, {(perfil?.nombre || 'Diego').split(' ')[0]} 👋
        </h2>
      </div>

      {/* Error de carga */}
      {errorCarga && (
        <div className="card p-4 border-l-4 border-rose-400 bg-rose-50 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {errorCarga}
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CalendarDays} label="Citas hoy"        value={citasHoy.length}
          hint={`${pendientes} por confirmar`} accent="clinic" />
        <StatCard icon={Users}        label="Pacientes hoy"    value={pacientesActivos} accent="mint" />
        <StatCard icon={Wallet}       label="Ingresos del mes" value={soles(ingresoMes)} accent="amber" />
        <StatCard icon={UserCheck}    label="Total pacientes"  value={totalPacientes}
          hint="registrados" accent="rose" />
      </div>

      {/* Balance del mes */}
      <section className="card p-4 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-clinic-400">Balance del mes</p>
          <Link to="/caja" className="text-sm font-semibold text-clinic-500 flex items-center gap-1">
            Ver caja <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-clinic-400 flex items-center gap-1">
              <TrendingUp size={14} className="text-mint-600 shrink-0" /> Ingresos
            </p>
            <p className="font-display font-bold text-mint-600 text-base sm:text-lg truncate">{soles(ingresoMes)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-clinic-400 flex items-center gap-1">
              <TrendingDown size={14} className="text-rose-500 shrink-0" /> Gastos
            </p>
            <p className="font-display font-bold text-rose-500 text-base sm:text-lg truncate">{soles(egresoMes)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-clinic-400 flex items-center gap-1">
              <Scale size={14} className="text-clinic-500 shrink-0" /> Utilidad
            </p>
            <p className={`font-display font-bold text-base sm:text-lg truncate ${neto < 0 ? 'text-rose-600' : 'text-clinic-800'}`}>
              {soles(neto)}
            </p>
          </div>
        </div>
      </section>

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
              const pac = paq.pacientes
              const wsp = pac?.celular
                ? linkWhatsAppPaciente(pac.celular,
                    `Hola ${pac.nombres}, te saludamos de Movimiento Koray. Te ${restantes === 1 ? 'queda 1 sesión' : `quedan ${restantes} sesiones`} de tu ${paq.tipo_paquete}. ¿Te gustaría renovar tu paquete para continuar con tu tratamiento?`)
                : null
              return (
                <div key={paq.id}
                  className="card p-3.5 flex items-center gap-3 border-l-4 border-amber-400 animate-fade-up">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <PackageCheck size={18} className="text-amber-500" />
                  </div>
                  <Link to={`/pacientes/${paq.paciente_id}`} className="min-w-0 flex-1">
                    <p className="font-semibold text-clinic-800 truncate">
                      {pac?.nombres} {pac?.apellidos}
                    </p>
                    <p className="text-[13px] text-clinic-400 truncate">{paq.tipo_paquete}</p>
                  </Link>
                  <span className="chip bg-amber-50 text-amber-700 font-bold shrink-0 hidden sm:inline-flex">
                    {restantes} sesión{restantes !== 1 ? 'es' : ''} restante{restantes !== 1 ? 's' : ''}
                  </span>
                  <span className="chip bg-amber-50 text-amber-700 font-bold shrink-0 sm:hidden">
                    {restantes} rest.
                  </span>
                  {wsp && <BotonWhatsApp href={wsp} titulo="Ofrecer renovación por WhatsApp" />}
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
            {citasHoy.map(c => {
              const wsp = c.estado !== 'Asistida' && c.estado !== 'Cancelada' ? linkRecordatorioCita(c) : null
              return (
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
                  <Link to={`/pacientes/${c.paciente_id}`} className="min-w-0 flex-1">
                    <p className="font-semibold text-clinic-800 truncate">
                      {c.pacientes?.nombres} {c.pacientes?.apellidos}
                    </p>
                    <p className="text-[13px] text-clinic-400 truncate">
                      {c.servicios_precios?.nombre_servicio || 'Atención'}
                    </p>
                  </Link>
                  {wsp && <BotonWhatsApp href={wsp} titulo="Enviar recordatorio por WhatsApp" />}
                  <div className="flex flex-col items-end gap-2">
                    <EstadoCita estado={c.estado} />
                    {c.estado !== 'Asistida' && c.estado !== 'Cancelada' && (
                      <button
                        onClick={() => marcarAsistida(c.id)}
                        disabled={marcando === c.id}
                        className="text-mint-600 text-[12px] font-bold flex items-center gap-1 disabled:opacity-50 transition-opacity">
                        <CheckCircle2 size={14} />
                        {marcando === c.id ? 'Guardando...' : 'Asistió'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Próximas citas */}
      {!cargando && (
        <section className="animate-fade-up">
          <SeccionTitulo>
            <span className="flex items-center gap-2">
              <CalendarClock size={18} className="text-clinic-500" />
              Próximos {DIAS_PROXIMAS} días
            </span>
          </SeccionTitulo>
          {proximas.length === 0 ? (
            <div className="card p-5 text-center text-sm text-clinic-400">
              No hay citas programadas para los próximos días.
            </div>
          ) : (
            <div className="card divide-y divide-clinic-50">
              {proximas.map(c => {
                const wsp = linkRecordatorioCita(c)
                return (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-24 shrink-0">
                      <p className="text-[13px] font-semibold text-clinic-700 first-letter:uppercase truncate">
                        {fechaCorta(c.fecha)}
                      </p>
                      <p className="text-[12px] text-clinic-400">{hora12(c.hora)}</p>
                    </div>
                    <Link to={`/pacientes/${c.paciente_id}`} className="min-w-0 flex-1">
                      <p className="font-semibold text-clinic-800 truncate">
                        {c.pacientes?.nombres} {c.pacientes?.apellidos}
                      </p>
                      <p className="text-[13px] text-clinic-400 truncate">
                        {c.servicios_precios?.nombre_servicio || 'Atención'}
                      </p>
                    </Link>
                    <span className="hidden sm:inline-flex"><EstadoCita estado={c.estado} /></span>
                    {wsp && <BotonWhatsApp href={wsp} titulo="Enviar recordatorio por WhatsApp" />}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function BotonWhatsApp({ href, titulo }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={titulo} aria-label={titulo}
      className="grid place-items-center w-9 h-9 rounded-full text-mint-600 hover:bg-mint-50 transition-colors shrink-0">
      <MessageCircle size={18} />
    </a>
  )
}
