/* ============================================================================
   PAGO CON WOMPI · EVENTOS (WEBHOOK)
   ----------------------------------------------------------------------------
   Wompi llama esta dirección cada vez que una transacción cambia de estado,
   sin importar si el cliente volvió a la web o cerró la pestaña. Es la red
   de seguridad para PSE y efectivo, que confirman minutos u horas después.

   Seguridad: NUNCA se confía en el cuerpo del evento. Solo se toma el id y
   se le vuelve a preguntar a Wompi por la transacción real. Si además existe
   WOMPI_EVENTS_SECRET (panel → Secretos → Eventos), se verifica también la
   firma del evento y se rechaza lo que no cuadre.

   Configuración en Wompi:  Desarrollo → Programadores → URL de Eventos:
     https://www.hysteriacoffeeroasters.com/api/wompi-eventos
   ========================================================================== */

import { createHash } from 'node:crypto';
import {
  enviarCorreoPedido, enviarCorreoCliente,
  yaAvisado, yaAvisadoProvisional, yaAvisadoCliente,
} from '../lib/correo-pedido.js';
import { leerPedido, olvidarPedido, hayGuardado } from '../lib/guardado.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const llavePublica = (process.env.WOMPI_PUBLIC_KEY || '').trim();
  if (!llavePublica) return res.status(503).json({ error: 'Pagos no configurados' });

  let evento;
  try {
    evento = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Cuerpo no válido' });
  }

  /* Si el secreto de eventos está configurado, la firma es obligatoria.

     El orden de los campos NO se fija aquí: cada evento trae en
     `signature.properties` la lista de qué campos se firmaron y en qué orden,
     y esa lista es la que manda. Antes iba escrito a mano
     (id + status + amount_in_cents); mientras la verificación estaba apagada
     daba lo mismo, pero con el secreto puesto un solo campo distinto tiraría
     TODOS los avisos — y son la red de seguridad de PSE y efectivo, que
     confirman cuando el cliente ya cerró la pestaña. La lista escrita a mano
     queda solo de reserva por si algún evento llegara sin `properties`. */
  const secretoEventos = (process.env.WOMPI_EVENTS_SECRET || '').trim();
  if (secretoEventos) {
    const firma = evento.signature || {};
    const campos = Array.isArray(firma.properties) && firma.properties.length
      ? firma.properties
      : ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];

    // 'transaction.amount_in_cents' se resuelve contra evento.data
    const valorDe = (ruta) => String(ruta).split('.')
      .reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), evento.data || {});

    const partes = campos.map(valorDe);
    const cadena = partes.map(v => (v === null || v === undefined ? '' : String(v))).join('')
                 + String(evento.timestamp === undefined ? '' : evento.timestamp)
                 + secretoEventos;
    const esperado = createHash('sha256').update(cadena).digest('hex').toUpperCase();
    const recibido = String(firma.checksum || '').toUpperCase();

    if (esperado !== recibido) {
      /* Se rechaza, pero no en silencio: queda el id de la transacción para
         poder recuperarla a mano desde los registros de Vercel, y qué campos
         se usaron, que es lo que hace falta para saber si el rechazo viene de
         un evento falso o de que Wompi cambió los campos que firma. */
      const faltantes = campos.filter((c, i) => partes[i] === undefined);
      console.error('EVENTO_WOMPI_RECHAZADO ' + JSON.stringify({
        transaccion: ((evento.data || {}).transaction || {}).id || null,
        estado: ((evento.data || {}).transaction || {}).status || null,
        campos,
        camposSinValor: faltantes,
      }));
      return res.status(401).json({ error: 'Firma no válida' });
    }
  }

  const id = String(((evento.data || {}).transaction || {}).id || '').trim();
  if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
    // 200 para que Wompi no reintente algo que nunca va a servir
    return res.status(200).json({ recibido: true, procesado: false });
  }

  const base = llavePublica.startsWith('pub_prod_')
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';

  try {
    // La verdad se consulta directo en Wompi, nunca del cuerpo del evento
    const r = await fetch(`${base}/transactions/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': `Bearer ${llavePublica}`, 'Accept': 'application/json' },
    });
    if (!r.ok) {
      console.error('Wompi no respondió al verificar el evento:', r.status);
      return res.status(500).json({ error: 'Reintentar' }); // Wompi reintenta solo
    }

    const t = ((await r.json()) || {}).data || {};
    if (t.status !== 'APPROVED') {
      /* Pago muerto: el pedido guardado ya no va a despacharse nunca, y ahí
         hay nombre, dirección, teléfono y documento. Se borra ya, sin esperar
         a la purga diaria. PENDING no entra: PSE y efectivo pasan por ahí
         camino de aprobarse. */
      if (['DECLINED', 'VOIDED', 'ERROR'].includes(t.status)) {
        await olvidarPedido(t.reference || id);
      }
      return res.status(200).json({ recibido: true, estado: t.status || 'DESCONOCIDO' });
    }

    // Datos que sí viajan con la transacción de Wompi
    const cd = t.customer_data || {};
    const sa = t.shipping_address || {};
    const total = Math.round((Number(t.amount_in_cents) || 0) / 100);

    const dest = {
      nombre:    cd.full_name || '',
      telefono:  cd.phone_number || sa.phone_number || '',
      correo:    t.customer_email || '',
      doctipo:   cd.legal_id_type || '',
      docnum:    cd.legal_id || '',
      ciudad:    sa.city || '',
      direccion: [sa.address_line_1, sa.address_line_2].filter(Boolean).join(' · '),
      notas:     '',
    };

    const referencia = t.reference || id;

    // Si ya salió la hoja de despacho CON detalle (porque el cliente volvió a
    // la web), aquí no hay nada que hacer: la buena ya está enviada.
    if (await yaAvisado(referencia)) {
      return res.status(200).json({ recibido: true, avisado: false, duplicado: true });
    }
    // Y si ya salió el provisional, tampoco: es un reintento de este mismo
    // webhook. Se responde 200 para que Wompi deje de reintentar.
    if (await yaAvisadoProvisional(referencia)) {
      return res.status(200).json({ recibido: true, avisado: false, duplicado: 'provisional' });
    }

    /* Se busca el pedido que api/wompi.js guardó al crear el pago. Si está,
       esta hoja de despacho ya es la DEFINITIVA aunque el cliente nunca vuelva
       a la web: se sabe qué café, en qué molienda y a qué dirección. */
    const guardado = await leerPedido(referencia);
    const cuadra = !!(guardado && guardado.pedido &&
                      Math.round(Number(guardado.pedido.total)) === total);
    const tieneDetalle = !!(guardado && guardado.pedido &&
                            Array.isArray(guardado.pedido.lineas) &&
                            guardado.pedido.lineas.length && cuadra);

    /* La referencia la genera el servidor y es única por intento, así que el
       guardado y el cobro deberían cuadrar siempre. Si no cuadran, algo no
       entendemos: mejor no despachar un pedido por un monto distinto al que
       Wompi cobró de verdad. Se cae al aviso provisional y queda el aviso. */
    if (guardado && !cuadra) {
      console.error('PEDIDO_GUARDADO_NO_CUADRA ' + JSON.stringify({
        referencia, cobradoPorWompi: total,
        totalGuardado: guardado.pedido && guardado.pedido.total,
      }));
    }

    /* Sin detalle guardado (pedidos anteriores a esto, o un fallo del store) se
       mantiene el aviso PROVISIONAL de siempre: sale etiquetado aparte, así que
       no bloquea a la hoja con detalle si el cliente vuelve un momento después.

       Antes esta línea afirmaba que el cliente no había vuelto a la web, y era
       falso en el caso más común: que el evento simplemente corriera más que
       la redirección del navegador. */
    /* Se dice POR QUÉ no hay detalle: cada causa pide una acción distinta de
       quien lee el correo, y sin esto el fallo del almacén sería invisible. */
    const porQueSinDetalle = !hayGuardado()
      ? 'El almacén de pedidos no está conectado en Vercel: el detalle solo llega si el cliente vuelve a la web.'
      : (guardado && !cuadra)
        ? 'Hay un pedido guardado pero su total no cuadra con lo cobrado (revisa PEDIDO_GUARDADO_NO_CUADRA en los registros).'
        : 'No hay pedido guardado con esta referencia: si no llega un segundo correo en unos minutos, confírmalo con el cliente.';

    const pedidoInterno = tieneDetalle ? guardado.pedido : {
      lineas: [{
        id: 'pedido',
        titulo: `Pago recibido por ${'$' + total.toLocaleString('es-CO')}. ${porQueSinDetalle}`,
        cantidad: 1,
        precio: total,
      }],
      subtotal: total,
      costoEnvio: 0,
      total,
    };

    /* Los datos de envío guardados son mejores que los que trae la transacción:
       llevan las indicaciones de entrega (portería, horario), que Wompi no
       transporta. Se completan con los de Wompi por si alguno viniera vacío. */
    if (tieneDetalle && guardado.dest) {
      for (const k of Object.keys(dest)) {
        if (guardado.dest[k]) dest[k] = guardado.dest[k];
      }
    }
    // El cliente ya sabe qué pidió: su correo solo confirma pago y total
    const pedidoCliente = { lineas: [], subtotal: total, costoEnvio: 0, total };

    /* Los dos correos se piden a la vez pero se resuelven por separado: antes
       el código de respuesta miraba solo el del negocio, así que un fallo suyo
       hacía que Wompi reintentara y el cliente recibiera su confirmación
       repetida hasta tres veces. */
    const clienteYaTiene = await yaAvisadoCliente(referencia, dest.correo);

    const [avisado, clienteAvisado] = await Promise.all([
      enviarCorreoPedido({
        referencia,
        pedido: pedidoInterno, dest,
        pasarela: `Wompi (${t.payment_method_type || 'evento'})`,
        transaccion: id,
        /* Con detalle NO es provisional: lleva la etiqueta exacta de la
           referencia, así que si el cliente vuelve después, wompi-confirmar ve
           yaAvisado() y no manda una segunda hoja igual. */
        provisional: !tieneDetalle,
      }),
      clienteYaTiene
        ? Promise.resolve(true)
        : enviarCorreoCliente({ referencia, pedido: pedidoCliente, dest, sinDetalle: true }),
    ]);

    /* Ya despachado: se borra el pedido guardado. Ahí hay nombre, dirección,
       teléfono y documento, y no tiene por qué seguir almacenado una vez que
       la hoja llegó al correo. Solo se borra si el aviso SALIÓ: si falló, el
       detalle tiene que sobrevivir para el reintento de Wompi. */
    if (tieneDetalle && avisado) await olvidarPedido(referencia);

    console.log('Wompi · evento procesado', JSON.stringify({
      referencia: t.reference, total, avisado, clienteAvisado,
      metodo: t.payment_method_type,
      conDetalle: tieneDetalle,
    }));

    // Si el aviso al negocio falló, 500: Wompi reintenta hasta 3 veces en 24 h.
    // El del cliente no entra en esta decisión, a propósito.
    return res.status(avisado ? 200 : 500).json({ recibido: true, avisado, clienteAvisado });

  } catch (err) {
    console.error('Error procesando el evento de Wompi:', err);
    return res.status(500).json({ error: 'Reintentar' });
  }
}
