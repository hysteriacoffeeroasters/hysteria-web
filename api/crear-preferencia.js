/* ============================================================================
   CHECKOUT SEGURO · MERCADO PAGO
   ----------------------------------------------------------------------------
   Esta función corre en el servidor de Vercel, NO en el navegador.
   Por eso tu Access Token nunca queda expuesto.

   CONFIGURACIÓN (una sola vez):
     Vercel → tu proyecto → Settings → Environment Variables
       Nombre : MP_ACCESS_TOKEN
       Valor  : tu Access Token de PRODUCCIÓN de Mercado Pago
       Entorno: Production, Preview y Development

     Lo consigues en:
       mercadopago.com.co/developers → Tus integraciones → tu app → Credenciales

   Después de guardarlo, vuelve a desplegar (Deployments → ⋯ → Redeploy).
   ========================================================================== */

/* ⚠️ PRECIOS DE SEGURIDAD
   El catálogo y el armado del pedido viven en lib/pedido.js, compartidos con
   Wompi: así el precio existe en un solo lugar y las dos pasarelas no pueden
   quedar desincronizadas. Nunca se confía en lo que manda el navegador. */
import {
  construirPedido, leerDestino, validarDestino, nuevaReferencia,
  SITE_URL, MOLIENDAS,
} from '../lib/pedido.js';

/* Mercado Pago Colombia solo reconoce CC, CE y NIT en payer.identification; los
   demás viajan como "Otro" en el pago, pero el tipo real se guarda en metadata
   porque es el que necesita la factura electrónica. */
const DOC_MERCADOPAGO = { CC: 'CC', CE: 'CE', NIT: 'NIT' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    console.error('Falta la variable de entorno MP_ACCESS_TOKEN');
    return res.status(503).json({ error: 'Pagos no configurados todavía' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Cuerpo no válido' });
  }

  try {
    const entrada = Array.isArray(body.items) ? body.items : [];

    if (!entrada.length) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Reconstruimos el pedido usando SOLO nuestros precios
    const pedido = construirPedido(entrada);
    if (!pedido.lineas.length) {
      return res.status(400).json({ error: 'No reconocimos ningún producto' });
    }

    const items = pedido.lineas.map(l => ({
      id: l.id,
      title: l.titulo,
      quantity: l.cantidad,
      unit_price: l.precio,
      currency_id: 'COP',
    }));
    const moliendas = pedido.moliendas;
    const subtotal = pedido.subtotal;
    const costoEnvio = pedido.costoEnvio;
    const base = SITE_URL;

    // Datos de envío que el cliente escribió antes de pagar. Se recortan y
    // validan aquí también: nunca se confía en lo que llega del navegador.
    const dest = leerDestino(body.datosEnvio);
    const problema = validarDestino(dest);
    if (problema) return res.status(400).json({ error: problema });

    const referencia = nuevaReferencia();

    const partes = dest.nombre.split(/\s+/);
    const preferencia = {
      items,
      shipments: {
        cost: costoEnvio,
        mode: 'not_specified',
        receiver_address: {
          street_name: dest.direccion,
          city_name: dest.ciudad,
          zip_code: '',
        },
      },
      payer: {
        name: partes[0] || dest.nombre,
        surname: partes.slice(1).join(' '),
        email: dest.correo,
        identification: {
          type: DOC_MERCADOPAGO[dest.doctipo] || 'Otro',
          number: dest.docnum.replace(/[\s.-]/g, ''),
        },
        phone: { area_code: '57', number: dest.telefono.replace(/\D/g, '') },
        address: { street_name: `${dest.direccion}, ${dest.ciudad}`, zip_code: '' },
      },
      external_reference: referencia,
      back_urls: {
        success: `${base}/?pago=exito&ref=${referencia}`,
        failure: `${base}/?pago=fallo`,
        pending: `${base}/?pago=pendiente&ref=${referencia}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'HYSTERIA',
      binary_mode: false,
      metadata: {
        origen: 'web',
        referencia,
        subtotal,
        envio: costoEnvio,
        cliente_nombre: dest.nombre,
        cliente_telefono: dest.telefono,
        cliente_ciudad: dest.ciudad,
        cliente_direccion: dest.direccion,
        cliente_notas: dest.notas,
        // Facturación electrónica (DIAN): tipo real de documento y correo
        factura_documento_tipo: dest.doctipo,
        factura_documento_numero: dest.docnum,
        factura_correo: dest.correo,
        // Cómo hay que preparar cada bolsa antes de despachar
        molienda: moliendas.join(' | ').slice(0, 480),
      },
    };

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencia),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error('Mercado Pago respondió con error:', r.status, data);
      return res.status(502).json({ error: 'No pudimos iniciar el pago' });
    }

    const url = data.init_point || data.sandbox_init_point;
    if (!url) {
      console.error('Mercado Pago no devolvió init_point:', data);
      return res.status(502).json({ error: 'Respuesta inesperada del pago' });
    }

    // Rastro mínimo en los logs de Vercel: lo justo para cruzar un pedido con
    // Mercado Pago. Los datos personales (nombre, dirección, teléfono, documento
    // y correo) NO se registran: viajan a Mercado Pago y viven allí, no en logs
    // que quedan retenidos en la plataforma.
    console.log('Pedido creado', JSON.stringify({
      referencia, total: subtotal + costoEnvio, ciudad: dest.ciudad,
      items: items.map(i => `${i.quantity}x ${i.title}`).join(' | '),
      molienda: moliendas.join(' | '),
    }));

    return res.status(200).json({ url, id: data.id, referencia });

  } catch (err) {
    console.error('Error creando la preferencia:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
