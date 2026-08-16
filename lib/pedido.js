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

/* ---------------------------------------------------------------------------
   CÓDIGOS DE DESCUENTO
   ---------------------------------------------------------------------------
   Aquí y SOLO aquí: el navegador pregunta por /api/descuento y el cobro los
   aplica este archivo. No hay segunda lista que mantener.

   Tres tipos:
     porcentaje   valor = 10  →  10% menos sobre los productos
     fijo         valor = 5000  →  $5.000 menos (nunca más que el subtotal)
     enviogratis  el envío sale gratis, sin tocar los productos

   El descuento se aplica sobre los PRODUCTOS; el envío gratis por monto
   (ENVIO_GRATIS_DESDE) se gana con el subtotal YA descontado, que es lo que
   de verdad se paga.

   ⚠️ Este archivo se sirve público: cualquiera puede leer estos códigos, como
   quien lee el menú. No pongas aquí códigos que deban ser secretos — para un
   código personal habría que moverlos a una variable de entorno.

   Los cupones funcionan SOLO con Wompi (la pasarela actual). Mercado Pago
   arma su cobro sumando los items y no puede representar un descuento de
   pedido: si el modo volviera a 'mercadopago', la web esconde la caja y no
   aplica ningún cupón (cuponesDisponibles en app.js).

   Para apagar un código: activo: false. Para estrenar uno, copia una línea. */
export const CODIGOS = {
  // 'BIENVENIDA10': { tipo: 'porcentaje', valor: 10, activo: true },
  // 'CAFETERO':     { tipo: 'fijo', valor: 5000, activo: true },
  // 'SINENVIO':     { tipo: 'enviogratis', activo: true },
  // Sirvió para verificar el circuito completo en producción el 15 de agosto;
  // queda de ejemplo. Los códigos reales los decide Andrés.
  'PRUEBA-INTERNA-D1': { tipo: 'fijo', valor: 1, activo: false },
};

/* ---------------------------------------------------------------------------
   CÓDIGOS SECRETOS
   ---------------------------------------------------------------------------
   Los de arriba se leen en la web; estos NO. Viven en la variable de entorno
   CODIGOS_SECRETOS de Vercel, así que solo los conoce quien los recibió —por
   ejemplo, en el correo de bienvenida del boletín.

   Formato, una línea (o varias separadas por coma o salto de línea):

       NOMBRE:tipo:valor:unico

   El cuarto campo es opcional y admite dos marcas:

       unico        una vez POR PERSONA, medido por el correo con el que paga
       unicoglobal  una sola vez EN TOTAL: el primero que lo use lo mata

   Ejemplos inventados, NO los códigos vivos — este archivo se sirve público y
   escribir aquí uno real lo regalaría:

       BIENVENIDA_EJEMPLO:porcentaje:10:unico
       REGALO_EJEMPLO:fijo:40000:unicoglobal
       ENVIO_EJEMPLO:enviogratis:0

   Si la variable no existe, esto simplemente no aporta ningún código. --------- */
function codigosSecretos() {
  const bruto = (process.env.CODIGOS_SECRETOS || '').trim();
  if (!bruto) return {};
  const salida = {};
  for (const linea of bruto.split(/[\n,]+/)) {
    const partes = linea.trim().split(':').map(s => s.trim());
    if (partes.length < 3) continue;
    const [nombre, tipo, valor, marca] = partes;
    const codigo = String(nombre || '').toUpperCase();
    if (!codigo) continue;
    const m = String(marca || '').toLowerCase();
    salida[codigo] = {
      tipo: String(tipo || '').toLowerCase(),
      valor: Number(valor),
      activo: true,
      unicoPorPersona: m === 'unico',
      unicoGlobal: m === 'unicoglobal',
    };
  }
  return salida;
}

/* Cuántos códigos puede acumular un pedido. No es un capricho: cada uno suma
   una consulta al almacén al pagar, y más de tres en un mismo carrito es señal
   de que alguien está probando combinaciones, no comprando café. */
export const MAX_CODIGOS = 3;

/* Lee varios códigos: acepta un texto con comas, un arreglo, o uno suelto.
   Devuelve los cupones válidos, sin repetidos y en el orden en que llegaron. */
export function leerCodigos(bruto) {
  const crudos = Array.isArray(bruto)
    ? bruto
    : String(bruto || '').split(',');
  const vistos = new Set();
  const salida = [];
  for (const c of crudos) {
    const cupon = leerCodigo(c);
    if (!cupon || vistos.has(cupon.codigo)) continue;
    vistos.add(cupon.codigo);
    salida.push(cupon);
    if (salida.length >= MAX_CODIGOS) break;
  }
  return salida;
}

/* Normaliza y busca un código. Devuelve { codigo, tipo, valor, unicoPorPersona }
   o null. Los secretos ganan a los públicos si coincidiera el nombre. */
export function leerCodigo(bruto) {
  const codigo = String(bruto || '').trim().toUpperCase().slice(0, 30);
  if (!codigo || !/^[A-Z0-9_-]+$/.test(codigo)) return null;
  const c = codigosSecretos()[codigo] || CODIGOS[codigo];
  if (!c || !c.activo) return null;
  const tipo = c.tipo;
  const unicoPorPersona = !!c.unicoPorPersona;
  const unicoGlobal = !!c.unicoGlobal;
  if (tipo === 'enviogratis') return { codigo, tipo, valor: 0, unicoPorPersona, unicoGlobal };
  const valor = Math.round(Number(c.valor));
  if (!Number.isFinite(valor) || valor <= 0) return null;
  if (tipo === 'porcentaje' && valor > 100) return null;
  if (tipo !== 'porcentaje' && tipo !== 'fijo') return null;
  return { codigo, tipo, valor, unicoPorPersona, unicoGlobal };
}
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
   Devuelve { lineas, moliendas, subtotal, descuento, codigo, costoEnvio, total }.
   `codigoBruto` es opcional: si no resuelve a un código activo, se ignora en
   silencio — el pedido sale sin descuento, nunca falla por un código malo. */
export function construirPedido(entrada, codigoBruto) {
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

  /* Varios códigos se ACUMULAN. Las reglas, para que sean predecibles:
       porcentajes  se suman entre ellos y se aplican una vez sobre el subtotal
                    (10 % + 5 % = 15 % del subtotal, no un 5 % sobre el resto:
                    encadenarlos daría un número que nadie sabe calcular de
                    cabeza, y aquí el cliente tiene que poder cuadrar la cuenta)
       fijos        se suman
       enviogratis  basta uno para que el envío salga gratis
     El descuento nunca supera el subtotal: un total negativo no existe. */
  const cupones = leerCodigos(codigoBruto);
  let descuento = 0;
  if (cupones.length && subtotal > 0) {
    const pct = cupones.filter(c => c.tipo === 'porcentaje')
                       .reduce((a, c) => a + c.valor, 0);
    const fijo = cupones.filter(c => c.tipo === 'fijo')
                        .reduce((a, c) => a + c.valor, 0);
    descuento = Math.round(subtotal * Math.min(pct, 100) / 100) + fijo;
    descuento = Math.min(descuento, subtotal);
  }
  const subtotalReal = subtotal - descuento;
  const envioGratisPorCupon = cupones.some(c => c.tipo === 'enviogratis');

  const costoEnvio =
    envioGratisPorCupon ? 0 :
    (ENVIO_GRATIS_DESDE > 0 && subtotalReal >= ENVIO_GRATIS_DESDE) ? 0 : ENVIO;

  /* GUARDA DE NO EMPEORAR.
     El envío gratis se gana con el subtotal ya descontado, así que un descuento
     puede tirar el carrito por debajo del umbral y devolver los $15.000 del
     envío. Ejemplo real: 39.500 + 85.000 = 124.500 lleva envío gratis; con un
     10% baja a 112.050, vuelve a cobrarse el envío y el total SUBE a 127.050.
     El cliente pagaba 2.550 de más por usar su código — y con los códigos de
     un solo uso, además lo quemaba para siempre.

     Si el cupón no mejora el precio, no se aplica. Devolver codigo:'' es la
     mitad importante: sin código no hay canje que anotar, así que tampoco se
     gasta. Un descuento que no descuenta no puede costarle nada a nadie. */
  if (cupones.length) {
    const envioSinCupon = (ENVIO_GRATIS_DESDE > 0 && subtotal >= ENVIO_GRATIS_DESDE) ? 0 : ENVIO;
    if (subtotalReal + costoEnvio >= subtotal + envioSinCupon) {
      return {
        lineas, moliendas, subtotal,
        descuento: 0, codigos: [], codigo: '',
        costoEnvio: envioSinCupon,
        total: subtotal + envioSinCupon,
      };
    }
  }

  const codigos = cupones.map(c => c.codigo);
  return {
    lineas, moliendas, subtotal,
    descuento,
    codigos,
    // Se conserva `codigo` como texto para lo que solo quiere mostrarlo
    codigo: codigos.join(' + '),
    costoEnvio,
    total: subtotalReal + costoEnvio,
  };
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
