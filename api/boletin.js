/* ============================================================================
   SUSCRIPCIÓN AL BOLETÍN · BREVO
   ----------------------------------------------------------------------------
   Esta función corre en el servidor de Vercel, NO en el navegador.
   Por eso tu llave de Brevo nunca queda expuesta.

   CONFIGURACIÓN (una sola vez):

   1. Crea tu cuenta gratis en https://www.brevo.com
   2. Arriba a la derecha, tu nombre → "SMTP y API" → pestaña "Claves de API"
      → "Generar una nueva clave de API" → cópiala
   3. Opcional pero recomendado: Contactos → Listas → crea la lista
      "Boletín web" y anota su ID (el número que aparece en la URL)
   4. En Vercel: tu proyecto → Settings → Environment Variables
        Nombre: BREVO_API_KEY     Valor: la clave que copiaste
        Nombre: BREVO_LIST_ID     Valor: el número de la lista  (opcional)
      Marca Production, Preview y Development.
   5. Deployments → ⋯ → Redeploy

   Mientras no exista BREVO_API_KEY, el formulario de la web sigue usando
   el correo como respaldo, así que no se rompe nada.
   ========================================================================== */

const MAX_LARGO = 254;   // longitud máxima real de un correo

// Validación deliberadamente simple y estricta
function correoValido(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (s.length < 6 || s.length > MAX_LARGO) return false;
  // Acepta dominios con varios niveles (unal.edu.co, empresa.com.co…)
  return /^[^\s@,;:<>()[\]\\]+@[^\s@.,;:<>()[\]\\]+(\.[^\s@.,;:<>()[\]\\]+)*\.[A-Za-z]{2,}$/.test(s);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const clave = process.env.BREVO_API_KEY;
  if (!clave) {
    // 503 le dice a la web que use el respaldo por correo
    return res.status(503).json({ error: 'Boletín no configurado todavía' });
  }

  // Defensa ligera: solo aceptamos suscripciones enviadas desde nuestra propia
  // web (misma origin). No frena un bot decidido, pero descarta el abuso trivial
  // desde otros orígenes. La protección fuerte (rate-limit por IP + doble opt-in)
  // se documenta en el LEEME y requiere infraestructura adicional.
  const origen = req.headers.origin || '';
  const permitido = ['https://www.hysteriacoffeeroasters.com', 'https://hysteriacoffeeroasters.com'];
  if (origen && !permitido.includes(origen)) {
    return res.status(403).json({ error: 'Origen no permitido' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Cuerpo no válido' });
  }

  try {
    // Trampa antibots: si este campo viene lleno, lo llenó un robot.
    // Respondemos "listo" para que no sepa que lo detectamos.
    if (body.website) return res.status(200).json({ ok: true });

    const email = String(body.email || '').trim().toLowerCase();
    if (!correoValido(email)) {
      return res.status(400).json({ error: 'Correo no válido' });
    }

    const datos = { email, updateEnabled: true };

    const listId = parseInt(process.env.BREVO_LIST_ID, 10);
    if (Number.isFinite(listId) && listId > 0) datos.listIds = [listId];

    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': clave,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(datos),
    });

    // 201 = creado · 204 = ya existía y se actualizó
    if (r.status === 201 || r.status === 204) {
      return res.status(200).json({ ok: true });
    }

    let detalle = {};
    try { detalle = await r.json(); } catch (e) {}

    // Ya estaba suscrito: para el visitante eso es un éxito, no un error
    if (detalle && detalle.code === 'duplicate_parameter') {
      return res.status(200).json({ ok: true, yaEstaba: true });
    }

    console.error('Brevo respondió con error:', r.status, detalle);
    return res.status(502).json({ error: 'No pudimos registrar el correo' });

  } catch (err) {
    console.error('Error registrando la suscripción:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
