# Plan de arreglo de la auditoría · Hysteria Coffee Roasters

> **Para retomar en otra sesión:** este archivo es la fuente de la verdad del
> trabajo. Lee primero "Cómo retomar" al final. El estado real está en las
> casillas `[ ]` / `[x]` — se actualizan y se hace commit tras cada grupo.

**Encargo de Andrés (14 ago 2026):** *"Arregla todo, absolutamente todo,
necesito que me entregues un trabajo totalmente profesional."*

**Origen:** auditoría de 6 lentes con refutación adversarial.
56 hallazgos en bruto → 31 tumbados → **25 comprobados** (1 alto, 6 medios, 18 bajos).
Informe legible: https://claude.ai/code/artifact/383339f5-7715-4a4d-94f7-8a87e51a14d5

---

## Reglas que no se negocian

1. **El español es la fuente.** El inglés es una capa (`assets/js/en.js`, GENERADO).
   Si una frase no está traducida, sale en español — nunca rota.
2. **Ojo con el orden de traduccion:** `traducirDatos()` traduce los datos ANTES
   de que se pinten, asi que en el momento del pintado `L.tueste` ya viene en
   ingles. Componer etiqueta + valor con `traducir()` en las dos partes
   duplica palabras. El generador tiene un bloque de `overrides` que gana al
   workflow, justo para estos choques.
3. **`assets/js/en.js` no se edita a mano.** Se regenera desde
   `scratchpad/ui-en.json` + la salida del workflow de traducción. Si el
   scratchpad ya no existe, editar `en.js` directamente y anotarlo aquí.
4. **No se usa "Colombian coffee" como reclamo.** La Federación Nacional de
   Cafeteros lo prohíbe a quien no es miembro. Sí se nombra el origen concreto.
5. **Los correos de pedido van en español a propósito**, aunque el cliente
   compre desde `/en`. Decisión de Andrés, no es un fallo.
6. **El favicon está congelado** hasta el 4 de septiembre esperando que Google
   lo rastree. NO tocar `favicon.ico` ni los `favicon-*.png`.
7. **Nunca escribir secretos en archivos del repo.** Van en variables de
   entorno de Vercel. `lib/` se sirve público (hallazgo 23).
8. **Verificar en producción tras cada despliegue**, no solo en local.

---

## Estado general

| Grupo | Hallazgos | Estado |
|---|---|---|
| A · Pedidos y avisos | 01, 02, 08, 09, 13 | [x] **hecho** · commit `GRUPO A` |
| B · Carrito | 03, 10, 11, 12, 24, 25 | [x] **hecho** · commit `GRUPO B` |
| C · Bilingüe | 04, 14, 15, 16 | [x] **hecho** · commit `GRUPO C` |
| D · SEO y documentación | 05, 06, 17, 18, 22, 23 | [ ] pendiente |
| E · Accesibilidad y contenido | 07, 19, 20, 21 | [ ] pendiente |

---

## GRUPO A · Pedidos y avisos

### [x] 01 · ALTO — Si Brevo falla, el pedido se pierde y el cliente ve "confirmado"

**Enfoque decidido.** No hay almacén (ni KV ni Blob; `package.json` no tiene
dependencias). No se va a fingir que se arregló la persistencia. Se ataca el
DAÑO, que son tres cosas:

- `assets/js/app.js` (~1469-1475, `confirmarWompi`): leer `avisado` de la
  respuesta. Solo vaciar el carrito y decir "confirmado" si `avisado === true`.
  Si es `false`: **conservar el carrito**, y decirle la verdad al cliente
  ("Tu pago se procesó. Estamos confirmando tu pedido, guarda esta referencia").
- `lib/correo-pedido.js`: reintentar el envío a Brevo (3 intentos con espera
  creciente) antes de darlo por perdido.
- `lib/correo-pedido.js`: si tras los reintentos falla, escribir el pedido
  COMPLETO en el registro con un prefijo greppable, p. ej.
  `PEDIDO_SIN_AVISAR {json}`, para poder recuperarlo desde los logs de Vercel.

**Lo que queda fuera y hay que decirle a Andrés:** persistencia de verdad.
Requiere que él cree un store en el panel de Vercel (Blob o KV) y pegue el
token; sin eso no se puede hacer desde aquí. Anotarlo como pendiente suyo.

### [x] 02 · MEDIO — El aviso de Wompi le gana la carrera y la hoja llega sin detalle

**Enfoque decidido.** Hoy las dos vías se excluyen con `yaAvisado(referencia)`
y gana la primera. Cambiar a etiquetas distintas:

- Correo detallado (vía cliente) → etiqueta `referencia`
- Correo provisional (vía webhook, sin detalle) → etiqueta `referencia + ':provisional'`
- `yaAvisado(ref)` mira SOLO la etiqueta detallada → el provisional ya no
  suprime al bueno.
- Nueva `yaAvisadoProvisional(ref)` para que el webhook no se repita a sí mismo
  en sus reintentos.

Resultado: si el webhook gana, llegan dos correos, pero el segundo trae el
detalle. Hoy llega uno solo y es inútil.

**Además:** quitar del correo provisional la frase *"el cliente no volvió a la
web tras pagar"*, que es falsa cuando sí volvió. Decir "detalle en camino".

### [x] 08 · BAJO — El antiduplicados es un check-then-act contra el log de Brevo
Se mitiga con lo de 02 (etiquetas separadas). Documentar la ventana que queda
en un comentario. No se puede cerrar del todo sin almacén propio.

### [x] 09 · BAJO — Si falla el correo al negocio, el cliente recibe hasta 3 copias
`api/wompi-eventos.js` (~114-129): separar el estado de los dos correos.
Reintentar solo lo que falló; no volver a enviar al cliente si el suyo sí salió.

### [x] 13 · BAJO — Tras pagar, Wompi devuelve siempre a la portada en español
`api/wompi.js` (~109): aceptar el idioma en el cuerpo de la petición y armar
`redirect-url` con `/en` cuando corresponda. En `assets/js/app.js`, `pagarWompi`
debe mandar `idioma: IDIOMA`.

---

## GRUPO B · Carrito

### [x] 03 · MEDIO — El carrito conserva cafés borrados del catálogo
`assets/js/app.js` (~55-77, `cargarCarrito`): descartar las líneas cuyo `id` ya
no exista en el catálogo (`buscarLote` + `PASAPORTE`), y avisar al cliente con
un toast. Ojo: no romper el Pasaporte, que no es un lote.

### [x] 10 · BAJO — Dos pestañas se pisan el carrito
`assets/js/app.js` (~33, 80-82): releer `localStorage` justo antes de escribir
y fusionar, en vez de sobrescribir con el estado en memoria.

### [x] 11 · BAJO — Precio viejo si cambian los tamaños de bolsa
`assets/js/app.js` (~37-45, `precioDeCatalogo`): si la colección tiene
presentaciones y la guardada ya no existe, caer a la primera presentación con
su precio de hoy (igual que hace el servidor en `lib/pedido.js`), no al precio
guardado.

### [x] 12 · BAJO — La foto del Pasaporte sale rota en /en
`assets/js/app.js` (~567): la ruta va sin barra inicial. Ya existe
`arreglarRutas()` en `idioma.js`; lo más limpio es que esa ruta salga de
`PASAPORTE` en `datos.js` o ponerle la barra.

### [x] 24 · BAJO — Escape lanza TypeError en las 12 páginas de sección
`assets/js/app.js` (~865): comprobar que `#nav-mobile` exista antes de usarlo.

### [x] 25 · BAJO — El botón QUITAR no dice qué producto quita
`assets/js/app.js` (~742): añadir `aria-label` con el nombre, igual que ya
hacen los botones de cantidad de esa misma fila.

---

## GRUPO C · Bilingüe

### [x] 04 · MEDIO — Tres textos en español visibles al cargar /en
- `assets/js/app.js:197` → "En barra, taza filtrada $11.500"
- `assets/js/app.js:506` → "DE LA CASA"
- `assets/js/enlaces.js:43` → "Cómo llegar" (ya llama a `traducir()`, falta la
  entrada en el diccionario)

### [x] 14 · BAJO — Siete textos más, al interactuar
"✓ ENVÍO GRATIS APLICADO", "Conectando…", "Enviando…", "Experiencia",
el `aria-label` del botón del carrito, `tu@correo.com` en los dos formularios
de `/en`, y el **tueste que se lee "Roast medium roast"** (el diccionario
traduce "Medio"→"Medium roast" y el código le antepone "Roast": quitar la
palabra repetida).

### [x] 15 · BAJO — El carrito se congela en el idioma en que se agregó
**Cuidado:** arreglarlo guardando solo el id invalidaría los carritos que los
clientes tienen guardados hoy. Enfoque seguro: guardar el `id` junto al nombre
y, al pintar, preferir el nombre del catálogo actual si el lote existe.

### [x] 16 · BAJO — No se dice que los precios son en pesos colombianos
`assets/js/app.js:12` (`money`): en inglés, añadir "COP" junto al importe.

---

## GRUPO D · SEO y documentación

### [ ] 05 · MEDIO — La documentación manda a editar el archivo de cobro equivocado
`assets/js/datos.js` líneas ~111, ~161, ~185 y cinco menciones en `LEEME.md`:
cambiar `api/crear-preferencia.js` por `lib/pedido.js`.

### [ ] 06 · MEDIO — JSON-LD de productos en páginas sin productos
`assets/js/app.js` (~1518, `inyectarSchema`): inyectar los `Product` solo en
portada, `/tienda` y `/cafes` (y sus equivalentes `/en`). En el resto, dejar
solo la ficha del negocio.

### [ ] 17 · BAJO — Tres imprecisiones del JSON-LD
- Doble barra en las imágenes (`…com//assets/…`): `app.js:1352` ya no debe
  anteponer la barra, porque `arreglarRutas()` de `idioma.js:154` ya la puso.
- Nombres de característica (Origen, Variedad, Proceso, Altura, Tueste) en
  español con valores en inglés: pasarlos por `traducir()`.
- `offers.url` apunta siempre a la portada española: usar `ruta()`.

### [ ] 18 · BAJO — La descripción de /en/brewing anuncia un método que no existe
`en/brewing.html:9`: menciona "Clever", que no está entre las diez guías, y se
salta Olleta y Colador de tela.

### [ ] 22 · BAJO — Las imágenes de compartir no tienen formato de tarjeta
Generar versiones 1200×630 para `og:`. El caso duro es `/cafes`, que declara
una de 430 px (por debajo del mínimo de WhatsApp y Facebook).
**Excepción:** la portada está congelada esperando el archivo de cámara.

### [ ] 23 · BAJO — LEEME.md y lib/ se sirven públicos
`vercel.json`: añadir `X-Robots-Tag: noindex` para `/LEEME.md` y `/lib/(.*)`.
Y corregir el comentario de `lib/pedido.js` que dice "corre SOLO en el
servidor", porque también se sirve como archivo estático.

---

## GRUPO E · Accesibilidad y contenido

### [ ] 07 · MEDIO — El foco se pierde entre los campos en rojo del checkout
`assets/css/style.css` (~897, 902-905) con `assets/js/app.js` (~1116-1120):
el borde rojo del error gana al del foco, y el checkout desactiva el contorno
general. Darle al campo enfocado un contorno propio para que error y foco no
peleen por el mismo color.

### [ ] 19 · BAJO — La guía de Olleta se contradice en las cucharadas
`assets/js/datos.js` ~671, 673, 683: la ficha dice "40 g (aprox. 5 cucharadas)"
pero la guía dice 4 tazas a una cucharada por taza, y Colador de tela fija
10 g por cucharada. Corregir a 4.

### [ ] 20 · BAJO — El mismo ratio con dos etiquetas
`assets/js/datos.js` ~535, 558, 719: V60 dice 1:16.6 y Chemex 1:16, y los dos
son 16,67. Unificar el redondeo.

### [ ] 21 · BAJO — Comentario huérfano: dice que Deseo tiene dos lotes
`assets/js/datos.js` ~287: solo hay uno. Borrar o corregir.

---

## Cómo retomar

1. **Mira las casillas de arriba.** Lo que esté en `[ ]` no está hecho.
2. **Mira el historial de git.** Cada grupo se cierra con su propio commit, y
   el mensaje dice qué hallazgos cubre. `git log --oneline` da el estado real.
3. **Verifica antes de dar nada por bueno.** Que el commit exista no significa
   que esté desplegado ni comprobado en producción.

### Comprobaciones rápidas

```bash
# Las 14 URLs responden
for u in / /tienda /cafes /menu /preparacion /visitanos /enlaces \
         /en /en/shop /en/coffees /en/menu /en/brewing /en/visit /en/links; do
  curl -s -o /dev/null -w "%{http_code} $u\n" "https://www.hysteriacoffeeroasters.com$u"
done

# Los precios del cliente y del servidor siguen cuadrando
grep -n "precio\|bolsa:" assets/js/datos.js
grep -n "precio:" lib/pedido.js
```

Para buscar restos de español en `/en`, cargar la página y recorrer los nodos
de texto buscando `[áéíóúñ¿¡]`, excluyendo los nombres propios que SÍ van en
español: Pasión, Ilusión, Deseo, Euforia, Bogotá, Nariño, Huila, Almojábana,
Panela, Andrés, Jeisson, Juan, Cédula.

### Lo que la auditoría NO pudo comprobar (sigue abierto)

- No se hizo ningún pago real ni en sandbox. No se sabe si la firma con la que
  se validan los avisos de Wompi coincide con la de un evento real: si Wompi
  cambiara esos campos, **todos** los avisos se rechazarían.
- Nadie vio con sus ojos el campo enfocado del checkout (el hallazgo 07 se
  sostiene sobre leer el CSS).
- No se miró Search Console ni se pasaron las páginas por la prueba oficial de
  resultados enriquecidos.

### Pendientes de Andrés, no del código

- Crear un store en Vercel (Blob o KV) si se quiere persistencia real de
  pedidos (hallazgo 01).
- Foto de portada en alta resolución, del archivo original de cámara.
- Pedir indexación de `/en/brewing` y `/en/visit` (se acabó la cuota diaria
  el 14 de agosto).
- Llamar a Ginna, +57 310 764 0758, por el pedido `HYS-MSS959YS-D5JA`.
