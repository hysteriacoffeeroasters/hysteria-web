/* ============================================================================
   HYSTERIA COFFEE ROASTERS · LÓGICA DEL SITIO
   No necesitas editar este archivo. Los datos están en assets/js/datos.js
   ========================================================================== */
(function () {
  'use strict';

  /* ── Utilidades ────────────────────────────────────────────────────────── */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Los importes se escriben siempre a la colombiana ($39.500), que es como
     los ve el cliente en la tienda y en Wompi. En inglés se añade "COP"
     detrás: un lector anglófono lee "$39.500" como treinta y nueve dólares
     con cincuenta, y no descubría el importe real hasta llegar a la pasarela. */
  const money = n => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 }) +
    (typeof IDIOMA !== 'undefined' && IDIOMA === 'en' ? ' COP' : '');

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const puesto = v => v && String(v).trim() && String(v).trim() !== 'PENDIENTE';

  /* Los colores de marca son vivos para flores y textos grandes, pero sobre
     negro no alcanzan 4.5:1 en textos pequeños (Ilusión y Deseo). Esta versión
     aclarada se usa solo en micro-textos (etiquetas, encabezados de la tabla). */
  const COLOR_TEXTO = {
    pasion:  '#FF5A54',
    ilusion: '#C579DD',
    deseo:   '#4E97FF',
    euforia: '#F49A1A',
  };
  const colorTexto = id => COLOR_TEXTO[id] || 'var(--white)';

  /* ── Estado del carrito ────────────────────────────────────────────────── */
  const LLAVE = 'hysteria_carrito_v1';
  let carrito = [];

  /* ¿Este id se puede comprar hoy? El servidor tiene la última palabra
     (lib/pedido.js), pero el carrito no debe mostrar lo que allí no existe. */
  function existeEnCatalogo(id) {
    if (id === 'pasaporte') {
      return typeof PASAPORTE !== 'undefined' && !!PASAPORTE.activo;
    }
    return !!buscarLote(id);
  }

  /* Precio vigente de una línea guardada. Cuando la colección tiene tamaños y
     el guardado ya no está en la lista, se cae al PRIMERO de la lista con su
     precio de hoy — que es exactamente lo que hace el servidor. Antes se caía
     al precio guardado, así que pantalla y cobro podían separarse el día que
     se tocaran las presentaciones. */
  function precioDeCatalogo(id, hit, gramos, guardado) {
    /* El Pasaporte no es lote de ninguna colección, así que buscarLote() le
       devuelve null y antes caía al precio GUARDADO. Resultado: el día que
       cambiara PASAPORTE.precio, quien ya lo tuviera en el carrito veía el
       precio viejo y el servidor le cobraba el nuevo — el mismo divorcio
       pantalla/cobro que este bloque existe para evitar, y encima cobrando de
       más. El servidor lo reprecia siempre (CATALOGO['pasaporte'] en
       lib/pedido.js); aquí también. */
    if (id === 'pasaporte') {
      const p = typeof PASAPORTE !== 'undefined' ? Number(PASAPORTE.precio) : NaN;
      return Number.isFinite(p) && p >= 0 ? p : Math.max(0, Number(guardado) || 0);
    }
    if (hit) {
      const lista = Array.isArray(hit.col.presentaciones) ? hit.col.presentaciones : [];
      const p = lista.find(x => Number(x.gramos) === Number(gramos));
      if (p) return Number(p.precio);
      if (lista.length) return Number(lista[0].precio);
      return hit.col.precios.bolsa;
    }
    return Math.max(0, Number(guardado) || 0);
  }

  /* Los gramos que corresponden al precio de arriba: si el tamaño guardado ya
     no existe, la línea se ajusta al primero para que no queden desparejados. */
  function gramosDeCatalogo(hit, gramos) {
    if (!hit) return Math.max(0, Number(gramos) || 0);
    const lista = Array.isArray(hit.col.presentaciones) ? hit.col.presentaciones : [];
    if (!lista.length) return hit.col.gramos;
    return lista.some(x => Number(x.gramos) === Number(gramos))
      ? Number(gramos)
      : Number(lista[0].gramos);
  }

  // Cuántas líneas se descartaron en la última carga por haber desaparecido
  // del catálogo. Se usa para avisar al cliente una sola vez, al arrancar.
  let descartadasAlCargar = 0;

  function leerCarritoGuardado() {
    let bruto = [];
    try {
      const raw = localStorage.getItem(LLAVE);
      bruto = raw ? JSON.parse(raw) : [];
    } catch (e) { return { lineas: [], descartadas: 0 }; }

    // Saneamos: cantidad numérica y acotada, precio numérico. Así, editar
    // localStorage a mano no burla el tope ni mete valores raros en el DOM.
    const validas = ['grano'].concat(
      (typeof MOLIENDAS !== 'undefined' ? MOLIENDAS : []).map(m => m.codigo));

    const candidatas = (Array.isArray(bruto) ? bruto : [])
      .filter(l => l && typeof l.id === 'string');

    /* Se tiran las líneas cuyo producto ya no está en el catálogo. Antes se
       conservaban: el cliente las veía con su precio y entraban en el total,
       pero el servidor las descartaba al cobrar y Wompi le cobraba menos de lo
       que había visto. */
    const vivas = candidatas.filter(l => existeEnCatalogo(l.id));
    const descartadas = candidatas.length - vivas.length;

    const lineas = vivas.map(l => {
      // Carritos guardados antes de existir la molienda no traen esCafe ni
      // gramos: se deducen del catálogo para que no pierdan el selector.
      const hit = buscarLote(l.id);
      const esCafe = l.esCafe !== undefined ? !!l.esCafe : !!hit;
      const gramos = gramosDeCatalogo(hit, Number(l.gramos) || (hit ? hit.col.gramos : 0));
      return {
        id: l.id,
        nombre: String(l.nombre || ''),
        variante: String(l.variante || ''),
        img: String(l.img || ''),
        esCafe,
        gramos: Math.max(0, gramos),
        molienda: validas.includes(l.molienda) ? l.molienda : (esCafe ? 'grano' : ''),
        // El precio manda el catálogo actual: si cambió en datos.js, el
        // carrito guardado se actualiza al volver (no se cobra el viejo).
        precio: precioDeCatalogo(l.id, hit, gramos, l.precio),
        cant: Math.min(MAX_UNIDADES, Math.max(1, Math.floor(Number(l.cant) || 1))),
      };
    });

    return { lineas, descartadas };
  }

  function cargarCarrito() {
    const { lineas, descartadas } = leerCarritoGuardado();
    carrito = lineas;
    descartadasAlCargar = descartadas;
    if (descartadas) guardarCarrito();   // se limpia lo que ya no se puede comprar
  }

  function guardarCarrito() {
    try { localStorage.setItem(LLAVE, JSON.stringify(carrito)); } catch (e) {}
  }

  /* Dos pestañas abiertas —muy normal viniendo de Instagram o de "Sigue
     explorando"— se borraban el carrito la una a la otra: cada una guardaba su
     copia en memoria, que ya estaba vieja.

     Se sincronizan por el evento `storage`, que solo salta en las OTRAS
     pestañas: cuando una escribe, las demás releen y se repintan. No se
     fusiona nada a mano a propósito — fusionar resucitaría las líneas que el
     cliente acaba de quitar, que es peor que el problema original. */
  window.addEventListener('storage', e => {
    if (e.key === LLAVE) {
      const { lineas } = leerCarritoGuardado();
      carrito = lineas;
      pintarCarrito();
    } else if (e.key === LLAVE_DESC) {
      cupon = leerCupon();
      pintarDescuento();
      pintarCarrito();
    }
  });

  /* ── Código de descuento ───────────────────────────────────────────────────
     El navegador solo PINTA el descuento; quien lo cobra es el servidor
     (construirPedido en lib/pedido.js). Por eso el cupón se guarda únicamente
     después de que /api/descuento lo valida, y se revalida al cargar: si el
     código se apagó entre visita y visita, se suelta solo y la pantalla nunca
     promete un precio que el cobro no va a respetar. */
  const LLAVE_DESC = 'hysteria_descuento_v1';
  let cupon = null;   // { codigo, tipo, valor } confirmado por el servidor

  /* Los cupones existen SOLO con Wompi. Mercado Pago arma su cobro sumando
     los items y un descuento de pedido no cabe en ese formato: si el modo
     volviera a 'mercadopago', la caja no aparece y un cupón guardado deja de
     aplicarse — así la pantalla y el cobro coinciden por construcción, en
     lugar de prometer un precio que esa pasarela no puede respetar. */
  const cuponesDisponibles = () =>
    typeof PAGOS !== 'undefined' && PAGOS.modo === 'wompi';

  function leerCupon() {
    try {
      const c = JSON.parse(localStorage.getItem(LLAVE_DESC) || 'null');
      return (c && typeof c.codigo === 'string' &&
              ['porcentaje', 'fijo', 'enviogratis'].includes(c.tipo))
        ? { codigo: c.codigo, tipo: c.tipo, valor: Math.max(0, Number(c.valor) || 0),
            unico: !!c.unico, unicoGlobal: !!c.unicoGlobal }
        : null;
    } catch (e) { return null; }
  }
  function guardarCupon() {
    try {
      if (cupon) localStorage.setItem(LLAVE_DESC, JSON.stringify(cupon));
      else localStorage.removeItem(LLAVE_DESC);
    } catch (e) {}
  }
  cupon = leerCupon();

  const unidades  = () => carrito.reduce((a, l) => a + l.cant, 0);
  const subtotal  = () => carrito.reduce((a, l) => a + l.precio * l.cant, 0);
  /* Réplica exacta de las reglas del servidor: porcentaje redondeado, fijo
     acotado al subtotal. Si esto y lib/pedido.js divergen, la pantalla miente. */
  // Descuento en bruto, antes de comprobar si de verdad conviene
  const descuentoBruto = () => {
    if (!cuponesDisponibles() || !cupon || !carrito.length) return 0;
    if (cupon.tipo === 'porcentaje') return Math.round(subtotal() * cupon.valor / 100);
    if (cupon.tipo === 'fijo')       return Math.min(cupon.valor, subtotal());
    return 0;   // 'enviogratis' actúa sobre el envío, no sobre los productos
  };
  const envioSinCupon = () => {
    if (!carrito.length) return 0;
    const libre = PAGOS.envioGratisDesde > 0 && subtotal() >= PAGOS.envioGratisDesde;
    return libre ? 0 : (PAGOS.envio || 0);
  };
  const envioConCupon = () => {
    if (!carrito.length) return 0;
    if (cuponesDisponibles() && cupon && cupon.tipo === 'enviogratis') return 0;
    // El envío gratis por monto se gana con lo que de verdad se paga
    const libre = PAGOS.envioGratisDesde > 0 &&
                  (subtotal() - descuentoBruto()) >= PAGOS.envioGratisDesde;
    return libre ? 0 : (PAGOS.envio || 0);
  };

  /* Misma guarda de no empeorar que aplica el servidor (construirPedido): si
     el descuento tira el carrito por debajo del umbral del envío gratis, el
     total puede SUBIR. En ese caso el cupón no se aplica — ni aquí ni al
     cobrar. Si estas dos reglas divergen, la pantalla miente. */
  const cuponConviene = () => {
    if (!cuponesDisponibles() || !cupon || !carrito.length) return false;
    return (subtotal() - descuentoBruto() + envioConCupon()) < (subtotal() + envioSinCupon());
  };

  const montoDescuento = () => (cuponConviene() ? descuentoBruto() : 0);
  const envio          = () => (cuponConviene() ? envioConCupon() : envioSinCupon());
  const total          = () => subtotal() - montoDescuento() + envio();

  // Mismo tope por línea que aplica el servidor (api/crear-preferencia.js).
  const MAX_UNIDADES = 50;

  function agregar(item) {
    const nuevo = Object.assign({ cant: 1 }, item);
    const ex = carrito.find(l => claveLinea(l) === claveLinea(nuevo));
    if (ex) {
      if (ex.cant >= MAX_UNIDADES) { avisar(traducir('Máximo') + ' ' + MAX_UNIDADES + ' ' + traducir('por producto')); return; }
      ex.cant += 1;
    } else {
      carrito.push(nuevo);
    }
    guardarCarrito(); pintarCarrito();
    avisar(item.nombre + ' ' + traducir('agregado'));
  }
  function cambiarCant(clave, d) {
    const l = carrito.find(x => claveLinea(x) === clave);
    if (!l) return;
    if (d > 0 && l.cant >= MAX_UNIDADES) { avisar(traducir('Máximo') + ' ' + MAX_UNIDADES + ' ' + traducir('por producto')); return; }
    l.cant = Math.min(MAX_UNIDADES, l.cant + d);
    if (l.cant < 1) carrito = carrito.filter(x => claveLinea(x) !== clave);
    guardarCarrito(); pintarCarrito();
  }
  function quitar(clave) {
    carrito = carrito.filter(x => claveLinea(x) !== clave);
    guardarCarrito(); pintarCarrito();
  }

  /* ── Aviso flotante ────────────────────────────────────────────────────── */
  let avisoT;
  function avisar(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(avisoT);
    avisoT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ── Lotes ─────────────────────────────────────────────────────────────────
     Una colección puede tener uno o varios lotes. Cada lote es una tarjeta.
     Aquí aplanamos {colección → lotes} en una sola lista.                     */
  function todosLosLotes() {
    const out = [];
    COLECCIONES.forEach(c => (c.lotes || []).forEach(l => out.push({ col: c, lote: l })));
    return out;
  }

  function buscarLote(id) {
    return todosLosLotes().find(x => x.lote.id === id) || null;
  }

  /* ── Colecciones ───────────────────────────────────────────────────────── */
  function pintarColecciones() {
    const cont = $('#coffee-grid');
    if (!cont) return;

    cont.innerHTML = todosLosLotes().map(({ col: c, lote: L }) => {
      const specs = [
        [traducir('Origen'), L.origen], [traducir('Variedad'), L.variedad], [traducir('Proceso'), L.proceso]
      ].filter(x => puesto(x[1]));

      const extras = [
        L.altura ? traducir('Altura') + ': ' + L.altura : '',
        L.productor ? L.productor : '',
        /* Ojo: para cuando esto se pinta, traducirDatos() ya pasó L.tueste al
           idioma de la página. Si el diccionario tradujera "Medio" como
           "Medium roast", esta línea diría "Roast medium roast"; por eso la
           entrada del diccionario es "Medium" a secas y la etiqueta pone el
           resto. En español no hay diccionario, así que sale "Tueste medio". */
        L.tueste ? traducir('Tueste') + ': ' + String(L.tueste).toLowerCase() : ''
      ].filter(Boolean).join(' · ');

      const badges = (L.agotado ? ['<span class="badge agotado">' + esc(traducir('Agotado')) + '</span>'] : [])
        .concat((L.insignias || []).map(t => '<span class="badge">' + esc(t) + '</span>'))
        .join('');

      const perfil = perfilHTML(L.perfil);

      return `
      <article class="coffee" data-coll="${esc(c.id)}" style="--c:${esc(c.color)};--c-t:${esc(colorTexto(c.id))}">
        <div class="coffee-media${L.imagenFicha ? ' media-ficha' : ''}">
          <img src="${esc(L.imagen)}"
               alt="${L.imagenFicha
                 ? `${esc(traducir('Ficha de cata de'))} ${esc(c.nombre)}${puesto(L.variedad) ? ', ' + esc(traducir('variedad')) + ' ' + esc(L.variedad) : ''}`
                 : `${esc(traducir('Bolsa de café'))} ${esc(c.nombre)}${puesto(L.variedad) ? ' · ' + esc(L.variedad) : ''}`}"
               width="${L.imagenFicha ? '900' : '800'}" height="${L.imagenFicha ? '1687' : '1000'}"
               loading="lazy" decoding="async">
          <span class="coffee-dot" aria-hidden="true"></span>
          <div class="coffee-badges">${badges}</div>
        </div>
        <div class="coffee-info">
          <h3 class="coffee-name">${esc(c.nombre)}</h3>
          ${puesto(L.variedad) ? `<p class="coffee-lote">${esc(L.variedad)}</p>` : ''}
          <p class="coffee-desc">${esc(c.descripcion)}</p>
          ${puesto(c.caracteristica) ? `<p class="coffee-caracteristica">${esc(c.caracteristica)}</p>` : ''}

          ${specs.length ? `<div class="coffee-specs">${specs.map(s => `
            <div><div class="spec-k">${esc(s[0])}</div><div class="spec-v">${esc(s[1])}</div></div>
          `).join('')}</div>` : ''}

          ${puesto(L.notas) ? `<p class="coffee-notes">${esc(L.notas)}</p>` : ''}
          ${extras ? `<p class="coffee-extra">${esc(extras)}</p>` : ''}
          ${perfil}

          <div class="coffee-buy">
            <div>
              <div class="coffee-price-k">${esc(traducir('Bolsa'))} ${c.gramos} g</div>
              <div class="coffee-price">${money(c.precios.bolsa)}</div>
              ${c.precios.taza ? `<div class="coffee-cup">${esc(traducir('En barra, taza filtrada'))} ${money(c.precios.taza)}</div>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm js-add" data-id="${esc(L.id)}" ${L.agotado ? 'disabled' : ''}>
              ${esc(traducir(L.agotado ? 'Agotado' : 'Agregar'))}
            </button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function pintarFiltros() {
    const cont = $('#cfilters');
    if (!cont) return;
    cont.innerHTML =
      `<button class="cfilt on" aria-pressed="true" data-f="all">${esc(traducir('Todas'))}</button>` +
      COLECCIONES.map(c => `<button class="cfilt" aria-pressed="false" data-f="${esc(c.id)}">${esc(c.nombre)}</button>`).join('');

    cont.addEventListener('click', e => {
      const b = e.target.closest('.cfilt');
      if (!b || b.classList.contains('on')) return;
      $$('.cfilt', cont).forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('on');
      b.setAttribute('aria-pressed', 'true');
      filtrar(b.dataset.f);
    });
  }

  function filtrar(key) {
    const col = COLECCIONES.find(c => c.id === key);
    document.documentElement.style.setProperty('--accent', col ? colorTexto(col.id) : '#FFFFFF');

    const wm = $('#collection-watermark');
    if (wm) {
      if (col && col.flor) { wm.src = col.flor; wm.alt = ''; wm.classList.add('show'); }
      else { wm.classList.remove('show'); }
    }
    $$('#coffee-grid .coffee').forEach(el => {
      el.classList.toggle('oculto', key !== 'all' && el.dataset.coll !== key);
    });
  }

  /* ── Tabla de precios ──────────────────────────────────────────────────── */
  function pintarPrecios() {
    const cont = $('#pricing-table');
    if (!cont) return;
    cont.innerHTML = `
      <table>
        <caption class="sr-only">${esc(traducir('Precios por colección'))}</caption>
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">${esc(traducir('Presentación'))}</span></th>
            ${COLECCIONES.map(c => `<th scope="col" style="color:${esc(colorTexto(c.id))}">${esc(c.nombre)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">${esc(traducir('Taza · método filtrado'))}</th>
            ${COLECCIONES.map(c => `<td>${c.precios.taza ? money(c.precios.taza) : '—'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">${esc(traducir('Par de tazas'))}</th>
            ${COLECCIONES.map(c => `<td>${c.precios.parDeTazas ? money(c.precios.parDeTazas) : '—'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">${esc(traducir('Bolsa para llevar'))}</th>
            ${COLECCIONES.map(c => `<td>${money(c.precios.bolsa)}<span class="cell-sub">${c.gramos} g</span></td>`).join('')}
          </tr>
        </tbody>
      </table>`;
  }

  /* ── Equipo ────────────────────────────────────────────────────────────── */
  function pintarEquipo() {
    const sec = $('#equipo');
    if (!sec) return;
    const E = typeof EQUIPO !== 'undefined' ? EQUIPO : null;
    const gente = E && Array.isArray(E.personas)
      ? E.personas.filter(p => puesto(p.nombre)) : [];

    if (!E || !E.mostrar || !gente.length) { sec.remove(); return; }

    const t = $('#equipo-titulo'), i = $('#equipo-intro');
    if (t) t.textContent = E.titulo || traducir('Nuestro equipo');
    if (i) { i.textContent = E.intro || ''; if (!puesto(E.intro)) i.remove(); }

    $('#equipo-grid').innerHTML = gente.map(p => {
      // Sin foto, la inicial en la tipografía de la marca hace de retrato:
      // se ve deliberado, no como una imagen que falta.
      const retrato = puesto(p.foto)
        ? `<img src="${esc(p.foto)}" alt="${esc(p.nombre)}" width="600" height="600"
                loading="lazy" decoding="async">`
        : `<span class="equipo-inicial" aria-hidden="true">${esc(p.nombre.trim().charAt(0))}</span>`;

      return `
      <article class="equipo-card">
        <div class="equipo-retrato${puesto(p.foto) ? '' : ' sin-foto'}">${retrato}</div>
        <div class="equipo-datos">
          ${puesto(p.cargo) ? `<p class="equipo-cargo">${esc(p.cargo)}</p>` : ''}
          <h4 class="equipo-nombre">${esc(p.nombre)}</h4>
          ${puesto(p.texto) ? `<p class="equipo-texto">${esc(p.texto)}</p>` : ''}
        </div>
      </article>`;
    }).join('');
  }

  /* ── Promociones ───────────────────────────────────────────────────────── */
  function pintarPromos() {
    const sec = $('#promos');
    if (!sec) return;
    const activas = (PROMOCIONES.lista || []).filter(p => p.activa);
    if (!PROMOCIONES.mostrar || !activas.length) {
      sec.remove();
      // sin sección, los enlaces a #promos quedarían rotos
      $$('a[href="#promos"]').forEach(a => a.remove());
      return;
    }

    $('#promo-grid').innerHTML = activas.map(p => `
      <article class="promo${p.destacada ? ' destacada' : ''}">
        <div class="promo-tag">${esc(traducir(p.destacada ? 'Promoción principal' : 'Promoción'))}</div>
        <h3 class="promo-name">${esc(p.nombre)}</h3>
        <p class="promo-desc">${esc(p.resumen)}</p>
        ${(p.incluye || []).length ? `<ul class="promo-includes">${p.incluye.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
        <div class="promo-prices">
          ${(p.precios || []).map(pr => `
            <div>
              <div class="promo-price-k">${esc(pr.etiqueta)}</div>
              ${pr.antes ? `<div class="promo-price-old">${money(pr.antes)}</div>` : ''}
              <div class="promo-price-new">${money(pr.ahora)}</div>
            </div>`).join('')}
        </div>
        ${PROMOCIONES.vigencia ? `<div class="promo-vigencia">${esc(PROMOCIONES.vigencia)}</div>` : ''}
      </article>`).join('');
  }

  /* ── Menú ──────────────────────────────────────────────────────────────── */
  function pintarMenu() {
    const tabs = $('#menu-tabs'), panels = $('#menu-panels');
    if (!tabs || !panels) return;

    // roving tabindex: solo la pestaña activa es tabbable; las flechas mueven entre ellas
    tabs.innerHTML = MENU.map((g, i) => `
      <button class="mtab${i === 0 ? ' on' : ''}" role="tab" id="tab-${esc(g.id)}"
              aria-controls="panel-${esc(g.id)}" aria-selected="${i === 0}"
              tabindex="${i === 0 ? '0' : '-1'}">${esc(g.nombre)}</button>`).join('');

    panels.innerHTML = MENU.map((g, i) => `
      <div class="menu-panel" role="tabpanel" id="panel-${esc(g.id)}"
           aria-labelledby="tab-${esc(g.id)}" tabindex="0" ${i === 0 ? '' : 'hidden'}>
        <div class="menu-grid">
          ${g.items.map(it => `
            <div class="menu-item${it.destacado ? ' destacado' : ''}">
              <div class="menu-item-name">${esc(it.nombre)}</div>
              ${it.desc ? `<div class="menu-item-desc">${esc(it.desc)}</div>` : ''}
              <div class="menu-item-price">${money(it.precio)}</div>
            </div>`).join('')}
        </div>
        ${g.nota ? `<p class="menu-note">${esc(g.nota)}</p>` : ''}
      </div>`).join('');

    function activar(b, enfocar) {
      $$('.mtab', tabs).forEach(x => {
        x.classList.remove('on');
        x.setAttribute('aria-selected', 'false');
        x.setAttribute('tabindex', '-1');
      });
      b.classList.add('on');
      b.setAttribute('aria-selected', 'true');
      b.setAttribute('tabindex', '0');
      if (enfocar) b.focus();
      $$('.menu-panel', panels).forEach(p => { p.hidden = true; });
      const target = $('#' + b.getAttribute('aria-controls'));
      if (target) target.hidden = false;
    }

    tabs.addEventListener('click', e => {
      const b = e.target.closest('.mtab');
      if (b) activar(b, false);
    });

    // Navegación con flechas / Home / End (patrón WAI-ARIA tabs)
    tabs.addEventListener('keydown', e => {
      const lista = $$('.mtab', tabs);
      const i = lista.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % lista.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + lista.length) % lista.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = lista.length - 1;
      if (j === null) return;
      e.preventDefault();
      activar(lista[j], true);
    });
  }

  /* ── Cómo preparar tu café ─────────────────────────────────────────────── */
  function pintarPreparacion() {
    const sec = $('#preparacion');
    if (!sec) return;
    const P = typeof PREPARACION !== 'undefined' ? PREPARACION : null;
    const metodos = P && Array.isArray(P.metodos) ? P.metodos : [];

    if (!P || !P.mostrar || !metodos.length) {
      sec.remove();
      $$('a[href="#preparacion"]').forEach(a => a.remove());
      return;
    }

    $('#prep-titulo').textContent = P.titulo || '¿Cómo preparar tu café?';
    $('#prep-intro').textContent = P.intro || '';

    const tabs = $('#prep-tabs'), panels = $('#prep-panels');

    tabs.innerHTML = metodos.map((m, i) => `
      <button class="ptab${i === 0 ? ' on' : ''}" role="tab" id="ptab-${esc(m.id)}"
              aria-controls="ppanel-${esc(m.id)}" aria-selected="${i === 0}"
              tabindex="${i === 0 ? '0' : '-1'}">${esc(m.nombre)}</button>`).join('');

    panels.innerHTML = metodos.map((m, i) => `
      <div class="prep-panel" role="tabpanel" id="ppanel-${esc(m.id)}"
           aria-labelledby="ptab-${esc(m.id)}" tabindex="0" ${i === 0 ? '' : 'hidden'}>
        <div class="prep-cols">
          <aside class="prep-ficha${puesto(m.foto) ? ' con-foto' : ''}"${puesto(m.foto)
            /* URL absoluta: dentro de una custom property, un url() relativo se
               resolvería contra la hoja de estilos y no contra la página.
               El %27 evita que un apóstrofo en el nombre cierre el url('). */
            ? ` style="--prep-foto:url('${esc(new URL(m.foto, document.baseURI).href.replace(/'/g, '%27'))}')"` : ''}>
            <h3 class="prep-equipo">${esc(m.equipo || m.nombre)}</h3>
            ${puesto(m.rinde) ? `<p class="prep-rinde">${esc(m.rinde)}</p>` : ''}
            <dl class="prep-datos">
              ${(m.ficha || []).map(d => `
                <div><dt>${esc(d.k)}</dt><dd>${esc(d.v)}</dd></div>`).join('')}
            </dl>
          </aside>
          <div class="prep-pasos">
            <h4 class="prep-h3">${esc(traducir('Paso a paso'))}</h4>
            <ol>${(m.pasos || []).map(p => `
              <li>
                <span class="paso-titulo">${esc(p.titulo)}</span>
                <span class="paso-texto">${esc(p.texto)}</span>
              </li>`).join('')}
            </ol>
          </div>
        </div>
      </div>`).join('');

    if (puesto(P.nota)) {
      panels.insertAdjacentHTML('beforeend', `<p class="prep-nota">${esc(P.nota)}</p>`);
    }

    // La foto de la cabecera se pide solo cuando la sección se acerca,
    // para que no compita con la foto de portada durante la carga inicial.
    fondoDiferido($('.prep-cabecera', sec));

    function activar(b, enfocar) {
      $$('.ptab', tabs).forEach(x => {
        x.classList.remove('on');
        x.setAttribute('aria-selected', 'false');
        x.setAttribute('tabindex', '-1');
      });
      b.classList.add('on');
      b.setAttribute('aria-selected', 'true');
      b.setAttribute('tabindex', '0');
      if (enfocar) b.focus();
      $$('.prep-panel', panels).forEach(p => { p.hidden = true; });
      const t = $('#' + b.getAttribute('aria-controls'));
      if (t) t.hidden = false;
    }

    tabs.addEventListener('click', e => {
      const b = e.target.closest('.ptab');
      if (b) activar(b, false);
    });
    tabs.addEventListener('keydown', e => {
      const lista = $$('.ptab', tabs);
      const i = lista.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % lista.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + lista.length) % lista.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = lista.length - 1;
      if (j === null) return;
      e.preventDefault();
      activar(lista[j], true);
    });
  }

  /* ── Destacado del menú ────────────────────────────────────────────────── */
  function pintarDestacado() {
    const cont = $('#destacado-menu');
    if (!cont) return;
    const d = typeof DESTACADO_MENU !== 'undefined' ? DESTACADO_MENU : null;
    if (!d || !d.mostrar) { cont.remove(); return; }

    // El precio sale del menú, no se escribe a mano: así nunca se desfasa
    let precio = null;
    (typeof MENU !== 'undefined' ? MENU : []).forEach(g =>
      (g.items || []).forEach(it => { if (it.nombre === d.item) precio = it.precio; }));

    cont.hidden = false;
    cont.innerHTML = `
      <figure class="destacado-foto">
        <img src="${esc(d.foto)}" alt="${esc(d.alt || '')}"
             width="800" height="1000" loading="lazy" decoding="async">
      </figure>
      <div class="destacado-info">
        <p class="sec-tag">${esc(traducir('De la casa'))}</p>
        <h3 class="destacado-titulo">${esc(d.titulo)}</h3>
        ${d.bajada ? `<p class="destacado-bajada">${esc(d.bajada)}</p>` : ''}
        ${precio !== null ? `<p class="destacado-precio">${money(precio)}</p>` : ''}
      </div>`;
  }

  /* ── Tienda ────────────────────────────────────────────────────────────── */
  function pintarTienda() {
    const cont = $('#shop-grid');
    if (!cont) return;

    cont.innerHTML = todosLosLotes().map(({ col: c, lote: L }) => {
      const meta = [L.origen, L.proceso].filter(puesto).join(' · ');
      return `
      <article class="shop-card" style="--c:${esc(c.color)};--c-t:${esc(colorTexto(c.id))}">
        <div class="shop-media${L.imagenFicha ? ' media-ficha' : ''}">
          <img src="${esc(L.imagen)}"
               alt="${esc(traducir(L.imagenFicha ? 'Ficha de cata' : 'Bolsa de café'))} ${esc(c.nombre)} ${esc(L.variedad)}"
               width="${L.imagenFicha ? '900' : '800'}" height="${L.imagenFicha ? '1687' : '1000'}"
               loading="lazy" decoding="async">
        </div>
        <div class="shop-info">
          <div class="shop-coll">${esc(c.nombre)}</div>
          <div class="shop-name">${puesto(L.variedad) ? esc(L.variedad) : esc(traducir('Bolsa')) + ' ' + c.gramos + ' g'}</div>
          <div class="shop-meta">${esc(traducir('Bolsa'))} ${c.gramos} g · ${esc(traducir('grano entero'))}${meta ? '<br>' + esc(meta) : ''}</div>
          <div class="shop-foot">
            <span class="shop-price">${money(c.precios.bolsa)}</span>
            <button class="btn btn-ghost btn-sm js-add" data-id="${esc(L.id)}" ${L.agotado ? 'disabled' : ''}>
              ${esc(traducir(L.agotado ? 'Agotado' : 'Agregar'))}
            </button>
          </div>
        </div>
      </article>`;
    }).join('');

    const p = $('#pasaporte');
    if (p) {
      if (!PASAPORTE.activo) { p.remove(); }
      else {
        p.innerHTML = `
          <div>
            <h3>${esc(PASAPORTE.nombre)}</h3>
            <p>${esc(PASAPORTE.descripcion)}</p>
          </div>
          <div class="pasaporte-buy">
            <span class="pasaporte-price">${money(PASAPORTE.precio)}</span>
            <button class="btn btn-solid btn-sm js-add" data-id="pasaporte">${esc(traducir('Agregar'))}</button>
          </div>`;
      }
    }
  }

  /* ── Añadir al carrito (delegado) ──────────────────────────────────────── */
  document.addEventListener('click', e => {
    const b = e.target.closest('.js-add');
    if (!b) return;
    const id = b.dataset.id;

    if (id === 'pasaporte') {
      agregar({
        id: 'pasaporte',
        nombre: PASAPORTE.nombre,
        variante: traducir('Experiencia'),
        precio: PASAPORTE.precio,
        // Ruta absoluta a propósito: sin la barra inicial, en las páginas de
        // inglés el navegador la buscaba una carpeta más abajo y salía rota.
        img: '/assets/logo/icono-white.png',
      });
      return;
    }
    const hit = buscarLote(id);
    if (!hit || hit.lote.agotado) return;
    const { col: c, lote: L } = hit;
    agregar({
      id: L.id,
      nombre: traducir('Café') + ' ' + c.nombre + (puesto(L.variedad) ? ' · ' + L.variedad : ''),
      gramos: c.gramos,
      esCafe: true,
      molienda: 'grano',          // por defecto sale en grano entero
      precio: c.precios.bolsa,
      img: L.imagen
    });
  });

  /* El nombre que se muestra de una línea guardada.
     El carrito guarda el nombre ya armado, así que quien metía un café
     navegando en español y luego pasaba a /en seguía viendo "Café Ilusión ·
     Borbón Rosado" dentro de un carrito por lo demás inglés. Si el producto
     sigue en el catálogo, manda el catálogo —que ya está en el idioma de la
     página—; si no, se usa el nombre guardado, que es mejor que nada. */
  function nombreVigente(l) {
    if (l.id === 'pasaporte') {
      return (typeof PASAPORTE !== 'undefined' && PASAPORTE.nombre) || l.nombre;
    }
    const hit = buscarLote(l.id);
    if (!hit) return l.nombre;
    const { col: c, lote: L } = hit;
    return traducir('Café') + ' ' + c.nombre + (puesto(L.variedad) ? ' · ' + L.variedad : '');
  }

  /* ── Molienda ──────────────────────────────────────────────────────────── */
  const nombreMolienda = cod => {
    const m = (typeof MOLIENDAS !== 'undefined' ? MOLIENDAS : []).find(x => x.codigo === cod);
    return m ? m.nombre : cod;
  };

  // 340 g · 1 kg · 2,5 kg — los kilos se leen mejor que "2500 g"
  function nombreGramos(g) {
    const n = Number(g) || 0;
    if (n < 1000) return n + ' g';
    const kilos = n / 1000;
    return String(kilos).replace('.', ',') + ' kg';
  }

  // Presentaciones disponibles de un café (vacío si la colección no las define)
  function presentacionesDe(id) {
    const hit = buscarLote(id);
    const lista = hit && Array.isArray(hit.col.presentaciones) ? hit.col.presentaciones : [];
    return lista.filter(p => Number(p.gramos) > 0 && Number(p.precio) > 0);
  }

  // Texto que ve el cliente y que viaja al pago
  function varianteDe(l) {
    /* La variante se guarda ya traducida (al agregar), así que para los que no
       son café se congelaba en el idioma de ese momento: agregar el Pasaporte
       en español y cambiar a inglés dejaba "Experiencia" en un carrito inglés.
       El nombre sí se recalculaba (nombreVigente) y el café también; esto era
       el único hueco. Se recalcula igual que el nombre. */
    if (l.id === 'pasaporte') return traducir('Experiencia');
    if (!l.esCafe) return l.variante || '';
    const base = traducir('Bolsa') + ' ' + nombreGramos(l.gramos);
    return l.molienda === 'grano'
      ? base + ' · ' + traducir('grano entero')
      : base + ' · ' + traducir('molienda') + ' ' + nombreMolienda(l.molienda).toLowerCase();
  }

  // La clave de una línea combina café, tamaño y molienda: el mismo café en
  // dos presentaciones o dos moliendas son líneas distintas del pedido.
  const claveLinea = l => l.id + '|' + (l.gramos || '') + '|' + (l.molienda || '');

  function cambiarTamano(clave, nuevosGramos) {
    const l = carrito.find(x => claveLinea(x) === clave);
    if (!l) return;
    const p = presentacionesDe(l.id).find(x => String(x.gramos) === String(nuevosGramos));
    if (!p) return;

    l.gramos = p.gramos;
    l.precio = p.precio;

    // Si ya había una línea igual con ese tamaño, se fusionan
    const gemela = carrito.find(x => x !== l && claveLinea(x) === claveLinea(l));
    if (gemela) {
      gemela.cant = Math.min(MAX_UNIDADES, gemela.cant + l.cant);
      carrito = carrito.filter(x => x !== l);
    }
    guardarCarrito(); pintarCarrito();
    avisar(traducir('Bolsa de') + ' ' + nombreGramos(p.gramos));
  }

  /* ── Perfil de taza ────────────────────────────────────────────────────── */
  // Los seis ejes de la infografía, ahora también en texto: la imagen de la
  // ficha es decorativa para un lector de pantalla, así que el dato tiene que
  // existir fuera de ella. Las barras son aria-hidden y el valor va en palabras.
  const EJES_PERFIL = [
    ['aroma', 'Aroma'], ['dulzura', 'Dulzura'], ['sabor', 'Sabor'],
    ['acidez', 'Acidez'], ['residual', 'Residual'], ['cuerpo', 'Cuerpo'],
  ].map(([k, etiqueta]) => [k, traducir(etiqueta)]);

  function perfilHTML(p) {
    if (!p) return '';
    const filas = EJES_PERFIL
      .filter(([k]) => Number(p[k]) > 0)
      .map(([k, etiqueta]) => {
        const v = Math.min(5, Math.max(1, Math.round(Number(p[k]))));
        return `
        <div class="perfil-fila">
          <span class="perfil-k">${esc(etiqueta)}</span>
          <span class="perfil-barra" aria-hidden="true">${
            Array.from({ length: 5 }, (_, i) =>
              `<i class="${i < v ? 'on' : ''}"></i>`).join('')
          }</span>
          <span class="sr-only">${v} ${esc(traducir('de 5'))}</span>
        </div>`;
      });
    if (!filas.length) return '';
    return `<div class="perfil"><p class="perfil-tit">${esc(traducir('Perfil de taza'))}</p>${filas.join('')}</div>`;
  }

  function cambiarMolienda(clave, nuevaMolienda) {
    const l = carrito.find(x => claveLinea(x) === clave);
    if (!l) return;
    const anterior = l.molienda;
    l.molienda = nuevaMolienda;

    // Si ya existía otra línea del mismo café con esa molienda, se fusionan
    const gemela = carrito.find(x => x !== l && claveLinea(x) === claveLinea(l));
    if (gemela) {
      gemela.cant = Math.min(MAX_UNIDADES, gemela.cant + l.cant);
      carrito = carrito.filter(x => x !== l);
    }
    guardarCarrito(); pintarCarrito();
    if (anterior !== nuevaMolienda) {
      avisar(nuevaMolienda === 'grano'
        ? traducir('En grano entero')
        : traducir('Molienda') + ' ' + nombreMolienda(nuevaMolienda).toLowerCase());
    }
  }

  /* La caja del código vive junto a las sumas. Se crea una sola vez desde
     aquí —no en el HTML— para que exista igual en la portada y en las doce
     landings sin tocar catorce archivos. */
  function asegurarCajaDescuento() {
    if (!cuponesDisponibles()) return;
    const sums = $('#cart-sums');
    if (!sums || $('#cart-desc')) return;
    const d = document.createElement('div');
    d.id = 'cart-desc';
    d.className = 'cart-desc';
    sums.parentNode.insertBefore(d, sums);
    pintarDescuento();
  }

  function pintarDescuento() {
    const d = $('#cart-desc');
    if (!d) return;
    if (cupon) {
      d.innerHTML = `
        <div class="cart-desc-ok">
          <span>✓ ${esc(traducir('Código'))} <strong>${esc(cupon.codigo)}</strong></span>
          <button type="button" class="cart-desc-quitar" data-quitar-codigo
                  aria-label="${esc(traducir('Quitar el código'))} ${esc(cupon.codigo)}">${esc(traducir('Quitar'))}</button>
        </div>
        ${cupon.unicoGlobal
          ? `<p class="cart-desc-nota">${esc(traducir('Válido una sola vez'))}</p>`
          : cupon.unico
            ? `<p class="cart-desc-nota">${esc(traducir('Válido una vez por persona'))}</p>`
            : ''}`;
    } else {
      d.innerHTML = `
        <div class="cart-desc-form">
          <label class="cart-desc-campo">
            <span class="sr-only">${esc(traducir('Código de descuento'))}</span>
            <input id="cart-desc-input" type="text" autocomplete="off" spellcheck="false"
                   autocapitalize="characters" maxlength="30"
                   placeholder="${esc(traducir('¿Tienes un código?'))}">
          </label>
          <button type="button" class="btn btn-ghost btn-sm" data-aplicar-codigo>${esc(traducir('Aplicar'))}</button>
        </div>
        <p class="cart-desc-error" id="cart-desc-error" role="alert"></p>`;
    }
  }

  async function aplicarCodigo() {
    const inp = $('#cart-desc-input');
    const err = $('#cart-desc-error');
    const codigo = ((inp && inp.value) || '').trim().toUpperCase();
    if (!codigo) { if (err) err.textContent = traducir('Escribe un código'); return; }
    const btn = $('[data-aplicar-codigo]');
    if (btn) btn.disabled = true;
    try {
      const r = await fetch('/api/descuento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      if (!data.valido) {
        if (err) err.textContent = traducir('Ese código no existe o ya no está activo');
        return;
      }
      cupon = { codigo: data.codigo, tipo: data.tipo, valor: Math.max(0, Number(data.valor) || 0),
                unico: !!data.unicoPorPersona, unicoGlobal: !!data.unicoGlobal };
      guardarCupon();
      pintarDescuento();
      pintarCarrito();
      // El repintado destruyó el botón que tenía el foco: sin esto, el teclado
      // cae al <body> y se escapa del diálogo modal del carrito.
      const q = $('[data-quitar-codigo]');
      if (q) q.focus();
      avisar(traducir('Código aplicado'));
    } catch (e) {
      if (err) err.textContent = traducir('No pudimos comprobar el código. Intenta de nuevo.');
    } finally {
      if (btn) btn.disabled = false;
      // En el camino de error el botón sigue vivo pero pudo perder el foco
      if (document.activeElement === document.body) {
        const b2 = $('[data-aplicar-codigo]');
        if (b2) b2.focus();
      }
    }
  }

  function quitarCodigo() {
    cupon = null;
    guardarCupon();
    pintarDescuento();
    pintarCarrito();
    const i = $('#cart-desc-input');
    if (i) i.focus();
  }

  /* Al cargar, el cupón guardado se revalida contra el servidor: puede haberse
     apagado desde la última visita. Si la red falla se deja como está — el
     servidor manda al cobrar, y Wompi muestra el monto real antes de pagar. */
  async function revalidarCupon() {
    if (!cupon) return;
    // Se anota QUÉ se consultó: si mientras la red respondía el cliente quitó
    // el cupón (o la compra se confirmó y lo limpió), la respuesta tardía ya
    // no aplica a nada y se descarta en vez de resucitar un estado muerto.
    const consultado = cupon.codigo;
    try {
      const r = await fetch('/api/descuento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: consultado }),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (!cupon || cupon.codigo !== consultado) return;
      cupon = data.valido
        ? { codigo: data.codigo, tipo: data.tipo, valor: Math.max(0, Number(data.valor) || 0),
            unico: !!data.unicoPorPersona }
        : null;
      guardarCupon();
      pintarDescuento();
      pintarCarrito();
    } catch (e) { /* sin red no se decide nada */ }
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-aplicar-codigo]')) aplicarCodigo();
    else if (e.target.closest('[data-quitar-codigo]')) quitarCodigo();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.id === 'cart-desc-input') {
      e.preventDefault();
      aplicarCodigo();
    }
  });

  /* ── Panel del carrito ─────────────────────────────────────────────────── */
  function pintarCarrito() {
    asegurarCajaDescuento();
    const cont = $('#cart-body'), foot = $('#cart-foot');
    const n = unidades();

    const badge = $('#cart-count');
    if (badge) { badge.textContent = n; badge.classList.toggle('on', n > 0); }
    const lbl = $('#cart-btn');
    if (lbl) lbl.setAttribute('aria-label', n ? traducir('Carrito') + ', ' + n + ' ' + traducir(n > 1 ? 'productos' : 'producto') : traducir('Carrito vacío'));

    if (!cont || !foot) return;

    // innerHTML destruye el control que tenía el foco del teclado: se anota
    // cuál era para devolvérselo después del repintado.
    const act = document.activeElement;
    const focoEn = act && cont.contains(act)
      ? ['data-mas', 'data-menos', 'data-quitar', 'data-tamano', 'data-forma', 'data-molienda']
          .map(a => (act.hasAttribute(a) ? [a, act.getAttribute(a)] : null))
          .find(Boolean) || ['vacio', '']
      : null;

    if (!carrito.length) {
      cont.innerHTML = `
        <div class="cart-empty">
          <p>${esc(traducir('Tu carrito está vacío'))}</p>
          <button class="btn btn-ghost btn-sm" data-ver-cafes>${esc(traducir('Ver los cafés'))}</button>
        </div>`;
      foot.hidden = true;
      const f = $('#cart-envio');
      if (f) f.hidden = true;   // sin productos no tiene sentido pedir la dirección
      if (focoEn) { const b = $('[data-ver-cafes]', cont); if (b) b.focus(); }
      return;
    }
    // si el paso de envío está abierto, se respeta; si no, se muestra el resumen
    const enEnvio = $('#cart-envio') && !$('#cart-envio').hidden;
    foot.hidden = enEnvio;

    const listaMoliendas = typeof MOLIENDAS !== 'undefined' ? MOLIENDAS : [];

    cont.innerHTML = carrito.map(l => {
      const k = claveLinea(l);
      const molido = l.esCafe && l.molienda !== 'grano';
      return `
      <div class="cart-line">
        <img class="cart-line-img" src="${esc(l.img)}" alt="" loading="lazy">
        <div class="cart-line-mid">
          <div class="cart-line-name">${esc(nombreVigente(l))}</div>
          <div class="cart-line-var">${esc(varianteDe(l))}</div>
          <div class="cart-line-price">${money(l.precio)} ${esc(traducir('c/u'))}</div>
        </div>
        <div class="cart-line-right">
          <div class="qty">
            <button data-menos="${esc(k)}" aria-label="${esc(traducir('Quitar una unidad de'))} ${esc(nombreVigente(l))}">−</button>
            <span>${l.cant}</span>
            <button data-mas="${esc(k)}" aria-label="${esc(traducir('Agregar una unidad de'))} ${esc(nombreVigente(l))}">+</button>
          </div>
          <button class="cart-line-del" data-quitar="${esc(k)}"
                  aria-label="${esc(traducir('Quitar'))} ${esc(nombreVigente(l))}">${esc(traducir('Quitar'))}</button>
        </div>
        ${l.esCafe ? `
        <div class="cart-line-opts">
          ${(() => {
            const tam = presentacionesDe(l.id);
            return tam.length > 1 ? `
          <label class="opt">
            <span class="sr-only">${esc(traducir('Tamaño de la bolsa de'))} ${esc(nombreVigente(l))}</span>
            <select data-tamano="${esc(k)}">
              ${tam.map(p => `
                <option value="${esc(p.gramos)}" ${Number(l.gramos) === Number(p.gramos) ? 'selected' : ''}
                >${esc(nombreGramos(p.gramos))} · ${esc(money(p.precio))}</option>`).join('')}
            </select>
          </label>` : '';
          })()}
          <label class="opt">
            <span class="sr-only">${esc(traducir('Presentación de'))} ${esc(nombreVigente(l))}</span>
            <select data-forma="${esc(k)}">
              <option value="grano" ${l.molienda === 'grano' ? 'selected' : ''}>${esc(traducir('Grano entero'))}</option>
              <option value="molido" ${molido ? 'selected' : ''}>${esc(traducir('Molido'))}</option>
            </select>
          </label>
          ${molido ? `
          <label class="opt">
            <span class="sr-only">${esc(traducir('Punto de molienda de'))} ${esc(nombreVigente(l))}</span>
            <select data-molienda="${esc(k)}">
              ${listaMoliendas.map(m => `
                <option value="${esc(m.codigo)}" ${l.molienda === m.codigo ? 'selected' : ''}
                >${esc(m.nombre)}${m.metodo ? ' · ' + esc(m.metodo) : ''}</option>`).join('')}
            </select>
          </label>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    /* El aviso de "te faltan X" mide contra lo que de verdad se paga. Con un
       cupón de envío gratis no falta nada por definición: sin esta guarda se
       pintaban a la vez "Te faltan $80.500 para el envío gratis" y
       "Envío: Gratis", empujando a comprar más para ganar lo ya ganado. */
    const falta = (cuponesDisponibles() && cupon && cupon.tipo === 'enviogratis' && cuponConviene())
      ? -1
      : PAGOS.envioGratisDesde > 0
        ? PAGOS.envioGratisDesde - (subtotal() - montoDescuento()) : -1;
    $('#cart-sums').innerHTML = `
      ${falta > 0 ? `<div class="cart-row"><span>${esc(traducir('Te faltan'))} ${money(falta)} ${esc(traducir('para el envío gratis'))}</span></div>` : ''}
      ${falta <= 0 && PAGOS.envioGratisDesde > 0 ? `<div class="cart-envio-libre">✓ ${esc(traducir('Envío gratis aplicado'))}</div>` : ''}
      <div class="cart-row"><span>${esc(traducir('Subtotal'))}</span><span>${money(subtotal())}</span></div>
      ${montoDescuento() > 0 ? `<div class="cart-row descuento"><span>${esc(traducir('Descuento'))} (${esc(cupon.codigo)})</span><span>−${money(montoDescuento())}</span></div>` : ''}
      <div class="cart-row"><span>${esc(traducir('Envío'))}</span><span>${envio() === 0 ? esc(traducir('Gratis')) : money(envio())}</span></div>
      <div class="cart-row total"><span>${esc(traducir('Total'))}</span><span>${money(total())}</span></div>`;

    // Devuelve el foco al control equivalente (o al cierre si su línea ya no está)
    if (focoEn) {
      const otraVez = focoEn[0] !== 'vacio' &&
        cont.querySelector(`[${focoEn[0]}="${CSS.escape(focoEn[1])}"]`);
      (otraVez || $('#cart-close') || cont).focus();
    }
  }

  let focoPrevio = null;

  function abrirCarrito(abrir) {
    const cart = $('#cart');
    if (abrir) focoPrevio = document.activeElement;

    cart.classList.toggle('open', abrir);
    $('#cart-backdrop').classList.toggle('open', abrir);
    cart.setAttribute('aria-hidden', String(!abrir));
    // inert saca el panel cerrado del orden de tabulación y del árbol de accesibilidad
    cart.toggleAttribute('inert', !abrir);
    document.body.classList.toggle('no-scroll', abrir);

    if (abrir) {
      mostrarPaso('resumen');   // siempre se abre en el resumen del pedido
      $('#cart-close').focus();
    } else if (focoPrevio && typeof focoPrevio.focus === 'function') {
      // devuelve el foco al botón que abrió el carrito, no a un nodo oculto
      focoPrevio.focus();
      focoPrevio = null;
    }
  }

  // Trampa de foco: mientras el carrito está abierto, Tab no se escapa al fondo
  function atraparFoco(e) {
    if (e.key !== 'Tab') return;
    const cart = $('#cart');
    if (!cart.classList.contains('open')) return;
    // Solo cuentan los controles visibles: el formulario de envío vive dentro
    // del panel con [hidden] y sus campos no deben anclar la envoltura del foco.
    const foco = Array.from(cart.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null);
    if (!foco.length) return;
    const primero = foco[0], ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#cart-btn')) return abrirCarrito(true);
    /* "Ver los cafés" del carrito vacío. Antes solo cerraba el panel
       (data-cerrar-carrito): en la portada disimulaba porque los cafés quedaban
       detrás, pero en la carta o en preparación no llevaba a ninguna parte.
       Ahora cumple lo que dice: si hay rejilla en esta página, va hasta ella;
       si no, navega a la tienda del idioma en que estás. */
    const verCafes = e.target.closest('[data-ver-cafes]');
    if (verCafes) {
      abrirCarrito(false);
      const grid = $('#shop-grid') || $('#coffee-grid');
      if (grid) {
        const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
        grid.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
      } else {
        window.location.href = (typeof ruta === 'function') ? ruta('/tienda') : '/tienda';
      }
      return;
    }
    if (e.target.closest('#cart-close') || e.target.closest('#cart-backdrop') || e.target.closest('[data-cerrar-carrito]')) {
      return abrirCarrito(false);
    }
    const menos = e.target.closest('[data-menos]');
    if (menos) return cambiarCant(menos.dataset.menos, -1);
    const mas = e.target.closest('[data-mas]');
    if (mas) return cambiarCant(mas.dataset.mas, 1);
    const q = e.target.closest('[data-quitar]');
    if (q) return quitar(q.dataset.quitar);
  });

  // Selectores de presentación y punto de molienda dentro del carrito
  document.addEventListener('change', e => {
    const tam = e.target.closest('[data-tamano]');
    if (tam) return cambiarTamano(tam.dataset.tamano, tam.value);

    const forma = e.target.closest('[data-forma]');
    if (forma) {
      const destino = forma.value === 'grano'
        ? 'grano'
        : (typeof MOLIENDA_POR_DEFECTO !== 'undefined' ? MOLIENDA_POR_DEFECTO : 'media');
      return cambiarMolienda(forma.dataset.forma, destino);
    }
    const mol = e.target.closest('[data-molienda]');
    if (mol) return cambiarMolienda(mol.dataset.molienda, mol.value);
  });

  document.addEventListener('keydown', e => {
    atraparFoco(e);
    if (e.key !== 'Escape') return;
    const panel = $('#cart');
    if (panel && panel.classList.contains('open')) abrirCarrito(false);
    // #nav-mobile solo existe en las dos portadas. En las 12 páginas de
    // sección no hay menú móvil, y sin esta comprobación cada Escape lanzaba
    // un TypeError (el carrito sí se cerraba, porque esa línea va antes).
    const movil = $('#nav-mobile');
    if (movil && movil.classList.contains('open')) cerrarNavMovil();
  });

  /* ── Pago ──────────────────────────────────────────────────────────────── */
  function textoPedido() {
    const lineas = carrito.map(l => `• ${l.cant} × ${l.nombre} (${varianteDe(l)}) — ${money(l.precio * l.cant)}`);
    return [
      'Hola Hysteria, quiero hacer un pedido:', '',
      lineas.join('\n'), '',
      `${traducir('Subtotal')}: ${money(subtotal())}`,
      montoDescuento() > 0 ? `${traducir('Descuento')} (${cupon.codigo}): −${money(montoDescuento())}` : '',
      `${traducir('Envío')}: ${envio() === 0 ? traducir('Gratis') : money(envio())}`,
      `Total: ${money(total())}`
    ].filter(Boolean).join('\n');
  }

  function irWhatsapp(datos) {
    let texto = textoPedido();
    if (datos) {
      texto += '\n\nDatos de envío:\n' +
        `${datos.nombre}\n${datos.telefono}\n${datos.direccion}, ${datos.ciudad}` +
        (datos.notas ? `\n${datos.notas}` : '') +
        '\n\nFacturación:\n' +
        `${datos.doctipo} ${datos.docnum}\n${datos.correo}`;
    }
    const msg = encodeURIComponent(texto);
    if (puesto(NEGOCIO.whatsapp)) {
      window.open(`https://wa.me/${NEGOCIO.whatsapp}?text=${msg}`, '_blank', 'noopener');
    } else {
      window.location.href =
        `mailto:${NEGOCIO.correo}?subject=${encodeURIComponent('Pedido desde la web')}&body=${msg}`;
    }
  }

  /* ── Paso de datos de envío ────────────────────────────────────────────── */
  const LLAVE_ENVIO = 'hysteria_envio_v1';

  function mostrarPaso(paso) {
    const foot = $('#cart-foot'), form = $('#cart-envio');
    if (paso === 'envio') {
      foot.hidden = true; form.hidden = false;
      // recuerda los datos de un pedido anterior para no volver a escribirlos
      try {
        const g = JSON.parse(localStorage.getItem(LLAVE_ENVIO) || '{}');
        CAMPOS_ENVIO.forEach(k => {
          const el = $('#env-' + k);
          if (el && g[k] && (el.tagName === 'SELECT' || !el.value)) el.value = g[k];
        });
      } catch (e) {}
      $('#env-nombre').focus();
    } else {
      form.hidden = true; foot.hidden = !carrito.length ? true : false;
      $('#envio-error').textContent = '';
    }
  }

  const CAMPOS_ENVIO = ['nombre', 'telefono', 'correo', 'doctipo', 'docnum',
                        'ciudad', 'direccion', 'notas'];

  // Nombres legibles para el mensaje de error
  const ROTULO = {
    nombre: 'nombre', telefono: 'celular', correo: 'correo',
    doctipo: 'tipo de documento', docnum: 'número de documento',
    ciudad: 'ciudad', direccion: 'dirección',
  };

  function leerEnvio() {
    const v = k => ($('#env-' + k) ? $('#env-' + k).value.trim() : '');
    const d = {};
    CAMPOS_ENVIO.forEach(k => { d[k] = v(k); });
    return d;
  }

  // Acepta dominios con varios niveles (unal.edu.co, empresa.com.co…)
  const correoOk = v =>
    /^[^\s@,;:<>()[\]\\]+@[^\s@.,;:<>()[\]\\]+(\.[^\s@.,;:<>()[\]\\]+)*\.[A-Za-z]{2,}$/.test(v) && v.length <= 254;

  function validarEnvio(d) {
    const faltan = [];
    if (d.nombre.length < 3) faltan.push('nombre');
    if (d.telefono.replace(/\D/g, '').length < 7) faltan.push('telefono');
    if (!correoOk(d.correo)) faltan.push('correo');
    if (!d.doctipo) faltan.push('doctipo');
    // pasaportes y permisos pueden llevar letras; el resto, al menos 5 caracteres
    if (d.docnum.replace(/[\s.-]/g, '').length < 5) faltan.push('docnum');
    if (d.ciudad.length < 3) faltan.push('ciudad');
    if (d.direccion.length < 5) faltan.push('direccion');

    Object.keys(ROTULO).forEach(k => {
      const el = $('#env-' + k);
      if (el) el.setAttribute('aria-invalid', String(faltan.includes(k)));
    });
    return faltan;
  }

  function pintarDocumentos() {
    const sel = $('#env-doctipo');
    if (!sel || typeof DOCUMENTOS === 'undefined') return;
    sel.innerHTML = DOCUMENTOS
      .map(t => `<option value="${esc(t.codigo)}">${esc(t.nombre)}</option>`)
      .join('');
  }

  /* ── Wompi ─────────────────────────────────────────────────────────────── */
  // El servidor calcula el monto y lo firma; aquí solo se arma el formulario
  // con lo que devuelve y se envía al checkout de Wompi.
  async function pagarWompi(datos) {
    const btn = $('#envio-pagar');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = traducir('Conectando…');

    try {
      const r = await fetch('/api/wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: carrito.map(l => ({
            id: l.id, cantidad: l.cant,
            gramos: l.esCafe ? l.gramos : 0,
            molienda: l.esCafe ? l.molienda : ''
          })),
          datosEnvio: datos,
          // El descuento lo aplica el servidor; aquí solo viaja el código
          codigo: cupon ? cupon.codigo : '',
          // Para que Wompi devuelva a la portada del idioma en que se compró
          idioma: typeof IDIOMA !== 'undefined' ? IDIOMA : 'es'
        })
      });

      /* 409: el código es de un solo uso y este correo ya lo gastó. NO es un
         fallo de la pasarela, así que no se manda a nadie a WhatsApp: se quita
         el código, se explica en el carrito y el cliente decide si sigue a
         precio pleno. Es el único momento en que se puede saber, porque el
         correo se escribe en este paso. */
      if (r.status === 409) {
        const data409 = await r.json().catch(() => ({}));
        cupon = null; guardarCupon();
        mostrarPaso('resumen');
        pintarDescuento(); pintarCarrito();
        const err = $('#cart-desc-error');
        /* El servidor distingue dos casos —«ya lo usaste tú» y «ya se usó, era
           único»— y manda el texto exacto. Se traduce lo que llega; si no
           llegara nada, se cae al primero, que es el más frecuente. */
        const msg = traducir(data409.error ||
          'Ese código es de un solo uso y ya lo usaste con este correo.');
        if (err) err.textContent = msg; else avisar(msg);
        btn.disabled = false;
        btn.textContent = original;
        return;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      if (!data.url || !data.campos) throw new Error('respuesta incompleta');

      // Los datos de envío ya quedaron guardados en LLAVE_ENVIO al enviar el
      // formulario; de ahí se recuperan al volver, porque la página se recarga
      // y el aviso de despacho los necesita.

      // El checkout de Wompi es un GET: se navega con los datos en la
      // dirección. Se hace con location y no enviando un <form>, porque el
      // envío de formularios a otro dominio falla en silencio (sin error)
      // y el cliente se quedaría mirando un botón que dice "Conectando…".
      const destino = new URL(data.url);
      Object.keys(data.campos).forEach(k => {
        destino.searchParams.set(k, data.campos[k]);
      });
      window.location.href = destino.toString();
      return;

    } catch (err) {
      console.warn('Wompi no disponible:', err);
      btn.disabled = false;
      btn.textContent = original;
      if (PAGOS.respaldoWhatsapp) {
        avisar(traducir('Cerramos tu pedido por WhatsApp'));
        irWhatsapp(datos);
      } else {
        avisar(traducir('No pudimos conectar con el pago. Intenta de nuevo.'));
      }
    }
  }

  async function pagar(datos) {
    if (!carrito.length) return;
    const btn = $('#envio-pagar');
    const original = btn.textContent;

    if (PAGOS.modo === 'wompi') return pagarWompi(datos);
    if (PAGOS.modo !== 'mercadopago') return irWhatsapp(datos);

    btn.disabled = true;
    btn.textContent = 'Conectando…';

    try {
      const r = await fetch('/api/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: carrito.map(l => ({
            id: l.id, titulo: l.nombre, descripcion: varianteDe(l),
            cantidad: l.cant, precio: l.precio,
            gramos: l.esCafe ? l.gramos : 0,
            molienda: l.esCafe ? l.molienda : ''
          })),
          envio: envio(),
          datosEnvio: datos
        })
      });

      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      if (!data.url) throw new Error('sin url');

      // El carrito NO se borra aquí: si el cliente abandona el pago
      // y vuelve, encuentra su pedido intacto. Se vacía solo al confirmar.
      window.location.href = data.url;
      return;

    } catch (err) {
      console.warn('Mercado Pago no disponible:', err);
      btn.disabled = false;
      btn.textContent = original;
      if (PAGOS.respaldoWhatsapp) {
        avisar(traducir('Cerramos tu pedido por WhatsApp'));
        irWhatsapp(datos);
      } else {
        avisar(traducir('No pudimos conectar con el pago. Intenta de nuevo.'));
      }
    }
  }

  function iniciarEnvio() {
    const form = $('#cart-envio');
    if (!form) return;

    pintarDocumentos();

    // Los textos dicen la verdad según cómo se esté cobrando hoy
    const enLinea = PAGOS.modo === 'wompi' || PAGOS.modo === 'mercadopago';
    const porWhatsapp = !enLinea;
    const pasarela = PAGOS.modo === 'wompi' ? 'Wompi' : 'Mercado Pago';
    const btnPagar = $('#envio-pagar');
    if (btnPagar) btnPagar.textContent = traducir(porWhatsapp ? 'Enviar pedido' : 'Ir a pagar');
    const notaEnvio = $('#nota-envio');
    if (notaEnvio) {
      notaEnvio.innerHTML = porWhatsapp
        ? traducir('Usamos tus datos solo para el envío y tu factura.') + '<br>' + traducir('Coordinamos el pago contigo por WhatsApp.')
        : traducir('Usamos tus datos solo para el envío y tu factura electrónica.') + '<br>' + traducir('El cobro lo procesa') + ' ' + esc(pasarela) + '.';
    }
    const notaResumen = $('#nota-resumen');
    if (notaResumen) {
      notaResumen.textContent = traducir(porWhatsapp
        ? 'Cerramos tu pedido por WhatsApp'
        : 'Pago con tarjeta, PSE o cierre por WhatsApp');
    }
    const btnResumen = $('#cart-checkout');
    if (btnResumen) btnResumen.textContent = traducir(porWhatsapp ? 'Continuar' : 'Finalizar compra');

    $('#cart-checkout').addEventListener('click', () => {
      if (!carrito.length) return;
      mostrarPaso('envio');
    });
    $('#envio-volver').addEventListener('click', () => mostrarPaso('resumen'));

    // al escribir o elegir se limpia la marca de error de ese campo
    const limpiarMarca = e => {
      if (e.target.matches('input, select')) e.target.setAttribute('aria-invalid', 'false');
      if (!$$('#cart-envio [aria-invalid="true"]').length) $('#envio-error').textContent = '';
    };
    form.addEventListener('input', limpiarMarca);
    form.addEventListener('change', limpiarMarca);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = leerEnvio();
      const faltan = validarEnvio(d);
      const err = $('#envio-error');
      if (faltan.length) {
        err.textContent = traducir('Revisa') + ': ' + faltan.map(k => traducir(ROTULO[k] || k)).join(', ') + '.';
        const primero = $('#env-' + faltan[0]);
        if (primero) primero.focus();
        return;
      }
      err.textContent = '';
      try { localStorage.setItem(LLAVE_ENVIO, JSON.stringify(d)); } catch (e) {}
      pagar(d);
    });
  }

  /* ── Tiendas ───────────────────────────────────────────────────────────── */
  function pintarTiendas() {
    const cont = $('#visit-grid');
    if (!cont) return;
    const vis = TIENDAS.filter(t => puesto(t.direccion));

    if (!vis.length) {
      cont.innerHTML = `
        <div class="visit-card">
          <div class="visit-tag">${esc(NEGOCIO.ciudad)}</div>
          <div class="visit-name">Escríbenos y te contamos dónde estamos</div>
          <p class="visit-detail">Estamos actualizando la información de nuestras tiendas.
             Mientras tanto, escríbenos y con gusto te atendemos.</p>
          ${puesto(NEGOCIO.whatsapp)
            ? `<a class="visit-link" href="https://wa.me/${esc(NEGOCIO.whatsapp)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>`
            : `<a class="visit-link" href="mailto:${esc(NEGOCIO.correo)}">Escribirnos</a>`}
        </div>`;
      return;
    }

    cont.classList.toggle('una-sola', vis.length === 1);

    cont.innerHTML = vis.map(t => {
      const mapa = t.mapa || ('https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(t.direccion + ', ' + NEGOCIO.ciudad + ', ' + NEGOCIO.pais));
      const tag = [t.etiqueta, t.barrio].filter(x => x && x.trim()).join(' · ');
      return `
      <div class="visit-card">
        <div class="visit-tag">${esc(tag)}</div>
        <div class="visit-name">${esc(t.nombre)}</div>
        <p class="visit-detail">${esc(t.direccion)}<br>${esc(NEGOCIO.ciudad)}, ${esc(NEGOCIO.pais)}</p>
        <a class="visit-link" href="${esc(mapa)}" target="_blank" rel="noopener">${esc(traducir('Ver en el mapa'))}</a>
        <div class="visit-hours">
          ${(t.horarios || []).map(h => `
            <div class="visit-hour"><b>${esc(h.dias)}</b><span>${esc(h.horas)}</span></div>`).join('')}
        </div>
      </div>`;
    }).join('');
  }

  /* ── Contacto en el pie ────────────────────────────────────────────────── */
  function pintarContacto() {
    const cont = $('#footer-contact');
    if (!cont) return;
    const filas = [];
    filas.push(`<a href="mailto:${esc(NEGOCIO.correo)}">${esc(NEGOCIO.correo)}</a>`);
    if (puesto(NEGOCIO.telefono)) {
      filas.push(`<a href="tel:${esc(String(NEGOCIO.telefono).replace(/\s/g, ''))}">${esc(NEGOCIO.telefono)}</a>`);
    }
    if (puesto(NEGOCIO.whatsapp)) {
      filas.push(`<a href="https://wa.me/${esc(NEGOCIO.whatsapp)}" target="_blank" rel="noopener">${esc(traducir('Escríbenos por WhatsApp'))}</a>`);
    }
    if (NEGOCIO.instagram) {
      filas.push(`<a href="${esc(NEGOCIO.instagram)}" target="_blank" rel="noopener">@hysteriacoffeeroasters</a>`);
    }
    cont.innerHTML = filas.join('');

    const soc = $('#footer-social');
    if (soc) {
      const s = [];
      if (NEGOCIO.instagram) s.push(`<a href="${esc(NEGOCIO.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
      if (NEGOCIO.facebook)  s.push(`<a href="${esc(NEGOCIO.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
      if (puesto(NEGOCIO.whatsapp)) s.push(`<a href="https://wa.me/${esc(NEGOCIO.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`);
      soc.innerHTML = s.join('');
    }

    const wa = $('#wa-float');
    if (wa) {
      if (puesto(NEGOCIO.whatsapp)) {
        wa.href = `https://wa.me/${NEGOCIO.whatsapp}?text=` +
          encodeURIComponent('Hola Hysteria, quiero saber más sobre sus cafés.');
      } else { wa.remove(); }
    }

    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ── Textos editables ──────────────────────────────────────────────────── */
  function pintarTextos() {
    const map = {
      '#txt-frase': TEXTOS.frase, '#txt-autor': '— ' + TEXTOS.fraseAutor,
      '#txt-intro': TEXTOS.intro, '#txt-esencia': TEXTOS.esencia,
      '#txt-eyebrow': `Hysteria Coffee Roasters · ${traducir('Café de especialidad')} · ${NEGOCIO.ciudad}`,
    };
    Object.keys(map).forEach(k => { const el = $(k); if (el) el.textContent = map[k]; });

    const nt = $('#nl-title'), ns = $('#nl-sub');
    if (nt) nt.textContent = BOLETIN.titulo;
    if (ns) ns.textContent = BOLETIN.subtitulo;
    if (!BOLETIN.activo) { const n = $('#newsletter'); if (n) n.remove(); }
  }

  /* ── Boletín ───────────────────────────────────────────────────────────── */
  function iniciarBoletin() {
    const form = $('#nl-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = $('#nl-email', form);
      const msg = $('#nl-msg', form);
      const email = input.value.trim();
      if (!email) {
        if (msg) msg.textContent = traducir('Escribe tu correo para suscribirte.');
        input.focus();
        return;
      }

      const btn = $('.nl-btn', form);
      const textoBtn = btn.textContent;
      btn.disabled = true;
      msg.style.color = '';
      msg.textContent = traducir('Enviando…');

      const respaldoCorreo = () => {
        window.location.href = `mailto:${NEGOCIO.correo}` +
          `?subject=${encodeURIComponent('Suscripción al boletín')}` +
          `&body=${encodeURIComponent('Quiero suscribirme con el correo: ' + email)}`;
        msg.textContent = traducir('Abrimos tu correo para confirmar la suscripción.');
      };

      try {
        const r = await fetch('/api/boletin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            website: (form.querySelector('[name="website"]') || {}).value || ''
          })
        });

        if (r.status === 503) { respaldoCorreo(); return; }   // aún sin configurar

        if (r.ok) {
          form.reset();
          msg.textContent = traducir('¡Listo! Te escribiremos pronto.');
        } else if (r.status === 400) {
          msg.textContent = traducir('Revisa el correo, parece incompleto.');
        } else {
          // Tropiezo pasajero del servidor (502/500): se pide reintentar.
          // El respaldo por correo queda solo para el 503 "sin configurar".
          msg.textContent = traducir('No pudimos registrarte en este momento. Inténtalo de nuevo en unos minutos.');
        }
      } catch (err) {
        console.warn('Boletín:', err);
        msg.textContent = traducir('No pudimos registrarte en este momento. Inténtalo de nuevo en unos minutos.');
      } finally {
        btn.disabled = false;
        btn.textContent = textoBtn;
      }
    });
  }

  /* ── Navegación ────────────────────────────────────────────────────────── */
  function cerrarNavMovil() {
    const t = $('#nav-toggle'), m = $('#nav-mobile');
    m.classList.remove('open');
    m.setAttribute('inert', '');
    t.setAttribute('aria-expanded', 'false');
    t.setAttribute('aria-label', traducir('Abrir menú'));
    document.body.classList.remove('no-scroll');
  }
  function iniciarNav() {
    // Las páginas de sección llevan una barra simplificada, sin menú móvil:
    // cada parte se activa solo si existe, para no romper el resto del arranque.
    const t = $('#nav-toggle'), m = $('#nav-mobile');
    if (t && m) {
      m.setAttribute('inert', '');   // arranca cerrado, fuera del orden de tabulación
      t.addEventListener('click', () => {
        const abierto = m.classList.toggle('open');
        m.toggleAttribute('inert', !abierto);
        t.setAttribute('aria-expanded', String(abierto));
        t.setAttribute('aria-label', abierto ? traducir('Cerrar menú') : traducir('Abrir menú'));
        document.body.classList.toggle('no-scroll', abierto);
      });
      $$('a', m).forEach(a => a.addEventListener('click', cerrarNavMovil));
    }

    const nav = $('#nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Resalta la sección visible. Solo aplica a anclas internas (#seccion):
    // en las landings los enlaces salen a otras páginas.
    const enlaces = $$('.nav-links a').filter(a => (a.getAttribute('href') || '').startsWith('#'));
    const secciones = enlaces.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window && secciones.length) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          enlaces.forEach(a => a.removeAttribute('aria-current'));
          const act = enlaces.find(a => a.getAttribute('href') === '#' + en.target.id);
          if (act) act.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secciones.forEach(s => io.observe(s));
    }
  }

  /* ── Animación de entrada ──────────────────────────────────────────────── */
  function iniciarReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(el => el.classList.add('in')); return;
    }
    const io = new IntersectionObserver((es, ob) => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('.reveal').forEach(el => io.observe(el));
  }

  /* ── Datos estructurados para Google ───────────────────────────────────── */
  function inyectarSchema() {
    const base = location.origin;

    /* Las fichas de producto SOLO se declaran donde el visitante ve productos:
       portada, tienda y cafés. Antes se inyectaban en todas las páginas, así
       que en /visitanos (horarios) y /menu (carta de barra) Google recibía los
       seis cafés con precio y "disponible" sin que hubiera ninguno en pantalla.
       Su guía lo prohíbe expresamente y lo cita como causa de sanción manual. */
    const hayProductos = !!($('#shop-grid') || $('#coffee-grid'));

    const productos = !hayProductos ? [] : todosLosLotes().map(({ col: c, lote: L }) => {
      const p = {
        '@type': 'Product',
        name: traducir('Café') + ' ' + c.nombre + (puesto(L.variedad) ? ' · ' + L.variedad : '') +
              ' · ' + traducir('Bolsa') + ' ' + c.gramos + ' g',
        description: [c.descripcion, puesto(L.notas) ? traducir('Notas') + ': ' + L.notas + '.' : '']
          .filter(Boolean).join(' '),
        // arreglarRutas() ya dejó L.imagen con la barra inicial: volver a
        // ponerla producía direcciones con doble barra (…com//assets/…)
        image: base + L.imagen,
        brand: { '@type': 'Brand', name: 'Hysteria Coffee Roasters' },
        weight: { '@type': 'QuantitativeValue', value: c.gramos, unitCode: 'GRM' },
        offers: {
          '@type': 'Offer', price: c.precios.bolsa, priceCurrency: 'COP',
          availability: L.agotado
            ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          // Al comprador anglófono se le manda a la tienda en su idioma
          url: base + (typeof ruta === 'function' ? ruta('/') : '/') + '#tienda'
        }
      };
      // Los nombres van traducidos: antes salían en español con los valores
      // ya en inglés, que es lo peor de los dos mundos.
      const props = [
        ['Origen', L.origen], ['Variedad', L.variedad],
        ['Proceso', L.proceso], ['Altura', L.altura], ['Tueste', L.tueste]
      ].filter(x => puesto(x[1]));
      if (props.length) {
        p.additionalProperty = props.map(x => ({
          '@type': 'PropertyValue', name: traducir(x[0]), value: x[1]
        }));
      }
      return p;
    });

    const negocio = {
      '@type': 'CafeOrCoffeeShop',
      '@id': base + '/#negocio',
      name: 'Hysteria Coffee Roasters',
      description: traducir('Tostadora y café de especialidad en') + ' ' + NEGOCIO.ciudad + '. ' + traducir('Colecciones Pasión, Ilusión, Deseo y Euforia.'),
      url: base + '/',
      // Google pinta estos logos sobre fondo blanco: el imagotipo de marca es
      // blanco y quedaría invisible, por eso aquí va la variante oscura.
      image: base + '/assets/fotos/og.jpg',
      logo: base + '/assets/logo/logo-schema.png',
      email: NEGOCIO.correo,
      servesCuisine: traducir('Café de especialidad'),
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: NEGOCIO.ciudad,
        addressCountry: 'CO'
      },
      sameAs: [NEGOCIO.instagram, NEGOCIO.facebook].filter(Boolean)
    };
    if (puesto(NEGOCIO.telefono)) negocio.telephone = NEGOCIO.telefono;

    const abiertas = TIENDAS.filter(t => puesto(t.direccion));

    // Con una sola tienda, su dirección es la del negocio (mejor para Google)
    if (abiertas.length === 1) {
      negocio.address.streetAddress = abiertas[0].direccion;
      const hg = abiertas[0].horarioGoogle || [];
      if (hg.length) {
        negocio.openingHoursSpecification = hg.map(h => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: h.dias,
          opens: h.abre,
          closes: h.cierra
        }));
      }
    }

    const tiendas = abiertas.length > 1 ? abiertas.map(t => ({
      '@type': 'CafeOrCoffeeShop',
      name: t.nombre,
      address: {
        '@type': 'PostalAddress', streetAddress: t.direccion,
        addressLocality: NEGOCIO.ciudad, addressCountry: 'CO'
      }
    })) : [];

    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [negocio].concat(tiendas, productos)
    });
    document.head.appendChild(s);
  }

  // Fondos que se descargan solo cuando su sección se acerca al viewport:
  // el elemento recibe .lista y el CSS recién ahí declara la imagen.
  function fondoDiferido(el) {
    if (!el) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es, ob) => {
        es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lista'); ob.disconnect(); } });
      }, { rootMargin: '600px 0px' });
      io.observe(el);
    } else { el.classList.add('lista'); }
  }

  // Consulta el estado real de la transacción antes de decirle nada al cliente.
  // De paso manda el carrito y los datos de envío para que salga el aviso de
  // despacho: Wompi solo conoce el monto, no qué café ni en qué molienda va.
  async function confirmarWompi(id, ref) {
    const limpio = String(id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    if (!limpio) { avisar(traducir('No pudimos confirmar tu pago')); return; }

    // Los datos de envío quedaron guardados al enviar el formulario, antes
    // de salir hacia Wompi (la misma memoria que autocompleta el checkout).
    let guardado = {};
    try { guardado = JSON.parse(localStorage.getItem(LLAVE_ENVIO) || '{}'); } catch (e) {}

    try {
      const r = await fetch('/api/wompi-confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: limpio,
          items: carrito.map(l => ({
            id: l.id, cantidad: l.cant,
            gramos: l.esCafe ? l.gramos : 0,
            molienda: l.esCafe ? l.molienda : ''
          })),
          datosEnvio: guardado,
          // El mismo código con el que se pagó: el total tiene que cuadrar
          codigo: cupon ? cupon.codigo : ''
        })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { estado, avisado } = await r.json();
      const num = ref;

      if (estado === 'APPROVED' && avisado) {
        carrito = []; guardarCarrito();
        // El cupón ya cumplió con este pedido; el siguiente empieza limpio
        cupon = null; guardarCupon(); pintarDescuento();
        pintarCarrito();
        avisar(num ? traducir('¡Gracias! Tu pedido') + ' ' + num + ' ' + traducir('está confirmado')
                   : traducir('¡Gracias! Recibimos tu pedido'));

      } else if (estado === 'APPROVED') {
        /* El pago sí entró, pero el aviso al negocio no salió. Antes se decía
           "confirmado" igual y se vaciaba el carrito, que era la única copia
           del detalle: el cliente quedaba tranquilo y el pedido se perdía.
           Ahora se le dice la verdad y el carrito NO se toca. */
        avisar(num
          ? traducir('Tu pago se procesó. Estamos confirmando el pedido') + ' ' + num +
            '. ' + traducir('Guarda esta referencia.')
          : traducir('Tu pago se procesó. Estamos confirmando tu pedido.'));

      } else if (estado === 'PENDING') {
        // PSE y efectivo pueden tardar: el carrito NO se vacía todavía
        avisar(num ? traducir('Pedido') + ' ' + num + ': ' + traducir('pago pendiente de confirmación')
                   : traducir('Tu pago quedó pendiente de confirmación'));
      } else {
        avisar(traducir('El pago no se completó. Tu carrito sigue intacto.'));
      }
    } catch (err) {
      console.warn('No pudimos confirmar el pago:', err);
      avisar(traducir('No pudimos confirmar tu pago. Escríbenos y lo revisamos.'));
    }
  }

  /* ── Arranque ──────────────────────────────────────────────────────────── */
  function iniciar() {
    // Antes que nada: si estamos en /en, los datos de datos.js se pasan a
    // inglés en el sitio. A partir de aquí ninguna función pintarX() necesita
    // saber en qué idioma está — pinta lo que encuentra.
    if (typeof arreglarRutas === 'function') arreglarRutas();
    if (typeof traducirDatos === 'function') traducirDatos();

    cargarCarrito();
    // Si el carrito traía cafés que ya no están en el catálogo, se le dice.
    // Callarlo dejaba al cliente creyendo que iba a recibir algo que no existe.
    if (descartadasAlCargar) {
      setTimeout(() => avisar(descartadasAlCargar === 1
        ? traducir('Un café de tu carrito ya no está disponible')
        : traducir('Algunos cafés de tu carrito ya no están disponibles')), 900);
    }
    pintarTextos();
    fondoDiferido($('.esencia-cabecera'));
    fondoDiferido($('.colecciones-cabecera'));
    fondoDiferido($('.tienda-cabecera'));
    pintarFiltros();
    pintarEquipo();
    pintarColecciones();
    pintarPrecios();
    pintarPromos();
    pintarMenu();
    pintarDestacado();
    pintarPreparacion();
    pintarTienda();
    pintarTiendas();
    pintarContacto();
    pintarCarrito();
    iniciarNav();
    iniciarBoletin();
    iniciarEnvio();
    iniciarReveal();
    inyectarSchema();
    // Sin await a propósito: si el código guardado se apagó, la pantalla se
    // corrige sola en cuanto responda; mientras tanto nada se bloquea.
    revalidarCupon();

    // Mensaje de vuelta desde la pasarela
    const params = new URLSearchParams(location.search);
    const p = params.get('pago');
    const ref = (params.get('ref') || '').replace(/[^A-Z0-9-]/gi, '').slice(0, 24);

    // Wompi devuelve a la MISMA dirección pase lo que pase, así que no se
    // puede dar por hecho que el pago salió bien: hay que preguntárselo.
    // La dirección se limpia para que un refresco no repita la confirmación.
    if (p === 'wompi') {
      const idPago = params.get('id');
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      confirmarWompi(idPago, ref);
      return;
    }

    if (p === 'exito') {
      carrito = []; guardarCarrito();
      cupon = null; guardarCupon(); pintarDescuento();
      pintarCarrito();
      avisar(ref ? traducir('¡Gracias! Tu pedido') + ' ' + ref + ' ' + traducir('está confirmado')
                 : traducir('¡Gracias! Recibimos tu pedido'));
    } else if (p === 'fallo') {
      avisar(traducir('El pago no se completó'));
    } else if (p === 'pendiente') {
      avisar(ref ? traducir('Pedido') + ' ' + ref + ': ' + traducir('pago pendiente de confirmación')
                 : traducir('Tu pago quedó pendiente de confirmación'));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
