# Hysteria Coffee Roasters · Sitio web

Todo lo que necesitas saber para manejar tu sitio, sin ser programador.

---

## 1. Lo primero: llena estos 5 datos

Abre `assets/js/datos.js` con el Bloc de notas (o cualquier editor) y busca las marcas **⚠️ REVISAR**.

| Qué | Dónde | Por qué importa |
|---|---|---|
| **Número de WhatsApp** | `NEGOCIO.whatsapp` | Sin esto no hay botón flotante ni respaldo de pedidos |
| **Correo de pedidos** | `NEGOCIO.correo` | A dónde llegan las consultas |
| **Dirección de la tienda** | `TIENDAS[].direccion` | Hoy dice `PENDIENTE` y **la tarjeta no se muestra** |
| **Notas de cata** | `COLECCIONES[].lote.notas` | Están vacías a propósito: no inventé sabores |
| **Vigencia de promociones** | `PROMOCIONES.vigencia` | Confirma que las 3 promos sigan activas |

> **Regla de oro:** cualquier campo que diga `PENDIENTE` simplemente **no aparece** en la web.
> Es a propósito: es mejor no mostrar nada que mostrar un dato falso.

### Las cuatro colecciones

| Colección | Flor | Bolsa | Precio | Taza | Par | Lotes activos |
|---|---|---|---|---|---|---|
| 🔴 Pasión | Lirio | 340 g | $39.500 | $11.500 | $17.000 | Colombia · Huila |
| 🟣 Ilusión | Orquídea | 340 g | $59.500 | $15.800 | $20.800 | Gesha · Huila |
| 🔵 Deseo | Rosa | 340 g | $75.000 | $17.000 | $22.500 | Borbón Rojo · Huila<br>Ombligón · Tolima |
| 🟠 Euforia | Loto | 250 g | $75.000 | $17.000 | $22.500 | Borbón Naranja · Huila |

Precios de `menú hysteria final (1).pdf`, fichas de `infografía hysteria final.pdf`.
Ojo: **Euforia es la única de 250 g**; las otras tres son de 340 g.

### Colecciones y lotes

La **colección** define el precio y el gramaje. Dentro puede haber **uno o varios lotes**,
y cada lote sale como su propia tarjeta. Hoy Deseo tiene dos.

Para agregar un lote, copia un bloque dentro de `lotes` de esa colección:

```js
{
  id: 'deseo-ombligon',          // único, sin espacios ni tildes
  imagen:    'assets/products/deseo-ombligon.jpg',
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

⚠️ **Todo lote nuevo debe agregarse también en `api/crear-preferencia.js`**, con el
mismo `id`. Si no está ahí, no se puede comprar (es la lista con la que se cobra).

Para retirar un lote: bórralo, o ponle `agotado: true` si quieres que siga visible
pero sin botón de compra.

El resto del sitio (tienda, tarjetas, Google) se actualiza solo.

⚠️ **Si cambias un PRECIO**, cámbialo en **dos** lugares:
1. `assets/js/datos.js` → lo que ve el cliente
2. `api/crear-preferencia.js` → lo que se cobra de verdad

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

## 4. Recibir los correos del boletín

Hoy el formulario abre el correo del cliente. Para recibirlos automáticamente:

1. Crea una cuenta gratis en [formspree.io](https://formspree.io)
2. **New Form** → copia la dirección que te dan (tipo `https://formspree.io/f/abc123`)
3. Pégala en `datos.js` → `BOLETIN.endpoint`

---

## 5. Qué hay dentro

```
hysteria-web/
├── index.html                  Estructura y SEO
├── LEEME.md                    Este archivo
├── package.json                Config del proyecto
├── vercel.json                 Caché y seguridad (ver nota abajo)
├── robots.txt / sitemap.xml    Para Google
├── site.webmanifest            Ícono al guardar en el celular
│
├── api/
│   └── crear-preferencia.js    Cobro seguro (corre en el servidor)
│
└── assets/
    ├── css/style.css           Diseño
    ├── js/datos.js             ← TÚ EDITAS AQUÍ
    ├── js/app.js               Carrito y funcionamiento
    ├── fonts/                  Neuton + Geosans Light (tu marca)
    ├── logo/                   Colibrí, imagotipo, favicons
    ├── collections/            Lirio, orquídea, rosa
    └── products/               Tus 3 etiquetas reales
```

---

### Nota sobre `vercel.json`

Ese archivo controla cuánto tiempo guarda el navegador cada cosa:

| Qué | Cuánto se guarda | Por qué |
|---|---|---|
| `assets/fonts/` | 1 año | Las fuentes nunca cambian |
| `assets/logo/`, `collections/`, `products/` | 1 día | Por si reemplazas una imagen |
| `assets/css/`, `assets/js/` | **Siempre se revisa** | Para que un cambio en `datos.js` se vea de inmediato |

⚠️ **No le agregues comentarios a ese archivo.** Vercel rechaza el despliegue si tiene
propiedades que no reconoce (JSON no admite comentarios).

## 6. Preguntas frecuentes

**¿Cómo cambio un precio?**
En `datos.js` **y** en `api/crear-preferencia.js`. Los dos.

**¿Cómo marco un café como agotado?**
En `datos.js`, esa colección → `agotado: true`. El botón se desactiva solo.

**¿Cómo apago las promociones?**
`PROMOCIONES.mostrar = false` esconde toda la sección.
`activa: false` esconde solo una.

**¿Cómo cambio el costo de envío?**
`PAGOS.envio` y `PAGOS.envioGratisDesde` en `datos.js`, **y** las constantes
`ENVIO` y `ENVIO_GRATIS_DESDE` en `api/crear-preferencia.js`.

**¿Cómo publico un cambio?**
Si conectaste GitHub: subes el cambio y Vercel lo publica solo en ~40 segundos.

**Cambié algo y no lo veo.**
Es la caché del navegador. `Ctrl + F5` para forzar la recarga.
