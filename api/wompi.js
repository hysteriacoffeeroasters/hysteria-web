/* ============================================================================
   PAGO CON WOMPI · PREPARAR LA TRANSACCIÓN
   ----------------------------------------------------------------------------
   Wompi (Bancolombia) cobra con tarjeta, PSE, Nequi, Bancolombia y efectivo.

   Esta función NO cobra: arma los datos firmados con los que el navegador
   abre el checkout de Wompi. El monto se calcula aquí, nunca en el navegador.

   CONFIGURACIÓN (una sola vez):
     Vercel → tu proyecto → Settings → Environment Variables

       WOMPI_PUBLIC_KEY        pub_prod_...        (la ve el navegador)
       WOMPI_INTEGRITY_SECRET  prod_integrity_...  (SECRETO, solo servidor)

     Las consigues en:  comercios.wompi.co → Desarrolladores → Llaves de API

     Para probar sin cobrar de verdad, usa las de sandbox:
       pub_test_...  y  test_integrity_...

   ⚠️ El secreto de integridad NUNCA va en assets/js/datos.js: ese archivo lo
      puede leer cualquiera. Solo vive en las variables de entorno de Vercel.
   ========================================================================== */

import { createHash } from 'node:crypto';
import {
  construirPedido, leerDestino, validarDestino, nuevaReferencia, SITE_URL,
} from '../lib/pedido.js';
import { guardarPedido } from '../lib/guardado.js';

const CHECKOUT = 'https://checkout.wompi.co/p/';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // .trim(): al copiar del panel de Wompi suele colarse un espacio o un salto
  // de línea invisible, y bastaría eso para que la firma no cuadre nunca.
  const llavePublica = (process.env.WOMPI_PUBLIC_KEY || '').trim();
  const secreto = (process.env.WOMPI_INTEGRITY_SECRET || '').trim();
  if (!llavePublica || !secreto) {
    console.error('Faltan WOMPI_PUBLIC_KEY o WOMPI_INTEGRITY_SECRET');
    return res.status(503).json({ error: 'Pagos no configurados todavía' });
  }

  // Aviso claro en los logs si la variable trae el secreto equivocado: el panel
  // de Wompi muestra juntos el de Eventos y el de Integridad, y se confunden.
  if (!secreto.includes('integrity')) {
    console.error('WOMPI_INTEGRITY_SECRET no parece el secreto de integridad. ' +
      'Empieza por: ' + secreto.slice(0, 14) + '… (se espera prod_integrity_ o test_integrity_)');
  }
  if (llavePublica.startsWith('pub_prod_') && secreto.startsWith('test_')) {
    console.error('Ambiente cruzado: llave de producción con secreto de pruebas');
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

    const pedido = construirPedido(entrada);
    if (!pedido.lineas.length) {
      return res.status(400).json({ error: 'No reconocimos ningún producto' });
    }

    const dest = leerDestino(body.datosEnvio);
    // Solo se acepta 'en'; cualquier otra cosa cae en español. Este valor viaja
    // a la dirección de regreso, así que no puede venir suelto del navegador.
    const idioma = body.idioma === 'en' ? 'en' : 'es';
    const problema = validarDestino(dest);
    if (problema) return res.status(400).json({ error: problema });

    const referencia = nuevaReferencia();
    const moneda = 'COP';
    // Wompi cobra en centavos y el peso colombiano no usa decimales
    const centavos = Math.round(pedido.total) * 100;

    // Firma de integridad: SHA256 de referencia + monto + moneda + secreto.
    // Wompi la exige para comprobar que el monto no se alteró en el camino.
    const firma = createHash('sha256')
      .update(`${referencia}${centavos}${moneda}${secreto}`)
      .digest('hex');

    /* Este es el ÚNICO momento en que el servidor conoce el pedido entero: qué
       café, qué molienda y a dónde va. Si no se guarda aquí y el cliente paga
       sin volver a la web, el detalle se pierde y al webhook solo le llega el
       monto — que es exactamente lo que pasó con el pedido del 13 de agosto.
       El webhook lo recupera por la referencia (lib/guardado.js).

       Se espera el guardado a propósito, en vez de dejarlo suelto: la función
       puede terminar en cuanto responde, y una promesa sin esperar se quedaría
       a medias. Nunca lanza, así que un fallo del store no impide pagar. */
    const guardado = await guardarPedido(referencia, { pedido, dest, idioma });

    // Rastro mínimo para cruzar el pago con el despacho. Sin datos personales:
    // nombre, dirección, teléfono, documento y correo NO se registran.
    console.log('Wompi · pedido preparado', JSON.stringify({
      referencia, total: pedido.total, ciudad: dest.ciudad,
      items: pedido.lineas.map(l => `${l.cantidad}x ${l.titulo}`).join(' | '),
      molienda: pedido.moliendas.join(' | '),
      guardado,
    }));

    // El navegador arma un formulario con estos campos y lo envía a Wompi.
    // Los nombres son los que exige su Checkout Web.
    return res.status(200).json({
      url: CHECKOUT,
      referencia,
      total: pedido.total,
      campos: {
        'public-key': llavePublica,
        'currency': moneda,
        'amount-in-cents': String(centavos),
        'reference': referencia,
        'signature:integrity': firma,
        // Se vuelve a la portada del idioma en que se compró: el momento de
        // "¿me cobraron o no?" es el peor para cambiarle el idioma a alguien.
        'redirect-url': `${SITE_URL}${idioma === 'en' ? '/en' : '/'}` +
                        `?pago=wompi&ref=${encodeURIComponent(referencia)}`,
        'customer-data:email': dest.correo,
        'customer-data:full-name': dest.nombre,
        'customer-data:phone-number': dest.telefono.replace(/\D/g, '').slice(-10),
        'customer-data:legal-id': dest.docnum,
        'customer-data:legal-id-type': dest.doctipo,
        'shipping-address:address-line-1': dest.direccion,
        'shipping-address:country': 'CO',
        'shipping-address:city': dest.ciudad,
        'shipping-address:region': dest.ciudad,
        'shipping-address:phone-number': dest.telefono.replace(/\D/g, '').slice(-10),
      },
    });

  } catch (err) {
    console.error('Error preparando el pago de Wompi:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
