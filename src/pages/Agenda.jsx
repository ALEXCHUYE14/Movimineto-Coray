import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { EstadoCita, Avatar, Vacio } from '../components/ui'
import { soles, hora12, iniciales, linkWhatsApp } from '../utils/format'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, Clock,
  CheckCircle2, XCircle, MessageCircle, Trash2, BadgeCheck
} from 'lucide-react'

const ESTADOS = ['Pendiente', 'Confirmada', 'Asistida', 'Cancelada']

export default function Agenda() {
  const [vista, setVista] = useState('dia') // 'dia' | 'semana'
  const [ref, setRef] = useState(new Date())
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)

  // catalogos para el formulario
  const [pacientes, setPacientes] = useState([])
  const [servicios, setServicios] = useState([])

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(null)

  const rango = useMemo(() => {
    if (vista === 'dia') {
      const d = format(ref, 'yyyy-MM-dd')
      return { desde: d, hasta: d }
    }
    const ini = startOfWeek(ref, { weekStartsOn: 1 })
    return { desde: format(ini, 'yyyy-MM-dd'), hasta: format(addDays(ini, 6), 'yyyy-MM-dd') }
  }, [vista, ref])

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase.from('citas')
      .select('*, pacientes(nombres, apellidos, celular), servicios_precios(nombre_servicio, precio)')
      .gte('fecha', rango.desde).lte('fecha', rango.hasta)
      .order('fecha').order('hora')
    setCitas(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [rango.desde, rango.hasta])

  useEffect(() => {
    supabase.from('pacientes').select('id, nombres, apellidos, celular').order('apellidos')
      .then(({ data }) => setPacientes(data || []))
    supabase.from('servicios_precios').select('id, nombre_servicio, precio').eq('activo', true).order('categoria')
      .then(({ data }) => setServicios(data || []))
  }, [])

  const abrirNueva = (fecha) => {
    setForm({ paciente_id: '', servicio_id: '', fecha: fecha || format(ref, 'yyyy-MM-dd'), hora: '09:00', estado: 'Pendiente', notas: '' })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.paciente_id || !form.fecha || !form.hora) return
    await supabase.from('citas').insert({
      paciente_id: form.paciente_id,
      servicio_id: form.servicio_id || null,
      fecha: form.fecha, hora: form.hora, estado: form.estado, notas: form.notas || null
    })
    setModal(false); cargar()
  }

  const cambiarEstado = async (id, estado) => {
    await supabase.from('citas').update({ estado }).eq('id', id)
    cargar()
  }
  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cita?')) return
    await supabase.from('citas').delete().eq('id', id)
    cargar()
  }

  const navegar = (dir) => setRef(d => addDays(d, (vista === 'dia' ? 1 : 7) * dir))

  const diasSemana = useMemo(() => {
    const ini = startOfWeek(ref, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(ini, i))
  }, [ref])

  const citasDe = (fecha) => citas.filter(c => c.fecha === fecha)

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex bg-clinic-50 rounded-xl2 p-1">
          {['dia', 'semana'].map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`min-h-[40px] px-4 rounded-xl2 text-sm font-semibold capitalize transition ${
                vista === v ? 'bg-white text-clinic-700 shadow-soft' : 'text-clinic-400'}`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => abrirNueva()} className="btn-primary"><Plus size={18} /> Nueva cita</button>
      </div>

      {/* Navegacion de fecha */}
      <div className="card p-2 flex items-center justify-between">
        <button onClick={() => navegar(-1)} className="grid place-items-center w-11 h-11 rounded-xl2 hover:bg-clinic-50 text-clinic-500"><ChevronLeft size={20} /></button>
        <button onClick={() => setRef(new Date())} className="text-center">
          <p className="font-display font-bold text-clinic-800 capitalize">
            {vista === 'dia'
              ? format(ref, "EEEE dd 'de' MMMM", { locale: es })
              : `${format(diasSemana[0], 'dd MMM', { locale: es })} - ${format(diasSemana[6], 'dd MMM', { locale: es })}`}
          </p>
          <p className="text-[11px] text-clinic-400">Tocar para ir a hoy</p>
        </button>
        <button onClick={() => navegar(1)} className="grid place-items-center w-11 h-11 rounded-xl2 hover:bg-clinic-50 text-clinic-500"><ChevronRight size={20} /></button>
      </div>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando agenda...</div>
      ) : vista === 'dia' ? (
        <VistaDia citas={citasDe(format(ref, 'yyyy-MM-dd'))}
          onEstado={cambiarEstado} onEliminar={eliminar} onNueva={() => abrirNueva()} />
      ) : (
        <div className="space-y-3">
          {diasSemana.map(d => {
            const f = format(d, 'yyyy-MM-dd')
            const lista = citasDe(f)
            return (
              <div key={f} className="card overflow-hidden">
                <button onClick={() => abrirNueva(f)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-clinic-50/60 hover:bg-clinic-50">
                  <span className="font-display font-bold text-clinic-700 capitalize">{format(d, "EEEE dd", { locale: es })}</span>
                  <span className="text-[12px] text-clinic-400">{lista.length} cita(s) · <span className="text-clinic-500 font-semibold">+ agregar</span></span>
                </button>
                {lista.length > 0 && (
                  <div className="divide-y divide-clinic-50">
                    {lista.map(c => <FilaCita key={c.id} c={c} onEstado={cambiarEstado} onEliminar={eliminar} compacta />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva cita */}
      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Agendar nueva cita"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardar} className="btn-primary flex-1"><BadgeCheck size={18} /> Guardar</button>
        </>}>
        {form && (
          <div className="space-y-4">
            <div>
              <label className="label">Paciente</label>
              <select className="field" value={form.paciente_id} onChange={e => setForm({ ...form, paciente_id: e.target.value })}>
                <option value="">Selecciona un paciente</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombres}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Servicio</label>
              <select className="field" value={form.servicio_id} onChange={e => setForm({ ...form, servicio_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre_servicio} — {soles(s.precio)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha</label>
                <input type="date" className="field" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div>
                <label className="label">Hora</label>
                <input type="time" className="field" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notas (opcional)</label>
              <textarea className="field min-h-[80px] py-3 resize-none" value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Indicaciones, observaciones..." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function VistaDia({ citas, onEstado, onEliminar, onNueva }) {
  if (citas.length === 0)
    return <Vacio icon={CalendarDays} titulo="Dia libre"
      descripcion="No hay citas programadas para esta fecha."
      accion={<button onClick={onNueva} className="btn-primary"><Plus size={18} /> Agendar cita</button>} />
  return <div className="space-y-2.5">{citas.map(c => (
    <div key={c.id} className="card animate-fade-up"><FilaCita c={c} onEstado={onEstado} onEliminar={onEliminar} /></div>
  ))}</div>
}

function FilaCita({ c, onEstado, onEliminar, compacta }) {
  const [abierto, setAbierto] = useState(false)
  const wsp = c.pacientes?.celular
    ? linkWhatsApp(`Hola ${c.pacientes?.nombres}, te recordamos tu cita en Movimiento Koray el ${c.fecha} a las ${hora12(c.hora)}.`)
    : null
  return (
    <div className={compacta ? 'px-4 py-3' : 'p-3.5'}>
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-14 shrink-0">
          <Clock size={14} className="text-clinic-300" />
          <span className="font-display font-bold text-clinic-700 text-[13px] mt-0.5">{c.hora?.slice(0,5)}</span>
        </div>
        <Avatar texto={iniciales(c.pacientes?.nombres, c.pacientes?.apellidos)} size={40} />
        <button onClick={() => setAbierto(a => !a)} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-clinic-800 truncate">{c.pacientes?.nombres} {c.pacientes?.apellidos}</p>
          <p className="text-[13px] text-clinic-400 truncate">{c.servicios_precios?.nombre_servicio || 'Atencion'}</p>
        </button>
        <EstadoCita estado={c.estado} />
      </div>

      {abierto && (
        <div className="mt-3 pt-3 border-t border-clinic-50 flex flex-wrap gap-2 animate-fade-up">
          <button onClick={() => onEstado(c.id, 'Confirmada')} className="btn-ghost flex-1 min-w-[120px]"><CheckCircle2 size={16} /> Confirmar</button>
          <button onClick={() => onEstado(c.id, 'Asistida')} className="btn-mint flex-1 min-w-[120px]"><BadgeCheck size={16} /> Asistio</button>
          <button onClick={() => onEstado(c.id, 'Cancelada')} className="btn-soft-danger flex-1 min-w-[120px]"><XCircle size={16} /> Cancelar</button>
          {wsp && <a href={wsp} target="_blank" rel="noreferrer" className="btn-ghost flex-1 min-w-[120px]"><MessageCircle size={16} /> WhatsApp</a>}
          <button onClick={() => onEliminar(c.id)} className="btn-soft-danger"><Trash2 size={16} /></button>
        </div>
      )}
    </div>
  )
}
