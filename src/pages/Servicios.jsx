import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Vacio, SeccionTitulo } from '../components/ui'
import { soles, linkWhatsApp } from '../utils/format'
import { Tags, MessageCircle, PackageCheck, Activity } from 'lucide-react'

export default function Servicios() {
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.from('servicios_precios').select('*').eq('activo', true)
      .order('categoria').order('precio')
      .then(({ data }) => { setServicios(data || []); setCargando(false) })
  }, [])

  const categorias = [...new Set(servicios.map(s => s.categoria))]
  const wsp = linkWhatsApp('Hola, deseo agendar una cita en Movimiento Koray.')

  return (
    <div className="space-y-5">
      <a href={wsp} target="_blank" rel="noreferrer"
        className="card p-4 flex items-center gap-3 bg-gradient-to-br from-mint-500 to-mint-600 text-white border-0 hover:shadow-float transition-shadow">
        <div className="grid place-items-center w-11 h-11 rounded-xl2 bg-white/20"><MessageCircle size={22} /></div>
        <div className="flex-1">
          <p className="font-display font-bold">Agendamiento rapido</p>
          <p className="text-white/80 text-[13px]">Escribir al consultorio · 996 113 188</p>
        </div>
      </a>

      {cargando ? (
        <div className="card p-8 text-center text-clinic-300">Cargando catalogo...</div>
      ) : servicios.length === 0 ? (
        <Vacio icon={Tags} titulo="Catalogo vacio" descripcion="No hay servicios registrados." />
      ) : categorias.map(cat => (
        <section key={cat}>
          <SeccionTitulo>{cat}</SeccionTitulo>
          <div className="space-y-2.5">
            {servicios.filter(s => s.categoria === cat).map(s => (
              <div key={s.id} className="card p-4 flex items-center gap-3 animate-fade-up">
                <div className={`grid place-items-center w-11 h-11 rounded-xl2 shrink-0 ${s.es_paquete ? 'bg-mint-50 text-mint-600' : 'bg-clinic-50 text-clinic-500'}`}>
                  {s.es_paquete ? <PackageCheck size={20} /> : <Activity size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-clinic-800">{s.nombre_servicio}</p>
                  {s.es_paquete && s.sesiones && <p className="text-[12px] text-mint-600 font-semibold">{s.sesiones} sesiones</p>}
                </div>
                <p className="font-display text-lg font-bold text-clinic-700 shrink-0">{soles(s.precio)}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
