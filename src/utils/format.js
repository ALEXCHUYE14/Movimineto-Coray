import { format, parseISO, isValid } from 'date-fns'
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
  if (!isValid(d)) return null
  const diff = Date.now() - d.getTime()
  return Math.abs(new Date(diff).getUTCFullYear() - 1970)
}

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
