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

import { list, del } from '@vercel/blob';
import { hayGuardado } from '../lib/guardado.js';

const HORAS_DE_VIDA = 72;

export default async function handler(req, res) {
  const secreto = (process.env.CRON_SECRET || '').trim();
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!hayGuardado()) {
    return res.status(200).json({ hecho: false, motivo: 'sin store conectado' });
  }

  const limite = Date.now() - HORAS_DE_VIDA * 3600 * 1000;

  try {
    const viejos = [];
    let cursor;
    // list() pagina de a 1000; se recorre entero por si algún día se acumulan
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

    // Solo la cuenta: nada de referencias ni datos en el registro
    console.log('Purga de pedidos guardados:', JSON.stringify({ borrados: viejos.length }));
    return res.status(200).json({ hecho: true, borrados: viejos.length });

  } catch (err) {
    console.error('La purga de pedidos falló:', err && err.message);
    // 500 para que el panel de crons de Vercel marque la corrida como fallida
    return res.status(500).json({ error: 'La purga falló' });
  }
}
