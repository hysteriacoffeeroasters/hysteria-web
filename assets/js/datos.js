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

  // Número de WhatsApp para recibir pedidos.
  // Formato internacional SIN "+", SIN espacios. Colombia = 57 + número.
  whatsapp: '573195584123',

  // Correo de pedidos (confirmado).
  correo: 'hysteriacoffeeroasters@gmail.com',

  // Teléfono visible. Déjalo en 'PENDIENTE' para ocultarlo.
  telefono: '+57 319 558 4123',

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
   3) LAS COLECCIONES Y SUS LOTES
   ---------------------------------------------------------------------------
   Pasión, Ilusión, Deseo y Euforia son NIVELES fijos de tu marca.
   Cada colección define el PRECIO y el gramaje.

   Dentro de cada colección puede haber UNO O VARIOS LOTES.
   Cada lote es un café distinto y sale como su propia tarjeta en la web.
   Hoy Deseo tiene dos: Borbón Rojo (Huila) y Ombligón (Tolima).

   👉 PARA AGREGAR UN LOTE: copia un bloque de "lotes" y cambia los datos.
      Necesita un "id" único y una imagen en assets/products/.

   👉 PARA QUITAR UN LOTE: bórralo del arreglo, o ponle  agotado: true
      si quieres que siga visible pero sin poder comprarse.

   ⚠️ Si agregas un lote nuevo, agrégalo también en api/crear-preferencia.js
      (es la lista con la que se cobra de verdad).

   Los datos salen de "infografía hysteria final.pdf".
   Si dejas un campo vacío, simplemente no se muestra en la web.
   --------------------------------------------------------------------------- */
const COLECCIONES = [
  {
    id: 'pasion',
    nombre: 'Pasión',
    color: '#E42320',
    flor: 'assets/collections/pasion.png',
    descripcion: 'Cafés que desbordan sentimientos de amor, gusto y respeto por la diversidad de nuestros orígenes, culturas y sabores.',
    caracteristica: 'Variedades tradicionales, procesos lavados',

    gramos: 340,
    precios: {
      bolsa:      39500,   // bolsa de 340 g
      taza:       11500,   // taza en método filtrado
      parDeTazas: 17000,
    },

    lotes: [
      {
        id: 'pasion-colombia',
        imagen:    'assets/products/pasion.jpg',
        origen:    'Huila',
        variedad:  'Colombia',
        proceso:   'Lavado',
        notas:     'Panela · caramelo · frutos amarillos',
        altura:    '1.800 msnm',
        productor: '',            // ← ej: 'Finca La Esperanza · familia Ramírez'
        tueste:    'Medio',
        insignias: ['Más vendido'],
        agotado:   false,
      },
    ],
  },

  {
    id: 'ilusion',
    nombre: 'Ilusión',
    color: '#A11AD3',
    flor: 'assets/collections/ilusion.png',
    descripcion: 'Cafés que traducen complejidad derivado a la genética de sus varietales y el cuidado detallado en sus procesos. Dejándonos en un estado de frenesí de euforia y satisfacción por sus sabores diferenciados.',
    caracteristica: 'Varietales exóticos',

    gramos: 340,
    precios: {
      bolsa:      59500,
      taza:       15800,
      parDeTazas: 20800,
    },

    lotes: [
      {
        id: 'ilusion-gesha',
        imagen:    'assets/products/ilusion.jpg',
        origen:    'Huila',
        variedad:  'Gesha',
        proceso:   'Lavado',
        notas:     'Limoncillo · flores blancas · miel',
        altura:    '1.750 msnm',
        productor: '',
        tueste:    'Medio',
        insignias: [],
        agotado:   false,
      },
    ],
  },

  {
    id: 'deseo',
    nombre: 'Deseo',
    color: '#0068FF',
    flor: 'assets/collections/deseo.png',
    descripcion: 'Cafés que trascienden las sensaciones del deseo, haciendo posible lo imposible dejándonos en una realidad de sabores experimentales, nuevos y complejos.',
    caracteristica: 'Naturales, Honey y fermentaciones alternativas',

    gramos: 340,
    precios: {
      bolsa:      75000,
      taza:       17000,
      parDeTazas: 22500,
    },

    // Deseo tiene DOS lotes activos. Los dos salen en la web.
    lotes: [
      {
        id: 'deseo-borbon-rojo',
        imagen:    'assets/products/deseo.jpg',
        origen:    'Huila',
        variedad:  'Borbón Rojo',
        proceso:   'Natural · Experimental',
        notas:     'Chocolate · frambuesa · cáscara de naranja',
        altura:    '1.750 msnm',
        productor: '',
        tueste:    'Medio',
        insignias: ['Edición limitada'],
        agotado:   false,
      },
      {
        id: 'deseo-ombligon',
        imagen:    'assets/products/deseo-ombligon.jpg',
        origen:    'Tolima',
        variedad:  'Ombligón',
        proceso:   'Natural · 72 h de fermentación',
        notas:     'Cacao · ciruela · avinado',
        altura:    '1.700 msnm',
        productor: '',
        tueste:    'Medio',
        insignias: ['Edición limitada'],
        agotado:   false,
      },
    ],
  },

  {
    id: 'euforia',
    nombre: 'Euforia',
    color: '#F49A1A',
    flor: 'assets/collections/euforia.png',

    // ⚠️ REVISAR — Es la única colección sin texto tuyo todavía.
    // Escríbelo con el mismo tono que las otras tres y reemplázalo aquí.
    descripcion: 'La colección más reciente de la casa, en presentación de 250 g.',
    caracteristica: '',   // ← ej: 'Procesos cítricos experimentales'

    gramos: 250,
    precios: {
      bolsa:      75000,
      taza:       17000,
      parDeTazas: 22500,
    },

    lotes: [
      {
        id: 'euforia-borbon-naranja',
        imagen:    'assets/products/euforia.jpg',
        origen:    'Huila',
        variedad:  'Borbón Naranja',
        proceso:   'Experimental Citric',
        notas:     'Flor de azahar · pomelo · tropical',
        altura:    '1.800 msnm',
        productor: '',
        tueste:    'Medio',
        insignias: ['Nuevo'],
        agotado:   false,
      },
    ],
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
  // 👉 Cambia a  true  para volver a publicar la sección de promociones.
  mostrar: false,

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
   Si dejas 'PENDIENTE' en dirección, esa tarjeta no se muestra.
   Si el campo "mapa" está vacío, se genera solo un enlace a Google Maps
   con la dirección. Puedes pegar el enlace exacto de tu ficha si prefieres.
   --------------------------------------------------------------------------- */
const TIENDAS = [
  {
    etiqueta: 'Nuestra tienda',
    nombre: 'Hysteria Coffee Roasters',
    direccion: 'Calle 92 #15-62',
    barrio: '',                       // opcional, ej: 'Chicó'
    mapa: '',                         // opcional: enlace exacto de Google Maps

    // Lo que ve el cliente en la web.
    horarios: [
      { dias: 'Lunes a viernes',      horas: '7:30 am – 7:00 pm' },
      { dias: 'Sábado',               horas: '9:30 am – 4:30 pm' },
      { dias: 'Domingos y festivos',  horas: 'Cerrado' },
    ],

    // Lo mismo pero para Google (no se muestra en la web).
    // Si cambias los horarios de arriba, cambia también estos.
    // Formato de 24 horas. No incluyas los días que cierras.
    horarioGoogle: [
      { dias: ['Monday','Tuesday','Wednesday','Thursday','Friday'], abre: '07:30', cierra: '19:00' },
      { dias: ['Saturday'],                                        abre: '09:30', cierra: '16:30' },
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
