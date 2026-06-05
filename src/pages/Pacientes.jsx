import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio } from '../components/ui'
import { iniciales, edad } from '../utils/format'
import { Search, Plus, ChevronRight, UserPlus, Phone, Users, CreditCard } from 'lucide-react'

export default function Pacientes() {
  const [pacientes, setPacientes]   = useState([])
  const [busqueda, setBusqueda]     = useState('')
  const [cargando, setCargando]     = useState(true)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(vacio())

  function vacio() {
    return {
      nombres: '', apellidos: '', dni: '',
      telefono: '', celular: '', fecha_nacimiento: '',
      historial_medico_general: ''
    }
  }

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase.from('pacientes').select('*').order('apellidos')
    setPacientes(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.nombres || !form.apellidos) return
    await supabase.from('pacientes').insert({
      ...form,
      fecha_nacimiento: form.fecha_nacimiento || null,
      dni: form.dni || null
    })
    setForm(vacio()); setModal(false); cargar()
  }

  const filtrados = pacientes.filter(p => {
    const t = `${p.nombres} ${p.apellidos} ${p.celular || ''} ${p.telefono || ''} ${p.dni || ''}`.toLowerCase()
    return t.includes(busqueda.toLowerCase())
  })

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clinic-300" />
          <input
            className="field pl-11"
            placeholder="Buscar por nombre, teléfono o DNI..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button onClick={() => setModal(true)} className="btn-primary px-4">
          <Plus size={20} /><span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      <p className="text-[13px] text-clinic-400 px-1">{filtrados.length} paciente(s)</p>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <Vacio
          icon={Users}
          titulo={busqueda ? 'Sin resultados' : 'Aún no tienes pacientes'}
          descripcion={busqueda ? 'Prueba con otro nombre, teléfono o DNI.' : 'Registra a tu primer paciente para empezar.'}
          accion={!busqueda && (
            <button onClick={() => setModal(true)} className="btn-primary">
              <UserPlus size={18} /> Registrar paciente
            </button>
          )}
        />
      ) : (
        <div className="space-y-2.5">
          {filtrados.map(p => (
            <Link key={p.id} to={`/pacientes/${p.id}`}
              className="card p-3.5 flex items-center gap-3 hover:shadow-float transition-shadow animate-fade-up">
              <Avatar texto={iniciales(p.nombres, p.apellidos)} size={46} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-clinic-800 truncate">{p.nombres} {p.apellidos}</p>
                <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                  {p.dni && (
                    <span className="text-[12px] text-clinic-400 flex items-center gap-1">
                      <CreditCard size={11} className="text-clinic-300" /> DNI {p.dni}
                    </span>
                  )}
                  {p.celular && (
                    <span className="text-[12px] text-clinic-400 flex items-center gap-1">
                      <Phone size={11} className="text-clinic-300" /> {p.celular}
                    </span>
                  )}
                  {edad(p.fecha_nacimiento) != null && (
                    <span className="text-[12px] text-clinic-300">{edad(p.fecha_nacimiento)} años</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-clinic-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <Modal
        abierto={modal} onClose={() => setModal(false)} titulo="Nuevo paciente"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardar} className="btn-primary flex-1"><UserPlus size={18} /> Registrar</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombres</label>
              <input className="field" value={form.nombres}
                onChange={e => setForm({ ...form, nombres: e.target.value })} />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input className="field" value={form.apellidos}
                onChange={e => setForm({ ...form, apellidos: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">DNI</label>
              <input className="field" inputMode="numeric" maxLength={8} placeholder="12345678"
                value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input type="date" className="field" value={form.fecha_nacimiento}
                onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Celular</label>
              <input className="field" inputMode="tel" value={form.celular}
                onChange={e => setForm({ ...form, celular: e.target.value })} />
            </div>
            <div>
              <label className="label">Teléfono fijo</label>
              <input className="field" inputMode="tel" value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Historial médico general</label>
            <textarea className="field min-h-[90px] py-3 resize-none"
              placeholder="Antecedentes, alergias, condiciones relevantes..."
              value={form.historial_medico_general}
              onChange={e => setForm({ ...form, historial_medico_general: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
