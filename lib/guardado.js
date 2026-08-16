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
function huellaCorreo(correo) {
  const e = String(correo || '').trim().toLowerCase();
  return e ? createHash('sha256').update(e).digest('hex').slice(0, 32) : '';
}

function rutaUso(codigo, correo) {
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
  const huella = huellaCorreo(correo);
  if (!c || !huella) return '';
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

/* ── Códigos de un solo uso EN TODA LA VIDA ────────────────────────────────
   Distinto del anterior: aquí no es uno por persona, es uno y ya. En cuanto
   alguien lo gasta, el código muere para todos.

   Eso obliga a RESERVARLO al ir a pagar, no al aprobarse el pago: si se
   esperara a la aprobación, dos personas podrían pagar a la vez y las dos se
   llevarían el descuento. La reserva se hace con allowOverwrite en false, que
   lanza si el archivo ya existe: gana quien llegue primero, sin carreras.

   El precio de reservar antes de cobrar es que un carrito abandonado deja el
   código bloqueado. Por eso la reserva nace SIN confirmar: si el pago muere se
   libera en el acto, y si nadie vuelve, la purga diaria la suelta a las 72 h.
   Solo una reserva confirmada es definitiva. */
function rutaGlobal(codigo) {
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
  return c ? `${CARPETA_USOS}/${c}/GLOBAL.json` : '';
}

/** Intenta reservar el código. true = es tuyo; false = alguien se te adelantó. */
export async function reservarCodigoGlobal(codigo, referencia, correo) {
  const r = rutaGlobal(codigo);
  if (!r) return false;
  /* Sin store no hay forma de garantizar el uso único. Se deja pasar, porque
     bloquear todas las compras por un fallo del almacén es peor que el riesgo
     de un descuento repetido — pero queda avisado en el registro. */
  if (!hayGuardado()) {
    console.error('CODIGO_GLOBAL_SIN_CONTROL ' + codigo + ': no hay store, no se puede garantizar el uso único');
    return true;
  }
  const huella = huellaCorreo(correo);
  const contenido = () => JSON.stringify({
    referencia, huella, confirmado: false,
    reservadoEn: new Date().toISOString(),
  });
  try {
    await put(r, contenido(), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: false,   // lanza si ya existe: ahí está la exclusividad
      abortSignal: AbortSignal.timeout(3000),
    });
    return true;
  } catch (err) {
    /* Ya hay una reserva. Antes de negar, se mira DE QUIÉN es: si es del mismo
       cliente y todavía no se confirmó, es él reintentando —le rechazaron la
       tarjeta, o abandonó y volvió— y sería absurdo decirle que su propio
       código "ya se usó". Se le devuelve la reserva con la referencia nueva.

       Solo se cede ante una reserva SIN CONFIRMAR: una confirmada significa
       que ese pago sí entró, y ahí el código está gastado para todos. */
    try {
      const previa = await get(r, { access: 'private', abortSignal: AbortSignal.timeout(3000) });
      if (previa && previa.statusCode === 200 && previa.stream) {
        const d = JSON.parse(await new Response(previa.stream).text());
        if (d && d.confirmado === false && huella && d.huella === huella) {
          await put(r, contenido(), {
            access: 'private', contentType: 'application/json',
            addRandomSuffix: false, allowOverwrite: true,
            abortSignal: AbortSignal.timeout(3000),
          });
          return true;
        }
      }
    } catch (e) { /* si no se puede leer, se niega: el lado seguro */ }
    return false;
  }
}

/** Vuelve definitiva la reserva. Solo tras un pago aprobado. */
export async function confirmarCodigoGlobal(codigo, referencia) {
  const r = rutaGlobal(codigo);
  if (!r || !hayGuardado()) return false;
  try {
    await put(r, JSON.stringify({ referencia, confirmado: true, confirmadoEn: new Date().toISOString() }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      abortSignal: AbortSignal.timeout(3000),
    });
    return true;
  } catch (err) {
    console.error('No se pudo confirmar el código global ' + codigo + ':', err && err.message);
    return false;
  }
}

/** Suelta la reserva: el pago murió y el código vuelve a estar disponible. */
export async function liberarCodigoGlobal(codigo) {
  const r = rutaGlobal(codigo);
  if (!r || !hayGuardado()) return false;
  try {
    await del(r, { abortSignal: AbortSignal.timeout(3000) });
    return true;
  } catch (err) {
    console.error('No se pudo liberar el código global ' + codigo + ':', err && err.message);
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
