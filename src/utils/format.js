import { format, parseISO, isValid, differenceInYears, startOfMonth, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

// Moneda peruana
export const soles = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
    .format(Number(n || 0))

// Fecha legible: "lun 09 jun 2025"
export const fechaCorta = (valor) => {
  if (!valor) return ''
  const d = typeof valor === 'string' ? parseISO(valor) : valor
  return isValid(d) ? format(d, "EEE dd MMM yyyy", { locale: es }) : ''
}

// Fecha larga para encabezados: "lunes, 09 de junio"
export const fechaLarga = (valor) => {
  const d = typeof valor === 'string' ? parseISO(valor) : valor
  return isValid(d) ? format(d, "EEEE, dd 'de' MMMM", { locale: es }) : ''
}

// Hora "HH:mm" -> "08:30 a.m."
export const hora12 = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

export const hoyISO = () => format(new Date(), 'yyyy-MM-dd')

export const edad = (fechaNac) => {
  if (!fechaNac) return null
  const d = typeof fechaNac === 'string' ? parseISO(fechaNac) : fechaNac
  if (!isValid(d) || d > new Date()) return null
  return differenceInYears(new Date(), d)
}

// Fecha local (yyyy-MM-dd) de un timestamp guardado en UTC.
// Evita que un pago de las 8 p.m. en Perú (UTC-5) cuente como del día siguiente.
export const fechaLocalISO = (ts) => {
  if (!ts) return ''
  const d = typeof ts === 'string' ? parseISO(ts) : ts
  return isValid(d) ? format(d, 'yyyy-MM-dd') : ''
}

// Inicio del mes en curso en hora local, como timestamp ISO para filtrar columnas timestamptz.
export const inicioMesISO = () => startOfMonth(new Date()).toISOString()

export const iniciales = (nombres = '', apellidos = '') =>
  `${(nombres[0] || '').toUpperCase()}${(apellidos[0] || '').toUpperCase()}` || '??'

// Link para que el PACIENTE contacte al consultorio de Diego
export const WHATSAPP_CONSULTORIO = '51996113188'
export const linkWhatsApp = (mensaje = '') =>
  `https://wa.me/${WHATSAPP_CONSULTORIO}?text=${encodeURIComponent(mensaje)}`

// Link para que DIEGO contacte al PACIENTE (usa el celular del paciente)
export const linkWhatsAppPaciente = (celular, mensaje = '') => {
  const num  = (celular || '').replace(/\D/g, '')
  const full = num.startsWith('51') ? num : `51${num}`
  return `https://wa.me/${full}?text=${encodeURIComponent(mensaje)}`
}

// Fecha relativa para mensajes: "hoy", "mañana" o "el lunes, 09 de noviembre"
export const fechaRelativa = (fechaISO) => {
  if (!fechaISO) return ''
  const hoy = hoyISO()
  const manana = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (fechaISO === hoy) return 'hoy'
  if (fechaISO === manana) return 'mañana'
  const f = fechaLarga(fechaISO)
  return f ? `el ${f}` : fechaISO
}

// Link de WhatsApp con el recordatorio de una cita (null si el paciente no tiene celular)
export const linkRecordatorioCita = (cita) => {
  const pac = cita?.pacientes
  if (!pac?.celular) return null
  return linkWhatsAppPaciente(
    pac.celular,
    `Hola ${pac.nombres}, te recordamos tu cita en Movimiento Koray ${fechaRelativa(cita.fecha)} a las ${hora12(cita.hora)}. ¡Te esperamos!`
  )
}
