import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { StatCard, Vacio, SeccionTitulo } from '../components/ui'
import { soles, fechaCorta, hoyISO } from '../utils/format'
import { imprimirTicket } from '../utils/print'
import {
  Wallet, Plus, TrendingUp, TrendingDown, CalendarDays,
  Banknote, Smartphone, CreditCard, Printer, Lock,
  ArrowDownRight, ArrowUpRight
} from 'lucide-react'

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta']
const CATEGORIAS_EGRESO = ['Materiales', 'Gastos operativos', 'Equipos', 'Otros']

const iconoMetodo = {
  Efectivo: Banknote, Yape: Smartphone, Plin: Smartphone,
  Transferencia: CreditCard, Tarjeta: CreditCard
}

export default function Caja() {
  const [ingresos, setIngresos]           = useState([])
  const [egresos, setEgresos]             = useState([])
  const [pacientes, setPacientes]         = useState([])
  const [cargando, setCargando]           = useState(true)
  const [modal, setModal]                 = useState(false)
  const [modalEgreso, setModalEgreso]     = useState(false)
  const [modalCierre, setModalCierre]     = useState(false)
  const [form, setForm]                   = useState(null)
  const [formEgreso, setFormEgreso]       = useState(null)

  const cargar = async () => {
    setCargando(true)
    const [{ data: ing }, { data: egr }] = await Promise.all([
      supabase.from('ingresos_caja')
        .select('*, pacientes(nombres, apellidos)')
        .order('fecha_pago', { ascending: false }).limit(100),
      supabase.from('egresos_caja')
        .select('*')
        .order('fecha_egreso', { ascending: false }).limit(100)
    ])
    setIngresos(ing || [])
    setEgresos(egr || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => {
    supabase.from('pacientes').select('id, nombres, apellidos').order('apellidos')
      .then(({ data }) => setPacientes(data || []))
  }, [])

  // ── Guardar ingreso ──────────────────────────────────────────────────────
  const abrirIngreso = () => {
    setForm({ paciente_id: '', concepto: '', monto: '', metodo_pago: 'Efectivo' })
    setModal(true)
  }

  const guardarIngreso = async () => {
    if (!form.monto || Number(form.monto) <= 0) return
    const { data: nuevo } = await supabase.from('ingresos_caja').insert({
      paciente_id: form.paciente_id || null,
      concepto:    form.concepto || 'Atención',
      monto:       Number(form.monto),
      metodo_pago: form.metodo_pago
    }).select().single()

    setModal(false)
    cargar()

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

  // ── Guardar egreso ───────────────────────────────────────────────────────
  const abrirEgreso = () => {
    setFormEgreso({ concepto: '', monto: '', categoria: 'Gastos operativos' })
    setModalEgreso(true)
  }

  const guardarEgreso = async () => {
    if (!formEgreso.concepto.trim() || !formEgreso.monto || Number(formEgreso.monto) <= 0) return
    await supabase.from('egresos_caja').insert({
      concepto:  formEgreso.concepto.trim(),
      monto:     Number(formEgreso.monto),
      categoria: formEgreso.categoria
    })
    setModalEgreso(false)
    cargar()
  }

  // ── Estadísticas ─────────────────────────────────────────────────────────
  const { totalMes, totalHoy, egresosMes, egresosHoy } = useMemo(() => {
    const hoy = hoyISO()
    const inicioMes = hoy.slice(0, 8) + '01'
    let ingMes = 0, ingHoy = 0, egrMes = 0, egrHoy = 0
    ingresos.forEach(i => {
      const f = i.fecha_pago.slice(0, 10)
      if (f >= inicioMes) ingMes += Number(i.monto)
      if (f === hoy)      ingHoy += Number(i.monto)
    })
    egresos.forEach(e => {
      const f = e.fecha_egreso.slice(0, 10)
      if (f >= inicioMes) egrMes += Number(e.monto)
      if (f === hoy)      egrHoy += Number(e.monto)
    })
    return { totalMes: ingMes, totalHoy: ingHoy, egresosMes: egrMes, egresosHoy: egrHoy }
  }, [ingresos, egresos])

  // ── Lista unificada de movimientos ───────────────────────────────────────
  const movimientos = useMemo(() => {
    const ing = ingresos.map(i => ({ ...i, tipo: 'ingreso', fecha: i.fecha_pago }))
    const egr = egresos.map(e => ({ ...e, tipo: 'egreso',  fecha: e.fecha_egreso }))
    return [...ing, ...egr]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 100)
  }, [ingresos, egresos])

  // ── Resumen del día para cierre ──────────────────────────────────────────
  const resumenHoy = useMemo(() => {
    const hoy = hoyISO()
    const ingHoy = ingresos.filter(i => i.fecha_pago.slice(0, 10) === hoy)
    const egrHoy = egresos.filter(e => e.fecha_egreso.slice(0, 10) === hoy)
    const porMetodo = {}
    ingHoy.forEach(i => {
      porMetodo[i.metodo_pago] = (porMetodo[i.metodo_pago] || 0) + Number(i.monto)
    })
    return {
      ingHoy,
      egrHoy,
      totalIngresos: totalHoy,
      totalEgresos:  egresosHoy,
      balance:       totalHoy - egresosHoy,
      porMetodo
    }
  }, [ingresos, egresos, totalHoy, egresosHoy])

  // ── Imprimir cierre de caja ──────────────────────────────────────────────
  const imprimirCierre = () => {
    const fechaStr = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaStr  = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    const logoUrl  = `${window.location.origin}/img/logo.jpeg`

    const filasMetodo = Object.entries(resumenHoy.porMetodo)
      .map(([m, v]) => `<div class="row"><span>${m}</span><span>S/ ${Number(v).toFixed(2)}</span></div>`)
      .join('') || '<div class="small">Sin ingresos</div>'

    const filasEgresos = resumenHoy.egrHoy
      .map(e => `<div class="row"><span class="truncate">${e.concepto} (${e.categoria})</span><span>-S/ ${Number(e.monto).toFixed(2)}</span></div>`)
      .join('') || '<div class="small">Sin egresos</div>'

    const signo = resumenHoy.balance >= 0 ? '' : '-'
    const balAbs = Math.abs(resumenHoy.balance).toFixed(2)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cierre de Caja - ${fechaStr}</title>
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',Courier,monospace; font-size:13px; color:#000; background:#fff; width:74mm; }
  .center  { text-align:center; }
  .bold    { font-weight:bold; }
  .large   { font-size:15px; }
  .small   { font-size:11px; color:#555; }
  .truncate { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:42mm; }
  hr       { border:none; border-top:1px dashed #000; margin:5px 0; }
  .hr-sol  { border:none; border-top:2px solid #000; margin:6px 0; }
  .row     { display:flex; justify-content:space-between; margin:2px 0; }
  .logo    { width:50px; height:50px; object-fit:cover; border-radius:6px; }
  .pos     { color:#1a7a4a; }
  .neg     { color:#c0392b; }
  .no-print { text-align:center; padding:10px; background:#f0f4f8; margin-bottom:12px; border-radius:6px; }
  .btn  { padding:9px 22px; font-size:14px; cursor:pointer; background:#2b78ab; color:white; border:none; border-radius:6px; font-weight:bold; font-family:inherit; }
</style>
</head>
<body>
  <div class="no-print"><button class="btn" onclick="window.print()">🖨️&nbsp; Imprimir cierre</button></div>
  <div class="center">
    <img class="logo" src="${logoUrl}" onerror="this.style.display='none'" />
    <div class="bold large" style="margin-top:5px">MOVIMIENTO KORAY</div>
    <div class="small">Centro de Terapia Física · Cel: 996 113 188</div>
  </div>
  <hr/>
  <div class="center bold" style="font-size:14px;margin:4px 0">CIERRE DE CAJA</div>
  <div class="center small">${fechaStr} — ${horaStr}</div>
  <hr/>
  <div class="bold" style="margin-bottom:3px">INGRESOS DEL DÍA</div>
  ${filasMetodo}
  <hr/>
  <div class="row bold"><span>TOTAL INGRESOS</span><span class="pos">S/ ${Number(resumenHoy.totalIngresos).toFixed(2)}</span></div>
  <hr/>
  <div class="bold" style="margin-bottom:3px">EGRESOS DEL DÍA</div>
  ${filasEgresos}
  <hr/>
  <div class="row bold"><span>TOTAL EGRESOS</span><span class="neg">-S/ ${Number(resumenHoy.totalEgresos).toFixed(2)}</span></div>
  <div class="hr-sol"/>
  <div class="row bold large"><span>BALANCE NETO</span><span>${signo}S/ ${balAbs}</span></div>
  <hr/>
  <div class="center small" style="margin-top:4px">Gracias por confiar en nosotros</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=720,height=960,scrollbars=yes')
    if (!win) { alert('Permite las ventanas emergentes en tu navegador para imprimir.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 650)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp}   label="Ingresos del mes"  value={soles(totalMes)}              accent="mint" />
        <StatCard icon={CalendarDays} label="Ingresos de hoy"   value={soles(totalHoy)}              accent="clinic" />
        <StatCard icon={TrendingDown} label="Egresos del mes"   value={soles(egresosMes)}            accent="rose" />
        <StatCard icon={Wallet}       label="Balance del mes"   value={soles(totalMes - egresosMes)} accent="amber" />
      </div>

      {/* Acciones */}
      <div className="flex gap-2 justify-end flex-wrap">
        <button
          onClick={() => setModalCierre(true)}
          className="btn-ghost flex items-center gap-1.5">
          <Lock size={16} /> Cerrar caja
        </button>
        <button
          onClick={abrirEgreso}
          className="btn-soft-danger flex items-center gap-1.5">
          <ArrowDownRight size={18} /> Registrar egreso
        </button>
        <button onClick={abrirIngreso} className="btn-primary">
          <Plus size={18} /> Registrar pago
        </button>
      </div>

      <SeccionTitulo>Movimientos recientes</SeccionTitulo>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando...</div>
      ) : movimientos.length === 0 ? (
        <Vacio icon={Wallet} titulo="Caja sin movimientos"
          descripcion="Registra el primer ingreso del consultorio."
          accion={<button onClick={abrirIngreso} className="btn-primary"><Plus size={18} /> Registrar pago</button>} />
      ) : (
        <div className="space-y-2.5">
          {movimientos.map(mov => {
            if (mov.tipo === 'ingreso') {
              const Icono = iconoMetodo[mov.metodo_pago] || Banknote
              return (
                <div key={`ing-${mov.id}`} className="card p-3.5 flex items-center gap-3 animate-fade-up">
                  <div className="grid place-items-center w-11 h-11 rounded-xl2 bg-mint-50 text-mint-600 shrink-0">
                    <Icono size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-clinic-800 truncate">{mov.concepto || 'Atención'}</p>
                    <p className="text-[13px] text-clinic-400 truncate">
                      {mov.pacientes ? `${mov.pacientes.nombres} ${mov.pacientes.apellidos} · ` : ''}
                      {mov.metodo_pago} · {fechaCorta(mov.fecha_pago)}
                    </p>
                  </div>
                  <p className="font-display font-bold text-mint-600 shrink-0">+{soles(mov.monto)}</p>
                  <button
                    onClick={() => imprimirTicket(mov)}
                    title="Imprimir ticket"
                    className="grid place-items-center w-9 h-9 rounded-full text-clinic-300 hover:text-clinic-600 hover:bg-clinic-50 transition-colors shrink-0">
                    <Printer size={16} />
                  </button>
                </div>
              )
            }
            return (
              <div key={`egr-${mov.id}`} className="card p-3.5 flex items-center gap-3 animate-fade-up border-l-2 border-rose-200">
                <div className="grid place-items-center w-11 h-11 rounded-xl2 bg-rose-50 text-rose-500 shrink-0">
                  <ArrowDownRight size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-clinic-800 truncate">{mov.concepto}</p>
                  <p className="text-[13px] text-clinic-400 truncate">
                    {mov.categoria} · {fechaCorta(mov.fecha_egreso)}
                  </p>
                </div>
                <p className="font-display font-bold text-rose-500 shrink-0">-{soles(mov.monto)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Registrar pago (ingreso) ── */}
      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Registrar pago"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardarIngreso} className="btn-mint flex-1"><Wallet size={18} /> Guardar e imprimir</button>
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

      {/* ── Modal: Registrar egreso ── */}
      <Modal abierto={modalEgreso} onClose={() => setModalEgreso(false)} titulo="Registrar egreso"
        footer={<>
          <button onClick={() => setModalEgreso(false)} className="btn-ghost flex-1">Cancelar</button>
          <button
            onClick={guardarEgreso}
            disabled={!formEgreso?.concepto?.trim() || !formEgreso?.monto || Number(formEgreso?.monto) <= 0}
            className="btn-primary flex-1 disabled:opacity-40">
            <ArrowDownRight size={18} /> Registrar egreso
          </button>
        </>}>
        {formEgreso && (
          <div className="space-y-4">
            <div>
              <label className="label">Monto (S/)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal"
                className="field text-lg font-bold" placeholder="0.00"
                value={formEgreso.monto}
                onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value })} />
            </div>
            <div>
              <label className="label">Concepto</label>
              <input className="field" placeholder="Ej. Compra de materiales"
                value={formEgreso.concepto}
                onChange={e => setFormEgreso({ ...formEgreso, concepto: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIAS_EGRESO.map(c => (
                  <button key={c} onClick={() => setFormEgreso({ ...formEgreso, categoria: c })}
                    className={`min-h-[40px] rounded-xl2 text-[13px] font-semibold transition ${
                      formEgreso.categoria === c ? 'bg-rose-500 text-white' : 'bg-clinic-50 text-clinic-500'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Cierre de caja ── */}
      <Modal abierto={modalCierre} onClose={() => setModalCierre(false)} titulo="Cierre de caja"
        footer={<>
          <button onClick={() => setModalCierre(false)} className="btn-ghost flex-1">Cerrar</button>
          <button onClick={imprimirCierre} className="btn-mint flex-1">
            <Printer size={18} /> Imprimir resumen
          </button>
        </>}>
        <div className="space-y-4">
          <p className="text-center text-[13px] text-clinic-400">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          {/* Ingresos */}
          <div className="bg-mint-50 rounded-xl p-4 space-y-1.5">
            <p className="text-[12px] font-semibold text-clinic-500 uppercase tracking-wide mb-2">Ingresos del día</p>
            {Object.keys(resumenHoy.porMetodo).length > 0
              ? Object.entries(resumenHoy.porMetodo).map(([m, v]) => (
                  <div key={m} className="flex justify-between text-[14px] text-clinic-700">
                    <span>{m}</span>
                    <span className="font-semibold">{soles(v)}</span>
                  </div>
                ))
              : <p className="text-[13px] text-clinic-400">Sin ingresos hoy</p>
            }
            <div className="border-t border-mint-200 pt-1.5 flex justify-between font-bold text-mint-700">
              <span>Total</span><span>{soles(resumenHoy.totalIngresos)}</span>
            </div>
          </div>

          {/* Egresos */}
          <div className="bg-rose-50 rounded-xl p-4 space-y-1.5">
            <p className="text-[12px] font-semibold text-rose-500 uppercase tracking-wide mb-2">Egresos del día</p>
            {resumenHoy.egrHoy.length > 0
              ? resumenHoy.egrHoy.map(e => (
                  <div key={e.id} className="flex justify-between text-[14px] text-clinic-700">
                    <span className="truncate flex-1 pr-2">{e.concepto}</span>
                    <span className="font-semibold text-rose-600 shrink-0">-{soles(e.monto)}</span>
                  </div>
                ))
              : <p className="text-[13px] text-clinic-400">Sin egresos hoy</p>
            }
            <div className="border-t border-rose-200 pt-1.5 flex justify-between font-bold text-rose-600">
              <span>Total</span><span>-{soles(resumenHoy.totalEgresos)}</span>
            </div>
          </div>

          {/* Balance */}
          <div className={`rounded-xl p-4 flex justify-between items-center font-bold text-lg ${
            resumenHoy.balance >= 0 ? 'bg-mint-100 text-mint-800' : 'bg-rose-100 text-rose-700'}`}>
            <span>Balance neto</span>
            <span>{soles(resumenHoy.balance)}</span>
          </div>
        </div>
      </Modal>

    </div>
  )
}
