/* ============================================================================
   HYSTERIA COFFEE ROASTERS · IDIOMA
   ----------------------------------------------------------------------------
   El español es la fuente de la verdad. El inglés es una CAPA que se pone
   encima: un diccionario español → inglés en assets/js/en.js.

   Consecuencia práctica: si una frase no está traducida, sale en español.
   Nunca sale una clave rota tipo "carrito.vacio" ni un hueco en blanco. Por eso
   no hay que mantener dos catálogos en paralelo — datos.js se edita una vez.

   Qué idioma se sirve lo dice la RUTA, no una cookie ni el navegador:
       /            /tienda        /cafes      …   → español
       /en          /en/shop       /en/coffees …   → inglés
   Así cada versión tiene su propia dirección, Google puede indexar las dos y
   el cliente puede compartir el enlace en el idioma que quiera.

   Este archivo se carga en TODAS las páginas. En las españolas no hace casi
   nada: traducir() devuelve lo que le entra y traducirDatos() se sale al vuelo.
   ========================================================================== */

var IDIOMA = (function () {
  return /^\/en(\/|$)/.test(location.pathname) ? 'en' : 'es';
})();

/* Equivalencias de página entre los dos idiomas. Las direcciones en inglés
   llevan palabras en inglés a propósito: /en/shop posiciona mejor que
   /en/tienda para quien busca en inglés. */
var RUTAS_IDIOMA = [
  { es: '/',             en: '/en' },
  { es: '/tienda',       en: '/en/shop' },
  { es: '/cafes',        en: '/en/coffees' },
  { es: '/menu',         en: '/en/menu' },
  { es: '/preparacion',  en: '/en/brewing' },
  { es: '/visitanos',    en: '/en/visit' },
  { es: '/enlaces',      en: '/en/links' },
];

(function () {
  'use strict';

  var DIC = (typeof DICCIONARIO_EN !== 'undefined') ? DICCIONARIO_EN : null;

  /* ── Traducir una frase ───────────────────────────────────────────────────
     Se normaliza el espacio en blanco antes de buscar: las plantillas del HTML
     parten las frases en varias líneas con sangría, y el diccionario guarda la
     frase en una sola línea. Sin esto no encontraría casi nada. */
  function normalizar(s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }

  /* Se llama traducir() y no t() a propósito: app.js ya usa `t` como variable
     local en once sitios (en algunos es un elemento del DOM), y una función
     global con ese nombre quedaría tapada dentro de esas funciones — o peor,
     `t('Abrir menú')` intentaría llamar a un <button> y reventaría. */
  window.traducir = function (texto) {
    if (IDIOMA !== 'en' || !DIC || texto == null) return texto;
    var s = String(texto);
    if (DIC[s]) return DIC[s];
    var n = normalizar(s);
    return DIC[n] || texto;
  };

  /* ── Dirección equivalente en el idioma activo ────────────────────────────
     ruta('/tienda') devuelve '/tienda' en español y '/en/shop' en inglés.
     Los enlaces externos, los anclas (#…) y los mailto pasan sin tocarse. */
  window.ruta = function (destino) {
    var d = String(destino || '');
    if (!d || d.charAt(0) !== '/') return d;          // #ancla, https://, mailto:
    if (IDIOMA !== 'en') return d;

    // Se separa el ancla para no perderla: /tienda#pasaporte
    var corte = d.indexOf('#');
    var camino = corte === -1 ? d : d.slice(0, corte);
    var ancla  = corte === -1 ? '' : d.slice(corte);

    for (var i = 0; i < RUTAS_IDIOMA.length; i++) {
      if (RUTAS_IDIOMA[i].es === camino) return RUTAS_IDIOMA[i].en + ancla;
    }
    return d;
  };

  /* La pareja de la página actual, para el selector y para el hreflang. */
  window.parejaIdioma = function () {
    var aqui = location.pathname.replace(/\.html$/, '').replace(/(.)\/$/, '$1');
    if (aqui === '/en/index') aqui = '/en';
    if (aqui === '/index') aqui = '/';
    for (var i = 0; i < RUTAS_IDIOMA.length; i++) {
      if (RUTAS_IDIOMA[i].es === aqui || RUTAS_IDIOMA[i].en === aqui) return RUTAS_IDIOMA[i];
    }
    return RUTAS_IDIOMA[0];
  };

  /* ── Traducir los datos ───────────────────────────────────────────────────
     Recorre los objetos de datos.js y cambia cada texto por su traducción, en
     el sitio. Se hace una sola vez al arrancar, así ninguna de las funciones
     pintarX() tiene que saber en qué idioma está: pintan lo que encuentran.

     Se saltan las claves que NO son texto visible (rutas de imagen, colores,
     identificadores): traducirlas rompería el sitio. */
  /* `dias` NO está en esta lista, y es a propósito. Esa clave la usan dos
     cosas: el horario que se ve en la web ('Sábado') y el que se le manda a
     Google, que ya viene en inglés ('Saturday'). Protegerla dejaba el horario
     visible sin traducir. Los nombres ingleses no están en el diccionario, así
     que pasan intactos: traducir() devuelve lo que no encuentra. */
  var CLAVES_INTOCABLES = {
    id: 1, codigo: 1, imagen: 1, img: 1, foto: 1, flor: 1, color: 1, icono: 1,
    mapa: 1, url: 1, href: 1, correo: 1, instagram: 1, facebook: 1, whatsapp: 1,
    telefono: 1, moneda: 1, modo: 1, abre: 1, cierra: 1,
  };

  var vistos = null;

  function traducirProfundo(nodo, clave) {
    if (nodo == null) return nodo;

    if (typeof nodo === 'string') {
      return CLAVES_INTOCABLES[clave] ? nodo : window.traducir(nodo);
    }
    if (typeof nodo !== 'object') return nodo;
    if (vistos.has(nodo)) return nodo;                 // por si hubiera ciclos
    vistos.add(nodo);

    if (Array.isArray(nodo)) {
      for (var i = 0; i < nodo.length; i++) nodo[i] = traducirProfundo(nodo[i], clave);
      return nodo;
    }
    for (var k in nodo) {
      if (Object.prototype.hasOwnProperty.call(nodo, k)) {
        nodo[k] = traducirProfundo(nodo[k], k);
      }
    }
    return nodo;
  }

  /* OJO con cómo se nombran los bloques aquí abajo.
     datos.js los declara con `const`, y un `const` de nivel superior NO se
     cuelga de window: vive en el ámbito léxico global. Así que window['MENU']
     es undefined y un bucle sobre nombres en texto no encuentra nada — hay que
     nombrar cada variable de verdad. El typeof protege de las páginas que no
     cargan datos.js entero. */
  window.traducirDatos = function () {
    if (IDIOMA !== 'en' || !DIC) return;
    vistos = new WeakSet();

    if (typeof COLECCIONES    !== 'undefined') traducirProfundo(COLECCIONES, null);
    if (typeof MENU           !== 'undefined') traducirProfundo(MENU, null);
    if (typeof PREPARACION    !== 'undefined') traducirProfundo(PREPARACION, null);
    if (typeof TEXTOS         !== 'undefined') traducirProfundo(TEXTOS, null);
    if (typeof EQUIPO         !== 'undefined') traducirProfundo(EQUIPO, null);
    if (typeof TIENDAS        !== 'undefined') traducirProfundo(TIENDAS, null);
    if (typeof PROMOCIONES    !== 'undefined') traducirProfundo(PROMOCIONES, null);
    if (typeof MOLIENDAS      !== 'undefined') traducirProfundo(MOLIENDAS, null);
    if (typeof DOCUMENTOS     !== 'undefined') traducirProfundo(DOCUMENTOS, null);
    if (typeof PASAPORTE      !== 'undefined') traducirProfundo(PASAPORTE, null);
    if (typeof BOLETIN        !== 'undefined') traducirProfundo(BOLETIN, null);
    if (typeof DESTACADO_MENU !== 'undefined') traducirProfundo(DESTACADO_MENU, null);

    vistos = null;
  };

  /* ── Señales para Google y para el navegador ──────────────────────────────
     El <html lang> y los hreflang van en el HTML de cada página, no aquí: los
     buscadores los necesitan antes de ejecutar JavaScript. Esto solo cubre el
     caso de que falten, para que nunca queden mal. */
  function asegurarHreflang() {
    var par = window.parejaIdioma();
    var base = 'https://www.hysteriacoffeeroasters.com';
    var quiere = [
      { hreflang: 'es',        href: base + par.es },
      { hreflang: 'en',        href: base + par.en },
      { hreflang: 'x-default', href: base + par.es },
    ];
    quiere.forEach(function (q) {
      if (document.querySelector('link[rel="alternate"][hreflang="' + q.hreflang + '"]')) return;
      var l = document.createElement('link');
      l.rel = 'alternate'; l.hreflang = q.hreflang; l.href = q.href;
      document.head.appendChild(l);
    });
  }

  /* ── Selector de idioma ───────────────────────────────────────────────────
     Va dentro de la barra de arriba, junto al carrito. Enlaza a la MISMA
     página en el otro idioma, no a la portada: si estás leyendo la guía del
     V60 en español y cambias a inglés, sigues en la guía del V60. */
  function ponerSelector() {
    var acciones = document.querySelector('.nav-actions');
    if (!acciones || document.getElementById('selector-idioma')) return;

    var par = window.parejaIdioma();
    var otro = IDIOMA === 'es' ? 'en' : 'es';
    var destino = IDIOMA === 'es' ? par.en : par.es;
    var etiqueta = otro === 'en' ? 'English' : 'Español';

    var a = document.createElement('a');
    a.id = 'selector-idioma';
    a.className = 'lang-btn';
    a.href = destino;
    a.hreflang = otro;
    a.setAttribute('aria-label', otro === 'en' ? 'Read this page in English'
                                               : 'Leer esta página en español');
    a.innerHTML = '<span aria-hidden="true">' + otro.toUpperCase() + '</span>' +
                  '<span class="lang-btn-largo">' + etiqueta + '</span>';
    acciones.insertBefore(a, acciones.firstChild);
  }

  function arrancar() { asegurarHreflang(); ponerSelector(); }

  /* Se espera a DOMContentLoaded salvo que la página ya esté 'complete'.
     Nada de `readyState === 'loading'`: los scripts con defer se ejecutan
     cuando ya es 'interactive', así que esa comprobación daba falso y esto
     corría ANTES que landing.js — que es quien crea la barra en las landings.
     Resultado: el selector de idioma no aparecía en ninguna de ellas. */
  if (document.readyState === 'complete') {
    arrancar();
  } else {
    document.addEventListener('DOMContentLoaded', arrancar);
  }
})();
