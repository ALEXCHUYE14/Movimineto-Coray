// Indicadores de solo lectura para el panel de Inicio.
// Carga sus propios datos: si algo falla aquí, el resto del panel sigue funcionando.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDays, addMonths, differenceInCalendarDays, format, getDate,
  parseISO, isValid, startOfDay, startOfMonth, subDays, subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase, mensajeError } from '../lib/supabase'
import { SeccionTitulo } from './ui'
import { soles, hoyISO, fechaLocalISO, linkWhatsAppPaciente } from '../utils/format'
import {
  BarChart3, TrendingUp, TrendingDown, Cake, UserX, CreditCard,
  MessageCircle, Trophy, AlertCircle
} from 'lucide-react'

const MESES_GRAFICO     = 6
const DIAS_INACTIVO     = 30
const DIAS_VENTANA      = 120   // historial revisado para detectar pacientes inactivos
const DIAS_CUMPLEANOS   = 7
const MAX_LISTA         = 5

export default function IndicadoresPanel() {
  const [datos, setDatos]       = useState(null)
  const [error, setError]       = useState(null)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    cargar()
    return () => { montado.current = false }
  }, [])

  const cargar = async () => {
    setError(null)
    const ahora      = new Date()
    const hoy        = hoyISO()
    const inicioMes  = format(startOfMonth(ahora), 'yyyy-MM-dd')
    const inicioGraf = startOfMonth(subMonths(ahora, MESES_GRAFICO - 1)).toISOString()
    const desdeHist  = format(subDays(ahora, DIAS_VENTANA), 'yyyy-MM-dd')
    try {
      const [ingRes, citasMesRes, histRes, cumpleRes, deudaRes] = await Promise.all([
        supabase.from('ingresos_caja')
          .select('monto, fecha_pago')
          .gte('fecha_pago', inicioGraf),
        supabase.from('citas')
          .select('estado, servicio_id, servicios_precios(nombre_servicio)')
          .gte('fecha', inicioMes).lte('fecha', hoy),
        supabase.from('citas')
          .select('paciente_id, fecha, estado, pacientes(nombres, apellidos, celular)')
          .gte('fecha', desdeHist)
          .neq('estado', 'Cancelada'),
        supabase.from('pacientes')
          .select('id, nombres, apellidos, celular, fecha_nacimiento')
          .not('fecha_nacimiento', 'is', null),
        supabase.from('paquetes_adquiridos')
          .select('id, paciente_id, tipo_paquete, monto_pagado, estado_pago, pacientes(nombres, apellidos, celular)')
          .in('estado_pago', ['Pendiente', 'Parcial'])
          .order('creado_en', { ascending: false })
      ])
      if (!montado.current) return
      const fallo = [ingRes, citasMesRes, histRes, cumpleRes, deudaRes].find(r => r.error)
      if (fallo) throw fallo.error

      setDatos({
        ingresos:   resumenIngresos(ingRes.data || [], ahora),
        mes:        resumenCitasMes(citasMesRes.data || []),
        inactivos:  pacientesInactivos(histRes.data || [], hoy),
        cumpleanos: proximosCumpleanos(cumpleRes.data || [], ahora),
        deudas:     deudaRes.data || []
      })
    } catch (e) {
      if (montado.current) setError(mensajeError(e, 'cargar los indicadores'))
    }
  }

  if (error) {
    return (
      <div className="card p-4 text-sm text-clinic-400 flex items-center gap-2">
        <AlertCircle size={16} className="shrink-0 text-amber-500" /> {error}
      </div>
    )
  }
  if (!datos) return <div className="card p-6 text-center text-clinic-300">Cargando indicadores...</div>

  const { ingresos, mes, inactivos, cumpleanos, deudas } = datos

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TarjetaIngresos ingresos={ingresos} />
        <TarjetaMes mes={mes} />
      </div>

      {cumpleanos.length > 0 && (
        <section className="animate-fade-up">
          <SeccionTitulo>
            <span className="flex items-center gap-2"><Cake size={18} className="text-rose-400" /> Cumpleaños</span>
          </SeccionTitulo>
          <div className="card divide-y divide-clinic-50">
            {cumpleanos.slice(0, MAX_LISTA).map(p => (
              <FilaPersona key={p.id} id={p.id} nombres={p.nombres} apellidos={p.apellidos}
                detalle={p.dias === 0 ? '¡Hoy cumple ' + p.edad + ' años!' :
                  `${p.dias === 1 ? 'Mañana' : `En ${p.dias} días`} · ${format(p.fecha, "dd 'de' MMMM", { locale: es })} · ${p.edad} años`}
                destacado={p.dias === 0}
                wsp={p.celular ? linkWhatsAppPaciente(p.celular,
                  `¡Feliz cumpleaños, ${p.nombres}! 🎉 Todo el equipo de Movimiento Koray te desea un excelente día lleno de salud y bienestar.`) : null}
                tituloWsp="Enviar saludo por WhatsApp" />
            ))}
          </div>
        </section>
      )}

      {deudas.length > 0 && (
        <section className="animate-fade-up">
          <SeccionTitulo accion={
            <Link to="/paquetes" className="text-sm font-semibold text-clinic-500">Ver paquetes</Link>
          }>
            <span className="flex items-center gap-2"><CreditCard size={18} className="text-amber-500" /> Pagos pendientes</span>
          </SeccionTitulo>
          <div className="card divide-y divide-clinic-50">
            {deudas.slice(0, MAX_LISTA).map(d => (
              <FilaPersona key={d.id} id={d.paciente_id}
                nombres={d.pacientes?.nombres} apellidos={d.pacientes?.apellidos}
                detalle={`${d.tipo_paquete} · ${soles(d.monto_pagado)}`}
                chip={d.estado_pago}
                wsp={d.pacientes?.celular ? linkWhatsAppPaciente(d.pacientes.celular,
                  `Hola ${d.pacientes.nombres}, te saludamos de Movimiento Koray. Te escribimos para coordinar el pago pendiente de tu ${d.tipo_paquete}. ¡Gracias!`) : null}
                tituloWsp="Recordar pago por WhatsApp" />
            ))}
            {deudas.length > MAX_LISTA && (
              <p className="px-4 py-2.5 text-[12px] text-clinic-400">y {deudas.length - MAX_LISTA} más…</p>
            )}
          </div>
        </section>
      )}

      {inactivos.length > 0 && (
        <section className="animate-fade-up">
          <SeccionTitulo>
            <span className="flex items-center gap-2"><UserX size={18} className="text-clinic-400" /> Pacientes por recuperar</span>
          </SeccionTitulo>
          <p className="text-[13px] text-clinic-400 -mt-2 mb-3">
            Sin citas desde hace más de {DIAS_INACTIVO} días y sin citas programadas.
          </p>
          <div className="card divide-y divide-clinic-50">
            {inactivos.slice(0, MAX_LISTA).map(p => (
              <FilaPersona key={p.id} id={p.id} nombres={p.nombres} apellidos={p.apellidos}
                detalle={`Última cita hace ${p.dias} días`}
                wsp={p.celular ? linkWhatsAppPaciente(p.celular,
                  `Hola ${p.nombres}, te saludamos de Movimiento Koray. Hace un tiempo no te vemos, ¿cómo sigues? Si deseas, podemos agendar tu próxima sesión.`) : null}
                tituloWsp="Contactar por WhatsApp" />
            ))}
            {inactivos.length > MAX_LISTA && (
              <p className="px-4 py-2.5 text-[12px] text-clinic-400">y {inactivos.length - MAX_LISTA} más…</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Tarjetas ────────────────────────────────────────────────────────────────

function TarjetaIngresos({ ingresos }) {
  const { meses, actual, anteriorMismoPeriodo } = ingresos
  const max = Math.max(...meses.map(m => m.total), 1)
  const variacion = anteriorMismoPeriodo > 0
    ? Math.round(((actual - anteriorMismoPeriodo) / anteriorMismoPeriodo) * 100)
    : null
  const sube = variacion !== null && variacion >= 0

  return (
    <section className="card p-4 animate-fade-up">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-clinic-400 flex items-center gap-1.5">
          <BarChart3 size={14} /> Ingresos últimos {meses.length} meses
        </p>
        {variacion !== null && (
          <span className={`chip font-bold ${sube ? 'bg-mint-50 text-mint-600' : 'bg-rose-50 text-rose-500'}`}>
            {sube ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {sube ? '+' : ''}{variacion}%
          </span>
        )}
      </div>
      <p className="text-[12px] text-clinic-400 mb-4">
        {variacion !== null
          ? `Comparado con el mismo periodo del mes anterior (${soles(anteriorMismoPeriodo)})`
          : 'Sin ingresos en el mismo periodo del mes anterior para comparar'}
      </p>
      <div className="flex items-end gap-2 h-32">
        {meses.map((m, i) => {
          const esActual = i === meses.length - 1
          const alto = Math.max((m.total / max) * 100, m.total > 0 ? 4 : 0)
          return (
            <div key={m.clave} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1"
              title={`${m.etiqueta}: ${soles(m.total)}`}>
              <span className="text-[10px] text-clinic-400 truncate max-w-full">
                {m.total > 0 ? abreviar(m.total) : ''}
              </span>
              <div className={`w-full rounded-t-lg ${esActual ? 'bg-clinic-500' : 'bg-clinic-200'}`}
                style={{ height: `${alto}%` }} />
              <span className={`text-[11px] first-letter:uppercase ${esActual ? 'font-bold text-clinic-700' : 'text-clinic-400'}`}>
                {m.etiqueta}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TarjetaMes({ mes }) {
  const { total, asistidas, canceladas, top } = mes
  const tasaCancel = total > 0 ? Math.round((canceladas / total) * 100) : 0
  const maxTop = Math.max(...top.map(t => t.cantidad), 1)

  return (
    <section className="card p-4 animate-fade-up">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-clinic-400 mb-3">Citas de este mes</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Mini valor={total}      etiqueta="Agendadas" />
        <Mini valor={asistidas}  etiqueta="Atendidas" color="text-mint-600" />
        <Mini valor={`${tasaCancel}%`} etiqueta="Canceladas"
          color={tasaCancel >= 20 ? 'text-rose-500' : 'text-clinic-800'} />
      </div>
      <p className="text-[12px] font-semibold text-clinic-500 flex items-center gap-1.5 mb-2">
        <Trophy size={14} className="text-amber-500" /> Servicios más atendidos
      </p>
      {top.length === 0 ? (
        <p className="text-[13px] text-clinic-400">Aún no hay citas atendidas este mes.</p>
      ) : (
        <div className="space-y-2">
          {top.map(t => (
            <div key={t.nombre}>
              <div className="flex justify-between text-[13px] gap-2">
                <span className="text-clinic-700 truncate">{t.nombre}</span>
                <span className="font-semibold text-clinic-800 shrink-0">{t.cantidad}</span>
              </div>
              <div className="h-1.5 rounded-full bg-clinic-50 mt-1">
                <div className="h-full rounded-full bg-mint-500" style={{ width: `${(t.cantidad / maxTop) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Mini({ valor, etiqueta, color = 'text-clinic-800' }) {
  return (
    <div className="rounded-xl2 bg-clinic-50/60 p-2.5 text-center">
      <p className={`font-display font-bold text-xl leading-none ${color}`}>{valor}</p>
      <p className="text-[11px] text-clinic-400 mt-1">{etiqueta}</p>
    </div>
  )
}

function FilaPersona({ id, nombres, apellidos, detalle, chip, destacado, wsp, tituloWsp }) {
  return (
    <div className={`px-4 py-3 flex items-center gap-3 ${destacado ? 'bg-rose-50/50' : ''}`}>
      <Link to={`/pacientes/${id}`} className="min-w-0 flex-1">
        <p className="font-semibold text-clinic-800 truncate">{nombres} {apellidos}</p>
        <p className="text-[13px] text-clinic-400 truncate">{detalle}</p>
      </Link>
      {chip && <span className="chip bg-amber-50 text-amber-700 font-bold shrink-0">{chip}</span>}
      {wsp && (
        <a href={wsp} target="_blank" rel="noreferrer" title={tituloWsp} aria-label={tituloWsp}
          className="grid place-items-center w-9 h-9 rounded-full text-mint-600 hover:bg-mint-50 transition-colors shrink-0">
          <MessageCircle size={18} />
        </a>
      )}
    </div>
  )
}

// ─── Cálculos (funciones puras) ──────────────────────────────────────────────

const abreviar = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))

function resumenIngresos(rows, ahora) {
  const meses = []
  for (let i = MESES_GRAFICO - 1; i >= 0; i--) {
    const d = subMonths(startOfMonth(ahora), i)
    meses.push({ clave: format(d, 'yyyy-MM'), etiqueta: format(d, 'MMM', { locale: es }).replace('.', ''), total: 0 })
  }
  const porClave = Object.fromEntries(meses.map(m => [m.clave, m]))

  // Comparativo justo: del 1 al día de hoy en ambos meses
  const diaHoy      = getDate(ahora)
  const claveActual = format(ahora, 'yyyy-MM')
  const claveAnt    = format(subMonths(ahora, 1), 'yyyy-MM')
  let actual = 0
  let anteriorMismoPeriodo = 0

  for (const r of rows) {
    const f = fechaLocalISO(r.fecha_pago)
    if (!f) continue
    const clave = f.slice(0, 7)
    const monto = Number(r.monto || 0)
    if (porClave[clave]) porClave[clave].total += monto
    if (clave === claveActual) actual += monto
    if (clave === claveAnt && Number(f.slice(8, 10)) <= diaHoy) anteriorMismoPeriodo += monto
  }
  return { meses, actual, anteriorMismoPeriodo }
}

function resumenCitasMes(rows) {
  const conteo = {}
  let asistidas = 0
  let canceladas = 0
  for (const c of rows) {
    if (c.estado === 'Cancelada') canceladas++
    if (c.estado === 'Asistida') {
      asistidas++
      const nombre = c.servicios_precios?.nombre_servicio || 'Atención general'
      conteo[nombre] = (conteo[nombre] || 0) + 1
    }
  }
  const top = Object.entries(conteo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, MAX_LISTA)
  return { total: rows.length, asistidas, canceladas, top }
}

function pacientesInactivos(rows, hoy) {
  const porPaciente = {}
  for (const c of rows) {
    if (!c.paciente_id) continue
    if (!porPaciente[c.paciente_id]) {
      porPaciente[c.paciente_id] = { id: c.paciente_id, ultima: null, futura: false, pac: c.pacientes }
    }
    const p = porPaciente[c.paciente_id]
    if (c.fecha > hoy) p.futura = true
    else if (!p.ultima || c.fecha > p.ultima) p.ultima = c.fecha
  }
  const hoyDate = parseISO(hoy)
  return Object.values(porPaciente)
    .filter(p => !p.futura && p.ultima && p.pac)
    .map(p => ({
      id: p.id,
      nombres: p.pac.nombres, apellidos: p.pac.apellidos, celular: p.pac.celular,
      dias: differenceInCalendarDays(hoyDate, parseISO(p.ultima))
    }))
    .filter(p => p.dias > DIAS_INACTIVO)
    .sort((a, b) => a.dias - b.dias)   // los más recientes primero: más fáciles de recuperar
}

function proximosCumpleanos(rows, ahora) {
  const hoy = startOfDay(ahora)
  const limite = addDays(hoy, DIAS_CUMPLEANOS)
  const lista = []
  for (const p of rows) {
    const nac = parseISO(p.fecha_nacimiento)
    if (!isValid(nac) || nac > hoy) continue
    // Cumpleaños de este año; si ya pasó, el del próximo año
    let cumple = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())
    if (cumple < hoy) cumple = addMonths(cumple, 12)
    if (cumple > limite) continue
    lista.push({
      id: p.id, nombres: p.nombres, apellidos: p.apellidos, celular: p.celular,
      fecha: cumple,
      dias: differenceInCalendarDays(cumple, hoy),
      edad: cumple.getFullYear() - nac.getFullYear()
    })
  }
  return lista.sort((a, b) => a.dias - b.dias)
}
