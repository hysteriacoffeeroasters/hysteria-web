# Hysteria Coffee Roasters · Sitio web

Todo lo que necesitas saber para manejar tu sitio, sin ser programador.

---

## 1. Los datos del negocio

Todo se edita en `assets/js/datos.js` (ábrelo con el Bloc de notas). Estado actual:

| Qué | Dónde | Estado |
|---|---|---|
| **WhatsApp** | `NEGOCIO.whatsapp` | ✅ +57 319 558 4123 |
| **Correo de pedidos** | `NEGOCIO.correo` | ✅ configurado |
| **Dirección de la tienda** | `TIENDAS[].direccion` | ✅ Calle 92 #15-62 |
| **Horarios** | `TIENDAS[].horarios` | ✅ configurados |
| **Notas de cata** | `COLECCIONES[].lotes[].notas` | ✅ desde la infografía |
| **Promociones** | `PROMOCIONES.mostrar` | ⏸️ ocultas (`false`) hasta confirmar vigencia |

> **Regla de oro:** cualquier campo que diga `PENDIENTE` o quede vacío
> simplemente **no aparece** en la web. Es a propósito: mejor no mostrar
> nada que mostrar un dato falso.

### Las cuatro colecciones

| Colección | Flor | Bolsa | Precio | Taza | Par | Lotes activos |
|---|---|---|---|---|---|---|
| 🔴 Pasión | Lirio | 340 g | $39.500 | $11.500 | $17.000 | Colombia · Huila<br>Caturra · Nariño |
| 🟣 Ilusión | Orquídea | 340 g | $59.500 | $15.800 | $20.800 | Borbón Rosado · Huila<br>Borbón Amarillo · Nariño |
| 🔵 Deseo | Rosa | 340 g | $75.000 | $17.000 | $22.500 | Borbón Rojo · Huila |
| 🟠 Euforia | Loto | 250 g | $75.000 | $17.000 | $22.500 | Borbón Naranja · Huila |

Precios de `menú hysteria final (1).pdf`, fichas de `infografía hysteria final.pdf`.
Ojo: **Euforia es la única de 250 g**; las otras tres son de 340 g.

### Colecciones y lotes

La **colección** define el precio y el gramaje. Dentro puede haber **uno o varios lotes**,
y cada lote sale como su propia tarjeta. Hoy Pasión e Ilusión tienen dos lotes cada una;
Deseo y Euforia, uno.

Para agregar un lote, copia un bloque dentro de `lotes` de esa colección. Este es
un ejemplo inventado, no un lote que exista:

```js
{
  id: 'deseo-lote-nuevo',        // único, sin espacios ni tildes
  imagen:    'assets/products/deseo-lote-nuevo.jpg',
  origen:    'Tolima',
  variedad:  'Ombligón',
  proceso:   'Natural · 72 h de fermentación',
  notas:     'Cacao · ciruela · avinado',
  altura:    '1.700 msnm',
  productor: '',
  tueste:    'Medio',
  insignias: ['Edición limitada'],
  agotado:   false,
},
```

⚠️ **Todo lote nuevo debe agregarse también en `lib/pedido.js`**, con el
mismo `id`. Si no está ahí, no se puede comprar (es la lista con la que se cobra).

Para retirar un lote: bórralo, o ponle `agotado: true` si quieres que siga visible
pero sin botón de compra.

El resto del sitio (tienda, tarjetas, Google) se actualiza solo.

⚠️ **Si cambias un PRECIO**, cámbialo en **dos** lugares:
1. `assets/js/datos.js` → lo que ve el cliente
2. `lib/pedido.js` → lo que se cobra de verdad

Están separados por seguridad: así nadie puede editar el precio desde su navegador y pagar $1.

---

## 2. Pasar el sitio a TU cuenta de Vercel

Hoy el sitio está en la cuenta de Vercel de otra persona. Estos son los pasos para tenerlo en la tuya.
El dominio lo sigues manejando desde GoDaddy, no hay que moverlo.

### Paso 1 · Sube el código a GitHub

El repositorio local **ya está creado y con el primer commit hecho**. Solo falta enviarlo.

1. Crea una cuenta gratis en [github.com](https://github.com)
2. Arriba a la derecha: **+ → New repository**
3. Nombre: `hysteria-web` · Visibilidad: **Private**
4. **No** marques "Add a README", ".gitignore" ni "license" (ya los tienes)
5. **Create repository**
6. Copia la dirección que te muestra y ejecuta esto, reemplazando `TU-USUARIO`:

```bash
cd "C:\Users\andre\OneDrive\Documents\Claude code\hysteria-web" && git remote add origin https://github.com/TU-USUARIO/hysteria-web.git && git push -u origin main
```

> Te pedirá iniciar sesión en GitHub la primera vez. Acepta desde el navegador.

### Paso 2 · Conecta Vercel

1. Entra a [vercel.com](https://vercel.com) → **Sign up** → *Continue with GitHub*
2. **Add New → Project** → elige `hysteria-web` → **Import**
3. No cambies nada de la configuración → **Deploy**
4. En 1 minuto te da una dirección tipo `hysteria-web.vercel.app`. **Ábrela y revisa que todo se vea bien.**

### Paso 3 · Conecta tu dominio

1. En tu proyecto → **Settings → Domains**
2. Escribe `hysteriacoffeeroasters.com` → **Add**
3. Vercel te dirá: *"This domain is already in use by another account"*.
   Es normal. Te mostrará un registro **TXT** de verificación.
4. Copia ese TXT.

### Paso 4 · Pega el registro en GoDaddy

1. Entra a [godaddy.com](https://godaddy.com) → **Mis productos**
2. Busca `hysteriacoffeeroasters.com` → **DNS** → **Administrar DNS**
3. **Agregar nuevo registro**:
   - Tipo: `TXT`
   - Nombre: `_vercel`
   - Valor: *(el que te dio Vercel)*
   - TTL: 1 hora
4. Guarda y vuelve a Vercel → **Verify**

> Puede tardar de 5 minutos a 1 hora en propagarse. Si no verifica de una, espera y reintenta.

### Paso 5 · Apunta el dominio

Una vez verificado, Vercel te muestra los registros finales. **Usa exactamente los que él te dé**, pero normalmente son:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | `216.198.79.1` |
| CNAME | `www` | `cname.vercel-dns.com` |

En GoDaddy, **edita** los registros que ya existen en vez de crear duplicados.
(Tu registro A hoy ya apunta a `216.198.79.1`, así que probablemente solo toques el CNAME.)

### Paso 6 · Listo

Cuando Vercel muestre el ✅ verde, el dominio queda en tu cuenta y sale automáticamente de la otra.
Pídele a la otra persona que borre el proyecto viejo para evitar confusiones.

---

## 3. Activar los pagos con Mercado Pago

El carrito ya está construido. Solo falta conectar tu cuenta.

1. Entra a [mercadopago.com.co/developers](https://www.mercadopago.com.co/developers) con tu cuenta
2. **Tus integraciones** → crea una aplicación (o entra a la que ya tengas)
3. **Credenciales de producción** → copia el **Access Token**
4. En Vercel: tu proyecto → **Settings → Environment Variables**
   - Nombre: `MP_ACCESS_TOKEN`
   - Valor: *(pega el Access Token)*
   - Marca **Production**, **Preview** y **Development**
   - **Save**
5. Ve a **Deployments** → en el último, menú `⋯` → **Redeploy**

Listo. El botón "Finalizar compra" ya cobra con tarjeta, PSE y efectivo.

> **Nunca** pegues el Access Token en `datos.js` ni en ningún archivo del proyecto.
> Ese archivo lo puede leer cualquiera. En Vercel queda cifrado y oculto.

**Si algo falla**, el carrito cae solo en WhatsApp para no perder la venta.
Ese respaldo se controla en `datos.js` → `PAGOS.respaldoWhatsapp`.

---

## 4. Activar el boletín con Brevo

Brevo es gratis, admite contactos ilimitados y permite enviar hasta 300 correos
al día. Sirve para las dos cosas: **recoger** las suscripciones y **enviar** el boletín.

1. Crea tu cuenta en [brevo.com](https://www.brevo.com)
2. Arriba a la derecha, tu nombre → **SMTP y API** → pestaña **Claves de API**
   → **Generar una nueva clave** → cópiala
3. *(Recomendado)* **Contactos → Listas** → crea la lista `Boletín web`
   y anota su **ID** (el número que aparece en la dirección del navegador)
4. En Vercel: tu proyecto → **Settings → Environment Variables**

   | Nombre | Valor |
   |---|---|
   | `BREVO_API_KEY` | la clave del paso 2 |
   | `BREVO_LIST_ID` | el número del paso 3 *(opcional)* |

   Marca **Production**, **Preview** y **Development**.
5. **Deployments → ⋯ → Redeploy**

Listo. Cada persona que se suscriba aparece sola en tus contactos de Brevo.

> **Mientras no pongas la clave**, el formulario sigue funcionando con el
> respaldo por correo. No se rompe nada, pero pierdes suscriptores: por eso
> conviene hacerlo pronto.

> ⚠️ **Nunca** pegues la clave en `datos.js`. Ese archivo lo puede leer cualquiera.
> En Vercel queda cifrada.

El formulario incluye una **trampa antibots**: un campo invisible que las personas
nunca ven y que los robots sí rellenan. Si llega lleno, la suscripción se descarta
en silencio. Además, solo se aceptan suscripciones enviadas desde tu propia web.

> Si algún día recibes suscripciones basura en volumen, la defensa fuerte es
> añadir un CAPTCHA (Cloudflare Turnstile, gratis) o activar el **doble opt-in**
> en Brevo (que el suscriptor confirme por correo). Avísame y lo conectamos.

---

## 5. Qué hay dentro

```
hysteria-web/
├── index.html                  Portada. Estructura y SEO
├── tienda.html                 Las cinco secciones tienen su propia página,
├── cafes.html                  para que cada una comparta con su propio
├── menu.html                   título, descripción e imagen
├── preparacion.html
├── visitanos.html
├── enlaces.html                Hub para el perfil de Instagram (sin indexar)
├── LEEME.md                    Este archivo
├── PLAN-AUDITORIA.md           Estado de los 25 arreglos de la auditoría
├── package.json                Config del proyecto
├── vercel.json                 Caché y seguridad (ver nota abajo)
├── robots.txt / sitemap.xml    Para Google
├── site.webmanifest            Ícono al guardar en el celular
│
├── en/                         El sitio en inglés: las mismas 7 páginas.
│                               NO se traduce a mano, ver assets/js/en.js
│
├── lib/                        Compartido entre las funciones del servidor
│   ├── pedido.js               ← EL PRECIO CON EL QUE SE COBRA DE VERDAD
│   └── correo-pedido.js        Los correos de pedido, por Brevo
│
├── api/                        Funciones que corren en Vercel
│   ├── wompi.js                Arma la transacción y firma la integridad
│   ├── wompi-estado.js         Consulta la transacción al volver del pago
│   ├── wompi-confirmar.js      Manda la hoja de despacho y avisa al cliente
│   ├── wompi-eventos.js        Webhook: la red de seguridad de PSE y efectivo
│   ├── boletin.js              Alta en la lista de Brevo
│   └── crear-preferencia.js    Mercado Pago (en desuso; hoy se cobra con Wompi)
│
└── assets/
    ├── css/style.css           Diseño
    ├── js/datos.js             ← TÚ EDITAS AQUÍ
    ├── js/app.js               Carrito y funcionamiento
    ├── js/landing.js           Cabecera, pie y carrito de las páginas sueltas
    ├── js/enlaces.js           Solo para el hub de enlaces
    ├── js/idioma.js            Detecta el idioma y aplica el diccionario
    ├── js/en.js                Diccionario español → inglés (GENERADO)
    ├── fonts/                  Neuton + Geosans Light (tu marca)
    ├── logo/                   Colibrí, imagotipo, favicons
    ├── collections/            Lirio, orquídea, rosa, loto
    ├── products/               Las bolsas y las fichas de cata
    ├── og/                     Tarjetas 1200×630 para compartir
    ├── equipo/                 Andrés, Jeisson, Juan
    └── fotos/                  Fotos de barra, grano y preparación
```

---

### Nota sobre `vercel.json`

Ese archivo controla cuánto tiempo guarda el navegador cada cosa:

| Qué | Cuánto se guarda | Por qué |
|---|---|---|
| `assets/fonts/` | 1 año | Las fuentes nunca cambian |
| Todo lo demás en `assets/` | **Siempre se revisa** | Para que al cambiar una ficha o un precio se vea de inmediato |

El navegador igual no vuelve a descargar lo que no cambió: pregunta al servidor
y este responde "sigue igual" (304), que pesa casi nada. Así nunca ves datos viejos.

> **Si reemplazas una imagen conservando el mismo nombre** y aún la ves vieja,
> es la caché de tu propio navegador: `Ctrl + F5` la refresca.
> Tus visitantes no tendrán ese problema con esta configuración.

⚠️ **No le agregues comentarios a ese archivo.** Vercel rechaza el despliegue si tiene
propiedades que no reconoce (JSON no admite comentarios).

## 6. Preguntas frecuentes

**¿Cómo cambio un precio?**
En `datos.js` **y** en `lib/pedido.js`. Los dos.

**¿Cómo marco un café como agotado?**
En `datos.js`, esa colección → `agotado: true`. El botón se desactiva solo.

**¿Cómo apago las promociones?**
`PROMOCIONES.mostrar = false` esconde toda la sección.
`activa: false` esconde solo una.

**¿Cómo cambio el costo de envío?**
`PAGOS.envio` y `PAGOS.envioGratisDesde` en `datos.js`, **y** las constantes
`ENVIO` y `ENVIO_GRATIS_DESDE` en `lib/pedido.js`.

**¿Cómo creo un código de descuento?**
En `CODIGOS`, dentro de `lib/pedido.js` — un solo lugar, la web lo consulta
sola. Tres tipos:

```js
'BIENVENIDA10': { tipo: 'porcentaje', valor: 10, activo: true },   // 10% menos
'CAFETERO':     { tipo: 'fijo', valor: 5000, activo: true },       // $5.000 menos
'SINENVIO':     { tipo: 'enviogratis', activo: true },             // envío gratis
```

Para apagar uno: `activo: false`. El descuento se aplica sobre los productos,
y el envío gratis por monto se gana con el subtotal ya descontado.
El nombre del código va en MAYÚSCULAS y solo letras, números, guion o guion
bajo — un código con tildes o minúsculas nunca validará.

⚠️ Los códigos son visibles para quien sepa mirar (lib/ se sirve público, como
el menú): no pongas ahí un código que deba ser secreto.

⚠️ Funcionan solo con Wompi, la pasarela actual. Si algún día vuelves a
Mercado Pago, la caja del código desaparece sola y ningún cupón se aplica.

**¿Se pueden usar varios códigos a la vez?**
Sí, hasta **tres**. Los porcentajes se suman entre ellos y se aplican una vez
sobre el subtotal; los montos fijos se suman; basta un código de envío gratis.
El descuento nunca supera el valor del carrito, así que el total no puede
quedar negativo — pero **sí puede quedar en cero**.

Decisión de Andrés (16 ago 2026): **los códigos se acumulan sin restricción**,
incluido el de regalo. Es deliberado, no un descuido. Si algún día se quiere un
código que no se combine con ningún otro, hay que añadir una marca nueva; hoy
no existe a propósito.

**¿Y un código secreto, que no se pueda leer en la web?**
Ese no va en el archivo: va en Vercel → Settings → Environment Variables, en
la variable `CODIGOS_SECRETOS`. Una línea por código:

```
NOMBRE:tipo:valor:unico
```

El cuarto campo es opcional y admite dos marcas:

| marca | significa |
|---|---|
| *(vacío)* | se puede usar cuantas veces se quiera |
| `unico` | una vez **por persona**, medida por el correo con el que se paga |
| `unicoglobal` | una sola vez **en total**: el primero que lo use lo mata |

Varios códigos se separan con coma o con salto de línea. Ejemplos del formato:

```
NOMBRE_DEL_CODIGO:porcentaje:10:unico
OTRO_NOMBRE:fijo:40000:unicoglobal
UN_TERCERO:enviogratis:0
```

**Sobre `unicoglobal`:** el código se **reserva** en cuanto alguien pulsa «Ir a
pagar», no cuando el pago se aprueba. Es la única forma de que dos personas
pagando a la vez no se lo lleven las dos. Si el pago se rechaza, la reserva se
suelta al instante; si el cliente abandona el carrito, la limpieza diaria la
libera a las 72 horas. Mientras tanto, quien lo intente verá «Ese código ya se
usó».

La reserva es **reentrante para la misma persona**: si a quien lo reservó le
rechazan la tarjeta y vuelve a intentarlo, su propia reserva no lo bloquea —
sería absurdo decirle que su código ya se usó cuando el pago no entró. Solo
una reserva ya **confirmada** (pago aprobado) cierra el código para todos,
incluido él.

⚠️ **No escribas aquí los códigos vivos.** Este archivo se sirve público: un
código real anotado en esta guía queda a la vista de cualquiera, que es justo
lo que la variable de entorno viene a evitar. Los códigos vivos existen en un
solo sitio: Vercel.

Para cambiar el descuento, edita el número y **redespliega** (las variables de
entorno solo entran en despliegues nuevos). Para retirarlo, borra la variable.

Límite honesto del «una vez por persona»: se mide por el correo del pago, así
que alguien con otro correo consigue otro descuento. Cerrarlo del todo pediría
verificar identidad, que no compensa para un 10 %.

**¿Cómo publico un cambio?**
Si conectaste GitHub: subes el cambio y Vercel lo publica solo en ~40 segundos.

**Cambié algo y no lo veo.**
Es la caché del navegador. `Ctrl + F5` para forzar la recarga.
