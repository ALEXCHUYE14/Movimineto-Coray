import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Aviso claro en consola si faltan las credenciales del archivo .env
  console.warn(
    '[Movimiento Koray] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y coloca tus credenciales de Supabase.'
  )
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export const supabaseConfigurado = Boolean(url && anonKey)

// Traduce un error de Supabase / red a un mensaje claro para el usuario.
// `accion` describe lo que se intentaba hacer, p. ej. "guardar la receta".
export function mensajeError(error, accion = 'completar la operación') {
  console.error(`[Movimiento Koray] Error al ${accion}:`, error)
  const code = error?.code || ''
  const msg  = String(error?.message || error || '')

  if (code === 'PGRST205' || code === '42P01' || /could not find the table|does not exist/i.test(msg)) {
    return `No se pudo ${accion}: falta una tabla en la base de datos. ` +
      'Ejecuta las migraciones pendientes de la carpeta "supabase" en el SQL Editor de Supabase.'
  }
  if (code === 'PGRST204' || /column .* (does not exist|of .* in the schema cache)/i.test(msg)) {
    return `No se pudo ${accion}: la base de datos no tiene una columna requerida. Ejecuta las migraciones pendientes.`
  }
  if (code === 'PGRST301' || code === '42501' || /jwt|row-level security|not authorized/i.test(msg)) {
    return `No se pudo ${accion}: tu sesión expiró o no tiene permisos. Cierra sesión y vuelve a ingresar.`
  }
  if (code === '23514' || code === '23502' || code === '22P02' || code === '22007') {
    return `No se pudo ${accion}: hay datos inválidos o incompletos. Revisa el formulario.`
  }
  if (code === '23503') {
    return `No se pudo ${accion}: el registro relacionado ya no existe. Recarga la página.`
  }
  if (/failed to fetch|network|load failed|timeout/i.test(msg)) {
    return `No se pudo ${accion}: sin conexión con el servidor. Verifica tu internet e intenta nuevamente.`
  }
  return `No se pudo ${accion}. Intenta nuevamente.${msg ? `\n\nDetalle: ${msg}` : ''}`
}
