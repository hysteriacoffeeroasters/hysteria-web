/* ============================================================================
   PEDIDOS GUARDADOS · VERCEL BLOB
   ----------------------------------------------------------------------------
   El detalle de un pedido —qué café, qué molienda, a qué dirección— solo vive
   en el navegador del cliente hasta que paga. Si no vuelve a la web tras el
   pago (PSE y efectivo confirman tarde), el webhook de Wompi solo conoce el
   monto y la hoja de despacho saldría sin detalle.

   Por eso api/wompi.js guarda aquí el pedido completo al crear el pago, y el
   webhook lo recupera por la referencia: la hoja sale completa aunque el
   cliente cierre la pestaña.

   ⚠️ AQUÍ HAY DATOS PERSONALES: nombre, dirección, teléfono y documento. Por
   eso el store es PRIVADO —leerlo exige token—, el pedido se borra en cuanto
   la hoja de despacho sale (o el pago muere: DECLINED/VOIDED/ERROR), y
   api/limpiar-pedidos.js purga a diario lo que quede huérfano (checkouts
   abandonados). Si algún día se pasa el store a público, esto queda expuesto
   a cualquiera que adivine la referencia.

   Si BLOB_READ_WRITE_TOKEN no está, todo esto no hace nada y el sitio se
   comporta como antes de existir este archivo. Ninguna función de aquí lanza,
   y todas llevan tiempo límite: un almacén caído o COLGADO no puede tumbar un
   pago ni dejar al webhook sin responder (si el webhook no responde, Wompi
   agota sus reintentos y el aviso se pierde del todo).
   ========================================================================== */

import { put, get, del, head } from '@vercel/blob';
import { createHash } from 'node:crypto';

const CARPETA = 'pedidos';
const CARPETA_USOS = 'usos';

/** ¿Hay store conectado? Sin token, todo esto queda inerte. */
export function hayGuardado() {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

/* El fallo silencioso es el enemigo aquí: sin token todo "funciona" pero no se
   guarda nada, exactamente el problema que este archivo viene a arreglar. Se
   avisa una sola vez por instancia para no inundar el registro. */
let avisadoSinToken = false;
function avisarSiFaltaToken() {
  if (hayGuardado() || avisadoSinToken) return;
  avisadoSinToken = true;
  console.error('BLOB_READ_WRITE_TOKEN no está: los pedidos NO se están ' +
    'guardando. Conecta el store al proyecto en Vercel → Storage.');
}

/* La referencia la genera el servidor (nuevaReferencia), pero aun así se filtra
   antes de construir una ruta con ella: si algún día llegara de fuera, un
   '../' podría escribir donde no debe. */
function ruta(referencia) {
  const limpia = String(referencia || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return limpia ? `${CARPETA}/${limpia}.json` : '';
}

/** Guarda el pedido completo. Devuelve true solo si quedó escrito. */
export async function guardarPedido(referencia, datos) {
  const r = ruta(referencia);
  avisarSiFaltaToken();
  if (!r || !hayGuardado()) return false;
  try {
    await put(r, JSON.stringify({ ...datos, guardadoEn: new Date().toISOString() }), {
      access: 'private',
      contentType: 'application/json',
      // Sin sufijo aleatorio: la ruta tiene que poder reconstruirse desde la
      // referencia, que es lo único que trae el evento de Wompi.
      addRandomSuffix: false,
      allowOverwrite: true,
      // Al agotarse lanza, lo atrapa el catch, y el pago sigue su curso sin
      // detalle guardado — que es tolerable; colgar el checkout no.
      abortSignal: AbortSignal.timeout(3000),
    });
    return true;
  } catch (err) {
    // No se relanza a propósito: si el guardado falla, el cliente igual tiene
    // que poder pagar. Se pierde el detalle, no la venta.
    console.error('No se pudo guardar el pedido ' + referencia + ':', err && err.message);
    return false;
  }
}

/** Recupera el pedido guardado, o null si no está. */
export async function leerPedido(referencia) {
  const r = ruta(referencia);
  if (!r || !hayGuardado()) return null;
  try {
    const res = await get(r, {
      access: 'private',
      // Más holgado que el de escritura: aquí quien espera es el webhook de
      // Wompi, no una persona. Pero SIN límite no puede ir: si esto colgara,
      // Wompi agotaría sus 3 reintentos contra un webhook mudo y no saldría
      // ni el aviso provisional.
      abortSignal: AbortSignal.timeout(5000),
    });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    const texto = await new Response(res.stream).text();
    const datos = JSON.parse(texto);
    return datos && typeof datos === 'object' ? datos : null;
  } catch (err) {
    // Que no exista es lo normal (pedidos anteriores a esto, o ya despachados)
    console.error('No se pudo leer el pedido ' + referencia + ':', err && err.message);
    return null;
  }
}

/* ── Canjes de códigos de un solo uso ──────────────────────────────────────
   Un código marcado 'unico' se puede usar una sola vez por persona. La persona
   se identifica por el CORREO con el que paga: es lo único que tenemos, y es
   el mismo dato con el que recibió el código en el boletín.

   El correo NO se guarda: se guarda su huella (SHA-256). Basta para responder
   "¿este correo ya lo usó?" y evita dejar en el almacén una lista permanente
   de correos de clientes, que es justo lo que no queremos acumular.

   Límite honesto: quien use otro correo consigue otro descuento. Cerrarlo del
   todo exigiría verificar identidad, que no compensa para un 10 %. */
function rutaUso(codigo, correo) {
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
  const e = String(correo || '').trim().toLowerCase();
  if (!c || !e) return '';
  const huella = createHash('sha256').update(e).digest('hex').slice(0, 32);
  return `${CARPETA_USOS}/${c}/${huella}.json`;
}

/** ¿Este correo ya usó este código? Ante la duda devuelve false: preferimos
    regalar un descuento de más antes que bloquear una compra legítima. */
export async function yaUsoElCodigo(codigo, correo) {
  const r = rutaUso(codigo, correo);
  if (!r || !hayGuardado()) return false;
  try {
    const info = await head(r, { abortSignal: AbortSignal.timeout(3000) });
    return !!info;
  } catch (err) {
    // head() lanza BlobNotFoundError cuando no existe: ese es el caso normal
    return false;
  }
}

/** Anota que este correo ya usó el código. Solo tras un pago APROBADO. */
export async function anotarUsoDelCodigo(codigo, correo, referencia) {
  const r = rutaUso(codigo, correo);
  if (!r || !hayGuardado()) return false;
  try {
    await put(r, JSON.stringify({ referencia, usadoEn: new Date().toISOString() }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      abortSignal: AbortSignal.timeout(3000),
    });
    return true;
  } catch (err) {
    console.error('No se pudo anotar el uso de ' + codigo + ':', err && err.message);
    return false;
  }
}

/** Borra el pedido. Se llama cuando la hoja de despacho ya salió. */
export async function olvidarPedido(referencia) {
  const r = ruta(referencia);
  if (!r || !hayGuardado()) return false;
  try {
    await del(r, { abortSignal: AbortSignal.timeout(3000) });
    return true;
  } catch (err) {
    console.error('No se pudo borrar el pedido ' + referencia + ':', err && err.message);
    return false;
  }
}
