/* ============================================================================
   PAGO CON WOMPI · AVISAR EL PEDIDO
   ----------------------------------------------------------------------------
   Al volver del pago, la web manda aquí el carrito y el id de la transacción.

   Antes de avisar nada, se le pregunta a Wompi si esa transacción existe, si
   está APROBADA y si el monto coincide con lo que suma el carrito. Solo
   entonces se envía la hoja de despacho al correo de pedidos.

   Así, aunque alguien invente una llamada a este endpoint, no consigue que
   salga un aviso de un pedido que nadie pagó.
   ========================================================================== */

import { construirPedido, leerDestino, validarDestino } from '../lib/pedido.js';
import {
  enviarCorreoPedido, enviarCorreoCliente, yaAvisado, yaAvisadoCliente,
} from '../lib/correo-pedido.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const llavePublica = (process.env.WOMPI_PUBLIC_KEY || '').trim();
  if (!llavePublica) {
    return res.status(503).json({ error: 'Pagos no configurados todavía' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Cuerpo no válido' });
  }

  const id = String(body.id || '').trim();
  if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' });
  }

  const base = llavePublica.startsWith('pub_prod_')
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';

  try {
    // 1. La verdad la tiene Wompi, no el navegador
    const r = await fetch(`${base}/transactions/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': `Bearer ${llavePublica}`, 'Accept': 'application/json' },
    });
    if (!r.ok) {
      console.error('Wompi respondió con error al confirmar:', r.status);
      return res.status(502).json({ error: 'No pudimos confirmar el pago' });
    }

    const t = ((await r.json()) || {}).data || {};
    if (t.status !== 'APPROVED') {
      // No es un error: PSE y efectivo tardan. Simplemente no se avisa todavía.
      return res.status(200).json({ estado: t.status || 'DESCONOCIDO', avisado: false });
    }

    // 2. El pedido se reconstruye con nuestros precios, no con los del navegador
    const pedido = construirPedido(Array.isArray(body.items) ? body.items : []);
    const dest = leerDestino(body.datosEnvio);

    // 3. El carrito tiene que cuadrar con lo que Wompi cobró de verdad
    const cobrado = Number(t.amount_in_cents) || 0;
    if (!pedido.lineas.length || Math.round(pedido.total) * 100 !== cobrado) {
      console.error('El carrito no coincide con lo cobrado', {
        referencia: t.reference, cobrado, carrito: Math.round(pedido.total) * 100,
      });
      return res.status(200).json({ estado: 'APPROVED', avisado: false });
    }
    if (validarDestino(dest)) {
      return res.status(200).json({ estado: 'APPROVED', avisado: false });
    }

    const referencia = t.reference || id;

    /* Si la hoja de despacho CON detalle ya salió, no se duplica nada. Ojo con
       el matiz: si lo que salió fue el aviso provisional del webhook (etiqueta
       distinta), esto NO lo bloquea — y es justo lo que se quiere, porque el
       provisional no dice qué café despachar y este sí. */
    if (await yaAvisado(referencia)) {
      return res.status(200).json({ estado: 'APPROVED', avisado: true, duplicado: true });
    }

    // Al cliente no se le escribe dos veces si el webhook ya le confirmó
    const clienteYaTiene = await yaAvisadoCliente(referencia, dest.correo);

    const [avisado, clienteAvisado] = await Promise.all([
      enviarCorreoPedido({
        referencia,
        pedido, dest,
        pasarela: 'Wompi',
        transaccion: id,
      }),
      clienteYaTiene
        ? Promise.resolve(true)
        : enviarCorreoCliente({ referencia, pedido, dest }),
    ]);

    console.log('Wompi · pedido confirmado', JSON.stringify({
      referencia: t.reference, total: pedido.total, ciudad: dest.ciudad,
      avisado, clienteAvisado,
      items: pedido.lineas.map(l => `${l.cantidad}x ${l.titulo}`).join(' | '),
    }));

    return res.status(200).json({ estado: 'APPROVED', avisado });

  } catch (err) {
    console.error('Error confirmando el pedido:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
