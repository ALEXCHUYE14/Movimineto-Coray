import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio, SeccionTitulo } from '../components/ui'
import { iniciales, edad, soles, fechaCorta, hoyISO, linkWhatsApp } from '../utils/format'
import {
  ArrowLeft, Phone, MessageCircle, PackageCheck, Plus, FileText,
  Stethoscope, CalendarClock, Cake, NotebookPen
} from 'lucide-react'

export default function PacienteDetalle() {
  const { id } = useParams()
  const [p, setP] = useState(null)
  const [paquetes, setPaquetes] = useState([])
  const [historiales, setHistoriales] = useState([])
  const [tab, setTab] = useState('historial')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(vacioHist())

  function vacioHist() {
    return {
      fecha_atencion: hoyISO(), motivo_consulta: '', evaluacion_fisioterapeutica: '',
      diagnostico: '', evolucion: '', notas_sesion: ''
    }
  }

  const cargar = async () => {
    const [pac, paq, hist] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', id).maybeSingle(),
      supabase.from('paquetes_adquiridos').select('*').eq('paciente_id', id).order('creado_en', { ascending: false }),
      supabase.from('historiales_clinicos').select('*').eq('paciente_id', id).order('fecha_atencion', { ascending: false })
    ])
    setP(pac.data); setPaquetes(paq.data || []); setHistoriales(hist.data || [])
  }
  useEffect(() => { cargar() }, [id])

  const guardarHist = async () => {
    if (!form.motivo_consulta && !form.notas_sesion && !form.evolucion) return
    await supabase.from('historiales_clinicos').insert({ paciente_id: id, ...form })
    setForm(vacioHist()); setModal(false); cargar()
  }

  // Resta una sesion de un paquete con un solo toque
  const restarSesion = async (paq) => {
    if (paq.sesiones_consumidas >= paq.sesiones_totales) return
    await supabase.from('paquetes_adquiridos')
      .update({ sesiones_consumidas: paq.sesiones_consumidas + 1 }).eq('id', paq.id)
    cargar()
  }

  if (!p) return <div className="card p-8 text-center text-clinic-300">Cargando paciente...</div>

  const wsp = p.celular ? linkWhatsApp(`Hola ${p.nombres}, le saluda el Centro de Terapia Fisica Movimiento Koray.`) : null

  return (
    <div className="space-y-5">
      <Link to="/pacientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-500">
        <ArrowLeft size={16} /> Pacientes
      </Link>

      {/* Ficha */}
      <div className="card p-5 animate-fade-up">
        <div className="flex items-center gap-4">
          <Avatar texto={iniciales(p.nombres, p.apellidos)} size={64} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-clinic-800 truncate">{p.nombres} {p.apellidos}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[13px] text-clinic-400">
              {edad(p.fecha_nacimiento) != null && <span className="flex items-center gap-1"><Cake size={13} /> {edad(p.fecha_nacimiento)} anos</span>}
              {p.celular && <span className="flex items-center gap-1"><Phone size={13} /> {p.celular}</span>}
            </div>
          </div>
        </div>
        {(p.celular) && (
          <div className="flex gap-2.5 mt-4">
            <a href={`tel:${p.celular}`} className="btn-ghost flex-1"><Phone size={16} /> Llamar</a>
            {wsp && <a href={wsp} target="_blank" rel="noreferrer" className="btn-mint flex-1"><MessageCircle size={16} /> WhatsApp</a>}
          </div>
        )}
        {p.historial_medico_general && (
          <div className="mt-4 bg-clinic-50/70 rounded-xl2 p-3.5 text-[13px] text-clinic-600">
            <p className="font-semibold text-clinic-700 mb-1 flex items-center gap-1.5"><FileText size={14} /> Historial medico general</p>
            {p.historial_medico_general}
          </div>
        )}
      </div>

      {/* Paquetes / sesiones restantes */}
      {paquetes.length > 0 && (
        <section>
          <SeccionTitulo>Paquetes y sesiones</SeccionTitulo>
          <div className="space-y-2.5">
            {paquetes.map(paq => {
              const restantes = paq.sesiones_totales - paq.sesiones_consumidas
              const pct = Math.round((paq.sesiones_consumidas / paq.sesiones_totales) * 100)
              const agotado = restantes <= 0
              return (
                <div key={paq.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-clinic-800 truncate flex items-center gap-1.5"><PackageCheck size={16} className="text-mint-500" /> {paq.tipo_paquete}</p>
                      <p className="text-[13px] text-clinic-400 mt-0.5">
                        <span className={`font-bold ${agotado ? 'text-rose-500' : 'text-mint-600'}`}>{restantes}</span> de {paq.sesiones_totales} sesiones disponibles
                      </p>
                    </div>
                    <button onClick={() => restarSesion(paq)} disabled={agotado}
                      className="btn-mint shrink-0 px-4">−1 sesion</button>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-clinic-50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-mint-400 to-mint-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="inline-flex bg-clinic-50 rounded-xl2 p-1 w-full">
        {[['historial', 'Linea de tiempo'], ['datos', 'Notas medicas']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 min-h-[42px] rounded-xl2 text-sm font-semibold transition ${tab === k ? 'bg-white text-clinic-700 shadow-soft' : 'text-clinic-400'}`}>
            {lbl}
          </button>
        ))}
      </div>

      <SeccionTitulo accion={
        <button onClick={() => setModal(true)} className="text-sm font-semibold text-clinic-500 flex items-center gap-1"><Plus size={16} /> Atencion</button>
      }>
        Evolucion clinica
      </SeccionTitulo>

      {historiales.length === 0 ? (
        <Vacio icon={Stethoscope} titulo="Sin registros clinicos"
          descripcion="Registra la primera evaluacion o sesion de este paciente."
          accion={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={18} /> Nueva atencion</button>} />
      ) : (
        <ol className="relative border-l-2 border-clinic-100 ml-2 space-y-4">
          {historiales.map(h => (
            <li key={h.id} className="ml-5 animate-fade-up">
              <span className="absolute -left-[9px] grid place-items-center w-4 h-4 rounded-full bg-clinic-500 ring-4 ring-white" />
              <div className="card p-4">
                <div className="flex items-center gap-2 text-[12px] font-bold text-clinic-500 mb-2">
                  <CalendarClock size={14} /> {fechaCorta(h.fecha_atencion)}
                </div>
                {h.motivo_consulta && <Campo etq="Motivo" val={h.motivo_consulta} />}
                {h.evaluacion_fisioterapeutica && <Campo etq="Evaluacion" val={h.evaluacion_fisioterapeutica} />}
                {h.diagnostico && <Campo etq="Diagnostico" val={h.diagnostico} />}
                {h.evolucion && <Campo etq="Evolucion" val={h.evolucion} />}
                {h.notas_sesion && <Campo etq="Notas de sesion" val={h.notas_sesion} />}
              </div>
            </li>
          ))}
        </ol>
      )}

      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Registrar atencion"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardarHist} className="btn-primary flex-1"><NotebookPen size={18} /> Guardar</button>
        </>}>
        <div className="space-y-4">
          <div><label className="label">Fecha de atencion</label>
            <input type="date" className="field" value={form.fecha_atencion} onChange={e => setForm({ ...form, fecha_atencion: e.target.value })} /></div>
          <div><label className="label">Motivo de consulta</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.motivo_consulta} onChange={e => setForm({ ...form, motivo_consulta: e.target.value })} /></div>
          <div><label className="label">Evaluacion fisioterapeutica</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.evaluacion_fisioterapeutica} onChange={e => setForm({ ...form, evaluacion_fisioterapeutica: e.target.value })} /></div>
          <div><label className="label">Diagnostico</label>
            <input className="field" value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} /></div>
          <div><label className="label">Evolucion</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.evolucion} onChange={e => setForm({ ...form, evolucion: e.target.value })} /></div>
          <div><label className="label">Notas de sesion</label>
            <textarea className="field min-h-[70px] py-3 resize-none" value={form.notas_sesion} onChange={e => setForm({ ...form, notas_sesion: e.target.value })} /></div>
        </div>
      </Modal>
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
