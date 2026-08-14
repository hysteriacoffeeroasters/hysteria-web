/* ============================================================================
   PAGO CON WOMPI · CONFIRMAR EL RESULTADO
   ----------------------------------------------------------------------------
   Al terminar, Wompi devuelve al cliente a nuestra web con ?id=<transacción>,
   y usa la MISMA dirección tanto si el pago pasó como si lo rechazaron.

   Por eso no se puede confiar en el regreso: hay que preguntarle a Wompi.
   Esta función consulta la transacción y devuelve su estado real.

   Estados posibles:
     APPROVED  → pagado
     DECLINED  → rechazado
     VOIDED    → anulado
     ERROR     → falló en la pasarela
     PENDING   → aún procesando (típico en PSE y efectivo)
   ========================================================================== */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const llavePublica = process.env.WOMPI_PUBLIC_KEY;
  if (!llavePublica) {
    return res.status(503).json({ error: 'Pagos no configurados todavía' });
  }

  // Solo caracteres de un id de transacción: nada de rutas ni consultas
  const id = String(req.query.id || '').trim();
  if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' });
  }

  // La llave dice sola en qué ambiente estamos
  const base = llavePublica.startsWith('pub_prod_')
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';

  try {
    const r = await fetch(`${base}/transactions/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': `Bearer ${llavePublica}`, 'Accept': 'application/json' },
    });

    if (!r.ok) {
      console.error('Wompi respondió con error al consultar:', r.status);
      return res.status(502).json({ error: 'No pudimos confirmar el pago' });
    }

    const datos = await r.json();
    const t = (datos && datos.data) || {};

    return res.status(200).json({
      estado: t.status || 'DESCONOCIDO',
      referencia: t.reference || '',
      metodo: (t.payment_method_type || ''),
    });

  } catch (err) {
    console.error('Error consultando la transacción de Wompi:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
