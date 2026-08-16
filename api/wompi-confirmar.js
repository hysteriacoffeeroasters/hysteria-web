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

    const dest = leerDestino(body.datosEnvio);
    const cobrado = Number(t.amount_in_cents) || 0;

    /* 2. EL PEDIDO GUARDADO MANDA. Lo escribió este mismo servidor al crear el
       pago, así que es la única fuente de fiar sobre qué se compró y con qué
       códigos. El carrito del navegador es solo el plan B para los pedidos
       anteriores al almacén.

       El orden importa y antes estaba al revés: se construía con body.codigo y
       solo se miraba el guardado si no cuadraba. Como este endpoint únicamente
       exige un id de transacción —que viaja a la vista en la URL de regreso—,
       cualquiera podía mandar un carrito inventado que cuadrara con lo cobrado
       y hacer que se diera por canjeado un código que nadie usó, matándolo para
       siempre. También servía para reescribir la hoja de despacho. */
    let pedido = null;
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
      /* Sin guardado: se reconstruye con nuestros precios. Los códigos del
         navegador NO se aceptan aquí —ese era el agujero—, así que si el
         pedido llevaba descuento, no cuadrará y no se avisará; el webhook, que
         sí tiene el guardado, se encarga. */
      pedido = construirPedido(Array.isArray(body.items) ? body.items : []);
      if (!pedido.lineas.length || Math.round(pedido.total) * 100 !== cobrado) {
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

    /* Los canjes van ANTES de borrar el pedido guardado: si alguno no se puede
       anotar, el pedido tiene que sobrevivir para que el webhook lo recoja. Si
       se borrara primero, un confirm fallido dejaría la reserva sin confirmar,
       la purga la soltaría a las 72 h con el pedido ya despachado, y el código
       valdría dos veces sin que nadie hiciera trampa.

       Se usan los códigos del pedido que de VERDAD se cobró, nunca los que
       mandó el navegador. */
    let canjesOk = true;
    for (const usado of (pedido.codigos || []).map(leerCodigo).filter(Boolean)) {
      if (usado.unicoPorPersona && dest.correo) {
        await anotarUsoDelCodigo(usado.codigo, dest.correo, referencia);
      }
      // La reserva pasa a definitiva: ya nadie la puede liberar ni la purga
      if (usado.unicoGlobal) {
        if (!await confirmarCodigoGlobal(usado.codigo, referencia)) canjesOk = false;
      }
    }

    /* El pedido guardado ya cumplió: la hoja de despacho salió por esta vía.
       Se borra porque ahí quedan nombre, dirección, teléfono y documento, y
       este es el camino más frecuente —el cliente vuelve a la web—, así que sin
       esto casi ningún pedido llegaría a borrarse nunca. Solo si el aviso SALIÓ
       y los canjes quedaron anotados. */
    if (avisado && canjesOk) await olvidarPedido(referencia);

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
