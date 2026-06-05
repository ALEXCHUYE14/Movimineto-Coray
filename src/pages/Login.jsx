import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabaseConfigurado } from '../lib/supabase'
import Logo from '../components/Logo'
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, HeartPulse,
  CalendarDays, Users, CreditCard, ShieldCheck, Loader2
} from 'lucide-react'

const FEATURES = [
  { icon: CalendarDays, texto: 'Agenda con vista diaria y semanal' },
  { icon: Users,        texto: 'Historial clínico completo por paciente' },
  { icon: CreditCard,   texto: 'Control de caja y métodos de pago' },
]

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [verPass, setVerPass] = useState(false)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(false)

  const onSubmit = async () => {
    setError('')
    if (!email || !pass) { setError('Ingresa tu correo y contraseña.'); return }
    setCargando(true)
    const { error } = await login(email.trim(), pass)
    setCargando(false)
    if (error) setError('Credenciales incorrectas. Verifica tus datos.')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_460px]">

      {/* ── Panel izquierdo decorativo (solo escritorio) ── */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-clinic-800 via-clinic-700 to-clinic-500 text-white flex-col">

        {/* Orbes de color de fondo */}
        <div className="absolute -right-40 -top-40 w-[560px] h-[560px] rounded-full bg-mint-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-28 bottom-0 w-[420px] h-[420px] rounded-full bg-clinic-400/25 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 top-1/2 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        {/* Patrón de puntos sutil */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        <div className="relative flex flex-col h-full px-14 py-12">

          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center">
              <Logo size={46} />
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-extrabold tracking-tight">Movimiento Koray</p>
              <p className="text-white/55 text-[13px]">Centro de Terapia Física</p>
            </div>
          </div>

          {/* Cuerpo hero */}
          <div className="flex-1 flex flex-col justify-center max-w-[400px]">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 w-fit mb-6">
              <HeartPulse size={13} className="text-mint-300" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide uppercase">
                Sistema de Gestión Clínica
              </span>
            </div>

            <h2 className="font-display text-[2.4rem] font-extrabold leading-[1.15] mb-4">
              Gestiona tu consultorio con total eficiencia
            </h2>
            <p className="text-white/60 text-[15px] leading-relaxed">
              Agenda, pacientes, paquetes e ingresos — todo en un solo lugar, diseñado para moverse contigo.
            </p>

            {/* Lista de funcionalidades */}
            <div className="mt-10 space-y-3">
              {FEATURES.map(({ icon: Icon, texto }) => (
                <div key={texto} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-mint-300" />
                  </div>
                  <span className="text-white/70 text-[14px]">{texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie — autor */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center font-display font-bold text-sm shrink-0">
              DM
            </div>
            <div>
              <p className="font-semibold text-[13px]">Diego Miguel Espinoza Guerrero</p>
              <p className="text-white/45 text-[12px]">Fisioterapeuta · Especialista en Rehabilitación</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex items-center justify-center min-h-screen p-6 bg-slatebg-50 relative">

        {/* Barra de acento superior */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-clinic-500 via-clinic-400 to-mint-500" />

        <div className="w-full max-w-[360px] animate-fade-up">

          {/* Logo móvil */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <Logo size={70} />
            <div className="text-center">
              <p className="font-display text-xl font-extrabold text-clinic-800">Movimiento Koray</p>
              <p className="text-clinic-400 text-sm">Centro de Terapia Física</p>
            </div>
          </div>

          {/* Encabezado */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 bg-mint-50 text-mint-700 rounded-full px-3 py-1 text-[11px] font-semibold mb-3 border border-mint-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />
              Sistema activo
            </div>
            <h1 className="font-display text-[1.85rem] font-extrabold text-clinic-900 leading-tight">
              Bienvenido, Diego
            </h1>
            <p className="text-clinic-400 mt-1.5 text-[14px]">
              Inicia sesión para administrar tu consultorio.
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="bg-white rounded-2xl shadow-card border border-clinic-100/70 p-6 space-y-4">

            {!supabaseConfigurado && (
              <div className="flex gap-2.5 items-start text-[13px] bg-amber-50 text-amber-700 rounded-xl p-3 border border-amber-200/60">
                <AlertCircle size={17} className="shrink-0 mt-0.5" />
                <span>Configura las credenciales de Supabase en el archivo <b>.env</b>.</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clinic-300 pointer-events-none" />
                <input
                  type="email" autoComplete="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSubmit()}
                  placeholder="correo@ejemplo.com"
                  className="field pl-11"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clinic-300 pointer-events-none" />
                <input
                  type={verPass ? 'text' : 'password'} autoComplete="current-password" value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSubmit()}
                  placeholder="········"
                  className="field pl-11 pr-11"
                />
                <button
                  type="button" onClick={() => setVerPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full text-clinic-300 hover:text-clinic-500 transition-colors"
                  aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {verPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-2 items-center text-[13px] text-rose-600 bg-rose-50 rounded-xl px-3.5 py-3 border border-rose-200/60">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}

            {/* Botón */}
            <button onClick={onSubmit} disabled={cargando} className="btn-primary w-full gap-2.5 text-[15px]">
              {cargando
                ? <><Loader2 size={17} className="animate-spin" /> Ingresando...</>
                : 'Ingresar al sistema'}
            </button>
          </div>

          {/* Pie de seguridad */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-clinic-300">
            <ShieldCheck size={13} />
            <span>Acceso exclusivo del personal autorizado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
