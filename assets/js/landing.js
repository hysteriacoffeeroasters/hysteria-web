/* ============================================================================
   PÁGINAS DE SECCIÓN (LANDINGS)
   ----------------------------------------------------------------------------
   Cada sección del sitio tiene además su propia página, para compartir por
   WhatsApp o Instagram: /menu, /cafes, /preparacion, /tienda, /visitanos.

   Este archivo NO se usa en index.html: la portada conserva su estructura
   intacta. Aquí solo se arma, una sola vez, lo que rodea a la sección:
   la barra de arriba, el pie, el carrito y los botones flotantes.

   Se carga ANTES que app.js (los dos con defer, que respetan el orden), así
   que cuando app.js arranca ya encuentra todo en su sitio y funciona igual
   que en la portada: el carrito, el checkout y los pagos son los mismos.

   Para crear otra landing: copia un archivo como menu.html, cambia el <title>,
   las etiquetas og: y el bloque <section> de dentro de <main>.
   ========================================================================== */

(function () {
  'use strict';

  const main = document.getElementById('contenido');
  if (!main) return;

  /* ── Barra de arriba ─────────────────────────────────────────────────────
     Deliberadamente más simple que la de la portada: quien llega aquí viene
     de un enlace concreto, así que se le ofrece la marca, el carrito y una
     salida clara al sitio completo, sin el menú de siete secciones. */
  const cabecera = `
  <header class="nav" id="nav">
    <a href="/" class="nav-logo" aria-label="Hysteria Coffee Roasters, inicio">
      <img src="assets/logo/icono-white.png" alt="" width="512" height="478">
      <span class="nav-logo-text">Hysteria<span>Coffee Roasters</span></span>
    </a>
    <nav class="nav-links landing-nav" aria-label="Navegación">
      <a href="/">Ver todo el sitio</a>
    </nav>
    <div class="nav-actions">
      <button class="cart-btn" id="cart-btn" aria-label="Carrito vacío">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span class="cart-label">Carrito</span>
        <span class="cart-count" id="cart-count">0</span>
      </button>
    </div>
  </header>`;

  /* ── Pie ─────────────────────────────────────────────────────────────── */
  const pie = `
  <div class="landing-otras">
    <p class="landing-otras-tit">Sigue explorando</p>
    <nav class="landing-otras-links" aria-label="Otras secciones">
      <a href="/cafes">Nuestros cafés</a>
      <a href="/menu">Menú</a>
      <a href="/preparacion">Cómo prepararlo</a>
      <a href="/tienda">Tienda</a>
      <a href="/visitanos">Visítanos</a>
    </nav>
  </div>

  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-mark">
        <img src="assets/logo/imagotipo-white.png" alt="Hysteria Coffee Roasters"
             width="640" height="1031" loading="lazy">
        <p class="footer-tagline">
          Café tostado con pasión.<br>
          Trato directo y precio justo con el caficultor.<br>
          Bogotá, Colombia.
        </p>
      </div>
      <div>
        <p class="footer-col-title">Contacto</p>
        <div class="footer-links" id="footer-contact"></div>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">© <span id="year">2026</span> Hysteria Coffee Roasters · Bogotá, Colombia</span>
      <div class="footer-social" id="footer-social"></div>
    </div>
  </footer>`;

  /* ── Carrito y flotantes ─────────────────────────────────────────────────
     Mismo marcado que la portada: así el pedido, el checkout y el pago
     funcionan idénticos desde cualquier landing. */
  const carrito = `
  <div class="cart-backdrop" id="cart-backdrop"></div>
  <aside class="cart" id="cart" role="dialog" aria-modal="true" aria-hidden="true"
         aria-labelledby="cart-title" inert>
    <div class="cart-head">
      <h2 id="cart-title">Tu pedido</h2>
      <button class="cart-close" id="cart-close" aria-label="Cerrar carrito">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="cart-body" id="cart-body"></div>

    <div class="cart-foot" id="cart-foot" hidden>
      <div id="cart-sums" role="status" aria-live="polite"></div>
      <button class="btn btn-solid cart-checkout" id="cart-checkout">Finalizar compra</button>
      <p class="cart-nota" id="nota-resumen">Cerramos tu pedido por WhatsApp</p>
    </div>

    <form class="cart-envio" id="cart-envio" hidden novalidate>
      <div class="envio-head">
        <button type="button" class="envio-volver" id="envio-volver">← Volver al pedido</button>
        <p class="envio-titulo">¿A dónde lo enviamos?</p>
      </div>

      <label class="campo">
        <span>Nombre y apellido</span>
        <input type="text" id="env-nombre" name="nombre" autocomplete="name" required>
      </label>

      <label class="campo">
        <span>Celular / WhatsApp</span>
        <input type="tel" id="env-telefono" name="telefono" autocomplete="tel"
               inputmode="tel" placeholder="300 000 0000" required>
      </label>

      <label class="campo">
        <span>Correo <em>(ahí llega tu factura)</em></span>
        <input type="email" id="env-correo" name="correo" autocomplete="email"
               inputmode="email" placeholder="tu@correo.com" required>
      </label>

      <div class="campo-fila">
        <label class="campo">
          <span>Documento</span>
          <select id="env-doctipo" name="doctipo" required></select>
        </label>
        <label class="campo">
          <span>Número</span>
          <input type="text" id="env-docnum" name="docnum" inputmode="numeric"
                 autocomplete="off" placeholder="1020304050" required>
        </label>
      </div>

      <label class="campo">
        <span>Ciudad</span>
        <input type="text" id="env-ciudad" name="ciudad" autocomplete="address-level2" required>
      </label>

      <label class="campo">
        <span>Dirección</span>
        <input type="text" id="env-direccion" name="direccion" autocomplete="street-address"
               placeholder="Calle 92 #15-62, apto 301" required>
      </label>

      <label class="campo">
        <span>Indicaciones <em>(opcional)</em></span>
        <input type="text" id="env-notas" name="notas" placeholder="Portería, horario, punto de referencia">
      </label>

      <p class="envio-error" id="envio-error" role="alert"></p>
      <button type="submit" class="btn btn-solid cart-checkout" id="envio-pagar">Ir a pagar</button>
      <p class="cart-nota" id="nota-envio">Usamos tus datos solo para el envío y tu factura.<br>
        Coordinamos el pago contigo por WhatsApp.</p>
    </form>
  </aside>

  <a class="wa-float" id="wa-float" href="#" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.465 3.488"/>
    </svg>
  </a>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  main.insertAdjacentHTML('beforebegin', cabecera);
  main.insertAdjacentHTML('afterend', pie + carrito);

  // La página actual no se ofrece a sí misma en "Sigue explorando"
  const aqui = location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  document.querySelectorAll('.landing-otras-links a').forEach(a => {
    if (a.getAttribute('href') === aqui) a.remove();
  });
})();
