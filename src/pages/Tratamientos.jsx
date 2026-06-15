import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio, SeccionTitulo, StatCard } from '../components/ui'
import { iniciales, fechaCorta, hoyISO } from '../utils/format'
import {
  ClipboardList, Plus, Search, ChevronRight,
  CheckCircle2, Activity, Clock, BadgeCheck, Loader2
} from 'lucide-react'

const ESTADOS = ['Activo', 'Pausado', 'Finalizado']

const estadoStyle = {
  Activo:     'bg-mint-50 text-mint-700',
  Pausado:    'bg-amber-50 text-amber-700',
  Finalizado: 'bg-clinic-50 text-clinic-500'
}

function vacioForm() {
  return {
    paciente_id: '', nombre_tratamiento: '', diagnostico: '',
    objetivos: '', plan_sesiones: '', sesiones_previstas: 10,
    fecha_inicio: hoyISO(), fecha_fin_estimada: '', observaciones: ''
  }
}

export default function Tratamientos() {
  const [tratamientos, setTratamientos] = useState([])
  const [pacientes, setPacientes]       = useState([])
  const [cargando, setCargando]         = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Activo')
  const [modal, setModal]               = useState(false)
  const [guardando, setGuardando]       = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [form, setForm]                 = useState(vacioForm())

  // Recarga la lista y sincroniza el detalle abierto para evitar datos stale
  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await supabase
        .from('tratamientos')
        .select('*, pacientes(id, nombres, apellidos)')
        .order('creado_en', { ascending: false })
      const lista = data || []
      setTratamientos(lista)
      // Mantener el modal de detalle actualizado si estaba abierto
      setModalDetalle(prev => {
        if (!prev) return null
        return lista.find(t => t.id === prev.id) || null
      })
    } catch {
      // mantener datos anteriores en error de red
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    supabase.from('pacientes').select('id, nombres, apellidos').order('apellidos')
      .then(({ data }) => setPacientes(data || []))
  }, [])

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.paciente_id || !form.nombre_tratamiento.trim()) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('tratamientos').insert({
        paciente_id:          form.paciente_id,
        nombre_tratamiento:   form.nombre_tratamiento.trim(),
        diagnostico:          form.diagnostico.trim()   || null,
        objetivos:            form.objetivos.trim()     || null,
        plan_sesiones:        form.plan_sesiones.trim() || null,
        sesiones_previstas:   Number(form.sesiones_previstas) || 10,
        sesiones_completadas: 0,
        fecha_inicio:         form.fecha_inicio,
        fecha_fin_estimada:   form.fecha_fin_estimada   || null,
        observaciones:        form.observaciones.trim() || null
      })
      if (error) throw error
      setModal(false)
      setForm(vacioForm())
      cargar()
    } catch {
      alert('No se pudo registrar el tratamiento. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  const marcarSesion = async (t) => {
    if (t.sesiones_completadas >= t.sesiones_previstas) return
    const completadas = t.sesiones_completadas + 1
    const estado = completadas >= t.sesiones_previstas ? 'Finalizado' : t.estado
    try {
      const { error } = await supabase.from('tratamientos')
        .update({ sesiones_completadas: completadas, estado })
        .eq('id', t.id)
      if (error) throw error
      cargar()
    } catch {
      alert('No se pudo marcar la sesión. Intenta nuevamente.')
    }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      const { error } = await supabase.from('tratamientos').update({ estado }).eq('id', id)
      if (error) throw error
      cargar()
    } catch {
      alert('No se pudo cambiar el estado. Intenta nuevamente.')
    }
  }

  const stats = useMemo(() => ({
    activos:     tratamientos.filter(t => t.estado === 'Activo').length,
    pausados:    tratamientos.filter(t => t.estado === 'Pausado').length,
    finalizados: tratamientos.filter(t => t.estado === 'Finalizado').length
  }), [tratamientos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return tratamientos.filter(t => {
      if (filtroEstado !== 'Todos' && t.estado !== filtroEstado) return false
      if (!q) return true
      const nombre = `${t.pacientes?.nombres || ''} ${t.pacientes?.apellidos || ''}`.toLowerCase()
      return nombre.includes(q) || t.nombre_tratamiento.toLowerCase().includes(q)
    })
  }, [tratamientos, filtroEstado, busqueda])

  const abrirNuevo = () => { setForm(vacioForm()); setModal(true) }

  return (
    <div className="space-y-5">

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Activity}   label="Activos"     value={stats.activos}     accent="mint" />
        <StatCard icon={Clock}      label="Pausados"    value={stats.pausados}    accent="amber" />
        <StatCard icon={BadgeCheck} label="Finalizados" value={stats.finalizados} accent="clinic" />
      </div>

      {/* Barra búsqueda + nuevo */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clinic-300" />
          <input
            className="field pl-11"
            placeholder="Buscar por paciente o tratamiento..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button onClick={abrirNuevo} className="btn-primary px-4">
          <Plus size={20} /><span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {['Activo', 'Pausado', 'Finalizado', 'Todos'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition ${
              filtroEstado === e
                ? 'bg-clinic-500 text-white'
                : 'bg-clinic-50 text-clinic-500 hover:bg-clinic-100'
            }`}>
            {e}
          </button>
        ))}
      </div>

      <SeccionTitulo>{filtrados.length} tratamiento(s)</SeccionTitulo>

      {/* Lista */}
      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <Vacio
          icon={ClipboardList}
          titulo={busqueda ? 'Sin resultados' : 'Sin tratamientos registrados'}
          descripcion="Registra el plan de tratamiento de un paciente."
          accion={
            <button onClick={abrirNuevo} className="btn-primary">
              <Plus size={18} /> Nuevo tratamiento
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtrados.map(t => {
            const pct       = t.sesiones_previstas > 0
              ? Math.min(Math.round((t.sesiones_completadas / t.sesiones_previstas) * 100), 100)
              : 0
            const restantes = t.sesiones_previstas - t.sesiones_completadas
            const agotado   = restantes <= 0

            return (
              <div key={t.id} className="card p-4 space-y-3 animate-fade-up">
                {/* Cabecera */}
                <div className="flex items-start gap-3">
                  <Avatar texto={iniciales(t.pacientes?.nombres, t.pacientes?.apellidos)} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-clinic-800 truncate">{t.nombre_tratamiento}</p>
                      <span className={`chip shrink-0 ${estadoStyle[t.estado]}`}>{t.estado}</span>
                    </div>
                    <p className="text-[13px] text-clinic-500 truncate">
                      {t.pacientes?.nombres} {t.pacientes?.apellidos}
                    </p>
                    {t.diagnostico && (
                      <p className="text-[12px] text-clinic-400 truncate mt-0.5">{t.diagnostico}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setModalDetalle(t)}
                    title="Ver detalle"
                    className="grid place-items-center w-9 h-9 rounded-full text-clinic-300 hover:text-clinic-600 hover:bg-clinic-50 transition-colors shrink-0">
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Progreso de sesiones */}
                <div>
                  <div className="flex justify-between text-[12px] text-clinic-400 mb-1.5">
                    <span>{t.sesiones_completadas} de {t.sesiones_previstas} sesiones</span>
                    <span className="font-semibold">
                      {agotado ? 'Completado' : `${restantes} restante${restantes !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-clinic-50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        agotado
                          ? 'bg-mint-500'
                          : pct >= 70
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-clinic-400 to-mint-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Acción rápida */}
                {t.estado === 'Activo' && !agotado && (
                  <button onClick={() => marcarSesion(t)} className="btn-mint w-full text-[14px]">
                    <CheckCircle2 size={16} /> Marcar sesión completada
                  </button>
                )}

                {t.fecha_inicio && (
                  <p className="text-[11px] text-clinic-300">
                    Inicio: {fechaCorta(t.fecha_inicio)}
                    {t.fecha_fin_estimada ? ` · Fin est.: ${fechaCorta(t.fecha_fin_estimada)}` : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Nuevo tratamiento ── */}
      <Modal
        abierto={modal}
        onClose={() => { if (!guardando) setModal(false) }}
        titulo="Nuevo tratamiento"
        footer={<>
          <button onClick={() => setModal(false)} disabled={guardando} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !form.paciente_id || !form.nombre_tratamiento.trim()}
            className="btn-primary flex-1 disabled:opacity-40">
            {guardando
              ? <><Loader2 size={16} className="animate-spin" /> Registrando...</>
              : <><ClipboardList size={18} /> Registrar</>}
          </button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="label">Paciente *</label>
            <select className="field" value={form.paciente_id}
              onChange={e => setForm({ ...form, paciente_id: e.target.value })}>
              <option value="">Seleccionar paciente...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.apellidos}, {p.nombres}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nombre del tratamiento *</label>
            <input className="field" placeholder="Ej. Rehabilitación columna lumbar"
              value={form.nombre_tratamiento}
              onChange={e => setForm({ ...form, nombre_tratamiento: e.target.value })} />
          </div>
          <div>
            <label className="label">Diagnóstico</label>
            <input className="field" placeholder="Ej. Lumbalgia crónica"
              value={form.diagnostico}
              onChange={e => setForm({ ...form, diagnostico: e.target.value })} />
          </div>
          <div>
            <label className="label">Objetivos del tratamiento</label>
            <textarea className="field min-h-[70px] py-3 resize-none"
              placeholder="Metas a alcanzar con el tratamiento..."
              value={form.objetivos}
              onChange={e => setForm({ ...form, objetivos: e.target.value })} />
          </div>
          <div>
            <label className="label">Plan de sesiones</label>
            <textarea className="field min-h-[70px] py-3 resize-none"
              placeholder="Técnicas, frecuencia semanal, ejercicios..."
              value={form.plan_sesiones}
              onChange={e => setForm({ ...form, plan_sesiones: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">N° sesiones previstas</label>
              <input type="number" min="1" className="field"
                value={form.sesiones_previstas}
                onChange={e => setForm({ ...form, sesiones_previstas: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="field" value={form.fecha_inicio}
                onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Fecha fin estimada</label>
            <input type="date" className="field" value={form.fecha_fin_estimada}
              onChange={e => setForm({ ...form, fecha_fin_estimada: e.target.value })} />
          </div>
          <div>
            <label className="label">Observaciones</label>
            <textarea className="field min-h-[70px] py-3 resize-none"
              placeholder="Consideraciones especiales, alergias, contraindicaciones..."
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Detalle y gestión de estado ── */}
      {modalDetalle && (
        <Modal abierto={true} onClose={() => setModalDetalle(null)} titulo="Detalle del tratamiento"
          footer={<button onClick={() => setModalDetalle(null)} className="btn-ghost w-full">Cerrar</button>}>
          <div className="space-y-4">
            {/* Cabecera */}
            <div className="bg-clinic-50 rounded-xl px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-clinic-800">{modalDetalle.nombre_tratamiento}</p>
                <span className={`chip ${estadoStyle[modalDetalle.estado]}`}>{modalDetalle.estado}</span>
              </div>
              <p className="text-[13px] text-clinic-600 font-medium">
                {modalDetalle.pacientes?.nombres} {modalDetalle.pacientes?.apellidos}
              </p>
              {modalDetalle.diagnostico && (
                <p className="text-[13px] text-clinic-400">{modalDetalle.diagnostico}</p>
              )}
            </div>

            {/* Progreso */}
            <div className="bg-mint-50 rounded-xl px-4 py-3">
              <div className="flex justify-between text-[13px] font-semibold text-mint-700 mb-2">
                <span>Progreso de sesiones</span>
                <span>{modalDetalle.sesiones_completadas} / {modalDetalle.sesiones_previstas}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-mint-400 to-mint-600 transition-all"
                  style={{ width: `${Math.min(Math.round((modalDetalle.sesiones_completadas / modalDetalle.sesiones_previstas) * 100), 100)}%` }} />
              </div>
            </div>

            {modalDetalle.objetivos && (
              <div>
                <p className="label mb-1">Objetivos</p>
                <p className="text-[14px] text-clinic-700 whitespace-pre-line">{modalDetalle.objetivos}</p>
              </div>
            )}
            {modalDetalle.plan_sesiones && (
              <div>
                <p className="label mb-1">Plan de sesiones</p>
                <p className="text-[14px] text-clinic-700 whitespace-pre-line">{modalDetalle.plan_sesiones}</p>
              </div>
            )}
            {modalDetalle.observaciones && (
              <div>
                <p className="label mb-1">Observaciones</p>
                <p className="text-[14px] text-clinic-700 whitespace-pre-line">{modalDetalle.observaciones}</p>
              </div>
            )}

            {/* Cambiar estado */}
            <div className="pt-2 border-t border-clinic-100">
              <p className="label mb-2">Cambiar estado</p>
              <div className="flex gap-2">
                {ESTADOS.filter(e => e !== modalDetalle.estado).map(e => (
                  <button key={e}
                    onClick={() => cambiarEstado(modalDetalle.id, e)}
                    className="flex-1 min-h-[42px] rounded-xl2 text-[13px] font-semibold bg-clinic-50 text-clinic-600 hover:bg-clinic-100 transition">
                    → {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
