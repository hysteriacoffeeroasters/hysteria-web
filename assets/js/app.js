/* ============================================================================
   HYSTERIA COFFEE ROASTERS · LÓGICA DEL SITIO
   No necesitas editar este archivo. Los datos están en assets/js/datos.js
   ========================================================================== */
(function () {
  'use strict';

  /* ── Utilidades ────────────────────────────────────────────────────────── */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const money = n => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

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

  function cargarCarrito() {
    try {
      const raw = localStorage.getItem(LLAVE);
      const bruto = raw ? JSON.parse(raw) : [];
      // Saneamos: cantidad numérica y acotada, precio numérico. Así, editar
      // localStorage a mano no burla el tope ni mete valores raros en el DOM.
      const validas = ['grano'].concat(
        (typeof MOLIENDAS !== 'undefined' ? MOLIENDAS : []).map(m => m.codigo));
      carrito = (Array.isArray(bruto) ? bruto : [])
        .filter(l => l && typeof l.id === 'string')
        .map(l => {
          // Carritos guardados antes de existir la molienda no traen esCafe ni
          // gramos: se deducen del catálogo para que no pierdan el selector.
          const hit = buscarLote(l.id);
          const esCafe = l.esCafe !== undefined ? !!l.esCafe : !!hit;
          const gramos = Number(l.gramos) || (hit ? hit.col.gramos : 0);
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
            precio: hit ? hit.col.precios.bolsa : Math.max(0, Number(l.precio) || 0),
            cant: Math.min(MAX_UNIDADES, Math.max(1, Math.floor(Number(l.cant) || 1))),
          };
        });
    } catch (e) { carrito = []; }
  }
  function guardarCarrito() {
    try { localStorage.setItem(LLAVE, JSON.stringify(carrito)); } catch (e) {}
  }

  const unidades  = () => carrito.reduce((a, l) => a + l.cant, 0);
  const subtotal  = () => carrito.reduce((a, l) => a + l.precio * l.cant, 0);
  const envio     = () => {
    if (!carrito.length) return 0;
    const libre = PAGOS.envioGratisDesde > 0 && subtotal() >= PAGOS.envioGratisDesde;
    return libre ? 0 : (PAGOS.envio || 0);
  };
  const total = () => subtotal() + envio();

  // Mismo tope por línea que aplica el servidor (api/crear-preferencia.js).
  const MAX_UNIDADES = 50;

  function agregar(item) {
    const nuevo = Object.assign({ cant: 1 }, item);
    const ex = carrito.find(l => claveLinea(l) === claveLinea(nuevo));
    if (ex) {
      if (ex.cant >= MAX_UNIDADES) { avisar('Máximo ' + MAX_UNIDADES + ' por producto'); return; }
      ex.cant += 1;
    } else {
      carrito.push(nuevo);
    }
    guardarCarrito(); pintarCarrito();
    avisar(item.nombre + ' agregado');
  }
  function cambiarCant(clave, d) {
    const l = carrito.find(x => claveLinea(x) === clave);
    if (!l) return;
    if (d > 0 && l.cant >= MAX_UNIDADES) { avisar('Máximo ' + MAX_UNIDADES + ' por producto'); return; }
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
        ['Origen', L.origen], ['Variedad', L.variedad], ['Proceso', L.proceso]
      ].filter(x => puesto(x[1]));

      const extras = [
        L.altura ? 'Altura: ' + L.altura : '',
        L.productor ? L.productor : '',
        L.tueste ? 'Tueste ' + String(L.tueste).toLowerCase() : ''
      ].filter(Boolean).join(' · ');

      const badges = (L.agotado ? ['<span class="badge agotado">Agotado</span>'] : [])
        .concat((L.insignias || []).map(t => '<span class="badge">' + esc(t) + '</span>'))
        .join('');

      const perfil = perfilHTML(L.perfil);

      return `
      <article class="coffee" data-coll="${esc(c.id)}" style="--c:${esc(c.color)};--c-t:${esc(colorTexto(c.id))}">
        <div class="coffee-media">
          <img src="${esc(L.imagen)}"
               alt="Ficha de cata de ${esc(c.nombre)}${puesto(L.variedad) ? ', variedad ' + esc(L.variedad) : ''}"
               width="900" height="1687" loading="lazy" decoding="async">
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
              <div class="coffee-price-k">Bolsa ${c.gramos} g</div>
              <div class="coffee-price">${money(c.precios.bolsa)}</div>
              ${c.precios.taza ? `<div class="coffee-cup">En barra, taza filtrada ${money(c.precios.taza)}</div>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm js-add" data-id="${esc(L.id)}" ${L.agotado ? 'disabled' : ''}>
              ${L.agotado ? 'Agotado' : 'Agregar'}
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
      '<button class="cfilt on" aria-pressed="true" data-f="all">Todas</button>' +
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
        <caption class="sr-only">Precios por colección</caption>
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Presentación</span></th>
            ${COLECCIONES.map(c => `<th scope="col" style="color:${esc(colorTexto(c.id))}">${esc(c.nombre)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Taza · método filtrado</th>
            ${COLECCIONES.map(c => `<td>${c.precios.taza ? money(c.precios.taza) : '—'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">Par de tazas</th>
            ${COLECCIONES.map(c => `<td>${c.precios.parDeTazas ? money(c.precios.parDeTazas) : '—'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">Bolsa para llevar</th>
            ${COLECCIONES.map(c => `<td>${money(c.precios.bolsa)}<span class="cell-sub">${c.gramos} g</span></td>`).join('')}
          </tr>
        </tbody>
      </table>`;
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
        <div class="promo-tag">${p.destacada ? 'Promoción principal' : 'Promoción'}</div>
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
            <h4 class="prep-h3">Paso a paso</h4>
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
    const cab = $('.prep-cabecera', sec);
    if (cab) {
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es, ob) => {
          es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lista'); ob.disconnect(); } });
        }, { rootMargin: '600px 0px' });
        io.observe(cab);
      } else { cab.classList.add('lista'); }
    }

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
        <p class="sec-tag">De la casa</p>
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
        <div class="shop-media">
          <img src="${esc(L.imagen)}" alt="Ficha de cata de ${esc(c.nombre)} ${esc(L.variedad)}"
               width="900" height="1687" loading="lazy" decoding="async">
        </div>
        <div class="shop-info">
          <div class="shop-coll">${esc(c.nombre)}</div>
          <div class="shop-name">${puesto(L.variedad) ? esc(L.variedad) : 'Bolsa ' + c.gramos + ' g'}</div>
          <div class="shop-meta">Bolsa ${c.gramos} g · grano entero${meta ? '<br>' + esc(meta) : ''}</div>
          <div class="shop-foot">
            <span class="shop-price">${money(c.precios.bolsa)}</span>
            <button class="btn btn-ghost btn-sm js-add" data-id="${esc(L.id)}" ${L.agotado ? 'disabled' : ''}>
              ${L.agotado ? 'Agotado' : 'Agregar'}
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
            <button class="btn btn-solid btn-sm js-add" data-id="pasaporte">Agregar</button>
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
      agregar({ id: 'pasaporte', nombre: PASAPORTE.nombre, variante: 'Experiencia',
                precio: PASAPORTE.precio, img: 'assets/logo/icono-white.png' });
      return;
    }
    const hit = buscarLote(id);
    if (!hit || hit.lote.agotado) return;
    const { col: c, lote: L } = hit;
    agregar({
      id: L.id,
      nombre: 'Café ' + c.nombre + (puesto(L.variedad) ? ' · ' + L.variedad : ''),
      gramos: c.gramos,
      esCafe: true,
      molienda: 'grano',          // por defecto sale en grano entero
      precio: c.precios.bolsa,
      img: L.imagen
    });
  });

  /* ── Molienda ──────────────────────────────────────────────────────────── */
  const nombreMolienda = cod => {
    const m = (typeof MOLIENDAS !== 'undefined' ? MOLIENDAS : []).find(x => x.codigo === cod);
    return m ? m.nombre : cod;
  };

  // Texto que ve el cliente y que viaja al pago
  function varianteDe(l) {
    if (!l.esCafe) return l.variante || '';
    const base = 'Bolsa ' + l.gramos + ' g';
    return l.molienda === 'grano'
      ? base + ' · grano entero'
      : base + ' · molienda ' + nombreMolienda(l.molienda).toLowerCase();
  }

  // La clave de una línea combina café y molienda: el mismo café en dos
  // moliendas son dos líneas distintas del pedido.
  const claveLinea = l => l.id + '|' + (l.molienda || '');

  /* ── Perfil de taza ────────────────────────────────────────────────────── */
  // Los seis ejes de la infografía, ahora también en texto: la imagen de la
  // ficha es decorativa para un lector de pantalla, así que el dato tiene que
  // existir fuera de ella. Las barras son aria-hidden y el valor va en palabras.
  const EJES_PERFIL = [
    ['aroma', 'Aroma'], ['dulzura', 'Dulzura'], ['sabor', 'Sabor'],
    ['acidez', 'Acidez'], ['residual', 'Residual'], ['cuerpo', 'Cuerpo'],
  ];

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
          <span class="sr-only">${v} de 5</span>
        </div>`;
      });
    if (!filas.length) return '';
    return `<div class="perfil"><p class="perfil-tit">Perfil de taza</p>${filas.join('')}</div>`;
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
      avisar(nuevaMolienda === 'grano' ? 'En grano entero'
                                       : 'Molienda ' + nombreMolienda(nuevaMolienda).toLowerCase());
    }
  }

  /* ── Panel del carrito ─────────────────────────────────────────────────── */
  function pintarCarrito() {
    const cont = $('#cart-body'), foot = $('#cart-foot');
    const n = unidades();

    const badge = $('#cart-count');
    if (badge) { badge.textContent = n; badge.classList.toggle('on', n > 0); }
    const lbl = $('#cart-btn');
    if (lbl) lbl.setAttribute('aria-label', n ? `Carrito, ${n} producto${n > 1 ? 's' : ''}` : 'Carrito vacío');

    if (!cont || !foot) return;

    // innerHTML destruye el control que tenía el foco del teclado: se anota
    // cuál era para devolvérselo después del repintado.
    const act = document.activeElement;
    const focoEn = act && cont.contains(act)
      ? ['data-mas', 'data-menos', 'data-quitar', 'data-forma', 'data-molienda']
          .map(a => (act.hasAttribute(a) ? [a, act.getAttribute(a)] : null))
          .find(Boolean) || ['vacio', '']
      : null;

    if (!carrito.length) {
      cont.innerHTML = `
        <div class="cart-empty">
          <p>Tu carrito está vacío</p>
          <button class="btn btn-ghost btn-sm" data-cerrar-carrito>Ver los cafés</button>
        </div>`;
      foot.hidden = true;
      const f = $('#cart-envio');
      if (f) f.hidden = true;   // sin productos no tiene sentido pedir la dirección
      if (focoEn) { const b = $('[data-cerrar-carrito]', cont); if (b) b.focus(); }
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
          <div class="cart-line-name">${esc(l.nombre)}</div>
          <div class="cart-line-var">${esc(varianteDe(l))}</div>
          <div class="cart-line-price">${money(l.precio)} c/u</div>
        </div>
        <div class="cart-line-right">
          <div class="qty">
            <button data-menos="${esc(k)}" aria-label="Quitar una unidad de ${esc(l.nombre)}">−</button>
            <span>${l.cant}</span>
            <button data-mas="${esc(k)}" aria-label="Agregar una unidad de ${esc(l.nombre)}">+</button>
          </div>
          <button class="cart-line-del" data-quitar="${esc(k)}">Quitar</button>
        </div>
        ${l.esCafe ? `
        <div class="cart-line-opts">
          <label class="opt">
            <span class="sr-only">Presentación de ${esc(l.nombre)}</span>
            <select data-forma="${esc(k)}">
              <option value="grano" ${l.molienda === 'grano' ? 'selected' : ''}>Grano entero</option>
              <option value="molido" ${molido ? 'selected' : ''}>Molido</option>
            </select>
          </label>
          ${molido ? `
          <label class="opt">
            <span class="sr-only">Punto de molienda de ${esc(l.nombre)}</span>
            <select data-molienda="${esc(k)}">
              ${listaMoliendas.map(m => `
                <option value="${esc(m.codigo)}" ${l.molienda === m.codigo ? 'selected' : ''}
                >${esc(m.nombre)}${m.metodo ? ' · ' + esc(m.metodo) : ''}</option>`).join('')}
            </select>
          </label>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    const falta = PAGOS.envioGratisDesde > 0 ? PAGOS.envioGratisDesde - subtotal() : -1;
    $('#cart-sums').innerHTML = `
      ${falta > 0 ? `<div class="cart-row"><span>Te faltan ${money(falta)} para el envío gratis</span></div>` : ''}
      ${falta <= 0 && PAGOS.envioGratisDesde > 0 ? `<div class="cart-envio-libre">✓ Envío gratis aplicado</div>` : ''}
      <div class="cart-row"><span>Subtotal</span><span>${money(subtotal())}</span></div>
      <div class="cart-row"><span>Envío</span><span>${envio() === 0 ? 'Gratis' : money(envio())}</span></div>
      <div class="cart-row total"><span>Total</span><span>${money(total())}</span></div>`;

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
    if ($('#cart').classList.contains('open')) abrirCarrito(false);
    if ($('#nav-mobile').classList.contains('open')) cerrarNavMovil();
  });

  /* ── Pago ──────────────────────────────────────────────────────────────── */
  function textoPedido() {
    const lineas = carrito.map(l => `• ${l.cant} × ${l.nombre} (${varianteDe(l)}) — ${money(l.precio * l.cant)}`);
    return [
      'Hola Hysteria, quiero hacer un pedido:', '',
      lineas.join('\n'), '',
      `Subtotal: ${money(subtotal())}`,
      `Envío: ${envio() === 0 ? 'Gratis' : money(envio())}`,
      `Total: ${money(total())}`
    ].join('\n');
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

  async function pagar(datos) {
    if (!carrito.length) return;
    const btn = $('#envio-pagar');
    const original = btn.textContent;

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
        avisar('Cerramos tu pedido por WhatsApp');
        irWhatsapp(datos);
      } else {
        avisar('No pudimos conectar con el pago. Intenta de nuevo.');
      }
    }
  }

  function iniciarEnvio() {
    const form = $('#cart-envio');
    if (!form) return;

    pintarDocumentos();

    // Los textos dicen la verdad según cómo se esté cobrando hoy
    const porWhatsapp = PAGOS.modo !== 'mercadopago';
    const btnPagar = $('#envio-pagar');
    if (btnPagar) btnPagar.textContent = porWhatsapp ? 'Enviar pedido' : 'Ir a pagar';
    const notaEnvio = $('#nota-envio');
    if (notaEnvio) {
      notaEnvio.innerHTML = porWhatsapp
        ? 'Usamos tus datos solo para el envío y tu factura.<br>Coordinamos el pago contigo por WhatsApp.'
        : 'Usamos tus datos solo para el envío y tu factura electrónica.<br>El cobro lo procesa Mercado Pago.';
    }
    const notaResumen = $('#nota-resumen');
    if (notaResumen) {
      notaResumen.textContent = porWhatsapp
        ? 'Cerramos tu pedido por WhatsApp'
        : 'Pago con tarjeta, PSE o cierre por WhatsApp';
    }
    const btnResumen = $('#cart-checkout');
    if (btnResumen) btnResumen.textContent = porWhatsapp ? 'Continuar' : 'Finalizar compra';

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
        err.textContent = 'Revisa: ' + faltan.map(k => ROTULO[k] || k).join(', ') + '.';
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
        <a class="visit-link" href="${esc(mapa)}" target="_blank" rel="noopener">Ver en el mapa</a>
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
      filas.push(`<a href="https://wa.me/${esc(NEGOCIO.whatsapp)}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>`);
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
      '#txt-mision': TEXTOS.mision, '#txt-vision': TEXTOS.vision,
      '#txt-eyebrow': `Hysteria Coffee Roasters · Café de especialidad · ${NEGOCIO.ciudad}`,
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
        if (msg) msg.textContent = 'Escribe tu correo para suscribirte.';
        input.focus();
        return;
      }

      const btn = $('.nl-btn', form);
      const textoBtn = btn.textContent;
      btn.disabled = true;
      msg.style.color = '';
      msg.textContent = 'Enviando…';

      const respaldoCorreo = () => {
        window.location.href = `mailto:${NEGOCIO.correo}` +
          `?subject=${encodeURIComponent('Suscripción al boletín')}` +
          `&body=${encodeURIComponent('Quiero suscribirme con el correo: ' + email)}`;
        msg.textContent = 'Abrimos tu correo para confirmar la suscripción.';
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
          msg.textContent = '¡Listo! Te escribiremos pronto.';
        } else if (r.status === 400) {
          msg.textContent = 'Revisa el correo, parece incompleto.';
        } else {
          // Tropiezo pasajero del servidor (502/500): se pide reintentar.
          // El respaldo por correo queda solo para el 503 "sin configurar".
          msg.textContent = 'No pudimos registrarte en este momento. Inténtalo de nuevo en unos minutos.';
        }
      } catch (err) {
        console.warn('Boletín:', err);
        msg.textContent = 'No pudimos registrarte en este momento. Inténtalo de nuevo en unos minutos.';
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
    t.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('no-scroll');
  }
  function iniciarNav() {
    const t = $('#nav-toggle'), m = $('#nav-mobile');
    m.setAttribute('inert', '');   // arranca cerrado, fuera del orden de tabulación
    t.addEventListener('click', () => {
      const abierto = m.classList.toggle('open');
      m.toggleAttribute('inert', !abierto);
      t.setAttribute('aria-expanded', String(abierto));
      t.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      document.body.classList.toggle('no-scroll', abierto);
    });
    $$('a', m).forEach(a => a.addEventListener('click', cerrarNavMovil));

    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Resalta la sección visible
    const enlaces = $$('.nav-links a');
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
    const productos = todosLosLotes().map(({ col: c, lote: L }) => {
      const p = {
        '@type': 'Product',
        name: 'Café ' + c.nombre + (puesto(L.variedad) ? ' · ' + L.variedad : '') +
              ' · Bolsa ' + c.gramos + ' g',
        description: [c.descripcion, puesto(L.notas) ? 'Notas: ' + L.notas + '.' : '']
          .filter(Boolean).join(' '),
        image: base + '/' + L.imagen,
        brand: { '@type': 'Brand', name: 'Hysteria Coffee Roasters' },
        weight: { '@type': 'QuantitativeValue', value: c.gramos, unitCode: 'GRM' },
        offers: {
          '@type': 'Offer', price: c.precios.bolsa, priceCurrency: 'COP',
          availability: L.agotado
            ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          url: base + '/#tienda'
        }
      };
      const props = [
        ['Origen', L.origen], ['Variedad', L.variedad],
        ['Proceso', L.proceso], ['Altura', L.altura], ['Tueste', L.tueste]
      ].filter(x => puesto(x[1]));
      if (props.length) {
        p.additionalProperty = props.map(x => ({
          '@type': 'PropertyValue', name: x[0], value: x[1]
        }));
      }
      return p;
    });

    const negocio = {
      '@type': 'CafeOrCoffeeShop',
      '@id': base + '/#negocio',
      name: 'Hysteria Coffee Roasters',
      description: 'Tostadora y café de especialidad en ' + NEGOCIO.ciudad + '. Colecciones Pasión, Ilusión, Deseo y Euforia.',
      url: base + '/',
      // Google pinta estos logos sobre fondo blanco: el imagotipo de marca es
      // blanco y quedaría invisible, por eso aquí va la variante oscura.
      image: base + '/assets/fotos/og.jpg',
      logo: base + '/assets/logo/logo-schema.png',
      email: NEGOCIO.correo,
      servesCuisine: 'Café de especialidad',
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

  /* ── Arranque ──────────────────────────────────────────────────────────── */
  function iniciar() {
    cargarCarrito();
    pintarTextos();
    pintarFiltros();
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

    // Mensaje de vuelta desde Mercado Pago
    const params = new URLSearchParams(location.search);
    const p = params.get('pago');
    const ref = (params.get('ref') || '').replace(/[^A-Z0-9-]/gi, '').slice(0, 20);
    if (p === 'exito') {
      carrito = []; guardarCarrito(); pintarCarrito();
      avisar(ref ? `¡Gracias! Tu pedido ${ref} está confirmado` : '¡Gracias! Recibimos tu pedido');
    } else if (p === 'fallo') {
      avisar('El pago no se completó');
    } else if (p === 'pendiente') {
      avisar(ref ? `Pedido ${ref}: pago pendiente de confirmación`
                 : 'Tu pago quedó pendiente de confirmación');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
