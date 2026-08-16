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
import { leerPedido, olvidarPedido, anotarUsoDelCodigo, confirmarCodigoGlobal } from '../lib/guardado.js';
import { leerCodigo } from '../lib/pedido.js';

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
    let pedido = construirPedido(Array.isArray(body.items) ? body.items : [], body.codigo);
    const dest = leerDestino(body.datosEnvio);

    // 3. El carrito tiene que cuadrar con lo que Wompi cobró de verdad
    const cobrado = Number(t.amount_in_cents) || 0;
    if (!pedido.lineas.length || Math.round(pedido.total) * 100 !== cobrado) {
      /* Antes de rendirse, se mira el pedido que el servidor guardó al crear
         el pago (lib/guardado.js): lo escribió este mismo servidor, así que es
         de fiar. Cubre los casos en que el navegador ya no tiene lo que tenía
         al pagar: borró el código de descuento, cambió un precio del catálogo
         entre el pago y el regreso, o se perdió el localStorage. */
      const g = await leerPedido(t.reference || id);
      if (g && g.pedido && Array.isArray(g.pedido.lineas) && g.pedido.lineas.length &&
          Math.round(Number(g.pedido.total)) * 100 === cobrado) {
        pedido = g.pedido;
        if (g.dest) {
          for (const k of Object.keys(dest)) {
            if (!dest[k] && g.dest[k]) dest[k] = g.dest[k];
          }
        }
      } else {
        console.error('El carrito no coincide con lo cobrado', {
          referencia: t.reference, cobrado, carrito: Math.round(pedido.total) * 100,
        });
        return res.status(200).json({ estado: 'APPROVED', avisado: false });
      }
    }
    /* El correo manda el que PAGÓ, no el que dice el navegador.
       Este endpoint solo exige un id de transacción, que viaja a la vista en la
       URL de regreso: cualquiera podía llamarlo con el id de otro y un correo
       ajeno, y ese correo se usaba tanto para anotar el canje del código —
       quemándoselo a alguien que no compró nada— como para mandarle la
       confirmación de un pedido que no hizo. El webhook ya hacía lo correcto;
       esta vía no. Del navegador solo se conservan las indicaciones de entrega
       y demás datos que Wompi no transporta. */
    const correoPagado = String(t.customer_email || '').trim().toLowerCase();
    if (correoPagado) dest.correo = correoPagado;

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

    /* El pedido guardado ya cumplió: la hoja de despacho salió por esta vía.
       Se borra porque ahí quedan nombre, dirección, teléfono y documento, y
       este es el camino más frecuente —el cliente vuelve a la web—, así que sin
       esto casi ningún pedido llegaría a borrarse nunca. Solo si el aviso SALIÓ:
       si falló, el detalle tiene que seguir ahí para que lo recoja el webhook. */
    if (avisado) await olvidarPedido(referencia);

    /* El canje se anota SOLO con el pago ya aprobado, nunca al crear el pago:
       si se anotara antes, un cliente que abandona el checkout perdería su
       código sin haber comprado nada. Se usa el código del pedido que de
       verdad se cobró (pedido.codigo), no el que mandó el navegador. */
    const usado = leerCodigo(pedido.codigo);
    if (usado && usado.unicoPorPersona && dest.correo) {
      await anotarUsoDelCodigo(usado.codigo, dest.correo, referencia);
    }
    // La reserva pasa a definitiva: ya nadie la puede liberar ni la purga
    if (usado && usado.unicoGlobal) {
      await confirmarCodigoGlobal(usado.codigo, referencia);
    }

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
