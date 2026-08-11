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

   👉 Si cambias un precio en assets/js/datos.js, cámbialo también aquí.       */
const CATALOGO = {
  pasion:    { nombre: 'Café Pasión · Bolsa 340 g',  precio: 39500 },
  ilusion:   { nombre: 'Café Ilusión · Bolsa 340 g', precio: 59500 },
  deseo:     { nombre: 'Café Deseo · Bolsa 340 g',   precio: 75000 },
  euforia:   { nombre: 'Café Euforia · Bolsa 250 g', precio: 75000 },
  pasaporte: { nombre: 'Pasaporte Compass',          precio: 25000 },
};

const ENVIO = 15000;
const ENVIO_GRATIS_DESDE = 120000;
const MAX_UNIDADES = 50;

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

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const entrada = Array.isArray(body.items) ? body.items : [];

    if (!entrada.length) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Reconstruimos el pedido usando SOLO nuestros precios
    const items = [];
    let subtotal = 0;

    for (const linea of entrada) {
      const prod = CATALOGO[linea.id];
      if (!prod) continue;

      let cant = parseInt(linea.cantidad, 10);
      if (!Number.isFinite(cant) || cant < 1) cant = 1;
      if (cant > MAX_UNIDADES) cant = MAX_UNIDADES;

      subtotal += prod.precio * cant;
      items.push({
        id: linea.id,
        title: prod.nombre,
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

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const base = `${proto}://${host}`;

    const preferencia = {
      items,
      shipments: { cost: costoEnvio, mode: 'not_specified' },
      back_urls: {
        success: `${base}/?pago=exito`,
        failure: `${base}/?pago=fallo`,
        pending: `${base}/?pago=pendiente`,
      },
      auto_return: 'approved',
      statement_descriptor: 'HYSTERIA',
      binary_mode: false,
      metadata: { origen: 'web', subtotal, envio: costoEnvio },
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

    return res.status(200).json({ url, id: data.id });

  } catch (err) {
    console.error('Error creando la preferencia:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
