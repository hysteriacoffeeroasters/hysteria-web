/* ============================================================================
   AVISO DE PEDIDO POR CORREO
   ----------------------------------------------------------------------------
   Cuando un pago se confirma, aquí se arma y envía la hoja de despacho:
   qué café, en qué molienda y tamaño, a dónde va y con qué datos de factura.

   Usa la misma cuenta de Brevo del boletín (BREVO_API_KEY), y el remitente
   verificado del dominio. Llega al correo de pedidos del negocio.
   ========================================================================== */

const REMITENTE = { name: 'Pedidos Hysteria', email: 'hola@hysteriacoffeeroasters.com' };

const pesos = n =>
  '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* ¿Ya salió el aviso de esta referencia? Consulta los transaccionales de
   Brevo por etiqueta. Evita duplicados cuando el pago se confirma por las
   dos vías a la vez (el regreso del cliente y el evento de Wompi). */
export async function yaAvisado(referencia) {
  const clave = process.env.BREVO_API_KEY;
  const destino = (process.env.CORREO_PEDIDOS || 'hysteriacoffeeroasters@gmail.com').trim();
  if (!clave || !referencia) return false;
  try {
    // Se listan los últimos envíos al correo de pedidos y se busca la
    // referencia entre sus etiquetas (el filtro directo por tag no es fiable)
    const r = await fetch(
      'https://api.brevo.com/v3/smtp/emails?email=' + encodeURIComponent(destino) + '&days=2&limit=100',
      { headers: { 'api-key': clave.trim(), 'Accept': 'application/json' } });
    if (!r.ok) {
      console.error('No se pudo consultar si ya se avisó:', r.status);
      return false;
    }
    const datos = await r.json();
    const lista = Array.isArray(datos.transactionalEmails) ? datos.transactionalEmails : [];
    return lista.some(e => Array.isArray(e.tags) && e.tags.includes(String(referencia)));
  } catch (err) {
    console.error('Error consultando si ya se avisó:', err);
    return false;   // ante la duda, mejor un duplicado que un pedido sin aviso
  }
}

/* Confirmación para el CLIENTE, con el manual de marca aplicado: la misma
   estructura del correo de bienvenida (tarjeta blanca, cabecera y pie negros,
   serif para títulos). Los clientes de correo no cargan las fuentes propias,
   por eso Georgia y Helvetica hacen de Neuton y Geosans.
   Nunca lanza: que falle el correo no debe romper la confirmación del pago. */
export async function enviarCorreoCliente({ referencia, pedido, dest, sinDetalle }) {
  const clave = process.env.BREVO_API_KEY;
  const correoNegocio = (process.env.CORREO_PEDIDOS || 'hysteriacoffeeroasters@gmail.com').trim();
  if (!clave || !dest.correo) return false;

  const filas = sinDetalle ? '' : pedido.lineas.map(l => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e8e8;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#000;">${esc(l.titulo)} × ${l.cantidad}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e8e8;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#000;white-space:nowrap;">${pesos(l.precio * l.cantidad)}</td>
    </tr>`).join('');

  const html = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f2;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#ffffff;">

        <!-- Cabecera: la marca vive en negro -->
        <tr>
          <td align="center" style="background-color:#000000;padding:34px 24px 30px;">
            <img src="https://www.hysteriacoffeeroasters.com/assets/logo/imagotipo-white.png"
                 width="130" alt="Hysteria Coffee Roasters"
                 style="display:block;width:130px;height:auto;border:0;">
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:36px 40px 6px;">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:36px;font-weight:normal;color:#000;">¡Gracias por tu pedido!</h1>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 40px 26px;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#757575;">
              Tu pago quedó confirmado con la referencia<br>
              <strong style="color:#000;letter-spacing:.04em;">${esc(referencia)}</strong>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000;">
              <tbody>${filas}</tbody>
              <tfoot>
                <tr><td style="padding:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#757575;">Envío</td>
                    <td style="padding:12px 0 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#000;">${pedido.costoEnvio === 0 ? 'Gratis' : pesos(pedido.costoEnvio)}</td></tr>
                <tr><td style="padding:8px 0 14px;font-family:Georgia,serif;font-size:17px;color:#000;">Total</td>
                    <td style="padding:8px 0 14px;text-align:right;font-family:Georgia,serif;font-size:17px;color:#000;"><strong>${pesos(pedido.total)}</strong></td></tr>
              </tfoot>
            </table>
          </td>
        </tr>

        ${dest.direccion ? `
        <tr>
          <td style="padding:8px 40px 0;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:23px;color:#000;border-top:1px solid #e8e8e8;padding-top:18px;">
              Lo enviaremos a <strong>${esc(dest.direccion)}, ${esc(dest.ciudad)}</strong>.<br>
              <span style="color:#757575;">Te escribimos al WhatsApp para coordinar la entrega.</span>
            </p>
          </td>
        </tr>` : ''}

        <tr>
          <td style="padding:18px 40px 32px;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:23px;color:#000;">
              ¿Dudas con tu pedido? Responde a este correo. Lo leemos nosotros.
            </p>
          </td>
        </tr>

        <!-- Pie: cierra como abre -->
        <tr>
          <td align="center" style="background-color:#000000;padding:28px 40px;">
            <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:16px;color:#ffffff;">Hysteria Coffee Roasters</p>
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#757575;">Calle 92 #15-62, Bogotá, Colombia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>`;

  const texto = [
    `¡Gracias por tu pedido! Referencia: ${referencia}`,
    '',
    ...(sinDetalle ? [] : pedido.lineas.map(l => `${l.cantidad}x ${l.titulo} — ${pesos(l.precio * l.cantidad)}`)),
    `Envío: ${pedido.costoEnvio === 0 ? 'gratis' : pesos(pedido.costoEnvio)}`,
    `Total: ${pesos(pedido.total)}`,
    dest.direccion ? `Entrega: ${dest.direccion}, ${dest.ciudad}` : '',
    '',
    'Hysteria Coffee Roasters · Calle 92 #15-62, Bogotá',
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': clave.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: REMITENTE,
        to: [{ email: dest.correo, name: dest.nombre || undefined }],
        replyTo: { email: correoNegocio, name: 'Hysteria Coffee Roasters' },
        subject: `Tu pedido ${referencia} está confirmado ☕`,
        htmlContent: html,
        textContent: texto,
        // La etiqueta permite saber después si esta referencia ya se avisó
        tags: [String(referencia)],
      }),
    });
    if (!r.ok) {
      let detalle = {};
      try { detalle = await r.json(); } catch (e) {}
      console.error('Brevo no aceptó la confirmación al cliente:', r.status, detalle);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error enviando la confirmación al cliente:', err);
    return false;
  }
}

/* Envía la hoja de despacho. Devuelve true si Brevo la aceptó.
   Nunca lanza: que falle el aviso no debe romper la confirmación del pago. */
export async function enviarCorreoPedido({ referencia, pedido, dest, pasarela, transaccion }) {
  const clave = process.env.BREVO_API_KEY;
  const destino = (process.env.CORREO_PEDIDOS || 'hysteriacoffeeroasters@gmail.com').trim();

  if (!clave) {
    console.error('No se pudo avisar del pedido: falta BREVO_API_KEY');
    return false;
  }

  const filas = pedido.lineas.map(l => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${esc(l.titulo)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${l.cantidad}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${pesos(l.precio * l.cantidad)}</td>
    </tr>`).join('');

  const dato = (k, v) => v
    ? `<tr><td style="padding:4px 0;color:#666;width:150px;">${esc(k)}</td><td style="padding:4px 0;"><strong>${esc(v)}</strong></td></tr>`
    : '';

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#111;">
    <div style="background:#000;color:#fff;padding:20px 24px;">
      <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.7;">Pedido pagado</div>
      <div style="font-size:26px;margin-top:4px;">${esc(referencia)}</div>
    </div>

    <div style="padding:24px;">
      <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.12em;color:#666;margin:0 0 10px;">Qué preparar</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>${filas}</tbody>
        <tfoot>
          <tr><td colspan="2" style="padding:10px 12px;text-align:right;color:#666;">Subtotal</td>
              <td style="padding:10px 12px;text-align:right;">${pesos(pedido.subtotal)}</td></tr>
          <tr><td colspan="2" style="padding:0 12px 10px;text-align:right;color:#666;">Envío</td>
              <td style="padding:0 12px 10px;text-align:right;">${pedido.costoEnvio === 0 ? 'Gratis' : pesos(pedido.costoEnvio)}</td></tr>
          <tr><td colspan="2" style="padding:12px;text-align:right;font-size:16px;"><strong>Total pagado</strong></td>
              <td style="padding:12px;text-align:right;font-size:16px;"><strong>${pesos(pedido.total)}</strong></td></tr>
        </tfoot>
      </table>

      <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.12em;color:#666;margin:28px 0 10px;">A dónde va</h2>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        ${dato('Nombre', dest.nombre)}
        ${dato('Dirección', dest.direccion)}
        ${dato('Ciudad', dest.ciudad)}
        ${dato('Teléfono', dest.telefono)}
        ${dato('Indicaciones', dest.notas)}
      </table>

      <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.12em;color:#666;margin:28px 0 10px;">Factura electrónica</h2>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        ${dato('Documento', `${dest.doctipo} ${dest.docnum}`)}
        ${dato('Correo', dest.correo)}
      </table>

      <p style="margin-top:28px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:14px;">
        Cobrado por ${esc(pasarela)}${transaccion ? ` · transacción ${esc(transaccion)}` : ''}.
        Este aviso lo genera la web al confirmarse el pago.
      </p>
    </div>
  </div>`;

  // Versión en texto: lo que se lee de un vistazo en el celular
  const texto = [
    `PEDIDO PAGADO · ${referencia}`,
    '',
    ...pedido.lineas.map(l => `${l.cantidad}x ${l.titulo} — ${pesos(l.precio * l.cantidad)}`),
    `TOTAL: ${pesos(pedido.total)} (envío ${pedido.costoEnvio === 0 ? 'gratis' : pesos(pedido.costoEnvio)})`,
    '',
    `${dest.nombre} · ${dest.telefono}`,
    `${dest.direccion}, ${dest.ciudad}`,
    dest.notas ? `Indicaciones: ${dest.notas}` : '',
    '',
    `Factura: ${dest.doctipo} ${dest.docnum} · ${dest.correo}`,
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': clave.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: REMITENTE,
        to: [{ email: destino }],
        // Al responder, se le escribe directo al cliente
        replyTo: { email: dest.correo, name: dest.nombre },
        subject: `Pedido ${referencia} · ${pesos(pedido.total)} · ${dest.ciudad}`,
        htmlContent: html,
        textContent: texto,
        tags: [String(referencia)],
      }),
    });

    if (!r.ok) {
      let detalle = {};
      try { detalle = await r.json(); } catch (e) {}
      console.error('Brevo no aceptó el aviso de pedido:', r.status, detalle);
      return false;
    }
    return true;

  } catch (err) {
    console.error('Error enviando el aviso de pedido:', err);
    return false;
  }
}
