/* ============================================================================
   PEDIDO · LA VERDAD SOBRE PRECIOS Y DATOS DEL CLIENTE
   ----------------------------------------------------------------------------
   Este archivo se EJECUTA solo en el servidor y lo comparten las dos pasarelas
   (Wompi y Mercado Pago). Existe para que el precio viva en un único lugar:
   si estuviera copiado en cada endpoint, tarde o temprano quedarían distintos.

   ⚠️ OJO: "se ejecuta en el servidor" NO quiere decir que sea privado. Vercel
   también lo sirve como archivo estático, así que cualquiera puede leerlo en
   hysteriacoffeeroasters.com/lib/pedido.js — está marcado como no indexable,
   pero es legible. NUNCA escribas aquí una clave ni un secreto: van en las
   variables de entorno de Vercel y se leen con process.env.

   El navegador nunca fija un precio. Manda qué producto, cuántos, qué tamaño
   y qué molienda; el monto se vuelve a calcular aquí desde esta tabla.

   👉 Si cambias un precio en assets/js/datos.js, cámbialo también aquí.
   👉 Si agregas un LOTE nuevo, agrégalo aquí con su mismo "id".
      Si no está en esta lista, no se puede comprar.
   ========================================================================== */

export const CATALOGO = {
  // Con "presentaciones", el precio sale del tamaño que pidió el cliente.
  // Debe coincidir con COLECCIONES[].presentaciones en assets/js/datos.js
  'pasion-colombia':        { nombre: 'Café Pasión · Colombia',                      precio: 39500,
                              presentaciones: { 340: 39500, 1000: 85000, 2500: 185000 } },
  'pasion-narino':          { nombre: 'Café Pasión · Caturra',                       precio: 39500,
                              presentaciones: { 340: 39500, 1000: 85000, 2500: 185000 } },
  'ilusion-borbon-rosado':  { nombre: 'Café Ilusión · Borbón Rosado · Bolsa 340 g',  precio: 59500 },
  'ilusion-borbon-amarillo':{ nombre: 'Café Ilusión · Borbón Amarillo · Bolsa 340 g',precio: 59500 },
  'deseo-borbon-rojo':      { nombre: 'Café Deseo · Borbón Rojo · Bolsa 340 g',      precio: 75000 },
  'euforia-borbon-naranja': { nombre: 'Café Euforia · Borbón Naranja · Bolsa 250 g', precio: 75000 },
  'pasaporte':              { nombre: 'Pasaporte Compass',                           precio: 25000 },
};

export const ENVIO = 15000;
export const ENVIO_GRATIS_DESDE = 120000;
export const MAX_UNIDADES = 50;

// Documentos que acepta la DIAN para el adquiriente
export const DOCS_VALIDOS = ['CC', 'CE', 'NIT', 'PA', 'PEP', 'PPT', 'TI'];

/* Puntos de molienda. Debe coincidir con MOLIENDAS en assets/js/datos.js.
   'grano' significa que la bolsa va sin moler. */
export const MOLIENDAS = {
  'grano':        'grano entero',
  'fina':         'molienda fina',
  'medio-fina':   'molienda medio fina',
  'media':        'molienda media',
  'media-gruesa': 'molienda media gruesa',
  'gruesa':       'molienda gruesa',
};

// Dominio canónico fijo para las URLs de retorno. No se deriva de las cabeceras
// del request (evita el anti-patrón host-header).
export const SITE_URL =
  (process.env.SITE_URL || 'https://www.hysteriacoffeeroasters.com').replace(/\/$/, '');

const etiquetaGramos = n =>
  n < 1000 ? `${n} g` : `${String(n / 1000).replace('.', ',')} kg`;

/* Reconstruye el pedido desde cero con NUESTROS precios.
   Devuelve { lineas, moliendas, subtotal, costoEnvio, total } */
export function construirPedido(entrada) {
  const lineas = [];
  const moliendas = [];
  let subtotal = 0;

  for (const linea of (Array.isArray(entrada) ? entrada : [])) {
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

    // Tamaño de la bolsa: solo se acepta uno de los declarados arriba. Lo que
    // manda el navegador nunca fija el precio, solo elige entre los nuestros.
    let precio = prod.precio;
    let etiquetaTamano = '';
    if (prod.presentaciones) {
      const g = String(parseInt(linea.gramos, 10) || '');
      const elegido = Object.prototype.hasOwnProperty.call(prod.presentaciones, g)
        ? g
        : String(Object.keys(prod.presentaciones)[0]);
      precio = prod.presentaciones[elegido];
      etiquetaTamano = ' · Bolsa ' + etiquetaGramos(Number(elegido));
    }

    subtotal += precio * cant;
    lineas.push({
      id: linea.id,
      titulo: prod.nombre + etiquetaTamano + (molienda ? ` · ${MOLIENDAS[molienda]}` : ''),
      cantidad: cant,
      precio,
    });
  }

  const costoEnvio =
    (ENVIO_GRATIS_DESDE > 0 && subtotal >= ENVIO_GRATIS_DESDE) ? 0 : ENVIO;

  return { lineas, moliendas, subtotal, costoEnvio, total: subtotal + costoEnvio };
}

// Acepta dominios con varios niveles (unal.edu.co, empresa.com.co…)
const CORREO_OK = /^[^\s@,;:<>()[\]\\]+@[^\s@.,;:<>()[\]\\]+(\.[^\s@.,;:<>()[\]\\]+)*\.[A-Za-z]{2,}$/;

/* Recorta y normaliza los datos de envío que escribió el cliente.
   Nunca se confía en lo que llega del navegador. */
export function leerDestino(e = {}) {
  const limpio = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  return {
    nombre:    limpio(e.nombre, 80),
    telefono:  limpio(e.telefono, 30),
    correo:    limpio(e.correo, 254).toLowerCase(),
    doctipo:   limpio(e.doctipo, 6).toUpperCase(),
    docnum:    limpio(e.docnum, 25),
    ciudad:    limpio(e.ciudad, 60),
    direccion: limpio(e.direccion, 160),
    notas:     limpio(e.notas, 200),
  };
}

/* Devuelve un mensaje de error, o null si los datos están completos */
export function validarDestino(d) {
  if (!d.nombre || !d.telefono || !d.ciudad || !d.direccion ||
      !CORREO_OK.test(d.correo) || !d.doctipo ||
      d.docnum.replace(/[\s.-]/g, '').length < 5) {
    return 'Faltan datos de envío o facturación';
  }
  if (!DOCS_VALIDOS.includes(d.doctipo)) return 'Tipo de documento no válido';
  return null;
}

/* Nº de pedido corto y legible, para cruzar el pago con el despacho.
   Lleva algo de azar para que dos intentos seguidos nunca choquen. */
export function nuevaReferencia() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HYS-${t}-${r}`;
}
