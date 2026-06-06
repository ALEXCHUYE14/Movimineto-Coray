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
  const numDoc   = `MK-${hoy.getFullYear()}${String(hoy.getMonth()+1).padStart(2,'0')}${String(hoy.getDate()).padStart(2,'0')}-${(paciente.dni || '').slice(-4).padStart(4,'0')}`

  const fmtFecha = (iso) => {
    if (!iso) return ''
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  const fmtDiaSemana = (iso) => {
    if (!iso) return ''
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('es-PE', { weekday: 'long' })
  }

  const campo = (etq, val) => val
    ? `<tr>
         <td class="campo-label">${etq}</td>
         <td class="campo-val">${val.replace(/\n/g, '<br>')}</td>
       </tr>`
    : ''

  const histHTML = historiales.length === 0
    ? `<div class="sin-registros">No se han registrado sesiones clínicas para este paciente.</div>`
    : historiales.map((h, i) => `
        <div class="sesion" ${i > 0 ? 'style="margin-top:22px"' : ''}>
          <div class="sesion-header">
            <div class="sesion-num">Sesión ${historiales.length - i}</div>
            <div class="sesion-fecha">
              <span class="sesion-dia">${fmtDiaSemana(h.fecha_atencion)}</span>
              ${fmtFecha(h.fecha_atencion)}
            </div>
          </div>
          <table class="campos-tabla">
            ${campo('Motivo de consulta',          h.motivo_consulta)}
            ${campo('Evaluación fisioterapéutica', h.evaluacion_fisioterapeutica)}
            ${campo('Diagnóstico',                  h.diagnostico)}
            ${campo('Evolución',                    h.evolucion)}
            ${campo('Notas de sesión',              h.notas_sesion)}
          </table>
        </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Clínico — ${paciente.nombres} ${paciente.apellidos}</title>
<style>
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .sesion   { page-break-inside: avoid; }
    body      { margin: 0; }
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11.5px;
    color: #1e2d3d;
    background: #f0f4f8;
    line-height: 1.65;
  }

  /* ───── BOTÓN PANTALLA ───── */
  .no-print {
    position: fixed; top: 16px; right: 16px; z-index: 999;
    display: flex; gap: 10px;
  }
  .btn-pdf {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 22px; font-size: 14px; cursor: pointer;
    background: #1d6fa4; color: white; border: none;
    border-radius: 8px; font-weight: 700; font-family: inherit;
    box-shadow: 0 4px 14px rgba(29,111,164,0.4);
    transition: background 0.15s;
  }
  .btn-pdf:hover { background: #15588a; }

  /* ───── HOJA A4 ───── */
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
    position: relative;
    overflow: hidden;
  }

  /* ───── BANDA LATERAL AZUL ───── */
  .sidebar {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 7mm;
    background: linear-gradient(180deg, #1d6fa4 0%, #15a98e 100%);
  }

  /* ───── CONTENIDO ───── */
  .content {
    margin-left: 7mm;
    padding: 12mm 14mm 12mm 12mm;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
  }

  /* ───── HEADER ───── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 10mm;
    border-bottom: 0.5px solid #c9dce9;
    margin-bottom: 8mm;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo {
    width: 52px; height: 52px;
    border-radius: 10px; object-fit: cover; flex-shrink: 0;
    border: 2px solid #ddeef8;
  }
  .logo-mk {
    width: 52px; height: 52px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, #1d6fa4 0%, #15a98e 100%);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 900; font-size: 18px; letter-spacing: -1px;
    border: 2px solid #ddeef8;
  }
  .clinic-block { line-height: 1.4; }
  .clinic-name  { font-size: 15px; font-weight: 800; color: #1a2e42; letter-spacing: -0.3px; }
  .clinic-sub   { font-size: 10px; color: #5490b5; margin-top: 2px; }
  .clinic-contact { font-size: 10px; color: #7aafc7; margin-top: 1px; }

  .header-right { text-align: right; }
  .doc-type {
    font-size: 17px; font-weight: 900; letter-spacing: -0.5px;
    color: #1d6fa4; text-transform: uppercase;
  }
  .doc-subtitle { font-size: 9.5px; color: #7aafc7; margin-top: 3px; letter-spacing: 0.04em; text-transform: uppercase; }
  .doc-num {
    margin-top: 5px;
    display: inline-block;
    font-size: 10px; font-weight: 700; color: #1a2e42;
    background: #eaf3fb; border: 1px solid #c9dce9;
    padding: 3px 9px; border-radius: 20px; letter-spacing: 0.03em;
  }

  /* ───── FICHA DEL PACIENTE ───── */
  .ficha {
    background: linear-gradient(135deg, #eaf3fb 0%, #e7f8f4 100%);
    border: 1px solid #c9dce9;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 8mm;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .ficha-avatar {
    width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #1d6fa4 0%, #15a98e 100%);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 900; font-size: 16px; letter-spacing: -1px;
    border: 2.5px solid #fff;
    box-shadow: 0 2px 8px rgba(29,111,164,0.25);
  }
  .ficha-datos { flex: 1; }
  .ficha-nombre { font-size: 15px; font-weight: 800; color: #1a2e42; line-height: 1.2; }
  .ficha-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 6px 10px; margin-top: 7px;
  }
  .ficha-item { }
  .ficha-item-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #7aafc7; }
  .ficha-item-val   { font-size: 11px; font-weight: 600; color: #1a2e42; margin-top: 1px; }
  .ficha-item-val.empty { color: #aac5d8; font-style: italic; font-weight: 400; font-size: 10.5px; }

  /* ───── SECCIÓN ANTECEDENTES ───── */
  .section-label {
    display: flex; align-items: center; gap: 7px;
    margin-bottom: 5px;
  }
  .section-label-line {
    flex: 1; height: 1px; background: #c9dce9;
  }
  .section-label-text {
    font-size: 8.5px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.1em; color: #5490b5; white-space: nowrap;
    padding: 0 4px;
  }
  .antecedentes-box {
    background: #f8fafc; border: 1px solid #ddeef8;
    border-left: 3px solid #5490b5;
    border-radius: 0 8px 8px 0;
    padding: 9px 12px;
    font-size: 11.5px; color: #2e4a61;
    white-space: pre-line; line-height: 1.65;
    margin-bottom: 8mm;
  }

  /* ───── SESIONES CLÍNICAS ───── */
  .sesion { margin-bottom: 0; }
  .sesion-header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 6px;
  }
  .sesion-num {
    font-size: 9px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.08em; color: #fff;
    background: #1d6fa4; padding: 3px 9px; border-radius: 20px;
    white-space: nowrap; flex-shrink: 0;
  }
  .sesion-fecha {
    font-size: 11px; color: #2e4a61; font-weight: 600;
    display: flex; align-items: center; gap: 5px;
  }
  .sesion-dia {
    text-transform: capitalize; color: #5490b5;
    font-weight: 400; font-size: 10.5px;
  }
  .sesion-separator {
    flex: 1; height: 1px; background: #e4eef7;
  }

  /* Tabla de campos */
  .campos-tabla {
    width: 100%; border-collapse: collapse;
    border: 1px solid #ddeef8; border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  .campos-tabla tr:not(:last-child) td { border-bottom: 1px solid #eef5fb; }
  .campo-label {
    width: 28%; padding: 6px 10px;
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: #5490b5;
    background: #f4f9fd; vertical-align: top;
    border-right: 1px solid #ddeef8;
    white-space: nowrap;
  }
  .campo-val {
    padding: 6px 11px; font-size: 11px; color: #1e2d3d;
    vertical-align: top; line-height: 1.6;
  }

  .sin-registros {
    color: #aac5d8; font-style: italic;
    text-align: center; padding: 20px 0; font-size: 12px;
  }

  /* ───── ESPACIADOR FLEX ───── */
  .spacer { flex: 1; }

  /* ───── FOOTER ───── */
  .footer {
    margin-top: 10mm;
    padding-top: 6mm;
    border-top: 1px solid #c9dce9;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer-info { font-size: 9.5px; color: #7aafc7; line-height: 1.8; }
  .footer-info strong { color: #5490b5; }
  .footer-badge {
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: #aac5d8;
    border: 1px solid #ddeef8; padding: 3px 9px; border-radius: 20px;
    margin-top: 5px; display: inline-block;
  }

  .firma-block { text-align: center; }
  .firma-line {
    width: 160px; border-top: 1.5px solid #1a2e42;
    margin: 0 auto 5px;
  }
  .firma-name  { font-size: 11.5px; font-weight: 700; color: #1a2e42; }
  .firma-cargo { font-size: 9.5px; color: #5490b5; margin-top: 2px; }
  .firma-cod   { font-size: 9px; color: #7aafc7; margin-top: 1px; }
</style>
</head>
<body>

  <!-- BOTÓN PANTALLA -->
  <div class="no-print">
    <button class="btn-pdf" onclick="window.print()">⬇&nbsp; Guardar PDF / Imprimir</button>
  </div>

  <div class="page">
    <!-- Banda lateral decorativa -->
    <div class="sidebar"></div>

    <div class="content">

      <!-- ═══ HEADER ═══ -->
      <div class="header">
        <div class="header-left">
          <img class="logo" src="${logoUrl}"
            onerror="this.outerHTML='<div class=\\'logo-mk\\'>MK</div>'" />
          <div class="clinic-block">
            <div class="clinic-name">Movimiento Koray</div>
            <div class="clinic-sub">Centro de Terapia Física y Rehabilitación</div>
            <div class="clinic-contact">Cel: 996 113 188 &nbsp;·&nbsp; Lima, Perú</div>
          </div>
        </div>
        <div class="header-right">
          <div class="doc-type">Informe Clínico</div>
          <div class="doc-subtitle">Fisioterapia y Rehabilitación</div>
          <div class="doc-num">${numDoc}</div>
        </div>
      </div>

      <!-- ═══ FICHA PACIENTE ═══ -->
      <div class="ficha">
        <div class="ficha-avatar">${(paciente.nombres||'?')[0]}${(paciente.apellidos||'?')[0]}</div>
        <div class="ficha-datos">
          <div class="ficha-nombre">${paciente.nombres} ${paciente.apellidos}</div>
          <div class="ficha-grid">
            <div class="ficha-item">
              <div class="ficha-item-label">DNI</div>
              <div class="ficha-item-val ${!paciente.dni ? 'empty' : ''}">${paciente.dni || 'No registrado'}</div>
            </div>
            <div class="ficha-item">
              <div class="ficha-item-label">Edad</div>
              <div class="ficha-item-val ${edadAnos == null ? 'empty' : ''}">${edadAnos != null ? edadAnos + ' años' : 'No registrada'}</div>
            </div>
            <div class="ficha-item">
              <div class="ficha-item-label">Celular</div>
              <div class="ficha-item-val ${!paciente.celular ? 'empty' : ''}">${paciente.celular || 'No registrado'}</div>
            </div>
            <div class="ficha-item">
              <div class="ficha-item-label">Sesiones registradas</div>
              <div class="ficha-item-val">${historiales.length}</div>
            </div>
            <div class="ficha-item">
              <div class="ficha-item-label">Fecha del informe</div>
              <div class="ficha-item-val">${fechaHoy}</div>
            </div>
            <div class="ficha-item">
              <div class="ficha-item-label">Especialidad</div>
              <div class="ficha-item-val">Fisioterapia</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ ANTECEDENTES ═══ -->
      ${paciente.historial_medico_general ? `
        <div class="section-label" style="margin-bottom:6px">
          <span class="section-label-text">Antecedentes médicos generales</span>
          <div class="section-label-line"></div>
        </div>
        <div class="antecedentes-box">${paciente.historial_medico_general}</div>
      ` : ''}

      <!-- ═══ EVOLUCIÓN CLÍNICA ═══ -->
      <div class="section-label" style="margin-bottom:8px">
        <span class="section-label-text">Evolución clínica · ${historiales.length} registro${historiales.length !== 1 ? 's' : ''}</span>
        <div class="section-label-line"></div>
      </div>

      ${histHTML}

      <!-- Empuja el footer al fondo -->
      <div class="spacer"></div>

      <!-- ═══ FOOTER ═══ -->
      <div class="footer">
        <div class="footer-info">
          <div>Centro de Terapia Física <strong>Movimiento Koray</strong></div>
          <div>Informe generado el ${fechaHoy}</div>
          <div class="footer-badge">Documento confidencial · Uso clínico exclusivo</div>
        </div>
        <div class="firma-block">
          <div class="firma-line"></div>
          <div class="firma-name">Diego M. Espinoza Guerrero</div>
          <div class="firma-cargo">Fisioterapeuta Titulado</div>
          <div class="firma-cod">Especialista en Rehabilitación Física</div>
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /page -->

</body>
</html>`

  abrirVentana(html)
}
