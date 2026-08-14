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
import { enviarCorreoPedido, enviarCorreoCliente } from '../lib/correo-pedido.js';

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

  // Si el secreto de eventos está configurado, la firma es obligatoria
  const secretoEventos = (process.env.WOMPI_EVENTS_SECRET || '').trim();
  if (secretoEventos) {
    const t = (evento.data && evento.data.transaction) || {};
    const cadena = `${t.id}${t.status}${t.amount_in_cents}${evento.timestamp}${secretoEventos}`;
    const esperado = createHash('sha256').update(cadena).digest('hex').toUpperCase();
    const recibido = String((evento.signature || {}).checksum || '').toUpperCase();
    if (esperado !== recibido) {
      console.error('Evento de Wompi con firma inválida, descartado');
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

    // El detalle de productos vive en el navegador del cliente; si no volvió
    // a la web, aquí solo se conoce el monto. El correo lo dice claramente.
    const pedido = {
      lineas: [{
        id: 'pedido',
        titulo: `Pedido por ${'$' + total.toLocaleString('es-CO')} — detalle no transmitido ` +
                `(el cliente no volvió a la web tras pagar). Confírmalo con él o con la referencia.`,
        cantidad: 1,
        precio: total,
      }],
      subtotal: total,
      costoEnvio: 0,
      total,
    };

    const [avisado] = await Promise.all([
      enviarCorreoPedido({
        referencia: t.reference || id,
        pedido, dest,
        pasarela: `Wompi (${t.payment_method_type || 'evento'})`,
        transaccion: id,
      }),
      enviarCorreoCliente({ referencia: t.reference || id, pedido, dest }),
    ]);

    console.log('Wompi · evento procesado', JSON.stringify({
      referencia: t.reference, total, avisado, metodo: t.payment_method_type,
    }));

    // Si el correo falló, 500: Wompi reintenta hasta 3 veces en 24 horas
    return res.status(avisado ? 200 : 500).json({ recibido: true, avisado });

  } catch (err) {
    console.error('Error procesando el evento de Wompi:', err);
    return res.status(500).json({ error: 'Reintentar' });
  }
}
