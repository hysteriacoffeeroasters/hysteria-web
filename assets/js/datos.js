/* ============================================================================
   HYSTERIA COFFEE ROASTERS · DATOS DEL NEGOCIO
   ----------------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS EDITAR.

   Cambia precios, lotes de café, horarios, menú y contacto aquí.
   NO toques los otros archivos: el diseño se actualiza solo.

   Busca las marcas  ⚠️ REVISAR  para ver qué falta confirmar.

   Menú y precios tomados de "menú hysteria final (1).pdf"
   ========================================================================== */


/* ---------------------------------------------------------------------------
   1) CONTACTO Y REDES
   --------------------------------------------------------------------------- */
const NEGOCIO = {

  // ⚠️ REVISAR — Número de WhatsApp para recibir pedidos.
  // Formato internacional SIN "+", SIN espacios. Colombia = 57 + número.
  // Ejemplo real: '573145557788'
  // Mientras diga 'PENDIENTE', el botón de pedido usará el correo.
  whatsapp: 'PENDIENTE',

  // ⚠️ REVISAR — ¿Es este el correo correcto para pedidos?
  correo: 'hysteriacoffeeroasters@gmail.com',

  // ⚠️ REVISAR — Teléfono visible. Déjalo en 'PENDIENTE' para ocultarlo.
  telefono: 'PENDIENTE',

  instagram: 'https://www.instagram.com/hysteriacoffeeroasters/',

  // Deja '' (vacío) para ocultar el enlace.
  facebook: '',

  ciudad: 'Bogotá',
  pais: 'Colombia',
  fundacion: '2021',
};


/* ---------------------------------------------------------------------------
   2) CÓMO SE COBRA
   --------------------------------------------------------------------------- */
const PAGOS = {

  // 'mercadopago' → checkout real: tarjetas, PSE, Efecty, cuotas  (recomendado)
  // 'whatsapp'    → el pedido se cierra por WhatsApp, sin cobro en línea
  modo: 'mercadopago',

  // Si Mercado Pago falla o aún no lo has configurado, el carrito
  // cae automáticamente en WhatsApp para no perder la venta.
  respaldoWhatsapp: true,

  /* ⚠️ IMPORTANTE — tu credencial de Mercado Pago NO va en este archivo.
     Este archivo lo puede leer cualquiera que visite la web.

     El token se guarda en Vercel como variable de entorno:
       Vercel → tu proyecto → Settings → Environment Variables
       Nombre:  MP_ACCESS_TOKEN
       Valor:   tu "Access Token" de producción de Mercado Pago
                (mercadopago.com.co/developers → Tus integraciones → Credenciales)

     La función segura ya está lista en  api/crear-preferencia.js          */

  // Costo de envío en pesos. Pon 0 para envío gratis siempre.
  envio: 15000,

  // Compras iguales o mayores a este monto llevan envío gratis. 0 = desactivado.
  envioGratisDesde: 120000,

  moneda: 'COP',
};


/* ---------------------------------------------------------------------------
   3) LAS COLECCIONES
   ---------------------------------------------------------------------------
   Pasión, Ilusión, Deseo y Euforia son NIVELES fijos de tu marca.
   El café que va dentro (el lote) rota.

   👉 CUANDO CAMBIES DE LOTE: edita solo el bloque "lote".
      El resto del sitio se actualiza solo.

   El campo "notas" está vacío a propósito: no invento notas de cata.
   Escribe las reales y aparecerán en la web. Si lo dejas vacío, no se muestra.
   Lo mismo con cualquier campo en 'PENDIENTE'.
   --------------------------------------------------------------------------- */
const COLECCIONES = [
  {
    id: 'pasion',
    nombre: 'Pasión',
    color: '#E42320',
    flor: 'assets/collections/pasion.png',
    etiqueta: 'assets/products/pasion.jpg',
    descripcion: 'La puerta de entrada. Un café limpio y equilibrado para tomar todos los días sin perder carácter.',

    gramos: 340,
    lote: {
      origen:    'Huila',
      variedad:  'Caturra',
      proceso:   'Lavado',
      notas:     '',            // ← ej: 'Panela · naranja · chocolate con leche'
      altura:    '',            // ← ej: '1.750 msnm'
      productor: '',            // ← ej: 'Finca La Esperanza · familia Ramírez'
      tueste:    'Medio',
    },

    precios: {
      bolsa:      39500,   // bolsa de 340 g
      taza:       11500,   // taza en método filtrado
      parDeTazas: 17000,
    },

    etiquetas: ['Más vendido'],   // insignias. Deja [] para ninguna.
    agotado: false,
  },

  {
    id: 'ilusion',
    nombre: 'Ilusión',
    color: '#A11AD3',
    flor: 'assets/collections/ilusion.png',
    etiqueta: 'assets/products/ilusion.jpg',
    descripcion: 'Un paso más arriba. Variedades de mayor complejidad y una taza con más matices aromáticos.',

    gramos: 340,
    lote: {
      origen:    'Huila',
      variedad:  'Pacamara',
      proceso:   'Lavado',
      notas:     '',
      altura:    '',
      productor: '',
      tueste:    'Medio',
    },

    precios: {
      bolsa:      59500,
      taza:       15800,
      parDeTazas: 20800,
    },

    etiquetas: [],
    agotado: false,
  },

  {
    id: 'deseo',
    nombre: 'Deseo',
    color: '#0068FF',
    flor: 'assets/collections/deseo.png',
    etiqueta: 'assets/products/deseo.jpg',
    descripcion: 'Lo más alto de la casa. Lotes experimentales y de fermentación controlada, en cantidad limitada.',

    gramos: 340,
    lote: {
      origen:    'Huila',
      variedad:  'Borbón Rojo',
      proceso:   'Natural · Experimental',
      notas:     '',
      altura:    '',
      productor: '',
      tueste:    'Medio',
    },

    precios: {
      bolsa:      75000,
      taza:       17000,
      parDeTazas: 22500,
    },

    etiquetas: ['Edición limitada'],
    agotado: false,
  },

  {
    id: 'euforia',
    nombre: 'Euforia',
    color: '#F49A1A',
    flor: 'assets/collections/euforia.png',
    etiqueta: 'assets/products/euforia.jpg',

    // ⚠️ REVISAR — Escribe la descripción real de esta colección.
    descripcion: 'La colección más reciente de la casa, en presentación de 250 g.',

    gramos: 250,
    // ⚠️ REVISAR — No encontré la ficha de este lote en tus archivos.
    // Llena estos campos y aparecerán solos en la web.
    lote: {
      origen:    'PENDIENTE',
      variedad:  'PENDIENTE',
      proceso:   'PENDIENTE',
      notas:     '',
      altura:    '',
      productor: '',
      tueste:    '',
    },

    precios: {
      bolsa:      75000,
      taza:       17000,
      parDeTazas: 22500,
    },

    etiquetas: ['Nuevo'],
    agotado: false,
  },
];


/* ---------------------------------------------------------------------------
   4) PASAPORTE COMPASS
   --------------------------------------------------------------------------- */
const PASAPORTE = {
  activo: true,
  nombre: 'Pasaporte Compass',
  precio: 25000,
  descripcion: 'Tu recorrido por las colecciones. Sella cada café que pruebas y desbloquea beneficios en tienda.',
};


/* ---------------------------------------------------------------------------
   5) PROMOCIONES
   ---------------------------------------------------------------------------
   ⚠️ REVISAR — Vienen de tu documento "Promociones Hysteria 2026", que tenía
   la fecha de cierre sin definir. Confirma que siguen vigentes.

   ⚠️ Estas promos son ANTERIORES a Euforia: no incluyen esa colección.
      Si quieres sumarla, copia una línea de "precios" y ajusta el valor.

   Para ocultar una: cambia  activa: true  →  activa: false
   Para ocultar la sección completa: PROMOCIONES.mostrar = false
   --------------------------------------------------------------------------- */
const PROMOCIONES = {
  mostrar: true,
  vigencia: 'Consulta vigencia en tienda',   // texto libre, o '' para ocultarlo

  lista: [
    {
      activa: true,
      destacada: true,
      nombre: 'Desata la Hysteria en casa',
      resumen: 'Llévate el Pasaporte Compass y recibe 20% de descuento en tu bolsa, más una taza en método filtrado del mismo café.',
      incluye: ['1 Pasaporte Compass', '1 bolsa de café con 20% dcto.', '1 taza en método filtrado'],
      // un precio por colección
      precios: [
        { etiqueta: 'Pasión',  antes: 76000,  ahora: 56600 },
        { etiqueta: 'Ilusión', antes: 100300, ahora: 72600 },
        { etiqueta: 'Deseo',   antes: 117000, ahora: 85000 },
      ],
    },
    {
      activa: true,
      destacada: false,
      nombre: 'Lemon Coffee & Cake',
      resumen: 'Cold brew con panela y limón, acompañado de una porción de torta de almojábana o zanahoria.',
      incluye: ['1 Lemon Coffee', '1 porción de torta a elección'],
      // "antes" recalculado con el menú nuevo: $14.000 + $12.000
      precios: [
        { etiqueta: 'Combo', antes: 26000, ahora: 20000 },
      ],
    },
    {
      activa: true,
      destacada: false,
      nombre: 'Drip & Croissant',
      resumen: 'Un café en método filtrado de la colección que elijas, con croissant recién horneado.',
      incluye: ['1 café filtrado', '1 croissant'],
      precios: [
        { etiqueta: 'Pasión',  antes: 22500, ahora: 18000 },
        { etiqueta: 'Ilusión', antes: 26800, ahora: 21440 },
        { etiqueta: 'Deseo',   antes: 28000, ahora: 22400 },
      ],
    },
  ],
};


/* ---------------------------------------------------------------------------
   6) MENÚ DE LA TIENDA
   ---------------------------------------------------------------------------
   ✔ Tomado tal cual de "menú hysteria final (1).pdf".
     Si cambias el menú impreso, actualiza aquí también.
   --------------------------------------------------------------------------- */
const MENU = [
  {
    id: 'classic',
    nombre: 'Classic',
    nota: 'Preparado con el café de la colección que elijas.',
    items: [
      { nombre: 'Espresso',       desc: '', precio: 7500 },
      { nombre: 'Long Black',     desc: '', precio: 7500 },
      { nombre: 'Cappu / Latte',  desc: '', precio: 11000 },
      { nombre: 'Flat White',     desc: '', precio: 11000 },
      { nombre: 'Mokka',          desc: '', precio: 14500 },
    ],
  },
  {
    id: 'icedcoffee',
    nombre: 'Iced Coffee',
    nota: '',
    items: [
      { nombre: 'Cold Brew',            desc: '', precio: 12000 },
      { nombre: 'Iced Latte',           desc: '', precio: 14000 },
      { nombre: 'Lemon Coffee',         desc: 'Cold brew con panela y limón', precio: 14000, destacado: true },
      { nombre: 'Iced Mokka',           desc: '', precio: 16500 },
      { nombre: 'Bebida de temporada',  desc: '', precio: 16500 },
    ],
  },
  {
    id: 'notcoffee',
    nombre: 'Not Coffee',
    nota: '',
    items: [
      { nombre: 'Golden Milk', desc: '', precio: 10000 },
      { nombre: 'Infusión',    desc: '', precio: 10000 },
      { nombre: 'Chai',        desc: '', precio: 10000 },
      { nombre: 'Té',          desc: '', precio: 10000 },
      { nombre: 'Matcha',      desc: '', precio: 12000 },
      { nombre: 'Chocolate',   desc: '', precio: 13000 },
    ],
  },
  {
    id: 'iceddrinks',
    nombre: 'Iced Drinks',
    nota: '',
    items: [
      { nombre: 'Iced Golden', desc: '', precio: 15000 },
      { nombre: 'Iced Chai',   desc: '', precio: 15000 },
      { nombre: 'Iced Tea',    desc: '', precio: 15000 },
      { nombre: 'Iced Matcha', desc: '', precio: 15000 },
    ],
  },
  {
    id: 'sodas',
    nombre: 'Sodas',
    nota: 'Sodas artesanales de la casa.',
    items: [
      { nombre: 'Pepino Hierbabuena',        desc: '', precio: 15000 },
      { nombre: 'Sandía Fresa Romero',       desc: '', precio: 15000 },
      { nombre: 'Toronja Frambuesa Albahaca', desc: '', precio: 15000 },
      { nombre: 'Soda de temporada',         desc: '', precio: 15000 },
    ],
  },
  {
    id: 'pasteleria',
    nombre: 'Pastelería',
    nota: 'Horneado el mismo día.',
    items: [
      { nombre: 'Arepa de yuca y queso', desc: '', precio: 7500 },
      { nombre: 'Pan de Chocolate',      desc: '', precio: 11000 },
      { nombre: 'Croissant de Queso',    desc: '', precio: 11000 },
      { nombre: 'Croissant de Almendra', desc: '', precio: 11000 },
      { nombre: 'Hysteria Cookies',      desc: '', precio: 11000 },
      { nombre: 'Arepa de Choclo',       desc: '', precio: 14000 },
    ],
  },
  {
    id: 'tortas',
    nombre: 'Tortas',
    nota: '',
    items: [
      { nombre: 'Almojábana',         desc: '', precio: 12000 },
      { nombre: 'Red Velvet',         desc: '', precio: 12000 },
      { nombre: 'Zanahoria',          desc: '', precio: 12000 },
      { nombre: 'Torta de temporada', desc: '', precio: 15000 },
    ],
  },
];


/* ---------------------------------------------------------------------------
   7) DÓNDE ESTAMOS
   ---------------------------------------------------------------------------
   ⚠️ REVISAR — Estas direcciones venían de la web anterior y parecen de relleno.
   Corrígelas. Si solo tienes una tienda, borra el segundo bloque completo.
   Si dejas 'PENDIENTE' en dirección, esa tarjeta no se muestra.
   --------------------------------------------------------------------------- */
const TIENDAS = [
  {
    etiqueta: 'Principal',
    nombre: 'Hysteria · La Candelaria',
    direccion: 'PENDIENTE',          // ej: 'Calle 12 #3-45, La Candelaria'
    barrio: 'La Candelaria',
    mapa: '',                         // pega aquí el enlace de Google Maps
    horarios: [
      { dias: 'Lunes a viernes', horas: '7:30 am – 8:00 pm' },
      { dias: 'Sábado y domingo', horas: '9:00 am – 9:00 pm' },
    ],
  },
  {
    etiqueta: 'Sucursal',
    nombre: 'Hysteria · Chapinero',
    direccion: 'PENDIENTE',          // ej: 'Carrera 7 #63-21, Chapinero Alto'
    barrio: 'Chapinero Alto',
    mapa: '',
    horarios: [
      { dias: 'Lunes a viernes', horas: '8:00 am – 7:00 pm' },
      { dias: 'Sábado', horas: '9:00 am – 6:00 pm' },
      { dias: 'Domingo', horas: 'Cerrado' },
    ],
  },
];


/* ---------------------------------------------------------------------------
   8) TEXTOS DE LA PORTADA
   --------------------------------------------------------------------------- */
const TEXTOS = {
  frase: 'El café es ese tipo de magia que te puedes tomar.',
  fraseAutor: 'Cmv',

  intro: 'Somos la unión de un sinfín de emociones, sentimientos y sensaciones que nos produce el café. Te traemos los mejores cafés colombianos de diferentes orígenes, variedades y procesos.',

  esencia: 'Queremos transmitir toda esa pasión y amor brindando los mejores cafés colombianos de diferentes orígenes, variedades y procesos, siempre resaltando y respetando el trabajo que hay detrás de un café especial.',

  mision: 'Ser una empresa influyente en el desarrollo del mercado del café de especialidad, generando cultura, conciencia e impacto al buen consumo a través de un estilo moderno y diferente, contribuyendo a la identidad y sentido de pertenencia de un producto tan nuestro como el café colombiano.',

  vision: 'Lograr un posicionamiento en el mercado de café especializado, llegando a muchos sectores sociales y siendo uno de los principales referentes de calidad y servicio, ofreciendo distintos tipos de experiencias y perfiles, trabajando siempre bajo un trato directo y precio justo con el caficultor.',
};


/* ---------------------------------------------------------------------------
   9) BOLETÍN
   ---------------------------------------------------------------------------
   Para recibir los correos de verdad necesitas un servicio de formularios.
   El más fácil y gratuito es Formspree:
     1. Entra a https://formspree.io y crea una cuenta
     2. Crea un formulario nuevo y copia el enlace que te dan
     3. Pégalo abajo en "endpoint"
   Mientras esté vacío, el formulario abre tu correo con el mensaje listo.
   --------------------------------------------------------------------------- */
const BOLETIN = {
  activo: true,
  endpoint: '',
  titulo: 'Tostados frescos, cada dos semanas.',
  subtitulo: 'Recibe primero los lotes nuevos y las ediciones limitadas.',
};
