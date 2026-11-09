// Modal para exportar reportes a CSV (se abre en Excel). Solo lectura.
import { useState } from 'react'
import { addDays, format, parseISO, startOfMonth } from 'date-fns'
import { FileDown, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { supabase, mensajeError } from '../lib/supabase'
import { hoyISO, fechaLocalISO } from '../utils/format'
import { generarCSV, descargarCSV, traerTodo } from '../utils/csv'

const horaLocal = (ts) => (ts ? format(new Date(ts), 'HH:mm') : '')
const nombrePac = (p) => (p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '')

// Inicio de un día local como timestamp ISO (para columnas timestamptz)
const inicioDiaISO = (fecha) => parseISO(fecha).toISOString()
const finDiaExclusivoISO = (fecha) => addDays(parseISO(fecha), 1).toISOString()

const REPORTES = {
  ingresos: {
    titulo: 'Ingresos',
    usaRango: true,
    consulta: (d, h) => () => supabase.from('ingresos_caja')
      .select('fecha_pago, concepto, metodo_pago, monto, pacientes(nombres, apellidos)')
      .gte('fecha_pago', inicioDiaISO(d)).lt('fecha_pago', finDiaExclusivoISO(h))
      .order('fecha_pago'),
    columnas: [
      { titulo: 'Fecha',    valor: r => fechaLocalISO(r.fecha_pago) },
      { titulo: 'Hora',     valor: r => horaLocal(r.fecha_pago) },
      { titulo: 'Paciente', valor: r => nombrePac(r.pacientes) },
      { titulo: 'Concepto', valor: r => r.concepto },
      { titulo: 'Método',   valor: r => r.metodo_pago },
      { titulo: 'Monto',    valor: r => Number(r.monto) }
    ]
  },
  egresos: {
    titulo: 'Egresos',
    usaRango: true,
    consulta: (d, h) => () => supabase.from('egresos_caja')
      .select('fecha_egreso, concepto, categoria, monto')
      .gte('fecha_egreso', inicioDiaISO(d)).lt('fecha_egreso', finDiaExclusivoISO(h))
      .order('fecha_egreso'),
    columnas: [
      { titulo: 'Fecha',     valor: r => fechaLocalISO(r.fecha_egreso) },
      { titulo: 'Hora',      valor: r => horaLocal(r.fecha_egreso) },
      { titulo: 'Concepto',  valor: r => r.concepto },
      { titulo: 'Categoría', valor: r => r.categoria },
      { titulo: 'Monto',     valor: r => Number(r.monto) }
    ]
  },
  citas: {
    titulo: 'Citas',
    usaRango: true,
    consulta: (d, h) => () => supabase.from('citas')
      .select('fecha, hora, estado, notas, pacientes(nombres, apellidos, celular), servicios_precios(nombre_servicio)')
      .gte('fecha', d).lte('fecha', h)
      .order('fecha').order('hora'),
    columnas: [
      { titulo: 'Fecha',    valor: r => r.fecha },
      { titulo: 'Hora',     valor: r => (r.hora || '').slice(0, 5) },
      { titulo: 'Paciente', valor: r => nombrePac(r.pacientes) },
      { titulo: 'Celular',  valor: r => r.pacientes?.celular },
      { titulo: 'Servicio', valor: r => r.servicios_precios?.nombre_servicio || 'Atención' },
      { titulo: 'Estado',   valor: r => r.estado },
      { titulo: 'Notas',    valor: r => r.notas }
    ]
  },
  pacientes: {
    titulo: 'Pacientes',
    usaRango: false,
    consulta: () => () => supabase.from('pacientes').select('*').order('apellidos'),
    columnas: [
      { titulo: 'Apellidos',        valor: r => r.apellidos },
      { titulo: 'Nombres',          valor: r => r.nombres },
      { titulo: 'DNI',              valor: r => r.dni },
      { titulo: 'Celular',          valor: r => r.celular },
      { titulo: 'Teléfono',         valor: r => r.telefono },
      { titulo: 'Fecha nacimiento', valor: r => r.fecha_nacimiento },
      { titulo: 'Registrado',       valor: r => fechaLocalISO(r.creado_en) }
    ]
  }
}

export default function ExportarReporte({ abierto, onClose }) {
  const [tipo, setTipo]   = useState('ingresos')
  const [desde, setDesde] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(() => hoyISO())
  const [exportando, setExportando] = useState(false)

  const rep = REPORTES[tipo]

  const exportar = async () => {
    if (rep.usaRango) {
      if (!desde || !hasta) { alert('Selecciona el rango de fechas.'); return }
      if (desde > hasta)    { alert('La fecha "Desde" no puede ser mayor que "Hasta".'); return }
    }
    setExportando(true)
    try {
      const filas = await traerTodo(rep.consulta(desde, hasta))
      if (filas.length === 0) {
        alert('No hay registros para exportar en ese rango.')
        return
      }
      const sufijo = rep.usaRango ? `_${desde}_a_${hasta}` : `_${hoyISO()}`
      descargarCSV(`MovimientoKoray_${rep.titulo}${sufijo}.csv`, generarCSV(rep.columnas, filas))
      onClose()
    } catch (e) {
      alert(mensajeError(e, 'exportar el reporte'))
    } finally {
      setExportando(false)
    }
  }

  return (
    <Modal abierto={abierto} onClose={() => { if (!exportando) onClose() }} titulo="Exportar reporte"
      footer={<>
        <button onClick={onClose} disabled={exportando} className="btn-ghost flex-1">Cancelar</button>
        <button onClick={exportar} disabled={exportando} className="btn-mint flex-1">
          {exportando
            ? <><Loader2 size={16} className="animate-spin" /> Exportando...</>
            : <><FileDown size={18} /> Descargar</>}
        </button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="label">Reporte</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(REPORTES).map(([k, r]) => (
              <button key={k} onClick={() => setTipo(k)}
                className={`min-h-[44px] rounded-xl2 text-[13px] font-semibold transition ${
                  tipo === k ? 'bg-clinic-500 text-white' : 'bg-clinic-50 text-clinic-500'}`}>
                {r.titulo}
              </button>
            ))}
          </div>
        </div>
        {rep.usaRango ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde</label>
              <input type="date" className="field" value={desde} max={hasta || undefined}
                onChange={e => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="field" value={hasta} min={desde || undefined}
                onChange={e => setHasta(e.target.value)} />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-clinic-400">Se exporta la lista completa de pacientes registrados.</p>
        )}
        <div className="bg-clinic-50 rounded-xl px-3.5 py-3 text-[12px] text-clinic-500">
          Se descargará un archivo .csv que puedes abrir con Excel o Google Sheets.
        </div>
      </div>
    </Modal>
  )
}
