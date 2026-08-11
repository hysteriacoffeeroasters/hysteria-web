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

  /* ── Estado del carrito ────────────────────────────────────────────────── */
  const LLAVE = 'hysteria_carrito_v1';
  let carrito = [];

  function cargarCarrito() {
    try {
      const raw = localStorage.getItem(LLAVE);
      carrito = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(carrito)) carrito = [];
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

  function agregar(item) {
    const ex = carrito.find(l => l.id === item.id);
    if (ex) ex.cant += 1;
    else carrito.push(Object.assign({ cant: 1 }, item));
    guardarCarrito(); pintarCarrito();
    avisar(item.nombre + ' agregado');
  }
  function cambiarCant(id, d) {
    const l = carrito.find(x => x.id === id);
    if (!l) return;
    l.cant += d;
    if (l.cant < 1) carrito = carrito.filter(x => x.id !== id);
    guardarCarrito(); pintarCarrito();
  }
  function quitar(id) {
    carrito = carrito.filter(x => x.id !== id);
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

      return `
      <article class="coffee" data-coll="${esc(c.id)}" style="--c:${esc(c.color)}">
        <div class="coffee-media">
          <img src="${esc(L.imagen)}"
               alt="Ficha de cata de ${esc(c.nombre)}${puesto(L.variedad) ? ', variedad ' + esc(L.variedad) : ''}"
               width="1000" height="896" loading="lazy" decoding="async">
          <span class="coffee-dot" aria-hidden="true"></span>
          <div class="coffee-badges">${badges}</div>
        </div>
        <div class="coffee-info">
          <h3 class="coffee-name">${esc(c.nombre)}</h3>
          ${puesto(L.variedad) ? `<p class="coffee-lote">${esc(L.variedad)}</p>` : ''}
          <p class="coffee-desc">${esc(c.descripcion)}</p>

          ${specs.length ? `<div class="coffee-specs">${specs.map(s => `
            <div><div class="spec-k">${esc(s[0])}</div><div class="spec-v">${esc(s[1])}</div></div>
          `).join('')}</div>` : ''}

          ${puesto(L.notas) ? `<p class="coffee-notes">${esc(L.notas)}</p>` : ''}
          ${extras ? `<p class="coffee-extra">${esc(extras)}</p>` : ''}

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
      '<button class="cfilt on" data-f="all">Todas</button>' +
      COLECCIONES.map(c => `<button class="cfilt" data-f="${esc(c.id)}">${esc(c.nombre)}</button>`).join('');

    cont.addEventListener('click', e => {
      const b = e.target.closest('.cfilt');
      if (!b || b.classList.contains('on')) return;
      $$('.cfilt', cont).forEach(x => { x.classList.remove('on'); });
      b.classList.add('on');
      filtrar(b.dataset.f);
    });
  }

  function filtrar(key) {
    const col = COLECCIONES.find(c => c.id === key);
    document.documentElement.style.setProperty('--accent', col ? col.color : '#FFFFFF');

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
            ${COLECCIONES.map(c => `<th scope="col" style="color:${esc(c.color)}">${esc(c.nombre)}</th>`).join('')}
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

    tabs.innerHTML = MENU.map((g, i) => `
      <button class="mtab${i === 0 ? ' on' : ''}" role="tab" id="tab-${esc(g.id)}"
              aria-controls="panel-${esc(g.id)}" aria-selected="${i === 0}">${esc(g.nombre)}</button>`).join('');

    panels.innerHTML = MENU.map((g, i) => `
      <div class="menu-panel" role="tabpanel" id="panel-${esc(g.id)}"
           aria-labelledby="tab-${esc(g.id)}" ${i === 0 ? '' : 'hidden'}>
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

    tabs.addEventListener('click', e => {
      const b = e.target.closest('.mtab');
      if (!b) return;
      $$('.mtab', tabs).forEach(x => { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('on'); b.setAttribute('aria-selected', 'true');
      $$('.menu-panel', panels).forEach(p => { p.hidden = true; });
      const target = $('#' + b.getAttribute('aria-controls'));
      if (target) target.hidden = false;
    });
  }

  /* ── Tienda ────────────────────────────────────────────────────────────── */
  function pintarTienda() {
    const cont = $('#shop-grid');
    if (!cont) return;

    cont.innerHTML = todosLosLotes().map(({ col: c, lote: L }) => {
      const meta = [L.origen, L.proceso].filter(puesto).join(' · ');
      return `
      <article class="shop-card" style="--c:${esc(c.color)}">
        <div class="shop-media">
          <img src="${esc(L.imagen)}" alt="Bolsa de café ${esc(c.nombre)} ${esc(L.variedad)}"
               width="1000" height="896" loading="lazy" decoding="async">
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
      variante: 'Bolsa ' + c.gramos + ' g · grano entero',
      precio: c.precios.bolsa,
      img: L.imagen
    });
  });

  /* ── Panel del carrito ─────────────────────────────────────────────────── */
  function pintarCarrito() {
    const cont = $('#cart-body'), foot = $('#cart-foot');
    const n = unidades();

    const badge = $('#cart-count');
    if (badge) { badge.textContent = n; badge.classList.toggle('on', n > 0); }
    const lbl = $('#cart-btn');
    if (lbl) lbl.setAttribute('aria-label', n ? `Carrito, ${n} producto${n > 1 ? 's' : ''}` : 'Carrito vacío');

    if (!cont || !foot) return;

    if (!carrito.length) {
      cont.innerHTML = `
        <div class="cart-empty">
          <p>Tu carrito está vacío</p>
          <button class="btn btn-ghost btn-sm" data-cerrar-carrito>Ver los cafés</button>
        </div>`;
      foot.hidden = true;
      return;
    }
    foot.hidden = false;

    cont.innerHTML = carrito.map(l => `
      <div class="cart-line">
        <img class="cart-line-img" src="${esc(l.img)}" alt="" loading="lazy">
        <div class="cart-line-mid">
          <div class="cart-line-name">${esc(l.nombre)}</div>
          <div class="cart-line-var">${esc(l.variante)}</div>
          <div class="cart-line-price">${money(l.precio)} c/u</div>
        </div>
        <div class="cart-line-right">
          <div class="qty">
            <button data-menos="${esc(l.id)}" aria-label="Quitar una unidad de ${esc(l.nombre)}">−</button>
            <span>${l.cant}</span>
            <button data-mas="${esc(l.id)}" aria-label="Agregar una unidad de ${esc(l.nombre)}">+</button>
          </div>
          <button class="cart-line-del" data-quitar="${esc(l.id)}">Quitar</button>
        </div>
      </div>`).join('');

    const falta = PAGOS.envioGratisDesde > 0 ? PAGOS.envioGratisDesde - subtotal() : -1;
    $('#cart-sums').innerHTML = `
      ${falta > 0 ? `<div class="cart-row"><span>Te faltan ${money(falta)} para el envío gratis</span></div>` : ''}
      ${falta <= 0 && PAGOS.envioGratisDesde > 0 ? `<div class="cart-envio-libre">✓ Envío gratis aplicado</div>` : ''}
      <div class="cart-row"><span>Subtotal</span><span>${money(subtotal())}</span></div>
      <div class="cart-row"><span>Envío</span><span>${envio() === 0 ? 'Gratis' : money(envio())}</span></div>
      <div class="cart-row total"><span>Total</span><span>${money(total())}</span></div>`;
  }

  function abrirCarrito(abrir) {
    $('#cart').classList.toggle('open', abrir);
    $('#cart-backdrop').classList.toggle('open', abrir);
    $('#cart').setAttribute('aria-hidden', String(!abrir));
    document.body.classList.toggle('no-scroll', abrir);
    if (abrir) $('#cart-close').focus();
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

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#cart').classList.contains('open')) abrirCarrito(false);
    if ($('#nav-mobile').classList.contains('open')) cerrarNavMovil();
  });

  /* ── Pago ──────────────────────────────────────────────────────────────── */
  function textoPedido() {
    const lineas = carrito.map(l => `• ${l.cant} × ${l.nombre} (${l.variante}) — ${money(l.precio * l.cant)}`);
    return [
      'Hola Hysteria, quiero hacer un pedido:', '',
      lineas.join('\n'), '',
      `Subtotal: ${money(subtotal())}`,
      `Envío: ${envio() === 0 ? 'Gratis' : money(envio())}`,
      `Total: ${money(total())}`
    ].join('\n');
  }

  function irWhatsapp() {
    const msg = encodeURIComponent(textoPedido());
    if (puesto(NEGOCIO.whatsapp)) {
      window.open(`https://wa.me/${NEGOCIO.whatsapp}?text=${msg}`, '_blank', 'noopener');
    } else {
      window.location.href =
        `mailto:${NEGOCIO.correo}?subject=${encodeURIComponent('Pedido desde la web')}&body=${msg}`;
    }
  }

  async function pagar() {
    if (!carrito.length) return;
    const btn = $('#cart-checkout');
    const original = btn.textContent;

    if (PAGOS.modo !== 'mercadopago') return irWhatsapp();

    btn.disabled = true;
    btn.textContent = 'Conectando…';

    try {
      const r = await fetch('/api/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: carrito.map(l => ({
            id: l.id, titulo: l.nombre, descripcion: l.variante,
            cantidad: l.cant, precio: l.precio
          })),
          envio: envio()
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
        irWhatsapp();
      } else {
        avisar('No pudimos conectar con el pago. Intenta de nuevo.');
      }
    }
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
      '#txt-eyebrow': `${NEGOCIO.ciudad} · Café de especialidad · Est. ${NEGOCIO.fundacion}`,
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
      if (!email) return;

      if (!BOLETIN.endpoint) {
        window.location.href = `mailto:${NEGOCIO.correo}` +
          `?subject=${encodeURIComponent('Suscripción al boletín')}` +
          `&body=${encodeURIComponent('Quiero suscribirme con el correo: ' + email)}`;
        msg.textContent = 'Abrimos tu correo para confirmar la suscripción.';
        return;
      }
      msg.textContent = 'Enviando…';
      try {
        const r = await fetch(BOLETIN.endpoint, {
          method: 'POST', headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });
        if (!r.ok) throw new Error();
        form.reset();
        msg.textContent = '¡Listo! Te escribiremos pronto.';
      } catch (err) {
        msg.textContent = 'No pudimos suscribirte. Escríbenos a ' + NEGOCIO.correo;
      }
    });
  }

  /* ── Navegación ────────────────────────────────────────────────────────── */
  function cerrarNavMovil() {
    $('#nav-mobile').classList.remove('open');
    $('#nav-toggle').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }
  function iniciarNav() {
    const t = $('#nav-toggle'), m = $('#nav-mobile');
    t.addEventListener('click', () => {
      const abierto = m.classList.toggle('open');
      t.setAttribute('aria-expanded', String(abierto));
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
      description: 'Tostadora y café de especialidad en ' + NEGOCIO.ciudad + '. Colecciones Pasión, Ilusión y Deseo.',
      url: base + '/',
      image: base + '/assets/logo/imagotipo-white.png',
      logo: base + '/assets/logo/icono-white.png',
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
    pintarTienda();
    pintarTiendas();
    pintarContacto();
    pintarCarrito();
    iniciarNav();
    iniciarBoletin();
    iniciarReveal();
    inyectarSchema();

    $('#cart-checkout').addEventListener('click', pagar);

    // Mensaje de vuelta desde Mercado Pago
    const p = new URLSearchParams(location.search).get('pago');
    if (p === 'exito') {
      carrito = []; guardarCarrito(); pintarCarrito();
      avisar('¡Gracias! Recibimos tu pedido');
    } else if (p === 'fallo') {
      avisar('El pago no se completó');
    } else if (p === 'pendiente') {
      avisar('Tu pago quedó pendiente de confirmación');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
