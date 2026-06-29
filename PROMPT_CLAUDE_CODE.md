# PROMPT PARA CLAUDE CODE — Proyecto "Cerámicas Gutiérrez" (Agente de Ventas + Landing)

> Pegar este documento completo como primer mensaje en Claude Code, dentro de la carpeta `ceramicos`.

---

## 0. CONTEXTO Y REGLA CRÍTICA DE SEGURIDAD

Vamos a construir un sistema de ventas para **Cerámicas Gutiérrez**, una casa de cerámicos (pisos, revestimientos, pegamento, pastina), reutilizando la arquitectura de un agente de ventas por WhatsApp que ya tengo funcionando para otro cliente (retail general), llamado **Concierge AI**.

**RUTA DE REFERENCIA (proyecto original, NO TOCAR):**
```
C:\Users\elpol\Desktop\SKILLS CLAUDE CODE\kit-automatizaciones-n8n\varios\ventas-whsp
```

### REGLA INQUEBRANTABLE — LEÉ ESTO DOS VECES ANTES DE EMPEZAR

1. **NUNCA escribas, edites, borres ni renombres ningún archivo dentro de `ventas-whsp`.** Es de solo lectura para este proyecto, sin excepción.
2. La única operación permitida sobre esa carpeta es **leer y copiar** archivos hacia la carpeta actual del proyecto nuevo (`ceramicos`).
3. Si en algún momento necesitás "ajustar" algo del original para que funcione en el nuevo contexto, la forma correcta es: copiar el archivo a `ceramicos/`, y modificar **la copia**. El original queda intacto siempre.
4. Antes de copiar, listame qué archivos vas a copiar y por qué. No copies el proyecto entero a ciegas — quiero entender qué se reutiliza y qué se construye desde cero.
5. Si tenés cualquier duda sobre si una acción podría modificar algo en `ventas-whsp`, parate y preguntame antes de ejecutar.

### Qué SÍ quiero que reutilices de `ventas-whsp` (como referencia/copia, no como dependencia compartida)
- La arquitectura del **Commerce Brain** (clasificador de intención: regex + tsvector/pg_trgm de PostgreSQL).
- La lógica del agente de WhatsApp (webhook, integración con Meta WhatsApp Cloud API o lo que esté usando ahí).
- El patrón de `show_product_images` y cualquier acción de envío de imágenes ya resuelta.
- Estructura general de tablas de productos, si aplica, como punto de partida para extender (no para copiar 1:1, porque el modelo de datos cambia — ver sección 2).
- Cualquier patrón de jobs automatizados (carritos abandonados, reengagement) que sea reutilizable conceptualmente.

**El agente de ventas en sí (la lógica conversacional, el prompt del sistema de IA, el flujo de decisión) NO se reescribe ni se rediseña. Se porta y se extiende con nuevos datos, no se reinventa.**

---

## 1. STACK TÉCNICO

- **Frontend/Backend:** Next.js 15 (App Router)
- **Base de datos:** Supabase (PostgreSQL) — **proyecto nuevo, separado del original.** No reutilizamos el proyecto Supabase de `ventas-whsp` ni el de courier (`iollopyvvpdenvpelaj`). Si no existe aún, indicame los pasos para crearlo o creálo si tenés el MCP/CLI de Supabase configurado.
- **Realtime:** Supabase Realtime para sincronizar dashboard → landing sin necesidad de "publicar".
- **Automatización:** n8n (si el original lo usa para el webhook de WhatsApp, mantenemos el mismo patrón).
- **3D/Animación (fase landing, más adelante):** React Three Fiber, GSAP, Lenis — mismo stack que ya usé en la landing del estudio jurídico. No es prioridad de esta primera etapa, ver Fase 2 al final.
- **Estilo de desarrollo:** Spec Driven Development (SDD) — definimos el contrato de datos antes de tocar UI.

---

## 2. MODELO DE DATOS NUEVO (extensión, no reescritura del original)

### 2.1 Productos — atributos específicos de cerámicos

Extender (o crear, si no es 1:1 portable) la tabla de productos con:

```sql
products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,              -- 'piso', 'pared', 'baño', 'exterior', 'pegamento', 'pastina'
  size text,                  -- '60x60', '30x30', etc. (null para pegamento/pastina)
  color text,
  finish text,                -- 'mate', 'brillante', 'rectificado'
  brand text,
  price_per_m2 numeric,       -- para cerámicos
  price_per_unit numeric,     -- para pegamento/pastina (se vende por bolsa/unidad)
  m2_per_box numeric,         -- conversión caja -> m2 (ej: 1.44)
  stock_m2 numeric,           -- stock disponible en m2 (o stock_units si no aplica m2)
  stock_units numeric,
  images text[],              -- urls
  featured_on_landing boolean default false,   -- ver sección 4
  featured_order int,                          -- orden manual en landing
  active boolean default true,
  created_at timestamptz default now()
)
```

### 2.2 Combos / Bundles (cerámico + pegamento + pastina con precio conjunto)

```sql
bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,                  -- "Combo Porcelanato Gris + Pegamento"
  bundle_price numeric not null,       -- precio conjunto (ej: 47000)
  active boolean default true,
  created_at timestamptz default now()
)

bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid references bundles(id) on delete cascade,
  product_id uuid references products(id),
  quantity numeric not null default 1   -- ej: 1 caja cerámico, 1 bolsa pegamento
)
```

**Lógica de negocio:** el precio del combo es independiente de la suma de precios individuales. El dueño lo actualiza manualmente cuando quiere. El Commerce Brain, al cotizar un producto que tiene bundles asociados, debe ofrecer el combo como upsell ("¿querés que te cotice también con pegamento y pastina? Te queda en $X en vez de $Y").

### 2.3 Promociones semanales (vigencia temporal, separado de combos)

```sql
promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),     -- nullable
  bundle_id uuid references bundles(id),        -- nullable (una promo aplica a producto O a bundle, no ambos)
  discount_type text check (discount_type in ('percentage', 'fixed_price')),
  discount_value numeric not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean default true,
  created_at timestamptz default now()
)
```

**Lógica de negocio:** el Commerce Brain debe chequear si hay una promoción vigente (`now() between starts_at and ends_at and active = true`) antes de cotizar un precio, y aplicar el descuento automáticamente en la respuesta del agente.

### 2.4 Selección de productos para la landing ("featured")

Decisión ya tomada: el dueño marca manualmente qué productos son "destacados" para la landing (`featured_on_landing = true` + `featured_order` para definir el orden). El resto del catálogo completo NO aparece en la landing pero sigue disponible para el agente de WhatsApp.

Razón de diseño (no la cambies sin discutirlo conmigo): la landing va a tener un formato visual tipo "hero" con pocas piezas premium, no un catálogo completo — así que la limitación de cantidad es intencional, no una limitación técnica a resolver con paginación.

Agregar una vista o endpoint simple:
```sql
-- vista de productos destacados, ordenados
create view landing_featured_products as
select * from products
where featured_on_landing = true and active = true
order by featured_order asc nulls last;
```

---

## 3. DASHBOARD (panel del dueño)

Reutilizar el patrón de dashboard que ya existe en `ventas-whsp` si tiene uno (panel de owner/admin), adaptado a:

1. **CRUD de productos** con los nuevos campos (categoría, medida, color, terminación, precio por m², conversión a cajas, stock).
2. **CRUD de combos**: armar combos seleccionando 2+ productos existentes + precio conjunto manual.
3. **CRUD de promociones**: seleccionar producto o combo, tipo de descuento, fecha de inicio/fin.
4. **Toggle "destacado en landing" + control de orden** sobre cada producto (puede ser tan simple como un checkbox + input numérico de orden, no hace falta drag-and-drop en esta primera versión — si querés drag-and-drop después lo agregamos en fase 2).
5. Todo cambio en el dashboard debe reflejarse en tiempo real (o al menos en el próximo load) en la landing, vía Supabase Realtime o revalidación de Next.js (`revalidatePath` / ISR corto).

---

## 4. AGENTE DE WHATSAPP (Commerce Brain extendido)

**No reescribir el clasificador de intención ni el flujo conversacional.** Extender el contexto/datos que el agente consulta:

1. Al cotizar un producto, debe poder responder preguntas con los nuevos atributos ("¿tenés en gris mate de 60x60?").
2. Al cotizar, debe calcular automáticamente m² → cantidad de cajas necesarias (redondeando hacia arriba a caja completa) si el usuario da medidas de ambiente.
3. Debe chequear y aplicar promociones vigentes antes de dar el precio final.
4. Debe ofrecer combos relacionados como upsell cuando corresponda.
5. Mantener `show_product_images` y cualquier lógica de envío de imágenes ya resuelta en el original.

---

## 5. LANDING PAGE — "Cerámicas Gutiérrez"

**Decisión de alcance ya tomada — no agregar IA de visualización.** La landing NO debe incluir ninguna funcionalidad de inteligencia artificial embebida (sin detección de piso en fotos del usuario, sin reemplazo automático de revestimiento, sin generación de imágenes en vivo). Esa idea quedó descartada del proyecto. Todo lo visual de esta landing se resuelve con video, imágenes y modelos 3D que **yo voy a proveer como archivos** — tu trabajo es construir la estructura de código que los reciba y los anime, no generar contenido.

### Dirección de diseño

Inspiración: Apple, Porsche, Tesla, Saloni. Mucho espacio en blanco, tipografía grande, pocas palabras por sección, fotos/video a pantalla completa, animaciones de scroll suaves. El usuario tiene que sentir que está diseñando su futura casa, no navegando un catálogo de materiales — esa percepción es la que justifica posicionar a Cerámicas Gutiérrez por encima de la competencia de precio.

Stack para esto: **React Three Fiber, GSAP (ScrollTrigger), Lenis** para scroll suave — mismo stack que ya usé en una landing previa de alta gama, así que reusá esos patrones de configuración si los tenés disponibles como referencia.

### Estructura de secciones

**Sección 1 — Hero cinematográfico**
- Pantalla completa, video en loop de fondo (yo te voy a dar el archivo de video).
- Texto mínimo superpuesto: algo como "Transformá tus espacios" o "Diseño que se vive" — dejalo como variable/constante fácil de editar, te voy a pedir ajustarlo.
- Al hacer scroll, el video continúa reproduciéndose de fondo mientras aparece contenido encima (no se corta abruptamente).

**Sección 2 — Cambio de ambiente con el scroll**
- Mismo ambiente (ej. una cocina), pero a medida que el usuario scrollea, la imagen de fondo cambia entre 3-5 variantes (mismo ambiente, distinto cerámico en el piso/revestimiento) usando GSAP ScrollTrigger con crossfade entre imágenes.
- **Importante para tu implementación:** estas variantes son imágenes estáticas pre-generadas que yo voy a proveer (mismo ambiente editado con distintos pisos), NO algo que el código genere o transforme en tiempo real. Armá el componente para recibir un array ordenado de imágenes + el nombre del cerámico asociado a cada una, y que el crossfade sea controlado por el progreso del scroll.
- Cada variante debe poder asociarse a un `product_id` real de la base, para que la ficha técnica (sección 3) muestre datos reales.

**Sección 3 — Ficha técnica flotante**
- Cuando el scroll llega a una variante de la sección 2, una tarjeta entra desde un lateral (animada con GSAP) mostrando: nombre del producto, categoría, medida, terminación, y atributos clave (ej. "antideslizante", "alto tránsito") leídos directamente de la tabla `products`.
- La tarjeta acompaña el scroll sin invadir toda la pantalla.

**Sección 4 — Inspiración por ambientes**
- Grid de fotos (baños, cocinas, livings, quinchos, fachadas) — yo voy a proveer estas imágenes.
- No se muestra el producto de entrada; aparece un texto tipo "Descubrí el producto utilizado" y al hacer click se revela la ficha del producto real asociado a esa foto.
- Necesito que el modelo de datos permita asociar cada imagen de esta galería a un `product_id` (puede ser una tabla `inspiration_gallery(id, image_url, room_type, product_id)`).

**Sección 5 — Comparador interactivo**
- Pantalla dividida en dos mitades, cerámico A a la izquierda y cerámico B a la derecha, con un slider horizontal que revela más de uno u otro al arrastrar.
- El usuario elige ambos productos de un selector (datos reales de la tabla `products`, filtrando solo categorías comparables entre sí).

**Sección 6 — Catálogo 3D rotable**
- Componente R3F que muestre una pieza de cerámico (plano/box simple) que el usuario puede rotar y acercar con el mouse/touch, con control de iluminación básico (2-3 presets de luz).
- **Esto sí lo vamos a dejar armado en código ya, aunque todavía no tenga los modelos/texturas finales.** Usá un material placeholder (textura de color sólido o un patrón genérico de prueba) para que el componente funcione end-to-end desde ya. Cuando yo te pase las texturas reales (mapas de color, rugosidad, normal por producto), solo hace falta reemplazar la textura del material, no tocar la lógica de rotación/zoom/iluminación.
- Asociar cada modelo 3D (cuando exista) a un `product_id`, con un campo en `products` como `texture_url` o una tabla separada `product_3d_assets(product_id, color_map_url, normal_map_url, roughness_map_url)` — elegí la que te resulte más prolija de mantener y decímela.

**Sección 7 — Calculadora inteligente**
- El usuario ingresa largo y ancho (o m² directo) del ambiente.
- La calculadora devuelve: m² totales, cantidad de cajas necesarias (usando `m2_per_box` del producto elegido, redondeando siempre hacia arriba a caja completa), un % de desperdicio recomendado sugerido (configurable, ej. 10% por defecto pero editable), y precio estimado total usando `price_per_m2` o el precio del combo si aplica.
- Debajo, botón "Solicitar cotización".

**Sección 8 — WhatsApp inteligente**
- No es solo un botón flotante genérico. Texto tipo "¿Necesitás ayuda para elegir?" con apertura directa a WhatsApp.
- Al abrir, debe precargar automáticamente en el mensaje (vía `wa.me/NUMERO?text=...`): el producto elegido (si venía de la calculadora o el comparador) y la cantidad calculada de m²/cajas.
- El número de WhatsApp lo voy a confirmar yo — no lo hardcodees sin preguntarme.

### Estética general (aplica a TODA la landing)
- Mucho espacio en blanco, tipografía grande (titulares grandes, poco texto de cuerpo), fotos/video a tamaño completo, animaciones suaves de entrada con GSAP.
- Nada de estética "catálogo de ferretería" — el objetivo es que se sienta premium incluso vendiendo productos similares a la competencia en precio.
- Paleta de color y tipografía: voy a proveer el logo de Cerámicas Gutiérrez; extraé/proponeme una paleta acorde una vez que lo tengas, o usá neutros (blancos, grises, negro) como base segura mientras tanto.

### Assets que YO voy a aportar como archivos (no los generes ni los inventes)
- Video en loop para el hero (sección 1).
- 3-5 imágenes del mismo ambiente con distinto cerámico, para el crossfade de scroll (sección 2).
- Galería de fotos de ambientes para la sección de inspiración (sección 4).
- Logo de Cerámicas Gutiérrez (en proceso).
- Más adelante: texturas/modelos 3D para el catálogo (sección 6) — hasta entonces, usá placeholders como se indica arriba.
- Fotos de producto individuales (para fichas, dashboard, comparador) — estas se suben directamente desde el dashboard del dueño (sección 3 del documento general), no van hardcodeadas en el código.

### Requisitos técnicos
- Next.js 15 App Router, Server Components para la carga de datos de Supabase.
- Cliente de Supabase configurado contra el proyecto NUEVO (no el de `ventas-whsp`).
- Responsive: todas las animaciones de scroll deben tener un comportamiento razonable en mobile (podés simplificar el crossfade o el comparador en pantallas chicas si el efecto completo no es viable, pero no rompas el layout).

---

## 6. ORDEN DE TRABAJO QUE QUIERO QUE SIGAS

1. Listame qué archivos de `ventas-whsp` planeás copiar como referencia, y a qué ruta dentro de `ceramicos` los vas a copiar. Esperá mi confirmación antes de copiar.
2. Una vez copiados, armá el esquema de Supabase nuevo (las tablas de la sección 2) con sus migraciones SQL.
3. Adaptá la lógica del Commerce Brain a los nuevos datos (sección 4), reutilizando el flujo y el clasificador del original.
4. Construí el dashboard del dueño (sección 3).
5. Construí la landing MVP (sección 5).
6. Al final de cada paso, hacé un resumen corto de qué se creó/modificó y qué falta, antes de seguir al siguiente paso. No avances varios pasos sin chequear conmigo si algo no está claro en el modelo de datos.

---

## 7. LO QUE NO QUIERO QUE HAGAS

- No modifiques nada dentro de `ventas-whsp`.
- No reescribas el flujo conversacional ni el clasificador de intención del agente — se extiende, no se rediseña.
- No construyas todavía las secciones cinematográficas de la landing (scroll-driven, 3D, comparador, IA de visualización) — eso es Fase 2, prompt aparte.
- No uses el proyecto de Supabase del courier ni el de `ventas-whsp` — proyecto nuevo y separado.
- No asumas un número de WhatsApp ni textos de mensaje — preguntame esos datos si los necesitás y no están definidos.