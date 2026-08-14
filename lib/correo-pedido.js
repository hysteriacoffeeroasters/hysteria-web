/* ============================================================================
   AVISO DE PEDIDO POR CORREO
   ----------------------------------------------------------------------------
   Cuando un pago se confirma, aquí se arma y envía la hoja de despacho:
   qué café, en qué molienda y tamaño, a dónde va y con qué datos de factura.

   Usa la misma cuenta de Brevo del boletín (BREVO_API_KEY), y el remitente
   verificado del dominio. Llega al correo de pedidos del negocio.
   ========================================================================== */

const REMITENTE = { name: 'Pedidos Hysteria', email: 'hola@hysteriacoffeeroasters.com' };

/* Sufijo de la etiqueta del aviso PROVISIONAL: el que manda el webhook de
   Wompi cuando el cliente todavía no ha vuelto a la web y aquí no se conoce
   qué café pidió. Va etiquetado distinto del bueno a propósito, para que un
   provisional NO impida que después salga el detallado. */
const PROVISIONAL = ':provisional';

const pesos = n =>
  '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ── Envío a Brevo con reintentos ─────────────────────────────────────────
   Un fallo puntual de Brevo dejaba el pedido sin avisar y el correo es el
   único registro que existe, así que se reintenta antes de darlo por perdido.
   Solo se reintenta lo que puede mejorar reintentando: un 5xx o un corte de
   red. Un 4xx es culpa nuestra (clave mala, destinatario inválido) y volver
   a intentarlo solo gasta tiempo.

   Devuelve true si Brevo lo aceptó. Nunca lanza: que falle el correo no debe
   romper la confirmación de un pago que el cliente ya hizo. */
async function enviarABrevo(cuerpo, queEs, intentos = 3) {
  const clave = process.env.BREVO_API_KEY;
  if (!clave) {
    console.error(`No se pudo enviar ${queEs}: falta BREVO_API_KEY`);
    return false;
  }

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': clave.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cuerpo),
      });

      if (r.ok) return true;

      let detalle = {};
      try { detalle = await r.json(); } catch (e) {}

      if (r.status < 500 && r.status !== 429) {
        console.error(`Brevo rechazó ${queEs} (no se reintenta):`, r.status, detalle);
        return false;
      }
      console.error(`Brevo falló al enviar ${queEs}, intento ${intento}/${intentos}:`, r.status, detalle);
    } catch (err) {
      console.error(`Error de red enviando ${queEs}, intento ${intento}/${intentos}:`, err);
    }

    if (intento < intentos) await dormir(intento * 700);   // 0,7 s y luego 1,4 s
  }
  return false;
}

/* Cuando el aviso al negocio se pierde del todo, el pedido queda escrito
   ENTERO en el registro con un prefijo fácil de buscar. No sustituye a una
   base de datos, pero permite recuperar el pedido desde los logs de Vercel
   en vez de perderlo. Buscar por: PEDIDO_SIN_AVISAR */
export function registrarPedidoSinAvisar({ referencia, pedido, dest, transaccion, via }) {
  try {
    console.error('PEDIDO_SIN_AVISAR ' + JSON.stringify({
      referencia, transaccion, via,
      total: pedido && pedido.total,
      cliente: dest && {
        nombre: dest.nombre, telefono: dest.telefono, correo: dest.correo,
        documento: [dest.doctipo, dest.docnum].filter(Boolean).join(' '),
        ciudad: dest.ciudad, direccion: dest.direccion, notas: dest.notas,
      },
      lineas: pedido && Array.isArray(pedido.lineas)
        ? pedido.lineas.map(l => `${l.cantidad}x ${l.titulo} = ${l.precio * l.cantidad}`)
        : [],
    }));
  } catch (err) {
    console.error('PEDIDO_SIN_AVISAR (no se pudo serializar)', referencia, err);
  }
}

/* ── ¿Ya salió el aviso de esta referencia? ───────────────────────────────
   Consulta los transaccionales de Brevo y busca la etiqueta. Evita duplicados
   cuando el pago se confirma por las dos vías (el regreso del cliente y el
   evento de Wompi).

   Ojo con el matiz de la etiqueta: `yaAvisado` busca la EXACTA, que solo la
   pone el aviso con detalle. Un provisional lleva sufijo, así que no cuenta —
   y por eso, si el webhook llegó primero, el correo bueno todavía puede salir.

   Limitación conocida: entre esta consulta y el envío pasa una llamada entera
   y el registro de Brevo no se indexa al instante. Si las dos vías coinciden
   en esa ventana, salen dos correos con la MISMA referencia, que se
   distinguen de un vistazo. Cerrarlo del todo pide un almacén propio; ante la
   duda se prefiere un duplicado a un pedido sin avisar. */
async function buscarEtiqueta(etiqueta, correo) {
  const clave = process.env.BREVO_API_KEY;
  const destino = (correo ||
    process.env.CORREO_PEDIDOS || 'hysteriacoffeeroasters@gmail.com').trim();
  if (!clave || !etiqueta) return false;
  try {
    const r = await fetch(
      'https://api.brevo.com/v3/smtp/emails?email=' + encodeURIComponent(destino) + '&days=2&limit=100',
      { headers: { 'api-key': clave.trim(), 'Accept': 'application/json' } });
    if (!r.ok) {
      console.error('No se pudo consultar si ya se avisó:', r.status);
      return false;
    }
    const datos = await r.json();
    const lista = Array.isArray(datos.transactionalEmails) ? datos.transactionalEmails : [];
    return lista.some(e => Array.isArray(e.tags) && e.tags.includes(String(etiqueta)));
  } catch (err) {
    console.error('Error consultando si ya se avisó:', err);
    return false;
  }
}

/* ¿Ya salió el aviso CON DETALLE? */
export async function yaAvisado(referencia) {
  return buscarEtiqueta(referencia);
}

/* ¿Ya salió el aviso PROVISIONAL? Lo usa el webhook para no repetirse a sí
   mismo en sus reintentos, sin bloquear al detallado. */
export async function yaAvisadoProvisional(referencia) {
  return buscarEtiqueta(String(referencia) + PROVISIONAL);
}

/* ¿Ya se le confirmó al CLIENTE? Se consulta contra SU buzón, no el del
   negocio: si no, no se encontraría nunca.

   Existe por un caso concreto: si el aviso al negocio falla pero el del
   cliente sale, el webhook devuelve 500 y Wompi reintenta — y sin esta
   comprobación el cliente recibía la misma confirmación hasta tres veces. */
export async function yaAvisadoCliente(referencia, correoCliente) {
  if (!correoCliente) return false;
  return buscarEtiqueta(String(referencia) + ':cliente', correoCliente);
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

  return enviarABrevo({
    sender: REMITENTE,
    to: [{ email: dest.correo, name: dest.nombre || undefined }],
    replyTo: { email: correoNegocio, name: 'Hysteria Coffee Roasters' },
    subject: `Tu pedido ${referencia} está confirmado ☕`,
    htmlContent: html,
    textContent: texto,
    // Etiqueta con sufijo: la del cliente no debe confundirse con la del
    // negocio, que es la que decide si el pedido ya se avisó.
    tags: [String(referencia) + ':cliente'],
  }, 'la confirmación al cliente');
}

/* Envía la hoja de despacho al negocio. Devuelve true si Brevo la aceptó.
   Nunca lanza: que falle el aviso no debe romper la confirmación del pago.

   `provisional` lo usa el webhook de Wompi cuando aún no conoce el detalle
   del carrito. Cambia la etiqueta para que ese aviso NO cuente como "ya
   avisado" y el correo bueno pueda salir después.

   Si tras los reintentos no sale, el pedido entero queda escrito en el
   registro con el prefijo PEDIDO_SIN_AVISAR, para poder recuperarlo. */
export async function enviarCorreoPedido({ referencia, pedido, dest, pasarela, transaccion, provisional }) {
  const clave = process.env.BREVO_API_KEY;
  const destino = (process.env.CORREO_PEDIDOS || 'hysteriacoffeeroasters@gmail.com').trim();

  if (!clave) {
    console.error('No se pudo avisar del pedido: falta BREVO_API_KEY');
    registrarPedidoSinAvisar({ referencia, pedido, dest, transaccion, via: 'sin BREVO_API_KEY' });
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

  const salio = await enviarABrevo({
    sender: REMITENTE,
    to: [{ email: destino }],
    // Al responder, se le escribe directo al cliente
    replyTo: dest.correo ? { email: dest.correo, name: dest.nombre } : undefined,
    subject: (provisional ? 'Pago recibido · ' : 'Pedido ') +
             `${referencia} · ${pesos(pedido.total)} · ${dest.ciudad || 'sin ciudad'}`,
    htmlContent: html,
    textContent: texto,
    tags: [String(referencia) + (provisional ? PROVISIONAL : '')],
  }, provisional ? 'el aviso provisional de pago' : 'la hoja de despacho');

  if (!salio) {
    registrarPedidoSinAvisar({
      referencia, pedido, dest, transaccion,
      via: provisional ? 'webhook (provisional)' : 'hoja de despacho',
    });
  }
  return salio;
}

