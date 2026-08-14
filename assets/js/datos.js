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

  // 'wompi'       → checkout real: tarjetas, PSE, Nequi, Bancolombia, efectivo
  // 'mercadopago' → checkout real: tarjetas, PSE, Efecty, cuotas
  // 'whatsapp'    → el pedido se cierra por WhatsApp, sin cobro en línea
  //
  // 👉 PARA COBRAR CON WOMPI:
  //    1. cambia esta línea a  modo: 'wompi'
  //    2. en Vercel pon WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET
  //       (comercios.wompi.co → Desarrolladores → Llaves de API)
  //    3. vuelve a desplegar
  //    Los textos de los botones se ajustan solos.
  modo: 'wompi',

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

     La función segura ya está lista en  lib/pedido.js          */

  // Costo de envío en pesos. Pon 0 para envío gratis siempre.
  envio: 15000,

  // Compras iguales o mayores a este monto llevan envío gratis. 0 = desactivado.
  envioGratisDesde: 120000,

  moneda: 'COP',
};


/* ---------------------------------------------------------------------------
   2b) FACTURACIÓN ELECTRÓNICA
   ---------------------------------------------------------------------------
   Al comprar, el cliente indica su documento y el correo donde quiere recibir
   la factura. Son los datos que exige la DIAN para el adquiriente.

   Si tu contador te pide otros tipos de documento, agrégalos o quítalos aquí:
   "codigo" es el que viaja con el pago, "nombre" es lo que ve el cliente.
   --------------------------------------------------------------------------- */
const DOCUMENTOS = [
  { codigo: 'CC',  nombre: 'Cédula de ciudadanía' },
  { codigo: 'CE',  nombre: 'Cédula de extranjería' },
  { codigo: 'NIT', nombre: 'NIT (empresa)' },
  { codigo: 'PA',  nombre: 'Pasaporte' },
  { codigo: 'PEP', nombre: 'PEP' },
  { codigo: 'PPT', nombre: 'PPT' },
  { codigo: 'TI',  nombre: 'Tarjeta de identidad' },
];


/* ---------------------------------------------------------------------------
   2c) MOLIENDA
   ---------------------------------------------------------------------------
   Cada bolsa se puede pedir en grano o molida. Si la piden molida, el cliente
   elige el punto según su método de preparación.

   El "metodo" es solo la ayuda que aparece junto a cada opción, para que
   sepa cuál escoger. Puedes editarlo, agregar o quitar puntos de molienda.
   Si cambias los "codigo", cámbialos también en lib/pedido.js
   --------------------------------------------------------------------------- */
/* Las ayudas de "metodo" siguen las recetas de la sección ¿Cómo preparar
   tu café? — si cambias una guía, revisa que esta tabla siga coincidiendo. */
const MOLIENDAS = [
  { codigo: 'fina',         nombre: 'Fina',         metodo: 'AeroPress · espresso' },
  { codigo: 'medio-fina',   nombre: 'Medio fina',   metodo: 'V60 · Moka' },
  { codigo: 'media',        nombre: 'Media',        metodo: 'Origami · olleta · goteo' },
  { codigo: 'media-gruesa', nombre: 'Media gruesa', metodo: 'Chemex · Clever' },
  { codigo: 'gruesa',       nombre: 'Gruesa',       metodo: 'Prensa francesa · cold brew' },
];

// Punto que viene marcado por defecto cuando eligen "Molido"
const MOLIENDA_POR_DEFECTO = 'media';


/* ---------------------------------------------------------------------------
   2d) DESTACADO DEL MENÚ
   ---------------------------------------------------------------------------
   Una foto grande al cierre del menú para destacar un producto.
   El precio NO se escribe aquí: se toma del MENU buscando "item", así que
   si cambias el precio en el menú, este bloque se actualiza solo.
   Pon  mostrar: false  para ocultarlo.
   --------------------------------------------------------------------------- */
const DESTACADO_MENU = {
  mostrar: true,
  item: 'Cold Brew',                     // debe coincidir con un nombre del MENU
  foto: 'assets/fotos/coldbrew.jpg',
  alt: 'Botella de Cold Brew de Hysteria sobre granos de café tostado',
  titulo: 'Cold Brew',
  bajada: 'Bebida artesanal, embotellada en casa.',
};


/* ---------------------------------------------------------------------------
   3) LAS COLECCIONES Y SUS LOTES
   ---------------------------------------------------------------------------
   Pasión, Ilusión, Deseo y Euforia son NIVELES fijos de tu marca.
   Cada colección define el PRECIO y el gramaje.

   Dentro de cada colección puede haber UNO O VARIOS LOTES.
   Cada lote es un café distinto y sale como su propia tarjeta en la web.
   Hoy Pasión e Ilusión tienen dos cada una; Deseo y Euforia, uno.

   👉 PARA AGREGAR UN LOTE: copia un bloque de "lotes" y cambia los datos.
      Necesita un "id" único y una imagen en assets/products/.

   👉 PARA QUITAR UN LOTE: bórralo del arreglo, o ponle  agotado: true
      si quieres que siga visible pero sin poder comprarse.

   ⚠️ Si agregas un lote nuevo, agrégalo también en lib/pedido.js
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

    // Tamaños que el cliente elige en el carrito. La primera es la que se
    // agrega por defecto y la que muestra la tarjeta.
    // ⚠️ Si cambias un precio, cámbialo también en lib/pedido.js
    presentaciones: [
      { gramos: 340,  precio: 39500 },
      { gramos: 1000, precio: 85000 },
      { gramos: 2500, precio: 185000 },
    ],

    lotes: [
      {
        id: 'pasion-colombia',
        imagen:    'assets/products/bolsa-pasion.jpg',
        origen:    'Huila',
        variedad:  'Colombia',
        proceso:   'Lavado',
        notas:     'Panela · caramelo · frutos amarillos',
        altura:    '1.800 msnm',
        productor: '',            // ← ej: 'Finca La Esperanza · familia Ramírez'
        tueste:    'Medio',
        // Perfil de taza de 1 a 5, igual que los colibríes de la infografía
        perfil:    { aroma: 3, dulzura: 4, sabor: 4, acidez: 3, residual: 3, cuerpo: 4 },
        insignias: ['Más vendido'],
        agotado:   false,
      },
      {
        id: 'pasion-narino',
        imagen:    'assets/products/bolsa-pasion.jpg',
        origen:    'Nariño',
        variedad:  'Caturra',
        proceso:   'Lavado',
        notas:     'Caramelo · naranja · nuez tostada',
        altura:    '2.000 msnm',
        productor: '',
        tueste:    'Medio',
        perfil:    { aroma: 3, dulzura: 4, sabor: 4, acidez: 3, residual: 3, cuerpo: 4 },
        insignias: [],
        agotado:   false,
      },
    ],
  },

  {
    id: 'ilusion',
    nombre: 'Ilusión',
    color: '#A11AD3',
    flor: 'assets/collections/ilusion.png',
    descripcion: 'Cafés que cambian nuestras percepciones y sensaciones, llevándonos a nuevos sabores y emociones y transformando verdades en realidades imaginarias.',
    caracteristica: 'Varietales exóticos y diferenciados',

    gramos: 340,
    precios: {
      bolsa:      59500,
      taza:       15800,
      parDeTazas: 20800,
    },

    lotes: [
      {
        id: 'ilusion-borbon-rosado',
        imagen:    'assets/products/bolsa-ilusion.jpg',
        origen:    'Huila',
        variedad:  'Borbón Rosado',
        proceso:   'Honey',
        notas:     'Cítrico · melocotón · caramelo',
        altura:    '1.710 msnm',
        productor: '',
        tueste:    'Medio',
        perfil:    { aroma: 3, dulzura: 3, sabor: 4, acidez: 3, residual: 4, cuerpo: 3 },
        insignias: [],
        agotado:   false,
      },
      {
        id: 'ilusion-borbon-amarillo',
        imagen:    'assets/products/bolsa-ilusion.jpg',
        origen:    'Nariño',
        variedad:  'Borbón Amarillo',
        proceso:   'Honey',
        notas:     'Tropical · alicorado · caña de azúcar',
        altura:    '2.200 msnm',
        productor: '',
        tueste:    'Medio',
        perfil:    { aroma: 4, dulzura: 4, sabor: 4, acidez: 4, residual: 4, cuerpo: 3 },
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
    descripcion: 'Cafés que trascienden las sensaciones del deseo, haciendo posible lo imposible y dejándonos en una realidad de sabores alucinantes, nuevos y complejos.',
    caracteristica: 'Procesos naturales y fermentaciones prolongadas',

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
        imagen:      'assets/products/bolsa-deseo.jpg',
        origen:    'Huila',
        variedad:  'Borbón Rojo',
        proceso:   'Natural · Experimental',
        notas:     'Chocolate · frambuesa · cáscara de naranja',
        altura:    '1.750 msnm',
        productor: '',
        tueste:    'Medio',
        perfil:    { aroma: 5, dulzura: 5, sabor: 4, acidez: 3, residual: 4, cuerpo: 3 },
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

    descripcion: 'Cafés que traducen complejidad y misticismo, derivados de sus procesos experimentales y de la genética de sus varietales, dejándonos en un estado de frenesí, entusiasmo y satisfacción por sus sabores diferenciados.',
    caracteristica: 'Procesos experimentales y cafés de competencia',

    gramos: 250,
    precios: {
      bolsa:      75000,
      taza:       17000,
      parDeTazas: 22500,
    },

    lotes: [
      {
        id: 'euforia-borbon-naranja',
        imagen:      'assets/products/bolsa-euforia.jpg',
        origen:    'Huila',
        variedad:  'Borbón Naranja',
        proceso:   'Experimental Citric',
        notas:     'Flor de azahar · pomelo · tropical',
        altura:    '1.800 msnm',
        productor: '',
        tueste:    'Medio',
        perfil:    { aroma: 5, dulzura: 5, sabor: 5, acidez: 3, residual: 4, cuerpo: 3 },
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
    nota: 'Preparado con un café seleccionado especialmente para espresso',
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
      { nombre: 'Pan de chocolate',      desc: '', precio: 11000 },
      { nombre: 'Croissant de queso',    desc: '', precio: 11000 },
      { nombre: 'Croissant de almendra', desc: '', precio: 11000 },
      { nombre: 'Hysteria Cookies',      desc: '', precio: 11000 },
      { nombre: 'Arepa de choclo',       desc: '', precio: 14000 },
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
   6b) CÓMO PREPARAR TU CAFÉ
   ---------------------------------------------------------------------------
   Guías de preparación por método. Cada una sale como una pestaña.

   Son recetas base, con proporciones estándar de café de especialidad.
   ⚠️ Ajústalas a tu estándar de casa si tu tueste pide otra cosa: son las
   que va a seguir tu cliente, así que conviene que coincidan contigo.

   Para agregar un método, copia un bloque. Para quitarlo, bórralo.
   Para ocultar la sección completa: PREPARACION.mostrar = false

   Foto opcional: agrega  foto: 'assets/fotos/tu-foto.jpg'  a un método y esa
   imagen aparece de fondo en su ficha (la web la oscurece sola para que el
   texto siga leyéndose). Si no hay foto, la ficha queda como siempre.
   --------------------------------------------------------------------------- */
const PREPARACION = {
  mostrar: true,
  titulo: '¿Cómo preparar tu café?',
  intro: 'El café que te llevas ya hizo su parte. Estas son las recetas con las que lo preparamos nosotros, para que en tu casa sepa igual. Elige tu método.',
  nota: 'Usa siempre café recién molido y agua filtrada. Etiquétanos en @hysteriacoffeeroasters con tu preparación.',

  metodos: [    {
      id: 'v60',
      nombre: 'V60',
      equipo: 'Hario V60',
      rinde: 'Para una taza',
      ficha: [
        { k: 'Café peso', v: '15 g' },
        { k: 'Tiempo total', v: '3:00–3:30 minutos' },
        { k: 'Agua filtrada', v: '250 ml (ratio 1:16.6)' },
        { k: 'Nº de filtros', v: '1 filtro V60 tamaño 01/02' },
        { k: 'Molienda', v: 'media-fina' },
        { k: 'Método', v: 'vertido / pour over' },
        { k: 'Temperatura', v: '92–96 °C' },
      ],
      pasos: [
        { titulo: 'Preparar el filtro', texto: 'Coloca el filtro en el cono y enjuágalo con abundante agua caliente para eliminar el sabor a papel y precalentar el V60 y tu taza. Desecha el agua.' },
        { titulo: 'Medir y moler', texto: 'Mide y muele 15 g de café en molienda media-fina, como azúcar granulada. Agrega el café al filtro y haz un pequeño pozo en el centro.' },
        { titulo: 'Floración', texto: 'Inicia el temporizador y vierte 40–50 ml de agua saturando todo el café. Gira suavemente el cono y espera 45 segundos a que florezca.' },
        { titulo: 'Primer vertido', texto: 'Del 0:45 al 1:15 vierte en círculos lentos y constantes hasta llegar a 150 ml. Controla el flujo: fino, cerca de la cama y sin tocar el filtro.' },
        { titulo: 'Vertido final', texto: 'Del 1:15 al 1:45 completa los 250 ml. Da un giro suave al cono para aplanar la cama de café y deja drenar por completo.' },
        { titulo: 'Servir', texto: 'El drenado debe terminar entre 3:00 y 3:30 con la cama plana. Si drena antes, muele más fino; si tarda más, muele más grueso. Sirve y disfruta.' },
      ],
    },
    {
      id: 'chemex',
      nombre: 'Chemex',
      equipo: 'Chemex',
      rinde: 'Para dos tazas',
      ficha: [
        { k: 'Café peso', v: '30 g' },
        { k: 'Tiempo total', v: '4:00–4:30 minutos' },
        { k: 'Agua filtrada', v: '500 ml (ratio 1:16)' },
        { k: 'Nº de filtros', v: '1 filtro Chemex' },
        { k: 'Molienda', v: 'media-gruesa' },
        { k: 'Método', v: 'vertido / pour over' },
        { k: 'Temperatura', v: '93–96 °C' },
      ],
      pasos: [
        { titulo: 'Preparar el filtro', texto: 'Abre el filtro Chemex con el lado de tres capas hacia el pico vertedor. Enjuágalo con abundante agua caliente y desecha el agua.' },
        { titulo: 'Medir y moler', texto: 'Mide y muele 30 g de café en molienda media-gruesa, un punto más gruesa que para otros vertidos: el filtro Chemex es más denso y drena lento.' },
        { titulo: 'Floración', texto: 'Agrega el café, nivela la cama e inicia el temporizador vertiendo 60 ml de agua. Espera 45 segundos a que el café libere sus gases.' },
        { titulo: 'Primer vertido', texto: 'Vierte en círculos lentos desde el centro hacia afuera hasta llegar a 300 ml, sin tocar el filtro. Mantén la cama de café siempre húmeda.' },
        { titulo: 'Vertido final', texto: 'Completa los 500 ml en uno o dos vertidos suaves. Todo el vertido debe terminar hacia el minuto 3:00 y drenar por completo antes de 4:30.' },
        { titulo: 'Servir', texto: 'Retira el filtro, gira suavemente la jarra para homogeneizar y sirve. La taza Chemex es limpia, dulce y brillante; disfrútala mientras se enfría.' },
      ],
    },
    {
      id: 'origami',
      nombre: 'Origami',
      equipo: 'Origami Dripper',
      rinde: 'Para una taza',
      foto: 'assets/fotos/prep-origami.jpg',
      ficha: [
        { k: 'Café peso', v: '15 g' },
        { k: 'Tiempo total', v: '2:30–3:00 minutos' },
        { k: 'Agua filtrada', v: '240 ml (ratio 1:16)' },
        { k: 'Nº de filtros', v: '1 filtro cónico (v60) o de ondas (kalita)' },
        { k: 'Molienda', v: 'media' },
        { k: 'Método', v: 'vertido / pour over' },
        { k: 'Temperatura', v: '90–94 °C' },
      ],
      pasos: [
        { titulo: 'Elegir el filtro', texto: 'El Origami acepta dos filtros: cónico para una taza más brillante y ácida, o de ondas para una taza más dulce y balanceada. Elige según tu café.' },
        { titulo: 'Preparar y precalentar', texto: 'Coloca el filtro sin aplastarlo contra las costillas del dripper: los canales de aire son la clave del flujo. Enjuaga con agua caliente y desecha el agua.' },
        { titulo: 'Medir y moler', texto: 'Mide y muele 15 g de café en molienda media. El Origami drena rápido: una molienda muy gruesa subextrae la taza.' },
        { titulo: 'Floración', texto: 'Agrega el café, inicia el temporizador y vierte 45 ml saturando toda la cama. Espera 30–45 segundos a que el café desgasifique.' },
        { titulo: 'Vertidos en pulsos', texto: 'Completa los 240 ml en 2 o 3 vertidos circulares y lentos, dejando bajar el nivel entre cada uno. Termina de verter hacia el minuto 1:45.' },
        { titulo: 'Drenar y servir', texto: 'El drenado total debe cerrar entre 2:30 y 3:00. Gira la jarra para integrar, sirve y percibe cómo cambia la taza según el filtro que elegiste.' },
      ],
    },
    {
      id: 'prensa',
      nombre: 'Prensa francesa',
      equipo: 'Prensa Francesa',
      rinde: 'Para dos tazas',
      ficha: [
        { k: 'Café peso', v: '20 g' },
        { k: 'Tiempo total', v: '9 minutos' },
        { k: 'Agua filtrada', v: '300 ml (ratio 1:15)' },
        { k: 'Nº de filtros', v: 'malla metálica de la prensa' },
        { k: 'Molienda', v: 'gruesa, como sal marina' },
        { k: 'Método', v: 'inmersión total' },
        { k: 'Temperatura', v: '93–96 °C' },
      ],
      pasos: [
        { titulo: 'Medir y moler', texto: 'Mide y muele 20 g de café en molienda gruesa, como sal marina. Una molienda fina pasará la malla y dejará sedimentos en la taza.' },
        { titulo: 'Precalentar', texto: 'Enjuaga la prensa y tu taza con agua caliente para mantener la temperatura estable durante toda la extracción. Desecha el agua.' },
        { titulo: 'Agregar café y agua', texto: 'Agrega el café a la prensa e inicia el temporizador al verter los 300 ml de agua a 93–96 °C, saturando todo el café. No revuelvas todavía.' },
        { titulo: 'Romper la costra', texto: 'Al minuto 4:00, revuelve suavemente la costra de café que se formó en la superficie y retira la espuma y los granos flotantes con una cuchara.' },
        { titulo: 'Reposar', texto: 'Coloca la tapa con el émbolo apenas apoyado en la superficie, sin sumergirlo. Deja reposar 4–5 minutos más para que los finos se asienten.' },
        { titulo: 'Presionar y servir', texto: 'Baja el émbolo solo hasta la superficie del líquido, sin comprimir el fondo. Sirve despacio y de inmediato para evitar la sobreextracción.' },
      ],
    },
    {
      id: 'aeropress',
      nombre: 'AeroPress',
      foto: 'assets/fotos/prep-aeropress.jpg',
      equipo: 'AeroPress',
      rinde: 'Para una taza',
      ficha: [
        { k: 'Café peso', v: '18 g' },
        { k: 'Tiempo total', v: '3 minutos' },
        { k: 'Agua filtrada', v: '220 ml + 50 ml de bypass' },
        { k: 'Nº de filtros', v: '2 filtros de papel' },
        { k: 'Molienda', v: 'fina, casi como la arena' },
        { k: 'Método', v: 'tradicional' },
        { k: 'Temperatura', v: '92 °C' },
      ],
      pasos: [
        { titulo: 'Medir y moler', texto: 'Mide y muele 18 g de café — una cucharada de AeroPress redondeada (aprox. 2 ½ cucharadas). Muele fino, casi como la arena.' },
        { titulo: 'Preparar el AeroPress', texto: 'Coloca los filtros en la canasta. Enjuágalos con agua caliente para eliminar el sabor a papel y precalienta la cámara y tu taza.' },
        { titulo: 'Agregar café', texto: 'Desecha el agua de tu taza. Enrosca la canasta a la cámara y colócala sobre la taza. Usa el embudo para agregar los 18 g de café.' },
        { titulo: 'Agregar agua', texto: 'Inicia el temporizador al verter el agua a 92 °C. Satura el café en 10 segundos y vierte hasta el nº 4 (220 g en balanza). Asegúrate de que todo el café esté saturado.' },
        { titulo: 'Colocar émbolo y esperar', texto: 'Revuelve con la paleta y coloca el émbolo en la cámara, tirando ligeramente hacia arriba para crear un sello de presión. ¡No presiones todavía!' },
        { titulo: 'Revolver y sumergir', texto: 'Al minuto 1:15, retira el sello, revuelve la suspensión y vuelve a colocar el émbolo. Presiona suave y constante; detente al escuchar el silbido. Ajusta con el bypass de 50 ml.' },
      ],
    },
    {
      id: 'moka',
      nombre: 'Moka',
      equipo: 'Cafetera Italiana (Moka)',
      rinde: '3 tazas',
      ficha: [
        { k: 'Café peso', v: '15–18 g (canasta llena)' },
        { k: 'Tiempo total', v: '5 minutos' },
        { k: 'Agua filtrada', v: 'hasta la válvula (~150 ml)' },
        { k: 'Nº de filtros', v: 'filtro metálico integrado' },
        { k: 'Molienda', v: 'media-fina, entre espresso y filtro' },
        { k: 'Método', v: 'percolación por presión' },
        { k: 'Temperatura', v: 'agua recién hervida en la base' },
      ],
      pasos: [
        { titulo: 'Medir y moler', texto: 'Muele el café en punto media-fina: más grueso que espresso, más fino que filtro. Una molienda de espresso sobreextrae y amarga la taza.' },
        { titulo: 'Llenar la base', texto: 'Llena la base con agua caliente, recién hervida, hasta justo debajo de la válvula de seguridad. Así el café no se cocina ni toma sabor metálico.' },
        { titulo: 'Agregar café', texto: 'Llena la canasta con el café molido y nivela con el dedo o una espátula. No compactes ni presiones: el agua debe fluir de manera pareja.' },
        { titulo: 'Armar y calentar', texto: 'Enrosca las dos partes con un paño (la base estará caliente) y lleva la moka a fuego medio-bajo con la tapa abierta para observar la extracción.' },
        { titulo: 'Vigilar la extracción', texto: 'El café subirá en un flujo color miel y constante. Cuando el flujo se torne pálido y escuches el gorgoteo, la extracción está completa.' },
        { titulo: 'Cortar y servir', texto: 'Retira del fuego de inmediato y enfría la base bajo el grifo para detener la extracción. Revuelve el café en la jarra y sirve.' },
      ],
    },
    {
      id: 'olleta',
      nombre: 'Olleta',
      equipo: 'Olleta Tradicional',
      rinde: '4 tazas',
      ficha: [
        { k: 'Café peso', v: '40 g (aprox. 5 cucharadas)' },
        { k: 'Tiempo total', v: '10 minutos' },
        { k: 'Agua filtrada', v: '600 ml' },
        { k: 'Nº de filtros', v: 'colador de tela para servir' },
        { k: 'Molienda', v: 'media' },
        { k: 'Método', v: 'decocción a la antigua' },
        { k: 'Panela', v: '40–50 g, al gusto (opcional)' },
      ],
      pasos: [
        { titulo: 'Calentar el agua', texto: 'Vierte los 600 ml de agua en la olleta y llévala a fuego medio. Si quieres el tinto campesino, agrega la panela desde el inicio para que se disuelva.' },
        { titulo: 'Medir y moler', texto: 'Mientras el agua calienta, mide y muele 40 g de café en molienda media, aproximadamente una cucharada colmada por taza.' },
        { titulo: 'Llevar a ebullición', texto: 'Espera a que el agua rompa el hervor y la panela esté completamente disuelta. Revuelve una vez para verificar.' },
        { titulo: 'Agregar el café', texto: 'Retira la olleta del fuego y agrega el café molido. Revuelve suavemente para que todo el café quede en contacto con el agua. No lo dejes hervir con el café.' },
        { titulo: 'Reposar', texto: 'Tapa y deja reposar 4 minutos. En ese tiempo el café libera su aroma y los posos comienzan a asentarse en el fondo de la olleta.' },
        { titulo: 'Colar y servir', texto: 'Pasa el café por el colador de tela directamente a las tazas o a una jarra. Sirve caliente y de inmediato; recalentarlo amarga la bebida.' },
      ],
    },
    {
      id: 'tela',
      nombre: 'Colador de tela',
      equipo: 'Colador de Tela',
      rinde: 'Para una taza',
      ficha: [
        { k: 'Café peso', v: '10 g (1 cucharada colmada)' },
        { k: 'Tiempo total', v: '4 minutos' },
        { k: 'Agua filtrada', v: '150 ml' },
        { k: 'Nº de filtros', v: '1 colador de tela (media)' },
        { k: 'Molienda', v: 'media' },
        { k: 'Método', v: 'colado tradicional' },
        { k: 'Temperatura', v: '88–92 °C, sin hervir' },
      ],
      pasos: [
        { titulo: 'Preparar la tela', texto: 'Enjuaga el colador con agua caliente antes de usarlo. La costura debe ir hacia afuera para que la extracción sea pareja.' },
        { titulo: 'Medir y moler', texto: 'Mide y muele 10 g de café en molienda media, aproximadamente una cucharada colmada por taza de 150 ml.' },
        { titulo: 'Calentar el agua', texto: 'Calienta el agua hasta justo antes de hervir y déjala reposar unos segundos: debe quedar entre 88 y 92 °C. El agua hirviendo quema el café.' },
        { titulo: 'Agregar café y saturar', texto: 'Pon el café en la tela sobre tu taza o jarra. Vierte un primer chorro pequeño para saturar el café y espera 30 segundos: es la floración.' },
        { titulo: 'Verter en pulsos', texto: 'Vierte el resto del agua en 3 o 4 pulsos circulares y lentos, dejando drenar entre cada uno, hasta completar los 150 ml.' },
        { titulo: 'Servir y cuidar la tela', texto: 'Sirve de inmediato. Enjuaga la tela solo con agua caliente, sin jabón, y guárdala limpia y seca (o húmeda en la nevera) para que no acumule aceites rancios.' },
      ],
    },
    {
      id: 'cafetera',
      nombre: 'Cafetera de filtro',
      equipo: 'Cafetera de Filtro',
      rinde: '1 litro',
      ficha: [
        { k: 'Café peso', v: '60 g por litro (ratio 1:16)' },
        { k: 'Tiempo total', v: '4–6 minutos de ciclo' },
        { k: 'Agua filtrada', v: '1000 ml en el tanque' },
        { k: 'Nº de filtros', v: '1 filtro de papel de canasta' },
        { k: 'Molienda', v: 'media, como sal gruesa' },
        { k: 'Método', v: 'goteo automático / batch brew' },
        { k: 'Temperatura', v: '92–96 °C (la máquina la controla)' },
      ],
      pasos: [
        { titulo: 'Medir y moler', texto: 'Mide y muele 60 g de café por cada litro de agua en molienda media, como sal gruesa. Ajusta la dosis según la capacidad de tu jarra.' },
        { titulo: 'Enjuagar el filtro', texto: 'Coloca el filtro de papel en la canasta y enjuágalo con agua caliente para eliminar el sabor a papel. Desecha el agua del enjuague.' },
        { titulo: 'Nivelar la cama', texto: 'Agrega el café al filtro y sacude suavemente la canasta para nivelar la cama. Una superficie pareja asegura una extracción uniforme.' },
        { titulo: 'Iniciar el ciclo', texto: 'Llena el tanque con 1000 ml de agua filtrada e inicia el ciclo. El goteo debe completarse entre 4 y 6 minutos.' },
        { titulo: 'Homogeneizar', texto: 'Al terminar el ciclo, revuelve o gira suavemente la jarra: el café del final es más ligero que el del inicio y hay que integrarlos.' },
        { titulo: 'Servir y conservar', texto: 'Sirve de inmediato. Conserva el resto en termo; evita la placa calefactora por más de 20–30 minutos porque cocina el café y lo amarga.' },
      ],
    },
    {
      id: 'coldbrew',
      nombre: 'Cold Brew',
      foto: 'assets/fotos/prep-coldbrew.jpg',
      equipo: 'Cold Brew',
      rinde: '1 litro de concentrado',
      ficha: [
        { k: 'Café peso', v: '125 g' },
        { k: 'Tiempo total', v: '12–18 horas' },
        { k: 'Agua filtrada', v: '1000 ml, fría (ratio 1:8)' },
        { k: 'Nº de filtros', v: 'colador de tela o filtro de papel' },
        { k: 'Molienda', v: 'gruesa, como sal marina' },
        { k: 'Método', v: 'inmersión en frío' },
        { k: 'Temperatura', v: 'ambiente o nevera (4–20 °C)' },
      ],
      pasos: [
        { titulo: 'Medir y moler', texto: 'Mide y muele 125 g de café en molienda gruesa, como sal marina. Una molienda fina enturbia el concentrado y complica el filtrado.' },
        { titulo: 'Mezclar', texto: 'En un frasco o jarra limpia, agrega el café y vierte los 1000 ml de agua fría filtrada. Revuelve hasta que todo el café quede saturado.' },
        { titulo: 'Reposar', texto: 'Tapa el recipiente y déjalo reposar de 12 a 18 horas: en la nevera para una taza más limpia y dulce, o a temperatura ambiente para más cuerpo.' },
        { titulo: 'Filtrar', texto: 'Pasa el concentrado por un colador de tela o filtro de papel sin presionar los posos. Si quieres máxima limpieza, filtra dos veces.' },
        { titulo: 'Diluir', texto: 'Obtienes un concentrado: dilúyelo 1:1 con agua o leche antes de tomarlo, o al gusto. Sírvelo con hielo abundante.' },
        { titulo: 'Conservar', texto: 'Guarda el concentrado tapado en la nevera hasta por 2 semanas. Su dulzor y baja acidez lo hacen perfecto para bebidas frías y cócteles.' },
      ],
    },
  ],
};


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

  intro: 'Somos la unión de un sinfín de emociones, sentimientos y sensaciones que nos produce el café. Te traemos los mejores cafés de diferentes orígenes, variedades y procesos.',

  esencia: 'Queremos transmitir toda esa pasión y amor brindando los mejores cafés de diferentes orígenes, variedades y procesos, siempre resaltando y respetando el trabajo que hay detrás de un café especial.',
};


/* ---------------------------------------------------------------------------
   7b) EL EQUIPO
   ---------------------------------------------------------------------------
   Las personas detrás de Hysteria. Aparecen en la sección "Nuestra esencia".

   • cargo  → una línea corta (aparece en mayúsculas sobre el nombre)
   • texto  → dos o tres frases: qué hace y qué le apasiona del café
   • foto   → opcional. Si la dejas vacía se muestra la inicial en la tipografía
              de la marca, que también se ve bien. Para poner foto, guarda el
              archivo en assets/equipo/ y escribe aquí 'assets/equipo/juan.jpg'

   Para agregar a alguien, copia un bloque. Para quitarlo, bórralo.
   --------------------------------------------------------------------------- */
const EQUIPO = {
  mostrar: true,
  titulo: 'El equipo detrás de cada taza',
  intro: 'Nuestra unión nace a partir de tres apasionados por el café con visiones diferentes que convergen en un solo objetivo: hacer visible el trabajo y la complejidad que hay detrás de cada grano de café.',

  personas: [
    {
      nombre: 'Juan',
      cargo:  'Tostador',
      texto:  '',        // ← opcional: una o dos frases sobre su trabajo
      foto:   'assets/equipo/juan.jpg',
    },
    {
      nombre: 'Jeisson',
      cargo:  'Gerente de Mercadeo',
      texto:  '',
      foto:   'assets/equipo/jeisson.jpg',
    },
    {
      nombre: 'Andrés',
      cargo:  'Barista',
      texto:  '',
      foto:   'assets/equipo/andres.jpg',
    },
  ],
};


/* ---------------------------------------------------------------------------
   9) BOLETÍN
   ---------------------------------------------------------------------------
   Los correos se registran en BREVO, que además te sirve para diseñar y
   enviar el boletín. La suscripción pasa por  api/boletin.js , que guarda
   tu llave en el servidor para que nadie pueda verla.

   ⚠️ La llave NO va en este archivo. Va en Vercel como BREVO_API_KEY.
      Las instrucciones completas están en api/boletin.js y en el LEEME.

   Mientras no configures la llave, el formulario sigue usando tu correo
   como respaldo, así que la web no se rompe.
   --------------------------------------------------------------------------- */
const BOLETIN = {
  activo: true,
  titulo: 'Tostados frescos, cada dos semanas.',
  subtitulo: 'Recibe primero los lotes nuevos y las ediciones limitadas.',
};
