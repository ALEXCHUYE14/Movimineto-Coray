// Utilidades de impresión / generación de PDF
// Usan window.open + window.print() — sin dependencias externas.

const LOGO_SRC = '/img/logo.jpeg'

function abrirVentana(html) {
  const win = window.open('', '_blank', 'width=720,height=960,scrollbars=yes')
  if (!win) {
    alert('Permite las ventanas emergentes en tu navegador para imprimir.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 650)
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET DE PAGO  (optimizado para impresora térmica 80 mm)
// ─────────────────────────────────────────────────────────────────────────────
export function imprimirTicket(ingreso) {
  const logoUrl  = `${window.location.origin}${LOGO_SRC}`
  const fecha    = new Date(ingreso.fecha_pago)
  const fechaStr = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const numRec   = (ingreso.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()
  const pacNombre = ingreso.pacientes
    ? `${ingreso.pacientes.nombres} ${ingreso.pacientes.apellidos}`
    : null

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ticket #${numRec}</title>
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #000;
    background: #fff;
    width: 74mm;
  }
  .center  { text-align: center; }
  .bold    { font-weight: bold; }
  .large   { font-size: 15px; }
  .small   { font-size: 11px; }
  hr       { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .hr-sol  { border: none; border-top: 2px solid #000; margin: 6px 0; }
  .row     { display: flex; justify-content: space-between; margin: 2px 0; }
  .logo    { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; }
  .monto   { font-size: 26px; font-weight: bold; text-align: center; margin: 6px 0 2px; }
  .check   { font-size: 28px; text-align: center; }
  /* Botón solo en pantalla */
  .no-print {
    text-align: center; padding: 10px;
    background: #f0f4f8; margin-bottom: 12px; border-radius: 6px;
  }
  .btn { padding: 9px 22px; font-size: 14px; cursor: pointer;
    background: #2b78ab; color: white; border: none;
    border-radius: 6px; font-weight: bold; font-family: inherit; }
</style>
</head>
<body>

  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️&nbsp; Imprimir ticket</button>
  </div>

  <div class="center">
    <img class="logo" src="${logoUrl}" onerror="this.style.display='none'" />
    <div class="bold large" style="margin-top:5px">MOVIMIENTO KORAY</div>
    <div class="small">Centro de Terapia Física</div>
    <div class="small">Cel: 996 113 188</div>
  </div>

  <div class="hr-sol" style="margin-top:8px"></div>
  <div class="center bold" style="font-size:14px;letter-spacing:1px">COMPROBANTE DE PAGO</div>
  <div class="center small" style="color:#555">Recibo N° ${numRec}</div>
  <hr />

  <div class="row"><span>Fecha:</span><span>${fechaStr}</span></div>
  <div class="row"><span>Hora:</span><span>${horaStr}</span></div>
  ${pacNombre ? `<div class="row"><span>Paciente:</span><span style="max-width:40mm;text-align:right;word-break:break-word">${pacNombre}</span></div>` : ''}

  <hr />
  <div class="row">
    <span class="bold">Concepto:</span>
    <span style="max-width:40mm;text-align:right;font-weight:bold">${ingreso.concepto || 'Atención'}</span>
  </div>
  <div class="row"><span>Método de pago:</span><span>${ingreso.metodo_pago}</span></div>

  <div class="hr-sol"></div>

  <div class="check">✅</div>
  <div class="monto">S/ ${Number(ingreso.monto).toFixed(2)}</div>
  <div class="center bold small" style="letter-spacing:2px">PAGO RECIBIDO</div>

  <div class="hr-sol"></div>

  <div class="center small" style="margin-top:5px">¡Gracias por su visita!</div>
  <div class="center small">Movimiento Koray</div>
  <div class="center small" style="margin-bottom:4px">Recupera tu bienestar 💪</div>

</body>
</html>`

  abrirVentana(html)
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNÓSTICO / REPORTE CLÍNICO  (formato A4 profesional)
// ─────────────────────────────────────────────────────────────────────────────
export function imprimirDiagnostico(paciente, historiales, edadAnos) {
  const logoUrl  = `${window.location.origin}${LOGO_SRC}`
  const hoy      = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

  const fmtFecha = (iso) => {
    if (!iso) return ''
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  const campo = (etq, val) => val
    ? `<div class="campo">
         <div class="campo-label">${etq}</div>
         <div class="campo-val">${val.replace(/\n/g, '<br>')}</div>
       </div>`
    : ''

  const histHTML = historiales.length === 0
    ? `<p style="color:#aed3e9;font-style:italic;padding:16px 0">Sin registros clínicos registrados.</p>`
    : historiales.map(h => `
        <div class="historia-item">
          <div class="historia-date">📅 ${fmtFecha(h.fecha_atencion)}</div>
          <div class="historia-content">
            ${campo('Motivo de consulta', h.motivo_consulta)}
            ${campo('Evaluación fisioterapéutica', h.evaluacion_fisioterapeutica)}
            ${campo('Diagnóstico', h.diagnostico)}
            ${campo('Evolución', h.evolucion)}
            ${campo('Notas de sesión', h.notas_sesion)}
          </div>
        </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Clínico — ${paciente.nombres} ${paciente.apellidos}</title>
<style>
  @page { size: A4; margin: 20mm 16mm 22mm 16mm; }
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print    { display: none !important; }
    .historia-item { page-break-inside: avoid; }
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 12.5px;
    color: #1b3650;
    background: #fff;
    line-height: 1.6;
  }

  /* ── Botón pantalla ── */
  .no-print {
    position: fixed; top: 14px; right: 14px; z-index: 999;
  }
  .btn-pdf {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; font-size: 14px; cursor: pointer;
    background: #2b78ab; color: white; border: none;
    border-radius: 8px; font-weight: 700; font-family: inherit;
    box-shadow: 0 4px 12px rgba(43,120,171,0.35);
  }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; gap: 14px;
    padding-bottom: 14px;
    border-bottom: 3px solid #2b78ab;
    margin-bottom: 22px;
  }
  .logo {
    width: 58px; height: 58px; border-radius: 12px;
    object-fit: cover; flex-shrink: 0;
  }
  .logo-mk {
    width: 58px; height: 58px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, #2b78ab 0%, #1aa384 100%);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 900; font-size: 20px;
  }
  .clinic-name { font-size: 21px; font-weight: 800; color: #1c405e; }
  .clinic-sub  { font-size: 12px; color: #4593c2; margin-top: 3px; }
  .doc-info { margin-left: auto; text-align: right; }
  .doc-info h1 { font-size: 17px; color: #2b78ab; font-weight: 700; }
  .doc-info p  { font-size: 11px; color: #79b6d9; margin-top: 3px; }

  /* ── Ficha paciente ── */
  .patient-card {
    background: #eef6fb;
    border-left: 5px solid #2b78ab;
    padding: 14px 18px;
    border-radius: 0 12px 12px 0;
    margin-bottom: 22px;
  }
  .patient-name { font-size: 18px; font-weight: 800; color: #1c405e; }
  .patient-meta {
    display: flex; gap: 20px; flex-wrap: wrap;
    margin-top: 7px; font-size: 12px; color: #4593c2;
  }

  /* ── Secciones ── */
  .section-title {
    font-size: 10.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #79b6d9;
    margin: 20px 0 10px; padding-bottom: 5px;
    border-bottom: 1px solid #d6e9f4;
  }
  .bg-gen {
    background: #f8fafc; border: 1px solid #d6e9f4;
    border-radius: 8px; padding: 12px 16px;
    white-space: pre-line; margin-bottom: 18px;
  }

  /* ── Historia clínica ── */
  .historia-item    { margin-bottom: 20px; }
  .historia-date {
    font-size: 11.5px; font-weight: 700; color: #2b78ab;
    background: #eef6fb; padding: 4px 12px;
    border-radius: 4px; display: inline-block;
    margin-bottom: 8px; text-transform: capitalize;
  }
  .historia-content {
    border: 1px solid #d6e9f4; border-radius: 10px;
    padding: 13px 16px;
  }
  .campo       { margin-bottom: 10px; }
  .campo:last-child { margin-bottom: 0; }
  .campo-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: #79b6d9; margin-bottom: 2px;
  }
  .campo-val   { font-size: 12.5px; color: #1b3650; }

  /* ── Footer ── */
  .footer {
    margin-top: 32px; padding-top: 16px;
    border-top: 2px solid #d6e9f4;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .watermark   { font-size: 11px; color: #aed3e9; line-height: 1.7; }
  .firma       { text-align: center; }
  .firma-line  { width: 185px; border-top: 1px solid #1b3650; margin: 0 auto 5px; }
  .firma-name  { font-size: 12.5px; font-weight: 700; }
  .firma-titulo{ font-size: 11px; color: #4593c2; }
</style>
</head>
<body>

  <!-- Botón solo en pantalla -->
  <div class="no-print">
    <button class="btn-pdf" onclick="window.print()">⬇️ Guardar PDF / Imprimir</button>
  </div>

  <!-- HEADER -->
  <div class="header">
    <img class="logo" src="${logoUrl}"
      onerror="this.outerHTML='<div class=\\'logo-mk\\'>MK</div>'" />
    <div>
      <div class="clinic-name">Movimiento Koray</div>
      <div class="clinic-sub">Centro de Terapia Física &nbsp;·&nbsp; Cel: 996 113 188</div>
    </div>
    <div class="doc-info">
      <h1>Reporte Clínico</h1>
      <p>Emitido: ${fechaHoy}</p>
    </div>
  </div>

  <!-- FICHA PACIENTE -->
  <div class="patient-card">
    <div class="patient-name">${paciente.nombres} ${paciente.apellidos}</div>
    <div class="patient-meta">
      ${paciente.dni          ? `<span>📋 DNI: <strong>${paciente.dni}</strong></span>` : ''}
      ${edadAnos  != null     ? `<span>🎂 ${edadAnos} años</span>` : ''}
      ${paciente.celular      ? `<span>📱 ${paciente.celular}</span>` : ''}
      ${paciente.telefono     ? `<span>☎️ ${paciente.telefono}</span>` : ''}
    </div>
  </div>

  ${paciente.historial_medico_general ? `
    <div class="section-title">Antecedentes Médicos Generales</div>
    <div class="bg-gen">${paciente.historial_medico_general}</div>
  ` : ''}

  <div class="section-title">
    Evolución Clínica
    <span style="font-weight:400;text-transform:none;letter-spacing:0"> — ${historiales.length} registro(s)</span>
  </div>

  ${histHTML}

  <!-- FOOTER -->
  <div class="footer">
    <div class="watermark">
      <p>Centro de Terapia Física <strong>Movimiento Koray</strong></p>
      <p>Reporte generado el ${fechaHoy}</p>
      <p>Sistema de Gestión Clínica · Confidencial</p>
    </div>
    <div class="firma">
      <div class="firma-line"></div>
      <div class="firma-name">Diego Miguel Espinoza Guerrero</div>
      <div class="firma-titulo">Fisioterapeuta Colegiado</div>
    </div>
  </div>

</body>
</html>`

  abrirVentana(html)
}
