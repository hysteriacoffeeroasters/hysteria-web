/* ============================================================================
   PURGA DIARIA DE PEDIDOS GUARDADOS
   ----------------------------------------------------------------------------
   lib/guardado.js escribe el pedido al ABRIR el checkout, antes de que exista
   pago. Los que terminan bien se borran al despachar, y los que mueren
   (DECLINED, VOIDED, ERROR) los borra el webhook. Pero el caso más común no
   pasa por ninguno de los dos: quien cierra la pestaña sin pagar. Ese pedido
   —con nombre, dirección, teléfono y documento— quedaría guardado para
   siempre, y son datos de gente que nunca compró.

   Esto lo barre a diario (bloque "crons" de vercel.json): borra todo lo que
   lleve más de 72 horas en la carpeta pedidos/. 72 h cubre de sobra a PSE y
   efectivo, que confirman en horas; un pedido legítimo jamás vive tanto aquí.

   Si CRON_SECRET está en las variables de entorno, Vercel manda esa cabecera
   al invocar el cron y aquí se exige; sin ella configurada, el endpoint queda
   abierto, pero lo único que puede hacer quien lo llame es adelantar la
   limpieza que igual iba a pasar.
   ========================================================================== */

import { list, del, get } from '@vercel/blob';
import { hayGuardado, liberarCodigoGlobal } from '../lib/guardado.js';

const HORAS_DE_VIDA = 72;
const CARPETA_USOS = 'usos';

export default async function handler(req, res) {
  const secreto = (process.env.CRON_SECRET || '').trim();
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!hayGuardado()) {
    return res.status(200).json({ hecho: false, motivo: 'sin store conectado' });
  }

  /* Soltar a mano la reserva de un código de un solo uso.
     Hace falta de verdad: un cliente que abandona el checkout —o una prueba—
     deja el código bloqueado 72 h, y a veces hay que devolverlo hoy.

     Solo suelta reservas SIN CONFIRMAR: una confirmada significa que ese pago
     entró, y resucitar el código regalaría el descuento dos veces. Por eso se
     pasa sin referencia, que liberarCodigoGlobal interpreta como "cualquiera
     de este código", pero el filtro de confirmado sigue mandando. */
  let cuerpo = {};
  try {
    cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {}
  if (cuerpo.liberar) {
    const codigo = String(cuerpo.liberar).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
    const ok = await liberarCodigoGlobal(codigo);
    console.log('Liberación manual de código:', JSON.stringify({ codigo, ok }));
    return res.status(200).json({
      hecho: true, liberado: ok, codigo,
      motivo: ok ? undefined : 'no existía reserva, o ya estaba confirmada',
    });
  }

  const limite = Date.now() - HORAS_DE_VIDA * 3600 * 1000;

  try {
    const viejos = [];
    let cursor;
    /* list() pagina de a 1000; se recorre entero por si algún día se acumulan.
       OJO con el prefijo: solo 'pedidos/'. La carpeta 'usos/' guarda qué
       correos ya gastaron un código de un solo uso y NO caduca — barrerla
       regalaría el descuento otra vez a quien ya lo usó. */
    do {
      const pagina = await list({
        prefix: 'pedidos/',
        cursor,
        abortSignal: AbortSignal.timeout(8000),
      });
      for (const b of pagina.blobs || []) {
        if (new Date(b.uploadedAt).getTime() < limite) viejos.push(b.pathname);
      }
      cursor = pagina.hasMore ? pagina.cursor : undefined;
    } while (cursor);

    if (viejos.length) {
      await del(viejos, { abortSignal: AbortSignal.timeout(8000) });
    }

    /* Segunda pasada: reservas de códigos de un solo uso global que nunca
       llegaron a confirmarse. Se reservan al ir a pagar, así que un carrito
       abandonado deja el código bloqueado; pasadas 72 h se suelta y vuelve a
       estar disponible. Las CONFIRMADAS no se tocan jamás: esas son las que
       de verdad se usaron. Tampoco las huellas por persona, que no caducan. */
    const liberadas = [];
    let cursorUsos;
    do {
      const pagina = await list({
        prefix: `${CARPETA_USOS}/`,
        cursor: cursorUsos,
        abortSignal: AbortSignal.timeout(8000),
      });
      for (const b of pagina.blobs || []) {
        if (!b.pathname.endsWith('/GLOBAL.json')) continue;   // huellas por persona: intactas
        if (new Date(b.uploadedAt).getTime() >= limite) continue;
        try {
          const r = await get(b.pathname, { access: 'private', abortSignal: AbortSignal.timeout(5000) });
          if (!r || r.statusCode !== 200 || !r.stream) continue;
          const datos = JSON.parse(await new Response(r.stream).text());
          if (datos && datos.confirmado === false) liberadas.push(b.pathname);
        } catch (e) { /* si no se puede leer, NO se borra: el lado seguro */ }
      }
      cursorUsos = pagina.hasMore ? pagina.cursor : undefined;
    } while (cursorUsos);

    if (liberadas.length) {
      await del(liberadas, { abortSignal: AbortSignal.timeout(8000) });
    }

    // Solo cuentas: nada de referencias ni datos en el registro
    console.log('Purga de pedidos guardados:', JSON.stringify({
      borrados: viejos.length, reservasLiberadas: liberadas.length,
    }));
    return res.status(200).json({
      hecho: true, borrados: viejos.length, reservasLiberadas: liberadas.length,
    });

  } catch (err) {
    console.error('La purga de pedidos falló:', err && err.message);
    // 500 para que el panel de crons de Vercel marque la corrida como fallida
    return res.status(500).json({ error: 'La purga falló' });
  }
}
