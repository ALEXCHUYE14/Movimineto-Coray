import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabaseConfigurado } from '../lib/supabase'
import Logo from '../components/Logo'
import { Mail, Lock, Eye, EyeOff, AlertCircle, HeartPulse } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const onSubmit = async () => {
    setError('')
    if (!email || !pass) { setError('Ingresa tu correo y contrasena.'); return }
    setCargando(true)
    const { error } = await login(email.trim(), pass)
    setCargando(false)
    if (error) setError('Credenciales incorrectas. Verifica tus datos.')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel izquierdo decorativo (escritorio) */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-clinic-600 via-clinic-500 to-mint-600 text-white p-12 flex-col justify-between">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-16 bottom-10 w-72 h-72 rounded-full bg-mint-300/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <Logo size={52} className="ring-2 ring-white/30" />
          <div className="leading-tight">
            <p className="font-display text-xl font-extrabold">Movimiento Koray</p>
            <p className="text-white/70 text-sm">Centro de Terapia Fisica</p>
          </div>
        </div>
        <div className="relative max-w-sm">
          <HeartPulse size={36} className="text-mint-200 mb-4" />
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            Gestiona tu consultorio desde la palma de tu mano.
          </h2>
          <p className="text-white/75 mt-4 leading-relaxed">
            Agenda, pacientes, paquetes e ingresos en un solo lugar, disenado para moverse contigo.
          </p>
        </div>
        <p className="relative text-white/50 text-sm">Diego Miguel Espinoza Guerrero · Fisioterapeuta</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <Logo size={68} />
            <div className="text-center">
              <p className="font-display text-xl font-extrabold text-clinic-800">Movimiento Koray</p>
              <p className="text-clinic-400 text-sm">Centro de Terapia Fisica</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-extrabold text-clinic-800">Bienvenido, Diego</h1>
          <p className="text-clinic-400 mt-1 mb-7">Inicia sesion para administrar tu consultorio.</p>

          {!supabaseConfigurado && (
            <div className="mb-5 flex gap-2.5 items-start text-[13px] bg-amber-50 text-amber-700 rounded-xl2 p-3.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>Configura tus credenciales de Supabase en el archivo <b>.env</b> para habilitar el acceso.</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">Correo electronico</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clinic-300" />
                <input type="email" autoComplete="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSubmit()}
                  placeholder="correo@ejemplo.com" className="field pl-11" />
              </div>
            </div>

            <div>
              <label className="label">Contrasena</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clinic-300" />
                <input type={verPass ? 'text' : 'password'} autoComplete="current-password" value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSubmit()}
                  placeholder="········" className="field pl-11 pr-11" />
                <button type="button" onClick={() => setVerPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full text-clinic-300 hover:text-clinic-500"
                  aria-label="Mostrar contrasena">
                  {verPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex gap-2 items-center text-[13px] text-rose-600 bg-rose-50 rounded-xl2 px-3.5 py-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button onClick={onSubmit} disabled={cargando} className="btn-primary w-full">
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>

          <p className="text-center text-[12px] text-clinic-300 mt-8">
            Acceso exclusivo del personal autorizado.
          </p>
        </div>
      </div>
    </div>
  )
}
