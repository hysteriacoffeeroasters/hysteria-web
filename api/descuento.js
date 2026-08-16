/* ============================================================================
   VALIDAR UN CÓDIGO DE DESCUENTO
   ----------------------------------------------------------------------------
   El navegador pregunta aquí cuando el cliente escribe un código en el
   carrito. Se responde con los términos (tipo y valor) para que la pantalla
   pueda mostrar el descuento al instante.

   Esto es solo la VISTA PREVIA: el descuento que se cobra lo aplica siempre
   el servidor en construirPedido() (lib/pedido.js), al preparar el pago. Un
   navegador mentiroso puede pintarse los números que quiera, pero Wompi cobra
   lo que firma el servidor.

   La lista de códigos vive en lib/pedido.js, que se sirve público: este
   endpoint no revela nada que no pueda leerse ya.
   ========================================================================== */

import { leerCodigo } from '../lib/pedido.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Cuerpo no válido' });
  }

  const cupon = leerCodigo(body.codigo);
  if (!cupon) {
    // 200 y no 404: que el código no exista es una respuesta, no un error
    return res.status(200).json({ valido: false });
  }

  /* No se comprueba aquí si ya se usó: en este momento el cliente todavía no
     ha escrito su correo. Solo se avisa de que es de un solo uso, y la
     comprobación real ocurre al pagar (api/wompi.js), que es cuando se conoce
     a quién pertenece. */
  return res.status(200).json({
    valido: true,
    codigo: cupon.codigo,
    tipo: cupon.tipo,
    valor: cupon.valor,
    unicoPorPersona: !!cupon.unicoPorPersona,
    unicoGlobal: !!cupon.unicoGlobal,
  });
}
