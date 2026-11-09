// Generación y descarga de archivos CSV compatibles con Excel.

// Escapa un valor para CSV. Los textos que empiezan con = + - @ se prefijan con '
// para que Excel no los interprete como fórmulas.
const celda = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function generarCSV(columnas, filas) {
  const encabezado = columnas.map(c => celda(c.titulo)).join(',')
  const cuerpo = filas.map(f => columnas.map(c => celda(c.valor(f))).join(','))
  return [encabezado, ...cuerpo].join('\r\n')
}

export function descargarCSV(nombreArchivo, contenido) {
  // BOM para que Excel reconozca tildes y ñ
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Supabase devuelve como máximo 1000 filas por consulta: se pide por páginas.
export async function traerTodo(construirConsulta, tamPagina = 1000) {
  const filas = []
  for (let desde = 0; ; desde += tamPagina) {
    const { data, error } = await construirConsulta().range(desde, desde + tamPagina - 1)
    if (error) throw error
    filas.push(...(data || []))
    if (!data || data.length < tamPagina) break
  }
  return filas
}
