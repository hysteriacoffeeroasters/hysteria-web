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

/* ⚠️ IMPORTANTE — PRECIOS DE SEGURIDAD
   Los precios se vuelven a calcular AQUÍ, en el servidor. Nunca se confía en
   lo que manda el navegador: si no fuera así, cualquiera podría editar el
   carrito desde su navegador y pagar $1.

   👉 Si cambias un precio en assets/js/datos.js, cámbialo también aquí.
   👉 Si agregas un LOTE nuevo, agrégalo también aquí con su mismo "id".
      Si no está en esta lista, no se puede comprar.                          */
const CATALOGO = {
  'pasion-colombia':        { nombre: 'Café Pasión · Colombia · Bolsa 340 g',        precio: 39500 },
  'ilusion-gesha':          { nombre: 'Café Ilusión · Gesha · Bolsa 340 g',          precio: 59500 },
  'deseo-borbon-rojo':      { nombre: 'Café Deseo · Borbón Rojo · Bolsa 340 g',      precio: 75000 },
  'deseo-ombligon':         { nombre: 'Café Deseo · Ombligón · Bolsa 340 g',         precio: 75000 },
  'euforia-borbon-naranja': { nombre: 'Café Euforia · Borbón Naranja · Bolsa 250 g', precio: 75000 },
  'pasaporte':              { nombre: 'Pasaporte Compass',                           precio: 25000 },
};

const ENVIO = 15000;
const ENVIO_GRATIS_DESDE = 120000;
const MAX_UNIDADES = 50;

// Dominio canónico fijo para las URLs de retorno del pago. No se deriva de las
// cabeceras del request (evita el anti-patrón host-header). Se puede sobrescribir
// con la variable de entorno SITE_URL en Vercel.
const SITE_URL = (process.env.SITE_URL || 'https://www.hysteriacoffeeroasters.com').replace(/\/$/, '');

/* Tipos de documento admitidos. Debe coincidir con DOCUMENTOS en assets/js/datos.js.
   Mercado Pago Colombia solo reconoce CC, CE y NIT en payer.identification; los
   demás viajan como "Otro" en el pago, pero el tipo real se guarda en metadata
   porque es el que necesita la factura electrónica. */
const DOCS_VALIDOS = ['CC', 'CE', 'NIT', 'PA', 'PEP', 'PPT', 'TI'];
const DOC_MERCADOPAGO = { CC: 'CC', CE: 'CE', NIT: 'NIT' };

/* Puntos de molienda. Debe coincidir con MOLIENDAS en assets/js/datos.js.
   'grano' significa que la bolsa va sin moler. */
const MOLIENDAS = {
  'grano':        'grano entero',
  'fina':         'molienda fina',
  'medio-fina':   'molienda medio fina',
  'media':        'molienda media',
  'media-gruesa': 'molienda media gruesa',
  'gruesa':       'molienda gruesa',
};

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
    const items = [];
    const moliendas = [];
    let subtotal = 0;

    for (const linea of entrada) {
      const prod = CATALOGO[linea.id];
      if (!prod) continue;

      let cant = parseInt(linea.cantidad, 10);
      if (!Number.isFinite(cant) || cant < 1) cant = 1;
      if (cant > MAX_UNIDADES) cant = MAX_UNIDADES;

      // La molienda solo aplica al café; el pasaporte no la lleva
      const esCafe = linea.id !== 'pasaporte';
      const cod = String(linea.molienda || '').trim();
      const molienda = esCafe ? (MOLIENDAS[cod] ? cod : 'grano') : '';
      if (molienda) moliendas.push(`${prod.nombre}: ${MOLIENDAS[molienda]}`);

      subtotal += prod.precio * cant;
      items.push({
        id: linea.id,
        title: prod.nombre + (molienda ? ` · ${MOLIENDAS[molienda]}` : ''),
        quantity: cant,
        unit_price: prod.precio,
        currency_id: 'COP',
      });
    }

    if (!items.length) {
      return res.status(400).json({ error: 'No reconocimos ningún producto' });
    }

    const costoEnvio =
      (ENVIO_GRATIS_DESDE > 0 && subtotal >= ENVIO_GRATIS_DESDE) ? 0 : ENVIO;

    const base = SITE_URL;

    // Datos de envío que el cliente escribió antes de pagar. Se recortan y
    // validan aquí también: nunca se confía en lo que llega del navegador.
    const limpio = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
    const e = body.datosEnvio || {};
    const dest = {
      nombre:    limpio(e.nombre, 80),
      telefono:  limpio(e.telefono, 30),
      correo:    limpio(e.correo, 254).toLowerCase(),
      doctipo:   limpio(e.doctipo, 6).toUpperCase(),
      docnum:    limpio(e.docnum, 25),
      ciudad:    limpio(e.ciudad, 60),
      direccion: limpio(e.direccion, 160),
      notas:     limpio(e.notas, 200),
    };

    const correoOk = /^[^\s@,;:<>()[\]\\]+@[^\s@.,;:<>()[\]\\]+\.[A-Za-z]{2,}$/.test(dest.correo);
    if (!dest.nombre || !dest.telefono || !dest.ciudad || !dest.direccion ||
        !correoOk || !dest.doctipo || dest.docnum.replace(/[\s.-]/g, '').length < 5) {
      return res.status(400).json({ error: 'Faltan datos de envío o facturación' });
    }
    if (!DOCS_VALIDOS.includes(dest.doctipo)) {
      return res.status(400).json({ error: 'Tipo de documento no válido' });
    }

    // Nº de pedido corto y legible, para cruzar el pago con el despacho
    const referencia = 'HYS-' + Date.now().toString(36).toUpperCase().slice(-6);

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

    // El pedido queda registrado en los logs de Vercel por si hace falta rastrearlo
    console.log('Pedido creado', JSON.stringify({
      referencia, total: subtotal + costoEnvio,
      cliente: dest.nombre, ciudad: dest.ciudad, telefono: dest.telefono,
      direccion: dest.direccion,
      factura: `${dest.doctipo} ${dest.docnum} · ${dest.correo}`,
      items: items.map(i => `${i.quantity}x ${i.title}`).join(' | '),
      molienda: moliendas.join(' | '),
    }));

    return res.status(200).json({ url, id: data.id, referencia });

  } catch (err) {
    console.error('Error creando la preferencia:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
