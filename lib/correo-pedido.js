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

/* Confirmación para el CLIENTE: marca, resumen y a dónde va su café.
   Nunca lanza: que falle el correo no debe romper la confirmación del pago. */
export async function enviarCorreoCliente({ referencia, pedido, dest }) {
  const clave = process.env.BREVO_API_KEY;
  const correoNegocio = (process.env.CORREO_PEDIDOS || 'hysteriacoffeeroasters@gmail.com').trim();
  if (!clave || !dest.correo) return false;

  const filas = pedido.lineas.map(l => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #222;color:#fff;">${esc(l.titulo)} × ${l.cantidad}</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;text-align:right;color:#fff;">${pesos(l.precio * l.cantidad)}</td>
    </tr>`).join('');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;">
    <div style="padding:36px 32px 8px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:26px;">Hysteria Coffee Roasters</div>
      <div style="font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#999;margin-top:6px;">Café de especialidad · Bogotá</div>
    </div>
    <div style="padding:24px 32px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;margin:0 0 6px;">¡Gracias por tu pedido!</h1>
      <p style="color:#bbb;font-size:14px;line-height:1.7;margin:0 0 22px;">
        Tu pago quedó confirmado con la referencia <strong style="color:#fff;">${esc(referencia)}</strong>.
        Ya estamos preparando tu café.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>${filas}</tbody>
        <tfoot>
          <tr><td style="padding:10px 0 0;color:#999;">Envío</td>
              <td style="padding:10px 0 0;text-align:right;color:#fff;">${pedido.costoEnvio === 0 ? 'Gratis' : pesos(pedido.costoEnvio)}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px;color:#fff;"><strong>Total</strong></td>
              <td style="padding:6px 0;text-align:right;font-size:16px;color:#fff;"><strong>${pesos(pedido.total)}</strong></td></tr>
        </tfoot>
      </table>
      ${dest.direccion ? `
      <p style="color:#bbb;font-size:13px;line-height:1.7;margin:22px 0 0;border-top:1px solid #222;padding-top:16px;">
        Lo enviaremos a <strong style="color:#fff;">${esc(dest.direccion)}, ${esc(dest.ciudad)}</strong>.
        Te escribimos al WhatsApp para coordinar la entrega.
      </p>` : ''}
      <p style="color:#bbb;font-size:13px;line-height:1.7;margin-top:16px;">
        ¿Dudas con tu pedido? Responde este correo y te contestamos nosotros.
      </p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #222;text-align:center;color:#777;font-size:11px;">
      Hysteria Coffee Roasters · Calle 92 #15-62, Bogotá, Colombia
    </div>
  </div>`;

  const texto = [
    `¡Gracias por tu pedido! Referencia: ${referencia}`,
    '',
    ...pedido.lineas.map(l => `${l.cantidad}x ${l.titulo} — ${pesos(l.precio * l.cantidad)}`),
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
