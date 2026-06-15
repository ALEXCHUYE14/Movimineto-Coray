import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Avatar, Vacio } from '../components/ui'
import { iniciales, edad } from '../utils/format'
import {
  Search, Plus, ChevronRight, UserPlus, Phone,
  Users, CreditCard, Trash2, Loader2
} from 'lucide-react'

const esSoloDigitos = (s) => /^\d+$/.test(s.trim())

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [busqueda, setBusqueda]   = useState('')
  const [cargando, setCargando]   = useState(true)
  const [modal, setModal]         = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm]           = useState(vacio())

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
    if (!form.nombres.trim() || !form.apellidos.trim()) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('pacientes').insert({
        ...form,
        fecha_nacimiento: form.fecha_nacimiento || null,
        dni: form.dni.trim() || null
      })
      if (error) throw error
      setForm(vacio()); setModal(false); cargar()
    } catch {
      alert('No se pudo registrar el paciente. Verifica tu conexión e intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar definitivamente a ${nombre}?\nEsta acción no se puede deshacer.`)) return
    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', id)
      if (error) throw error
      cargar()
    } catch {
      alert('No se pudo eliminar el paciente. Intenta nuevamente.')
    }
  }

  const q = busqueda.trim()
  const modoDNI = esSoloDigitos(q) && q.length >= 3

  const filtrados = pacientes.filter(p => {
    if (!q) return true
    if (esSoloDigitos(q)) {
      const dniNorm = (p.dni      || '').replace(/\D/g, '')
      const celNorm = (p.celular  || '').replace(/\D/g, '')
      const telNorm = (p.telefono || '').replace(/\D/g, '')
      return dniNorm.includes(q) || celNorm.includes(q) || telNorm.includes(q)
    }
    return `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div className="space-y-5">
      {/* Barra de búsqueda */}
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

      {/* Contador + indicador modo DNI */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] text-clinic-400">{filtrados.length} paciente(s)</p>
        {modoDNI && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-clinic-500 bg-clinic-50 border border-clinic-100 px-2.5 py-1 rounded-full">
            <CreditCard size={12} /> Buscando por DNI / teléfono
          </span>
        )}
      </div>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <Vacio
          icon={Users}
          titulo={busqueda ? 'Sin resultados' : 'Aún no tienes pacientes'}
          descripcion={
            busqueda
              ? modoDNI ? 'No se encontró ningún paciente con ese DNI o teléfono.' : 'Prueba con otro nombre.'
              : 'Registra a tu primer paciente para empezar.'
          }
          accion={!busqueda && (
            <button onClick={() => setModal(true)} className="btn-primary">
              <UserPlus size={18} /> Registrar paciente
            </button>
          )}
        />
      ) : (
        <div className="space-y-2.5">
          {filtrados.map(p => (
            <div key={p.id}
              className="card p-3.5 flex items-center gap-3 hover:shadow-float transition-shadow animate-fade-up">
              <Link to={`/pacientes/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar texto={iniciales(p.nombres, p.apellidos)} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-clinic-800 truncate">{p.nombres} {p.apellidos}</p>
                  <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                    {p.dni && (
                      <span className={`text-[12px] flex items-center gap-1 ${modoDNI ? 'text-clinic-600 font-semibold' : 'text-clinic-400'}`}>
                        <CreditCard size={11} className={modoDNI ? 'text-clinic-500' : 'text-clinic-300'} />
                        DNI {p.dni}
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

              <button
                onClick={() => eliminar(p.id, `${p.nombres} ${p.apellidos}`)}
                className="grid place-items-center w-9 h-9 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                aria-label="Eliminar paciente">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo paciente */}
      <Modal
        abierto={modal}
        onClose={() => { if (!guardando) setModal(false) }}
        titulo="Nuevo paciente"
        footer={<>
          <button onClick={() => setModal(false)} disabled={guardando} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="btn-primary flex-1">
            {guardando
              ? <><Loader2 size={16} className="animate-spin" /> Registrando...</>
              : <><UserPlus size={18} /> Registrar</>}
          </button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombres *</label>
              <input className="field" value={form.nombres}
                onChange={e => setForm({ ...form, nombres: e.target.value })} />
            </div>
            <div>
              <label className="label">Apellidos *</label>
              <input className="field" value={form.apellidos}
                onChange={e => setForm({ ...form, apellidos: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">DNI</label>
              <input className="field" inputMode="numeric" maxLength={8} placeholder="12345678"
                value={form.dni}
                onChange={e => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })} />
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
