import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio, SeccionTitulo } from '../components/ui'
import { iniciales, edad, soles, fechaCorta, hoyISO, linkWhatsAppPaciente } from '../utils/format'
import { imprimirDiagnostico } from '../utils/print'
import {
  ArrowLeft, Phone, MessageCircle, PackageCheck, Plus, FileText,
  Stethoscope, CalendarClock, Cake, NotebookPen, CreditCard,
  Pencil, CalendarPlus, BadgeCheck, Trash2, FileDown
} from 'lucide-react'

export default function PacienteDetalle() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [p, setP]                     = useState(null)
  const [paquetes, setPaquetes]       = useState([])
  const [historiales, setHistoriales] = useState([])
  const [servicios, setServicios]     = useState([])
  const [tab, setTab]                 = useState('historial')

  // Modal: nueva atención clínica
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(vacioHist())

  // Modal: editar datos del paciente
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm]   = useState(null)

  // Modal: agendar cita rápida
  const [citaModal, setCitaModal]         = useState(false)
  const [citaForm, setCitaForm]           = useState(null)
  const [citaGuardada, setCitaGuardada]   = useState(false)

  function vacioHist() {
    return {
      fecha_atencion: hoyISO(), antecedentes: '', motivo_consulta: '',
      evaluacion_fisioterapeutica: '', diagnostico: '',
      evolucion: '', notas_sesion: ''
    }
  }

  const cargar = async () => {
    const [pac, paq, hist] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', id).maybeSingle(),
      supabase.from('paquetes_adquiridos').select('*').eq('paciente_id', id).order('creado_en', { ascending: false }),
      supabase.from('historiales_clinicos').select('*').eq('paciente_id', id).order('fecha_atencion', { ascending: false })
    ])
    setP(pac.data)
    setPaquetes(paq.data || [])
    setHistoriales(hist.data || [])
  }

  // Servicios se cargan una vez al montar
  useEffect(() => {
    supabase.from('servicios_precios')
      .select('id, nombre_servicio, precio')
      .eq('activo', true).order('categoria')
      .then(({ data }) => setServicios(data || []))
  }, [])

  useEffect(() => { cargar() }, [id])

  /* ── Historial clínico ── */
  const guardarHist = async () => {
    if (!form.motivo_consulta && !form.notas_sesion && !form.evolucion) return
    await supabase.from('historiales_clinicos').insert({ paciente_id: id, ...form })
    setForm(vacioHist()); setModal(false); cargar()
  }

  /* ── Sesiones de paquete ── */
  const restarSesion = async (paq) => {
    if (paq.sesiones_consumidas >= paq.sesiones_totales) return
    await supabase.from('paquetes_adquiridos')
      .update({ sesiones_consumidas: paq.sesiones_consumidas + 1 }).eq('id', paq.id)
    cargar()
  }

  /* ── Editar paciente ── */
  const abrirEditar = () => {
    setEditForm({
      nombres:                  p.nombres || '',
      apellidos:                p.apellidos || '',
      dni:                      p.dni || '',
      celular:                  p.celular || '',
      telefono:                 p.telefono || '',
      fecha_nacimiento:         p.fecha_nacimiento || '',
      historial_medico_general: p.historial_medico_general || ''
    })
    setEditModal(true)
  }

  const guardarEdicion = async () => {
    if (!editForm.nombres.trim() || !editForm.apellidos.trim()) return
    await supabase.from('pacientes').update({
      nombres:                  editForm.nombres.trim(),
      apellidos:                editForm.apellidos.trim(),
      dni:                      editForm.dni.trim() || null,
      celular:                  editForm.celular.trim() || null,
      telefono:                 editForm.telefono.trim() || null,
      fecha_nacimiento:         editForm.fecha_nacimiento || null,
      historial_medico_general: editForm.historial_medico_general.trim() || null
    }).eq('id', id)
    setEditModal(false)
    cargar()
  }

  /* ── Eliminar paciente ── */
  const eliminarPaciente = async () => {
    setEditModal(false)
    if (!confirm(`¿Eliminar definitivamente a ${p.nombres} ${p.apellidos}?\n\nSe eliminarán también todas sus citas, paquetes e historial clínico. Esta acción no se puede deshacer.`)) return
    await supabase.from('pacientes').delete().eq('id', id)
    navigate('/pacientes')
  }

  /* ── Agendar cita rápida ── */
  const abrirCita = () => {
    setCitaGuardada(false)
    setCitaForm({ servicio_id: '', fecha: hoyISO(), hora: '09:00', notas: '' })
    setCitaModal(true)
  }

  const guardarCita = async () => {
    if (!citaForm.fecha || !citaForm.hora) return
    await supabase.from('citas').insert({
      paciente_id: id,
      servicio_id: citaForm.servicio_id || null,
      fecha:       citaForm.fecha,
      hora:        citaForm.hora,
      estado:      'Pendiente',
      notas:       citaForm.notas.trim() || null
    })
    setCitaGuardada(true)
  }

  /* ── Render ── */
  if (!p) return <div className="card p-8 text-center text-clinic-300">Cargando paciente...</div>

  const wsp = p.celular
    ? linkWhatsAppPaciente(p.celular, `Hola ${p.nombres}, le saluda el Centro de Terapia Física Movimiento Koray.`)
    : null

  return (
    <div className="space-y-5">
      <Link to="/pacientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-500">
        <ArrowLeft size={16} /> Pacientes
      </Link>

      {/* ── Ficha del paciente ── */}
      <div className="card p-5 animate-fade-up">
        <div className="flex items-start gap-4">
          <Avatar texto={iniciales(p.nombres, p.apellidos)} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl font-extrabold text-clinic-800 truncate">
                {p.nombres} {p.apellidos}
              </h2>
              <button onClick={abrirEditar}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-clinic-400 hover:text-clinic-600 bg-clinic-50 hover:bg-clinic-100 rounded-full px-2.5 py-1 transition-colors shrink-0">
                <Pencil size={11} /> Editar
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[13px] text-clinic-400">
              {p.dni && (
                <span className="flex items-center gap-1 font-medium text-clinic-600">
                  <CreditCard size={13} className="text-clinic-400" /> DNI {p.dni}
                </span>
              )}
              {edad(p.fecha_nacimiento) != null && (
                <span className="flex items-center gap-1"><Cake size={13} /> {edad(p.fecha_nacimiento)} años</span>
              )}
              {p.celular && (
                <span className="flex items-center gap-1"><Phone size={13} /> {p.celular}</span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones de contacto */}
        <div className="flex gap-2.5 mt-4 flex-wrap">
          {p.celular && <a href={`tel:${p.celular}`} className="btn-ghost flex-1 min-w-[120px]"><Phone size={16} /> Llamar</a>}
          {wsp && (
            <a href={wsp} target="_blank" rel="noreferrer" className="btn-mint flex-1 min-w-[120px]">
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          <button onClick={abrirCita} className="btn-primary flex-1 min-w-[120px]">
            <CalendarPlus size={16} /> Agendar cita
          </button>
        </div>

        {p.historial_medico_general && (
          <div className="mt-4 bg-clinic-50/70 rounded-xl2 p-3.5 text-[13px] text-clinic-600">
            <p className="font-semibold text-clinic-700 mb-1 flex items-center gap-1.5">
              <FileText size={14} /> Historial médico general
            </p>
            {p.historial_medico_general}
          </div>
        )}
      </div>

      {/* ── Paquetes y sesiones ── */}
      {paquetes.length > 0 && (
        <section>
          <SeccionTitulo>Paquetes y sesiones</SeccionTitulo>
          <div className="space-y-2.5">
            {paquetes.map(paq => {
              const restantes = paq.sesiones_totales - paq.sesiones_consumidas
              const pct       = Math.round((paq.sesiones_consumidas / paq.sesiones_totales) * 100)
              const agotado   = restantes <= 0
              const urgente   = !agotado && restantes <= 2
              return (
                <div key={paq.id} className={`card p-4 ${urgente ? 'border-l-4 border-amber-400' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-clinic-800 truncate flex items-center gap-1.5">
                        <PackageCheck size={16} className="text-mint-500 shrink-0" /> {paq.tipo_paquete}
                      </p>
                      <p className="text-[13px] text-clinic-400 mt-0.5">
                        <span className={`font-bold ${agotado ? 'text-rose-500' : urgente ? 'text-amber-600' : 'text-mint-600'}`}>
                          {restantes}
                        </span>{' '}
                        de {paq.sesiones_totales} sesiones disponibles
                        {urgente && <span className="ml-2 text-amber-600 font-semibold">· ¡Por vencer!</span>}
                      </p>
                    </div>
                    <button onClick={() => restarSesion(paq)} disabled={agotado}
                      className="btn-mint shrink-0 px-4">−1 sesión</button>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-clinic-50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${agotado ? 'bg-rose-400' : urgente ? 'bg-amber-400' : 'bg-gradient-to-r from-mint-400 to-mint-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Tabs ── */}
      <div className="inline-flex bg-clinic-50 rounded-xl2 p-1 w-full">
        {[['historial', 'Línea de tiempo'], ['datos', 'Notas médicas']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 min-h-[42px] rounded-xl2 text-sm font-semibold transition ${tab === k ? 'bg-white text-clinic-700 shadow-soft' : 'text-clinic-400'}`}>
            {lbl}
          </button>
        ))}
      </div>

      <SeccionTitulo accion={
        <div className="flex items-center gap-2">
          <button
            onClick={() => imprimirDiagnostico(p, historiales, edad(p.fecha_nacimiento))}
            className="text-sm font-semibold text-clinic-400 hover:text-clinic-600 flex items-center gap-1 transition-colors">
            <FileDown size={15} /> PDF
          </button>
          <button onClick={() => setModal(true)} className="text-sm font-semibold text-clinic-500 flex items-center gap-1">
            <Plus size={16} /> Atención
          </button>
        </div>
      }>
        Evolución clínica
      </SeccionTitulo>

      {historiales.length === 0 ? (
        <Vacio icon={Stethoscope} titulo="Sin registros clínicos"
          descripcion="Registra la primera evaluación o sesión de este paciente."
          accion={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={18} /> Nueva atención</button>} />
      ) : (
        <ol className="relative border-l-2 border-clinic-100 ml-2 space-y-4">
          {historiales.map(h => (
            <li key={h.id} className="ml-5 animate-fade-up">
              <span className="absolute -left-[9px] grid place-items-center w-4 h-4 rounded-full bg-clinic-500 ring-4 ring-white" />
              <div className="card p-4">
                <div className="flex items-center gap-2 text-[12px] font-bold text-clinic-500 mb-2">
                  <CalendarClock size={14} /> {fechaCorta(h.fecha_atencion)}
                </div>
                {h.antecedentes                && <Campo etq="Antecedentes"   val={h.antecedentes} />}
                {h.motivo_consulta             && <Campo etq="Motivo"         val={h.motivo_consulta} />}
                {h.evaluacion_fisioterapeutica && <Campo etq="Evaluación"     val={h.evaluacion_fisioterapeutica} />}
                {h.diagnostico                 && <Campo etq="Diagnóstico"    val={h.diagnostico} />}
                {h.evolucion                   && <Campo etq="Evolución"      val={h.evolucion} />}
                {h.notas_sesion                && <Campo etq="Notas de sesión" val={h.notas_sesion} />}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* ── Modal: registrar atención ── */}
      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Registrar atención"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardarHist} className="btn-primary flex-1"><NotebookPen size={18} /> Guardar</button>
        </>}>
        <div className="space-y-4">
          <div><label className="label">Fecha de atención</label>
            <input type="date" className="field" value={form.fecha_atencion}
              onChange={e => setForm({ ...form, fecha_atencion: e.target.value })} /></div>
          <div><label className="label">Antecedentes</label>
            <textarea className="field min-h-[70px] py-3 resize-none"
              placeholder="Antecedentes relevantes: cirugías, traumatismos, patologías previas..."
              value={form.antecedentes}
              onChange={e => setForm({ ...form, antecedentes: e.target.value })} /></div>
          <div><label className="label">Motivo de consulta</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.motivo_consulta}
              onChange={e => setForm({ ...form, motivo_consulta: e.target.value })} /></div>
          <div><label className="label">Evaluación fisioterapéutica</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.evaluacion_fisioterapeutica}
              onChange={e => setForm({ ...form, evaluacion_fisioterapeutica: e.target.value })} /></div>
          <div><label className="label">Diagnóstico</label>
            <input className="field" value={form.diagnostico}
              onChange={e => setForm({ ...form, diagnostico: e.target.value })} /></div>
          <div><label className="label">Evolución</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.evolucion}
              onChange={e => setForm({ ...form, evolucion: e.target.value })} /></div>
          <div><label className="label">Notas de sesión</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.notas_sesion}
              onChange={e => setForm({ ...form, notas_sesion: e.target.value })} /></div>
        </div>
      </Modal>

      {/* ── Modal: editar datos del paciente ── */}
      {editForm && (
        <Modal abierto={editModal} onClose={() => setEditModal(false)} titulo="Editar paciente"
          footer={<>
            <button onClick={() => setEditModal(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={guardarEdicion} className="btn-primary flex-1"><Pencil size={17} /> Guardar cambios</button>
          </>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombres *</label>
                <input className="field" value={editForm.nombres}
                  onChange={e => setEditForm({ ...editForm, nombres: e.target.value })} /></div>
              <div><label className="label">Apellidos *</label>
                <input className="field" value={editForm.apellidos}
                  onChange={e => setEditForm({ ...editForm, apellidos: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">DNI</label>
                <input className="field" inputMode="numeric" maxLength={8} placeholder="12345678"
                  value={editForm.dni}
                  onChange={e => setEditForm({ ...editForm, dni: e.target.value.replace(/\D/g, '') })} /></div>
              <div><label className="label">Fecha de nacimiento</label>
                <input type="date" className="field" value={editForm.fecha_nacimiento}
                  onChange={e => setEditForm({ ...editForm, fecha_nacimiento: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Celular</label>
                <input className="field" inputMode="tel" value={editForm.celular}
                  onChange={e => setEditForm({ ...editForm, celular: e.target.value })} /></div>
              <div><label className="label">Teléfono fijo</label>
                <input className="field" inputMode="tel" value={editForm.telefono}
                  onChange={e => setEditForm({ ...editForm, telefono: e.target.value })} /></div>
            </div>
            <div><label className="label">Historial médico general</label>
              <textarea className="field min-h-[90px] py-3 resize-none"
                placeholder="Antecedentes, alergias, condiciones relevantes..."
                value={editForm.historial_medico_general}
                onChange={e => setEditForm({ ...editForm, historial_medico_general: e.target.value })} /></div>

            {/* Zona peligrosa */}
            <div className="pt-3 border-t border-rose-100">
              <button onClick={eliminarPaciente}
                className="btn-soft-danger w-full gap-2">
                <Trash2 size={16} /> Eliminar paciente definitivamente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: agendar cita rápida ── */}
      {citaForm && (
        <Modal abierto={citaModal} onClose={() => setCitaModal(false)} titulo="Agendar cita"
          footer={
            citaGuardada
              ? <button onClick={() => setCitaModal(false)} className="btn-primary w-full">Listo</button>
              : <>
                  <button onClick={() => setCitaModal(false)} className="btn-ghost flex-1">Cancelar</button>
                  <button onClick={guardarCita} className="btn-primary flex-1"><BadgeCheck size={17} /> Confirmar cita</button>
                </>
          }>
          {citaGuardada ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-mint-50 flex items-center justify-center mx-auto mb-3">
                <BadgeCheck size={28} className="text-mint-500" />
              </div>
              <p className="font-display font-bold text-clinic-800 text-lg">¡Cita agendada!</p>
              <p className="text-clinic-400 text-sm mt-1">
                {p.nombres} {p.apellidos} — {citaForm.fecha} a las {citaForm.hora}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-clinic-50 rounded-xl px-4 py-3 text-[13px] text-clinic-600 font-medium">
                Paciente: <span className="font-bold text-clinic-800">{p.nombres} {p.apellidos}</span>
              </div>
              <div><label className="label">Servicio</label>
                <select className="field" value={citaForm.servicio_id}
                  onChange={e => setCitaForm({ ...citaForm, servicio_id: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {servicios.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre_servicio} — {soles(s.precio)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Fecha</label>
                  <input type="date" className="field" value={citaForm.fecha}
                    onChange={e => setCitaForm({ ...citaForm, fecha: e.target.value })} /></div>
                <div><label className="label">Hora</label>
                  <input type="time" className="field" value={citaForm.hora}
                    onChange={e => setCitaForm({ ...citaForm, hora: e.target.value })} /></div>
              </div>
              <div><label className="label">Notas (opcional)</label>
                <textarea className="field min-h-[70px] py-3 resize-none"
                  placeholder="Indicaciones, área de trabajo..."
                  value={citaForm.notas}
                  onChange={e => setCitaForm({ ...citaForm, notas: e.target.value })} /></div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function Campo({ etq, val }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-clinic-300">{etq}</p>
      <p className="text-[14px] text-clinic-700 whitespace-pre-line">{val}</p>
    </div>
  )
}
