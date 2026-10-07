import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase, mensajeError } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio, SeccionTitulo } from '../components/ui'
import { iniciales, edad, soles, fechaCorta, hoyISO, linkWhatsAppPaciente } from '../utils/format'
import { imprimirDiagnostico, imprimirReceta, prepararVentana } from '../utils/print'
import {
  ArrowLeft, Phone, MessageCircle, PackageCheck, Plus, FileText,
  Stethoscope, CalendarClock, Cake, NotebookPen, CreditCard,
  Pencil, CalendarPlus, BadgeCheck, Trash2, FileDown, Loader2, AlertCircle,
  ClipboardList
} from 'lucide-react'

export default function PacienteDetalle() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [p, setP]                     = useState(null)
  const [cargando, setCargando]       = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [errorCarga, setErrorCarga]   = useState('')
  const [paquetes, setPaquetes]       = useState([])
  const [historiales, setHistoriales] = useState([])
  const [recetas, setRecetas]         = useState([])
  const [servicios, setServicios]     = useState([])
  const [tab, setTab]                 = useState('historial')

  // Modal: nueva atención clínica
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(vacioHist())
  const [guardandoHist, setGuardandoHist] = useState(false)

  // Modal: nueva receta / indicaciones terapéuticas
  const [recetaModal, setRecetaModal]         = useState(false)
  const [recetaForm, setRecetaForm]           = useState(vacioReceta())
  const [guardandoReceta, setGuardandoReceta] = useState(false)

  // Modal: editar datos del paciente
  const [editModal, setEditModal]   = useState(false)
  const [editForm, setEditForm]     = useState(null)
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  // Modal: agendar cita rápida
  const [citaModal, setCitaModal]       = useState(false)
  const [citaForm, setCitaForm]         = useState(null)
  const [citaGuardada, setCitaGuardada] = useState(false)
  const [guardandoCita, setGuardandoCita] = useState(false)

  // Evita descontar dos veces una sesión por toques rápidos repetidos
  const ajustandoSesion = useRef(false)

  function vacioHist() {
    return {
      fecha_atencion: hoyISO(), antecedentes: '', motivo_consulta: '',
      evaluacion_fisioterapeutica: '', diagnostico: '',
      evolucion: '', notas_sesion: ''
    }
  }

  function vacioReceta() {
    return {
      diagnostico: '',
      indicaciones: [{ indicacion: '', frecuencia: '', duracion: '' }],
      recomendaciones: '',
      proximo_control: ''
    }
  }

  const cargar = async () => {
    try {
      const [pac, paq, hist, rec] = await Promise.all([
        supabase.from('pacientes').select('*').eq('id', id).maybeSingle(),
        supabase.from('paquetes_adquiridos').select('*').eq('paciente_id', id).order('creado_en', { ascending: false }),
        supabase.from('historiales_clinicos').select('*').eq('paciente_id', id).order('fecha_atencion', { ascending: false }),
        supabase.from('recetas_medicas').select('*').eq('paciente_id', id)
          .order('fecha_emision', { ascending: false }).order('creado_en', { ascending: false })
      ])
      // Un error de red o de sesión NO significa que el paciente no exista
      if (pac.error) throw pac.error
      if (!pac.data) {
        setNoEncontrado(true)
      } else {
        setP(pac.data)
        setNoEncontrado(false)
      }
      setErrorCarga('')
      if (!paq.error)  setPaquetes(paq.data || [])
      if (!hist.error) setHistoriales(hist.data || [])
      if (!rec.error)  setRecetas(rec.data || [])
      else console.error('[Movimiento Koray] No se pudieron cargar las recetas:', rec.error)
    } catch (e) {
      setErrorCarga(mensajeError(e, 'cargar los datos del paciente'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    supabase.from('servicios_precios')
      .select('id, nombre_servicio, precio')
      .eq('activo', true).order('categoria')
      .then(({ data }) => setServicios(data || []))
  }, [])

  useEffect(() => { setCargando(true); setNoEncontrado(false); cargar() }, [id])

  /* ── Historial clínico ── */
  const guardarHist = async () => {
    const limpio = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || null) : v])
    )
    if (!limpio.fecha_atencion) { alert('Indica la fecha de atención.'); return }
    const camposClinicos = ['antecedentes', 'motivo_consulta', 'evaluacion_fisioterapeutica', 'diagnostico', 'evolucion', 'notas_sesion']
    if (!camposClinicos.some(k => limpio[k])) {
      alert('Completa al menos un campo clínico antes de guardar.')
      return
    }
    setGuardandoHist(true)
    try {
      const { error } = await supabase.from('historiales_clinicos').insert({ paciente_id: id, ...limpio })
      if (error) throw error
      setForm(vacioHist()); setModal(false); cargar()
    } catch (e) {
      alert(mensajeError(e, 'guardar la atención'))
    } finally {
      setGuardandoHist(false)
    }
  }

  /* ── Recetas médicas / indicaciones terapéuticas ── */
  const abrirReceta = () => {
    setRecetaForm(vacioReceta())
    setRecetaModal(true)
  }

  const actualizarIndicacion = (idx, campo, valor) => {
    setRecetaForm(f => ({
      ...f,
      indicaciones: f.indicaciones.map((it, i) => i === idx ? { ...it, [campo]: valor } : it)
    }))
  }

  const agregarIndicacion = () => {
    setRecetaForm(f => ({
      ...f,
      indicaciones: [...f.indicaciones, { indicacion: '', frecuencia: '', duracion: '' }]
    }))
  }

  const quitarIndicacion = (idx) => {
    setRecetaForm(f => ({ ...f, indicaciones: f.indicaciones.filter((_, i) => i !== idx) }))
  }

  const guardarReceta = async () => {
    const indicacionesLimpias = recetaForm.indicaciones
      .map(it => ({
        indicacion: (it.indicacion || '').trim(),
        frecuencia: (it.frecuencia || '').trim(),
        duracion:   (it.duracion || '').trim()
      }))
      .filter(it => it.indicacion)

    const diagnosticoLimpio    = recetaForm.diagnostico.trim()
    const recomendacionesLimpias = recetaForm.recomendaciones.trim()

    if (!indicacionesLimpias.length && !diagnosticoLimpio && !recomendacionesLimpias) {
      alert('Completa el diagnóstico, al menos una indicación o las recomendaciones.')
      return
    }
    if (recetaForm.proximo_control && recetaForm.proximo_control < hoyISO()) {
      alert('La fecha del próximo control no puede ser anterior a hoy.')
      return
    }

    // La ventana del PDF se abre ya, dentro del clic; si se abre después del
    // guardado (await) el navegador del celular la bloquea.
    const ventana = prepararVentana()
    setGuardandoReceta(true)
    let guardada = null
    try {
      const { data, error } = await supabase.from('recetas_medicas').insert({
        paciente_id:     id,
        fecha_emision:   hoyISO(),
        diagnostico:     diagnosticoLimpio || null,
        indicaciones:    indicacionesLimpias,
        recomendaciones: recomendacionesLimpias || null,
        proximo_control: recetaForm.proximo_control || null
      }).select().single()
      if (error) throw error
      guardada = data
    } catch (e) {
      ventana?.close()
      alert(mensajeError(e, 'guardar la receta'))
      return
    } finally {
      setGuardandoReceta(false)
    }

    // La receta ya está guardada: un fallo al imprimir no debe reportarse como fallo al guardar.
    setRecetaModal(false)
    setRecetaForm(vacioReceta())
    setRecetas(r => [guardada, ...r])
    cargar()
    try {
      imprimirReceta(p, guardada, edad(p.fecha_nacimiento), ventana)
    } catch (e) {
      ventana?.close()
      console.error('[Movimiento Koray] Error al generar el PDF de la receta:', e)
      alert('La receta se guardó correctamente, pero no se pudo generar el PDF. Usa el botón "PDF" de la receta.')
    }
  }

  /* ── Sesiones de paquete ── */
  const restarSesion = async (paq) => {
    if (ajustandoSesion.current || paq.sesiones_consumidas >= paq.sesiones_totales) return
    ajustandoSesion.current = true
    try {
      // La condición sobre el valor actual evita descontar sobre datos desactualizados
      const { data, error } = await supabase.from('paquetes_adquiridos')
        .update({ sesiones_consumidas: paq.sesiones_consumidas + 1 })
        .eq('id', paq.id).eq('sesiones_consumidas', paq.sesiones_consumidas)
        .select('id')
      if (error) throw error
      if (!data?.length) alert('El paquete fue modificado desde otro lugar. Se recargarán los datos.')
      await cargar()
    } catch (e) {
      alert(mensajeError(e, 'actualizar la sesión'))
    } finally {
      ajustandoSesion.current = false
    }
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
    if (!editForm.nombres.trim() || !editForm.apellidos.trim()) {
      alert('Nombres y apellidos son obligatorios.')
      return
    }
    if (editForm.dni && editForm.dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos.')
      return
    }
    setGuardandoEdit(true)
    try {
      const { error } = await supabase.from('pacientes').update({
        nombres:                  editForm.nombres.trim(),
        apellidos:                editForm.apellidos.trim(),
        dni:                      editForm.dni.trim() || null,
        celular:                  editForm.celular.trim() || null,
        telefono:                 editForm.telefono.trim() || null,
        fecha_nacimiento:         editForm.fecha_nacimiento || null,
        historial_medico_general: editForm.historial_medico_general.trim() || null
      }).eq('id', id)
      if (error) throw error
      setEditModal(false)
      cargar()
    } catch (e) {
      alert(mensajeError(e, 'guardar los cambios'))
    } finally {
      setGuardandoEdit(false)
    }
  }

  /* ── Eliminar paciente ──
     IMPORTANTE: el confirm() se muestra ANTES de cerrar el modal para no
     desorientar al usuario con un modal que se cierra solo antes de confirmar. */
  const eliminarPaciente = async () => {
    const confirmar = confirm(
      `¿Eliminar definitivamente a ${p.nombres} ${p.apellidos}?\n\n` +
      `Se eliminarán también todas sus citas, paquetes e historial clínico. Esta acción no se puede deshacer.`
    )
    if (!confirmar) return
    setEditModal(false)
    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', id)
      if (error) throw error
      navigate('/pacientes')
    } catch (e) {
      alert(mensajeError(e, 'eliminar el paciente'))
    }
  }

  /* ── Agendar cita rápida ── */
  const abrirCita = () => {
    setCitaGuardada(false)
    setCitaForm({ servicio_id: '', fecha: hoyISO(), hora: '09:00', notas: '' })
    setCitaModal(true)
  }

  const guardarCita = async () => {
    if (!citaForm.fecha || !citaForm.hora) {
      alert('Indica la fecha y la hora de la cita.')
      return
    }
    setGuardandoCita(true)
    try {
      const { error } = await supabase.from('citas').insert({
        paciente_id: id,
        servicio_id: citaForm.servicio_id || null,
        fecha:       citaForm.fecha,
        hora:        citaForm.hora,
        estado:      'Pendiente',
        notas:       (citaForm.notas || '').trim() || null
      })
      if (error) throw error
      setCitaGuardada(true)
    } catch (e) {
      alert(mensajeError(e, 'agendar la cita'))
    } finally {
      setGuardandoCita(false)
    }
  }

  /* ── Render: estados de carga y error ── */
  if (cargando) {
    return <div className="card p-8 text-center text-clinic-300">Cargando paciente...</div>
  }

  if (errorCarga && !p) {
    return (
      <div className="card p-10 text-center flex flex-col items-center gap-3">
        <AlertCircle size={26} className="text-rose-400" />
        <p className="text-sm text-clinic-500 whitespace-pre-line">{errorCarga}</p>
        <button onClick={() => { setCargando(true); cargar() }} className="btn-primary">Reintentar</button>
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="space-y-4">
        <Link to="/pacientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-500">
          <ArrowLeft size={16} /> Pacientes
        </Link>
        <div className="card p-10 text-center flex flex-col items-center gap-3">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-rose-50 text-rose-400">
            <AlertCircle size={26} />
          </div>
          <div>
            <p className="font-display font-bold text-clinic-700">Paciente no encontrado</p>
            <p className="text-sm text-clinic-400 mt-1">El registro solicitado no existe o fue eliminado.</p>
          </div>
          <Link to="/pacientes" className="btn-primary">Volver a Pacientes</Link>
        </div>
      </div>
    )
  }

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
                      className="btn-mint shrink-0 px-4 disabled:opacity-40">−1 sesión</button>
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
        {[['historial', 'Línea de tiempo'], ['recetas', 'Recetas'], ['datos', 'Notas médicas']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 min-h-[42px] rounded-xl2 text-sm font-semibold transition ${
              tab === k ? 'bg-white text-clinic-700 shadow-soft' : 'text-clinic-400'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Contenido de tabs ── */}
      {tab === 'historial' && (
        <>
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
                    {h.antecedentes                && <Campo etq="Antecedentes"              val={h.antecedentes} />}
                    {h.motivo_consulta             && <Campo etq="Motivo"                    val={h.motivo_consulta} />}
                    {h.evaluacion_fisioterapeutica && <Campo etq="Evaluación"                val={h.evaluacion_fisioterapeutica} />}
                    {h.diagnostico                 && <Campo etq="Diagnóstico"               val={h.diagnostico} />}
                    {h.evolucion                   && <Campo etq="Evolución"                 val={h.evolucion} />}
                    {h.notas_sesion                && <Campo etq="Notas de sesión"           val={h.notas_sesion} />}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {tab === 'recetas' && (
        <>
          <SeccionTitulo accion={
            <button onClick={abrirReceta} className="text-sm font-semibold text-clinic-500 flex items-center gap-1">
              <Plus size={16} /> Nueva receta
            </button>
          }>
            Recetas médicas
          </SeccionTitulo>

          {recetas.length === 0 ? (
            <Vacio icon={ClipboardList} titulo="Sin recetas registradas"
              descripcion="Genera indicaciones terapéuticas para este paciente y descárgalas en PDF."
              accion={<button onClick={abrirReceta} className="btn-primary"><Plus size={18} /> Nueva receta</button>} />
          ) : (
            <div className="space-y-2.5">
              {recetas.map(r => {
                const wspReceta = p.celular
                  ? linkWhatsAppPaciente(p.celular,
                      `Hola ${p.nombres}, le comparto sus indicaciones terapéuticas de Movimiento Koray del ${fechaCorta(r.fecha_emision)}. Le adjunto el PDF a continuación.`)
                  : null
                const nIndicaciones = Array.isArray(r.indicaciones) ? r.indicaciones.length : 0
                return (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-clinic-800 flex items-center gap-1.5">
                          <ClipboardList size={16} className="text-clinic-500 shrink-0" />
                          {fechaCorta(r.fecha_emision)}
                        </p>
                        {r.diagnostico && (
                          <p className="text-[13px] text-clinic-500 mt-1 truncate">{r.diagnostico}</p>
                        )}
                        <p className="text-[12px] text-clinic-400 mt-0.5">
                          {nIndicaciones} indicación{nIndicaciones !== 1 ? 'es' : ''}
                          {r.proximo_control && <> · Control: {fechaCorta(r.proximo_control)}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => imprimirReceta(p, r, edad(p.fecha_nacimiento))}
                        className="btn-ghost flex-1 min-w-[100px] text-sm">
                        <FileDown size={15} /> PDF
                      </button>
                      {wspReceta && (
                        <a href={wspReceta} target="_blank" rel="noreferrer"
                          className="btn-mint flex-1 min-w-[100px] text-sm">
                          <MessageCircle size={15} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'datos' && (
        <>
          <SeccionTitulo accion={
            <button onClick={abrirEditar} className="text-sm font-semibold text-clinic-500 flex items-center gap-1">
              <Pencil size={15} /> Editar
            </button>
          }>
            Notas médicas generales
          </SeccionTitulo>

          {p.historial_medico_general ? (
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-bold text-clinic-500">
                <FileText size={14} /> Historial médico general
              </div>
              <p className="text-[14px] text-clinic-700 whitespace-pre-line leading-relaxed">
                {p.historial_medico_general}
              </p>
            </div>
          ) : (
            <Vacio icon={FileText} titulo="Sin notas médicas"
              descripcion="Agrega antecedentes, alergias o condiciones relevantes del paciente."
              accion={
                <button onClick={abrirEditar} className="btn-primary">
                  <Pencil size={18} /> Agregar notas médicas
                </button>
              } />
          )}

          {/* Resumen de diagnósticos de las sesiones */}
          {historiales.some(h => h.diagnostico) && (
            <section className="mt-2">
              <SeccionTitulo>Diagnósticos registrados</SeccionTitulo>
              <div className="space-y-2">
                {historiales.filter(h => h.diagnostico).map(h => (
                  <div key={h.id} className="card p-3.5 flex items-start gap-3">
                    <div className="text-[11px] font-bold text-clinic-400 shrink-0 mt-0.5 w-24">
                      {fechaCorta(h.fecha_atencion)}
                    </div>
                    <p className="text-[13px] text-clinic-700">{h.diagnostico}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Modal: registrar atención ── */}
      <Modal
        abierto={modal}
        onClose={() => { if (!guardandoHist) setModal(false) }}
        titulo="Registrar atención"
        footer={<>
          <button onClick={() => setModal(false)} disabled={guardandoHist} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardarHist} disabled={guardandoHist} className="btn-primary flex-1">
            {guardandoHist
              ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              : <><NotebookPen size={18} /> Guardar</>}
          </button>
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

      {/* ── Modal: nueva receta / indicaciones terapéuticas ── */}
      <Modal
        abierto={recetaModal}
        onClose={() => { if (!guardandoReceta) setRecetaModal(false) }}
        titulo="Nueva receta médica"
        footer={<>
          <button onClick={() => setRecetaModal(false)} disabled={guardandoReceta} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button onClick={guardarReceta} disabled={guardandoReceta} className="btn-primary flex-1">
            {guardandoReceta
              ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              : <><FileDown size={17} /> Guardar y generar PDF</>}
          </button>
        </>}>
        <div className="space-y-4">
          <div><label className="label">Diagnóstico / Motivo</label>
            <input className="field" placeholder="Ej. Lumbalgia mecánica"
              value={recetaForm.diagnostico}
              onChange={e => setRecetaForm({ ...recetaForm, diagnostico: e.target.value })} /></div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">Indicaciones terapéuticas</label>
              <button type="button" onClick={agregarIndicacion}
                className="text-[12px] font-semibold text-clinic-500 flex items-center gap-1">
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="space-y-2.5">
              {recetaForm.indicaciones.map((it, idx) => (
                <div key={idx} className="bg-clinic-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <textarea className="field flex-1 min-h-[54px] py-2 resize-none text-[13px]"
                      placeholder="Ej. Ejercicios de fortalecimiento de cuádriceps"
                      value={it.indicacion}
                      onChange={e => actualizarIndicacion(idx, 'indicacion', e.target.value)} />
                    {recetaForm.indicaciones.length > 1 && (
                      <button type="button" onClick={() => quitarIndicacion(idx)}
                        className="grid place-items-center w-9 h-9 rounded-full hover:bg-rose-50 text-clinic-300 hover:text-rose-500 shrink-0"
                        aria-label="Quitar indicación">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="field text-[13px]" placeholder="Frecuencia (ej. 3x semana)"
                      value={it.frecuencia}
                      onChange={e => actualizarIndicacion(idx, 'frecuencia', e.target.value)} />
                    <input className="field text-[13px]" placeholder="Duración (ej. 4 semanas)"
                      value={it.duracion}
                      onChange={e => actualizarIndicacion(idx, 'duracion', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div><label className="label">Recomendaciones generales</label>
            <textarea className="field min-h-[70px] py-3 resize-none"
              placeholder="Cuidados, posturas, aplicación de frío/calor..."
              value={recetaForm.recomendaciones}
              onChange={e => setRecetaForm({ ...recetaForm, recomendaciones: e.target.value })} /></div>

          <div><label className="label">Próximo control (opcional)</label>
            <input type="date" className="field" value={recetaForm.proximo_control}
              onChange={e => setRecetaForm({ ...recetaForm, proximo_control: e.target.value })} /></div>
        </div>
      </Modal>

      {/* ── Modal: editar datos del paciente ── */}
      {editForm && (
        <Modal
          abierto={editModal}
          onClose={() => { if (!guardandoEdit) setEditModal(false) }}
          titulo="Editar paciente"
          footer={<>
            <button onClick={() => setEditModal(false)} disabled={guardandoEdit} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button onClick={guardarEdicion} disabled={guardandoEdit} className="btn-primary flex-1">
              {guardandoEdit
                ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                : <><Pencil size={17} /> Guardar cambios</>}
            </button>
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
              <button onClick={eliminarPaciente} disabled={guardandoEdit} className="btn-soft-danger w-full gap-2">
                <Trash2 size={16} /> Eliminar paciente definitivamente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: agendar cita rápida ── */}
      {citaForm && (
        <Modal
          abierto={citaModal}
          onClose={() => { if (!guardandoCita) setCitaModal(false) }}
          titulo="Agendar cita"
          footer={
            citaGuardada
              ? <button onClick={() => setCitaModal(false)} className="btn-primary w-full">Listo</button>
              : <>
                  <button onClick={() => setCitaModal(false)} disabled={guardandoCita} className="btn-ghost flex-1">
                    Cancelar
                  </button>
                  <button onClick={guardarCita} disabled={guardandoCita} className="btn-primary flex-1">
                    {guardandoCita
                      ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                      : <><BadgeCheck size={17} /> Confirmar cita</>}
                  </button>
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
