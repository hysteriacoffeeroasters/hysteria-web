/* ============================================================================
   PÁGINA DE ENLACES (para el perfil de Instagram)
   ----------------------------------------------------------------------------
   Los botones fijos ya están escritos en enlaces.html. Aquí solo se añaden
   los que dependen de datos.js —WhatsApp, Instagram, correo, dirección— para
   que cambiar el número o la dirección allí baste también en esta página.
   ========================================================================== */

(function () {
  'use strict';

  const puesto = v => v && String(v).trim() && String(v).trim() !== 'PENDIENTE';
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  if (typeof NEGOCIO === 'undefined') return;

  // La dirección real de la tienda, tomada de TIENDAS
  const tienda = (typeof TIENDAS !== 'undefined' ? TIENDAS : [])
    .find(t => puesto(t.direccion));
  const dir = document.getElementById('hub-direccion');
  if (dir && tienda) dir.textContent = `${tienda.direccion}, ${NEGOCIO.ciudad}`;

  const directos = [];

  if (puesto(NEGOCIO.whatsapp)) {
    const texto = encodeURIComponent('Hola Hysteria, quiero saber más sobre sus cafés.');
    directos.push(`<a class="hub-directo" href="https://wa.me/${esc(NEGOCIO.whatsapp)}?text=${texto}"
      target="_blank" rel="noopener">WhatsApp</a>`);
  }
  if (puesto(NEGOCIO.instagram)) {
    directos.push(`<a class="hub-directo" href="${esc(NEGOCIO.instagram)}"
      target="_blank" rel="noopener">Instagram</a>`);
  }
  if (puesto(NEGOCIO.correo)) {
    directos.push(`<a class="hub-directo" href="mailto:${esc(NEGOCIO.correo)}">Correo</a>`);
  }
  if (tienda) {
    const mapa = tienda.mapa || ('https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(`${tienda.direccion}, ${NEGOCIO.ciudad}, ${NEGOCIO.pais}`));
    directos.push(`<a class="hub-directo" href="${esc(mapa)}"
      target="_blank" rel="noopener">Cómo llegar</a>`);
  }

  const cont = document.getElementById('hub-directos');
  if (cont) cont.innerHTML = directos.join('');
})();
