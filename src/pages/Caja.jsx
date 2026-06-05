import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { StatCard, Vacio, SeccionTitulo } from '../components/ui'
import { soles, fechaCorta, hoyISO } from '../utils/format'
import { imprimirTicket } from '../utils/print'
import { format } from 'date-fns'
import { Wallet, Plus, TrendingUp, CalendarDays, Banknote, Smartphone, CreditCard, Printer } from 'lucide-react'

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta']
const iconoMetodo = {
  Efectivo: Banknote, Yape: Smartphone, Plin: Smartphone,
  Transferencia: CreditCard, Tarjeta: CreditCard
}

export default function Caja() {
  const [ingresos, setIngresos]   = useState([])
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando]   = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(null)

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase.from('ingresos_caja')
      .select('*, pacientes(nombres, apellidos)')
      .order('fecha_pago', { ascending: false }).limit(100)
    setIngresos(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])
  useEffect(() => {
    supabase.from('pacientes').select('id, nombres, apellidos').order('apellidos')
      .then(({ data }) => setPacientes(data || []))
  }, [])

  const abrir = () => {
    setForm({ paciente_id: '', concepto: '', monto: '', metodo_pago: 'Efectivo' })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.monto || Number(form.monto) <= 0) return

    // Insertamos y recuperamos el registro para el ticket
    const { data: nuevo } = await supabase.from('ingresos_caja').insert({
      paciente_id: form.paciente_id || null,
      concepto:    form.concepto || 'Atención',
      monto:       Number(form.monto),
      metodo_pago: form.metodo_pago
    }).select().single()

    setModal(false)
    cargar()

    // Imprimimos el ticket con los datos del paciente del estado local
    if (nuevo) {
      const pac = form.paciente_id
        ? pacientes.find(p => p.id === form.paciente_id) || null
        : null
      imprimirTicket({
        ...nuevo,
        pacientes: pac ? { nombres: pac.nombres, apellidos: pac.apellidos } : null
      })
    }
  }

  const { totalMes, totalHoy } = useMemo(() => {
    const hoy = hoyISO()
    const inicioMes = hoy.slice(0, 8) + '01'
    let mes = 0, dia = 0
    ingresos.forEach(i => {
      const f = i.fecha_pago.slice(0, 10)
      if (f >= inicioMes) mes += Number(i.monto)
      if (f === hoy)      dia += Number(i.monto)
    })
    return { totalMes: mes, totalHoy: dia }
  }, [ingresos])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp}   label="Ingresos del mes" value={soles(totalMes)} accent="mint" />
        <StatCard icon={CalendarDays} label="Ingresos de hoy"  value={soles(totalHoy)} accent="clinic" />
      </div>

      <div className="flex justify-end">
        <button onClick={abrir} className="btn-primary"><Plus size={18} /> Registrar pago</button>
      </div>

      <SeccionTitulo>Movimientos recientes</SeccionTitulo>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando...</div>
      ) : ingresos.length === 0 ? (
        <Vacio icon={Wallet} titulo="Caja sin movimientos"
          descripcion="Registra el primer ingreso del consultorio."
          accion={<button onClick={abrir} className="btn-primary"><Plus size={18} /> Registrar pago</button>} />
      ) : (
        <div className="space-y-2.5">
          {ingresos.map(i => {
            const Icono = iconoMetodo[i.metodo_pago] || Banknote
            return (
              <div key={i.id} className="card p-3.5 flex items-center gap-3 animate-fade-up">
                <div className="grid place-items-center w-11 h-11 rounded-xl2 bg-mint-50 text-mint-600 shrink-0">
                  <Icono size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-clinic-800 truncate">{i.concepto || 'Atención'}</p>
                  <p className="text-[13px] text-clinic-400 truncate">
                    {i.pacientes ? `${i.pacientes.nombres} ${i.pacientes.apellidos} · ` : ''}
                    {i.metodo_pago} · {fechaCorta(i.fecha_pago)}
                  </p>
                </div>
                <p className="font-display font-bold text-mint-600 shrink-0">{soles(i.monto)}</p>
                {/* Botón reimprimir ticket */}
                <button
                  onClick={() => imprimirTicket(i)}
                  title="Imprimir ticket"
                  className="grid place-items-center w-9 h-9 rounded-full text-clinic-300 hover:text-clinic-600 hover:bg-clinic-50 transition-colors shrink-0">
                  <Printer size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal registrar pago */}
      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Registrar pago"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardar} className="btn-mint flex-1"><Wallet size={18} /> Guardar e imprimir</button>
        </>}>
        {form && (
          <div className="space-y-4">
            <div>
              <label className="label">Monto (S/)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal"
                className="field text-lg font-bold" placeholder="0.00"
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })} />
            </div>
            <div>
              <label className="label">Concepto</label>
              <input className="field" placeholder="Ej. Terapia individual"
                value={form.concepto}
                onChange={e => setForm({ ...form, concepto: e.target.value })} />
            </div>
            <div>
              <label className="label">Paciente (opcional)</label>
              <select className="field" value={form.paciente_id}
                onChange={e => setForm({ ...form, paciente_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.apellidos}, {p.nombres}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(m => (
                  <button key={m} onClick={() => setForm({ ...form, metodo_pago: m })}
                    className={`min-h-[44px] rounded-xl2 text-[13px] font-semibold transition ${
                      form.metodo_pago === m ? 'bg-clinic-500 text-white' : 'bg-clinic-50 text-clinic-500'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-clinic-50 rounded-xl px-3.5 py-3 text-[12px] text-clinic-500 flex items-center gap-2">
              <Printer size={14} /> Al guardar se abrirá el ticket de pago automáticamente.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
