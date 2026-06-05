import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio, SeccionTitulo } from '../components/ui'
import { iniciales, soles } from '../utils/format'
import { PackageCheck, Plus, Minus, ChevronRight, ShoppingBag } from 'lucide-react'

export default function Paquetes() {
  const [paquetes, setPaquetes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(null)

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase.from('paquetes_adquiridos')
      .select('*, pacientes(nombres, apellidos)')
      .order('creado_en', { ascending: false })
    setPaquetes(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  useEffect(() => {
    supabase.from('pacientes').select('id, nombres, apellidos').order('apellidos').then(({ data }) => setPacientes(data || []))
    supabase.from('servicios_precios').select('*').eq('es_paquete', true).then(({ data }) => setServicios(data || []))
  }, [])

  const abrir = () => {
    setForm({ paciente_id: '', servicio_id: '', tipo_paquete: '', sesiones_totales: 15, monto_pagado: 0, estado_pago: 'Pagado' })
    setModal(true)
  }

  const elegirServicio = (sid) => {
    const s = servicios.find(x => x.id === sid)
    setForm(f => ({ ...f, servicio_id: sid, tipo_paquete: s?.nombre_servicio || '', sesiones_totales: s?.sesiones || f.sesiones_totales, monto_pagado: s?.precio || 0 }))
  }

  const guardar = async () => {
    if (!form.paciente_id || !form.tipo_paquete) return
    const { data, error } = await supabase.from('paquetes_adquiridos').insert({
      paciente_id: form.paciente_id, servicio_id: form.servicio_id || null,
      tipo_paquete: form.tipo_paquete, sesiones_totales: Number(form.sesiones_totales),
      monto_pagado: Number(form.monto_pagado), estado_pago: form.estado_pago
    }).select().maybeSingle()

    // Si esta pagado, registra el ingreso en caja automaticamente
    if (!error && data && form.estado_pago === 'Pagado' && Number(form.monto_pagado) > 0) {
      await supabase.from('ingresos_caja').insert({
        paquete_id: data.id, paciente_id: form.paciente_id,
        concepto: `Paquete: ${form.tipo_paquete}`, monto: Number(form.monto_pagado), metodo_pago: 'Efectivo'
      })
    }
    setModal(false); cargar()
  }

  const ajustar = async (paq, delta) => {
    const nuevo = paq.sesiones_consumidas + delta
    if (nuevo < 0 || nuevo > paq.sesiones_totales) return
    await supabase.from('paquetes_adquiridos').update({ sesiones_consumidas: nuevo }).eq('id', paq.id)
    cargar()
  }

  const activos = paquetes.filter(p => p.sesiones_consumidas < p.sesiones_totales)
  const completados = paquetes.filter(p => p.sesiones_consumidas >= p.sesiones_totales)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={abrir} className="btn-primary"><Plus size={18} /> Vender paquete</button>
      </div>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando...</div>
      ) : paquetes.length === 0 ? (
        <Vacio icon={ShoppingBag} titulo="Sin paquetes vendidos"
          descripcion="Registra el primer paquete ahorro de un paciente."
          accion={<button onClick={abrir} className="btn-primary"><Plus size={18} /> Vender paquete</button>} />
      ) : (
        <>
          <SeccionTitulo>Paquetes activos ({activos.length})</SeccionTitulo>
          <div className="space-y-2.5">
            {activos.map(p => <TarjetaPaquete key={p.id} p={p} onAjustar={ajustar} />)}
          </div>

          {completados.length > 0 && (
            <>
              <SeccionTitulo>Completados ({completados.length})</SeccionTitulo>
              <div className="space-y-2.5 opacity-70">
                {completados.map(p => <TarjetaPaquete key={p.id} p={p} onAjustar={ajustar} />)}
              </div>
            </>
          )}
        </>
      )}

      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Vender paquete"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardar} className="btn-primary flex-1"><PackageCheck size={18} /> Registrar</button>
        </>}>
        {form && (
          <div className="space-y-4">
            <div><label className="label">Paciente</label>
              <select className="field" value={form.paciente_id} onChange={e => setForm({ ...form, paciente_id: e.target.value })}>
                <option value="">Selecciona</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombres}</option>)}
              </select></div>
            <div><label className="label">Paquete del catalogo</label>
              <select className="field" value={form.servicio_id} onChange={e => elegirServicio(e.target.value)}>
                <option value="">Personalizado</option>
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre_servicio} — {soles(s.precio)}</option>)}
              </select></div>
            <div><label className="label">Nombre del paquete</label>
              <input className="field" value={form.tipo_paquete} onChange={e => setForm({ ...form, tipo_paquete: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Sesiones totales</label>
                <input type="number" min="1" className="field" value={form.sesiones_totales} onChange={e => setForm({ ...form, sesiones_totales: e.target.value })} /></div>
              <div><label className="label">Monto (S/)</label>
                <input type="number" min="0" step="0.01" className="field" value={form.monto_pagado} onChange={e => setForm({ ...form, monto_pagado: e.target.value })} /></div>
            </div>
            <div><label className="label">Estado de pago</label>
              <select className="field" value={form.estado_pago} onChange={e => setForm({ ...form, estado_pago: e.target.value })}>
                <option>Pagado</option><option>Parcial</option><option>Pendiente</option>
              </select></div>
            <p className="text-[12px] text-clinic-400">Si el estado es "Pagado", se registrara automaticamente el ingreso en Caja.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TarjetaPaquete({ p, onAjustar }) {
  const restantes = p.sesiones_totales - p.sesiones_consumidas
  const pct = Math.round((p.sesiones_consumidas / p.sesiones_totales) * 100)
  const agotado = restantes <= 0
  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-center gap-3">
        <Avatar texto={iniciales(p.pacientes?.nombres, p.pacientes?.apellidos)} size={42} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-clinic-800 truncate">{p.pacientes?.nombres} {p.pacientes?.apellidos}</p>
          <p className="text-[13px] text-clinic-400 truncate">{p.tipo_paquete}</p>
        </div>
        <Link to={`/pacientes/${p.paciente_id}`} className="grid place-items-center w-9 h-9 rounded-full hover:bg-clinic-50 text-clinic-300"><ChevronRight size={18} /></Link>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => onAjustar(p, -1)} disabled={p.sesiones_consumidas <= 0}
          className="grid place-items-center w-11 h-11 rounded-xl2 bg-clinic-50 text-clinic-500 active:scale-95 disabled:opacity-40"><Minus size={20} /></button>
        <div className="flex-1">
          <div className="flex justify-between text-[12px] mb-1">
            <span className={`font-bold ${agotado ? 'text-rose-500' : 'text-mint-600'}`}>{restantes} restantes</span>
            <span className="text-clinic-300">{p.sesiones_consumidas}/{p.sesiones_totales}</span>
          </div>
          <div className="h-2.5 rounded-full bg-clinic-50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-mint-400 to-mint-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button onClick={() => onAjustar(p, 1)} disabled={agotado}
          className="grid place-items-center w-11 h-11 rounded-xl2 bg-mint-500 text-white active:scale-95 disabled:opacity-40"><Plus size={20} /></button>
      </div>
    </div>
  )
}
