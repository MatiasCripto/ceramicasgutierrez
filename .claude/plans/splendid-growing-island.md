# Plan: Generación de PDFs (Presupuestos y Comprobantes)

## Contexto

El dueño de Cerámicas Gutiérrez necesita poder generar dos tipos de PDF desde el dashboard: presupuestos (con vigencia de 48hs) y comprobantes de venta (sin valor fiscal, documentos comerciales prolijos con la marca del negocio). El agente de WhatsApp NO genera estos documentos — es siempre una acción manual del dueño.

Este plan cubre:
1. Tablas y almacenamiento en Supabase
2. Instalación de @react-pdf/renderer
3. Componentes PDF (documento base + variantes quote/receipt)
4. API route para generación y subida del PDF
5. Página de configuración de datos de facturación
6. Página de creación de documento
7. Navegación (sidebar + settings tabs)

---

## 1. Migración SQL — Tablas nuevas

**Archivo:** `infrastructure/supabase/migrations/003_documents.sql`

Se crean dos tablas:

### `business_info`
Una sola fila (fijo, como `app_settings`). Campos: `id`, `business_name`, `tax_id`, `address`, `phone`, `email`, `logo_url`, `updated_at`. RLS: allow all para authenticated.

### `documents`
Una tabla para ambos tipos. Campos: `id`, `type` (quote|receipt), `customer_id` (nullable FK customers), `customer_name`, `customer_phone`, `items JSONB`, `subtotal`, `total_price`, `valid_until` (nullable, solo si type=quote), `pdf_url`, `order_id` (nullable FK orders), `created_at`.

Items JSONB = arreglo con `{ product_name, category, color, finish, image_url, m2, boxes, price_per_m2, total }` — mismo congelado que `orders.items` pero con campos extra opcionales del producto.

Storage buckets: `business-assets` (público, subida authenticated) para logos y PDFs.

---

## 2. Dependencias

Instalar `@react-pdf/renderer` (liviano, corre en Vercel sin Puppeteer).

---

## 3. Componentes de PDF (`src/lib/pdf/`)

### `DocumentPDF.tsx`
Componente React-PDF reutilizable que renderiza:
- **Header:** logo (solo texto si no hay logo_url cargado), business_name, tax_id, address, phone
- **Tipo de documento:** badge visual — "PRESUPUESTO" en azul con fondo, "COMPROBANTE" en verde
- **Cliente + fecha:** customer_name, phone, fecha de emisión
- **Tabla de items:** columnas Producto, m², Cajas, $/m², Subtotal
- **Total:** destacado, con subtotal + total
- **Footer:** datos de contacto (phone, email, address)
- **Texto de vigencia (solo quote):** exacto del requerimiento, con ajuste dinámico si valid_until ≠ 48hs

### `generateDocumentPDF.ts`
Función que:
1. Recibe los datos (business_info, document data)
2. Renderiza el PDF con `@react-pdf/renderer` usando `renderToStream`
3. Convierte el stream a Buffer
4. Sube el buffer a Supabase Storage (`business-assets/documents/{id}.pdf`)
5. Obtiene la URL pública
6. Retorna la URL

---

## 4. API Route (`/api/documents/generate`)

**Archivo:** `src/app/api/documents/generate/route.ts`

Handler POST:
1. Recibe: `type`, `customer_name`, `customer_phone`, `customer_id` (nullable), `items[]`, `valid_until` (nullable, solo quote), `order_id` (nullable)
2. Calcula subtotal y total_price desde items
3. Lee `business_info` desde Supabase (una fila)
4. Inserta fila en `documents`
5. Genera PDF usando `generateDocumentPDF()`
6. Actualiza `pdf_url` en la fila de documents
7. Retorna `{ document, pdfUrl }`

Si `business_info` no existe, retorna error `400` con mensaje de completar configuración.

---

## 5. Página de Configuración de Facturación

**Ruta:** `/dashboard/settings/billing`
**Archivo:** `src/app/dashboard/settings/billing/page.tsx`

### Sub-navegación de settings
Agregar pestaña "Facturación" al sub-nav (ya existe General, Pagos, Agente). Se replica en las 4 páginas de settings:
- `settings/page.tsx`
- `settings/payments/page.tsx`
- `settings/agent/page.tsx`
- `settings/billing/page.tsx`

### Formulario
Cliente (`'use client'`):
- Carga `business_info` desde Supabase directo (sin API route)
- Campos: Razón Social, CUIT/CUIL, Dirección, Teléfono, Email
- **Logo uploader:** reusa el mismo patrón inline de `products/new/page.tsx` (file input oculto → upload a `business-assets` bucket → getPublicUrl)
- Botón guardar: upsert a `business_info` (usando la PK fija, ej. `id = 'default'`)

---

## 6. Página de Creación de Documento

**Ruta:** `/dashboard/documents/new`
**Archivo:** `src/app/dashboard/documents/new/page.tsx`

Client component con:

### Paso 1 — Tipo de documento
Radio selector: "Presupuesto" | "Comprobante" (afecta valid_until y texto de vigencia)

### Paso 2 — Cliente
- Selector de búsqueda entre customers existentes (fetch `customers` con search input)
- O toggle "Cliente nuevo" con inputs manuales (name, phone)

### Paso 3 — Productos
- Loader de productos activos desde Supabase (`id, name, category, price_per_m2, m2_per_box, color, finish, images[0]`)
- Lista dinámica de filas: product selector → input m² → cálculo automático de cajas (`Math.ceil(m2 / m2_per_box)`)
- Botón "Agregar producto"
- Cada fila muestra: nombre, m², cajas, precio/m², subtotal

### Paso 4 — Vigencia (solo presupuesto)
- Fecha/hora editable (default now + 48hs)

### Paso 5 — Generar
- Botón "Generar PDF" → POST a `/api/documents/generate`
- Mientras genera: estado de carga
- Después: muestra el PDF embebido o link de descarga
- Muestra resumen del documento generado (tipo, cliente, total, fecha)

---

## 7. Navigation Updates

### Sidebar (`layout.tsx`)
Agregar item "Documentos" (`/dashboard/documents`) con icono `FileText` de lucide-react.

### Settings sub-nav (x4 archivos)
Agregar pestaña "Facturación" apuntando a `/settings/billing`.

---

## 8. Lista de documentos (opcional en esta fase)

Para que la navegación tenga sentido, crear una página lista:
**Ruta:** `/dashboard/documents/page.tsx` (server component)
- Tabla con todos los documents (type, customer_name, total, created_at)
- Link a `/dashboard/documents/new`
- Cada fila linkea al PDF (pdf_url)

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `infrastructure/supabase/migrations/003_documents.sql` | Crear |
| `package.json` | Agregar `@react-pdf/renderer` |
| `src/lib/pdf/DocumentPDF.tsx` | Crear |
| `src/lib/pdf/generateDocumentPDF.ts` | Crear |
| `src/app/api/documents/generate/route.ts` | Crear |
| `src/app/dashboard/settings/billing/page.tsx` | Crear |
| `src/app/dashboard/documents/new/page.tsx` | Crear |
| `src/app/dashboard/documents/page.tsx` | Crear |
| `src/app/dashboard/layout.tsx` | Modificar (sidebar nav) |
| `src/app/dashboard/settings/page.tsx` | Modificar (sub-nav) |
| `src/app/dashboard/settings/payments/page.tsx` | Modificar (sub-nav) |
| `src/app/dashboard/settings/agent/page.tsx` | Modificar (sub-nav) |

## Verificación

1. Correr migración SQL en Supabase (o aplicar con `supabase migration up`)
2. Navegar a `/dashboard/settings/billing` y completar datos + subir logo
3. Ir a `/dashboard/documents/new`, seleccionar "Presupuesto", agregar 2-3 productos, generar PDF y verificar:
   - Header con logo + datos del negocio
   - "PRESUPUESTO" visible
   - Texto de vigencia de 48hs
   - Tabla de items con cálculos correctos
4. Repetir con "Comprobante":
   - Sin texto de vigencia
   - Badge "COMPROBANTE"
5. Verificar que el PDF se abre/descarga correctamente
