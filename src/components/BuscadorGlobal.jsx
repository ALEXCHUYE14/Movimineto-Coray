// Buscador de pacientes en la cabecera: por nombre, DNI o celular.
// Atajo: Ctrl+K (o Cmd+K). Solo lectura: no modifica datos.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Avatar } from './ui'
import { iniciales } from '../utils/format'

const MAX_RESULTADOS = 8

const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const soloDigitos = (s) => (s || '').replace(/\D/g, '')

export default function BuscadorGlobal() {
  const [abierto, setAbierto]     = useState(false)
  const [texto, setTexto]         = useState('')
  const [pacientes, setPacientes] = useState(null)   // null = aún no cargados
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState(false)
  const [activo, setActivo]       = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Atajo de teclado
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 0)
  }, [abierto])

  const abrir = () => {
    setAbierto(true)
    setTexto('')
    setActivo(0)
    cargarPacientes()
  }
  const cerrar = () => { setAbierto(false); setTexto('') }

  // Se recarga en cada apertura para incluir pacientes recién registrados
  const cargarPacientes = async () => {
    setCargando(true)
    setError(false)
    const { data, error: err } = await supabase.from('pacientes').select('*').order('apellidos')
    if (err) setError(true)
    else setPacientes(data || [])
    setCargando(false)
  }

  const q = texto.trim()
  const qDig = soloDigitos(q)
  const esNumero = q.length > 0 && qDig.length === q.replace(/\s/g, '').length
  const resultados = !q || !pacientes ? [] : pacientes.filter(p => {
    if (esNumero) {
      return [p.dni, p.celular, p.telefono].some(v => soloDigitos(v).includes(qDig))
    }
    const nombre = normalizar(`${p.nombres} ${p.apellidos}`)
    return normalizar(q).split(/\s+/).every(parte => nombre.includes(parte))
  }).slice(0, MAX_RESULTADOS)

  const ir = (p) => {
    cerrar()
    navigate(`/pacientes/${p.id}`)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') cerrar()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && resultados[activo]) ir(resultados[activo])
  }

  return (
    <>
      {/* Botón disparador */}
      <button onClick={abrir} aria-label="Buscar paciente"
        className="grid place-items-center w-11 h-11 rounded-xl2 hover:bg-clinic-50 text-clinic-500 sm:w-auto sm:h-10 sm:px-3 sm:flex sm:items-center sm:gap-2 sm:bg-clinic-50/70 sm:text-clinic-400 sm:text-sm">
        <Search size={18} />
        <span className="hidden sm:inline">Buscar paciente</span>
        <kbd className="hidden md:inline text-[10px] font-semibold bg-white border border-clinic-100 rounded px-1.5 py-0.5 text-clinic-400">Ctrl K</kbd>
      </button>

      {/* Panel de búsqueda */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
          <div className="absolute inset-0 bg-clinic-900/40 backdrop-blur-sm" onClick={cerrar} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-card overflow-hidden animate-fade-up">
            <div className="flex items-center gap-2 px-4 border-b border-clinic-100">
              <Search size={18} className="text-clinic-300 shrink-0" />
              <input ref={inputRef} value={texto}
                onChange={e => { setTexto(e.target.value); setActivo(0) }}
                onKeyDown={onKeyDown}
                placeholder="Nombre, DNI o celular..."
                className="flex-1 h-14 outline-none text-clinic-800 placeholder:text-clinic-300 bg-transparent min-w-0" />
              {cargando && <Loader2 size={16} className="animate-spin text-clinic-300 shrink-0" />}
              <button onClick={cerrar} aria-label="Cerrar búsqueda"
                className="grid place-items-center w-9 h-9 rounded-full hover:bg-clinic-50 text-clinic-400 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {error ? (
                <p className="p-5 text-sm text-rose-600 text-center">No se pudo cargar la lista de pacientes.</p>
              ) : !q ? (
                <p className="p-5 text-sm text-clinic-400 text-center">Escribe para buscar entre tus pacientes.</p>
              ) : resultados.length === 0 && !cargando ? (
                <p className="p-5 text-sm text-clinic-400 text-center">Sin resultados para “{q}”.</p>
              ) : (
                resultados.map((p, i) => (
                  <button key={p.id} onClick={() => ir(p)} onMouseEnter={() => setActivo(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${i === activo ? 'bg-clinic-50' : ''}`}>
                    <Avatar texto={iniciales(p.nombres, p.apellidos)} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-clinic-800 truncate">{p.nombres} {p.apellidos}</p>
                      <p className="text-[12px] text-clinic-400 truncate">
                        {[p.dni && `DNI ${p.dni}`, p.celular && `Cel. ${p.celular}`].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
