// Escala Visual Analógica (EVA) del dolor: 0 = sin dolor, 10 = dolor máximo.
import { fechaCorta } from '../utils/format'

export const evaValida = (v) => Number.isInteger(v) && v >= 0 && v <= 10

export function etiquetaEva(v) {
  if (!evaValida(v)) return ''
  if (v === 0) return 'Sin dolor'
  if (v <= 3)  return 'Leve'
  if (v <= 6)  return 'Moderado'
  if (v <= 9)  return 'Intenso'
  return 'Máximo'
}

// Verde -> ámbar -> rojo
export function colorEva(v) {
  if (!evaValida(v)) return '#94a3b8'
  if (v <= 3) return '#16a34a'
  if (v <= 6) return '#d97706'
  return '#dc2626'
}

// Selector 0-10 para formularios. value: número o null.
export function SelectorEva({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => {
          const activo = value === n
          return (
            <button key={n} type="button"
              onClick={() => onChange(activo ? null : n)}
              aria-pressed={activo}
              aria-label={`Dolor ${n} de 10`}
              className={`h-10 rounded-lg text-[13px] font-bold transition ${activo ? 'text-white shadow-soft' : 'bg-clinic-50 text-clinic-500 hover:bg-clinic-100'}`}
              style={activo ? { background: colorEva(n) } : undefined}>
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-[11px] text-clinic-400 mt-1.5">
        <span>Sin dolor</span>
        <span className="font-semibold" style={{ color: colorEva(value) }}>
          {evaValida(value) ? `${value}/10 · ${etiquetaEva(value)}` : 'Opcional · toca para registrar'}
        </span>
        <span>Máximo</span>
      </div>
    </div>
  )
}

export function ChipEva({ valor }) {
  if (!evaValida(valor)) return null
  return (
    <span className="chip font-bold text-white" style={{ background: colorEva(valor) }}
      title={`Escala EVA: ${etiquetaEva(valor)}`}>
      Dolor {valor}/10
    </span>
  )
}

// Gráfico de evolución del dolor. historiales: cualquier orden; usa los que tengan EVA.
export function GraficoEva({ historiales }) {
  const puntos = (historiales || [])
    .filter(h => evaValida(h.eva_dolor) && h.fecha_atencion)
    .sort((a, b) => (a.fecha_atencion < b.fecha_atencion ? -1 : a.fecha_atencion > b.fecha_atencion ? 1
      : String(a.creado_en || '').localeCompare(String(b.creado_en || ''))))
  if (puntos.length < 2) return null

  const W = 600, H = 170, PX = 30, PT = 14, PB = 26
  const ancho = W - PX * 2, alto = H - PT - PB
  const x = (i) => PX + (puntos.length === 1 ? ancho / 2 : (i / (puntos.length - 1)) * ancho)
  const y = (v) => PT + (1 - v / 10) * alto
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.eva_dolor).toFixed(1)}`).join(' ')

  const primero = puntos[0].eva_dolor
  const ultimo  = puntos[puntos.length - 1].eva_dolor
  const cambio  = primero - ultimo
  const pct     = primero > 0 ? Math.round((cambio / primero) * 100) : null
  const resumen = cambio > 0
    ? `El dolor bajó de ${primero} a ${ultimo}${pct !== null ? ` (−${pct}%)` : ''}`
    : cambio < 0
      ? `El dolor subió de ${primero} a ${ultimo}`
      : `El dolor se mantiene en ${ultimo}/10`

  const etiquetasX = puntos.length <= 6
    ? puntos.map((_, i) => i)
    : [0, Math.floor((puntos.length - 1) / 2), puntos.length - 1]

  return (
    <section className="card p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-clinic-400">Evolución del dolor (EVA)</p>
          <p className={`text-sm font-semibold mt-0.5 ${cambio > 0 ? 'text-mint-600' : cambio < 0 ? 'text-rose-500' : 'text-clinic-600'}`}>
            {resumen}
          </p>
        </div>
        <span className="text-[12px] text-clinic-400">{puntos.length} registros</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Gráfico de evolución del dolor. ${resumen}.`}>
        {[0, 5, 10].map(v => (
          <g key={v}>
            <line x1={PX} x2={W - PX} y1={y(v)} y2={y(v)} stroke="#e2edf5" strokeDasharray={v === 0 ? '' : '4 4'} />
            <text x={PX - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#79b6d9">{v}</text>
          </g>
        ))}
        <path d={linea} fill="none" stroke="#2b78ab" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((p, i) => (
          <circle key={p.id || i} cx={x(i)} cy={y(p.eva_dolor)} r="5" fill={colorEva(p.eva_dolor)} stroke="#fff" strokeWidth="2">
            <title>{`${fechaCorta(p.fecha_atencion)}: ${p.eva_dolor}/10`}</title>
          </circle>
        ))}
        {etiquetasX.map(i => (
          <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="#4593c2"
            textAnchor={i === 0 ? 'start' : i === puntos.length - 1 ? 'end' : 'middle'}>
            {fechaCorta(puntos[i].fecha_atencion).split(' ').slice(1, 3).join(' ')}
          </text>
        ))}
      </svg>
    </section>
  )
}
