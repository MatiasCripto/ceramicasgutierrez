# Plan: Paso 12A + 12B — Dashboard redesign + Product search + Value props + PDF fix

## Contexto

El dashboard tiene tres problemas: (1) **inconsistencia visual severa** — mezcla de CSS variables con colores Tailwind hardcodeados, cada sección CRUD con su propio color de acento (azul/verde/púrpura), sidebar claro sin indicación de página activa, contraste ilegible en labels de formularios (gris sobre gris); (2) **el buscador de productos en documentos/new no filtra al tipear** — usa un <select> nativo sin búsqueda; (3) **falta una sección de propuestas de valor en el sitio público** con los tres íconos que el dueño ya tiene.

Además, el PDF existente ya tiene la paleta de colores correcta (del Paso 11.2b) pero **no registra la fuente Inter explícitamente**, causando que caracteres acentuados como "Pérez" se rendericen como "Pýrez".

---

## 12A.1 — Sistema de diseño completo del dashboard

> **⚠️ Nota de color**: La variable `--brand-hover` en globals.css actualmente es `#c9a100`. Cambiar a `#DBA900` para que coincida con la paleta exacta del logo (#F5C200 → hover #DBA900).

### Filosofía
- **Sidebar oscuro** (#111111) + contenido en blanco cálido (#F8F7F4) — jerarquía visual inmediata
- **Un solo acento**: dorado #F5C200 — solo en botones primarios, sidebar activo, badges
- **Inter** en todos los niveles del dashboard (sin Playfair Display)
- **Contraste WCAG AA** en todo texto (ratio mínimo 4.5:1)
- **Espaciado generoso**: padding mínimo 24px en cards, 16px entre elementos de formulario

### Variables CSS (reemplazar `:root` en globals.css)

```css
/* Superficies */
--dash-bg:           #F8F7F4;
--dash-sidebar:      #111111;
--dash-sidebar-hover:#1A1A1A;
--dash-card:         #FFFFFF;
--dash-card-border:  #E8E6E1;
--dash-input-bg:     #FFFFFF;
--dash-input-border: #D1CEC8;
--dash-input-focus:  #F5C200;
--dash-row-hover:    #F3F2EE;

/* Texto */
--dash-text-primary:   #111111;
--dash-text-secondary: #555550;
--dash-text-muted:     #888880;
--dash-text-sidebar:   #CCCCCC;
--dash-text-sidebar-active: #F5C200;
--dash-placeholder:    #AAAAAA;

/* Acento dorado */
--dash-gold:        #F5C200;
--dash-gold-hover:  #DBA900;
--dash-gold-subtle: #FEF7D6;
--dash-gold-border: #F0D060;

/* Semánticos */
--dash-success:     #059669;
--dash-success-bg:  #ECFDF5;
--dash-warning:     #D97706;
--dash-warning-bg:  #FFFBEB;
--dash-danger:      #DC2626;
--dash-danger-bg:   #FEF2F2;
--dash-info:        #2563EB;
--dash-info-bg:     #EFF6FF;

/* Radios */
--dash-radius-sm:   6px;
--dash-radius-md:   8px;
--dash-radius-lg:   12px;
--dash-radius-full: 9999px;
```

### Sidebar (dashboard/layout.tsx)
- Fondo: `var(--dash-sidebar)` = #111111, ancho: 240px
- Logo área: padding 20px 24px, borde #222222
- Nombre "Cerámicas Gutiérrez": #FFFFFF 15px 600, subtítulo "Panel del dueño": #888888 12px
- Items nav: padding 10px 16px, radius 8px, margin 2px 8px
- Ícono: 18px, #888888 reposo, #F5C200 activo
- Activo: background #1C1C1C, texto dorado, ícono dorado
- Clase `.dash-link-active` para el item actual (detectar con `usePathname()`)

### Cards y contenido
- Fondo contenido: `var(--dash-bg)` = #F8F7F4
- Card: fondo blanco, borde #E8E6E1, radius 12px, padding 24px, shadow sutil
- Títulos: 22px 600 #111111; subtítulos: 14px 400 #555550

### Formularios (crítico para el contraste)
- Labels: 13px 500, color #111111 (NUNCA gris), margin-bottom 6px
- Inputs: height 40px, padding 0 12px, font 14px
- Texto escrito: #111111, placeholder: #AAAAAA
- Background: blanco, borde: #D1CEC8, radius 8px
- Focus: borde dorado #F5C200, box-shadow gold-subtle
- Clase CSS `.dash-input` + `.dash-label` para reutilización

### Botones
- **Primario**: background #F5C200, texto #111111, weight 600, height 40px, border-radius 8px
- **Secundario**: transparente, borde #E8E6E1, texto #111111, hover #F3F2EE
- NUNCA azul, verde o púrpura

### Tablas
- Header: background #F8F7F4, texto #555550, 12px uppercase, letter-spacing 0.05em
- Filas: texto #111111, font-size 14px, border-bottom 1px #E8E6E1
- Hover: background #F3F2EE
- Status pills: 9999px radius, colores semánticos con bg tintado 15%

### Archivos a modificar (solo CSS vars + layout)

| Archivo | Cambio principal |
|---|---|
| `src/app/globals.css` | Reemplazar todas las variables CSS de dashboard con `--dash-*` |
| `src/app/dashboard/layout.tsx` | Sidebar oscuro + detección de ruta activa con `usePathname()` |
| `src/app/dashboard/page.tsx` | Reemplazar `text-gray-900`, `bg-white rounded-xl`, etc. → CSS vars |
| `src/app/dashboard/products/new/page.tsx` | Reemplazar Tailwind grays + `bg-blue-600` → `--dash-gold` |
| `src/app/dashboard/products/[id]/edit/page.tsx` | Ídem |
| `src/app/dashboard/combos/new/page.tsx` | Reemplazar Tailwind grays + `bg-green-600` → `--dash-gold` |
| `src/app/dashboard/combos/[id]/edit/page.tsx` | Ídem |
| `src/app/dashboard/promociones/new/page.tsx` | Reemplazar Tailwind grays + `bg-purple-600` → `--dash-gold` |
| `src/app/dashboard/promociones/[id]/edit/page.tsx` | Ídem |
| `src/app/dashboard/documents/new/page.tsx` | Reemplazar grays restantes + accent colors |
| `src/app/dashboard/documents/page.tsx` | Reemplazar badges azul/verde con badges semánticos |
| `src/app/dashboard/products/page.tsx` | Renombrar vars (foreground → dash-text-primary, etc.) |
| `src/app/dashboard/combos/page.tsx` | Ídem |
| `src/app/dashboard/promociones/page.tsx` | Ídem |
| `src/app/dashboard/orders/page.tsx` | Ídem |
| `src/app/dashboard/orders/[id]/page.tsx` | Ídem |
| `src/app/dashboard/customers/page.tsx` | Ídem |
| `src/app/dashboard/customers/[id]/page.tsx` | Ídem |
| `src/app/dashboard/conversations/page.tsx` | Ídem |
| `src/app/dashboard/conversations/[id]/page.tsx` | Ídem |
| `src/app/dashboard/whatsapp/page.tsx` | Ídem |
| `src/app/dashboard/settings/page.tsx` | Ídem |
| `src/app/dashboard/settings/payments/page.tsx` | Ídem |
| `src/app/dashboard/settings/agent/page.tsx` | Ídem |
| `src/app/dashboard/settings/billing/page.tsx` | Ídem |
| `src/app/dashboard/notifications/page.tsx` | Ídem |
| `src/app/dashboard/overview/page.tsx` | Ídem |
| `src/app/dashboard/documents/new/page.tsx` | Ídem |
| `src/components/products/variants-editor.tsx` | Renombrar vars |

---

## 12A.2 — Fix del buscador de productos en documentos

### Problema
El `<select>` nativo en documents/new NO filtra al tipear. En todos los formularios CRUD (combos, promociones) pasa lo mismo.

### Solución: Componente reutilizable `ProductSearchSelect`

Crear `src/components/ProductSearchSelect.tsx`:
- Input de texto visible con placeholder "Buscar producto..."
- `useMemo` para filtrar en tiempo real por nombre (case-insensitive, cualquier posición)
- Dropdown posicionado absoluto con z-20
- Navegación por teclado: flechas arriba/abajo, Enter selecciona, Escape cierra
- Click fuera cierra el dropdown
- Texto negro (#111111) sobre fondo blanco — ratio de contraste 19.6:1 (WCAG AAA)

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/ProductSearchSelect.tsx` | **NUEVO** — componente reutilizable |
| `src/app/dashboard/documents/new/page.tsx` | Reemplazar `<select>` productos → `<ProductSearchSelect>` |
| `src/app/dashboard/combos/new/page.tsx` | Ídem |
| `src/app/dashboard/combos/[id]/edit/page.tsx` | Ídem |
| `src/app/dashboard/promociones/new/page.tsx` | Ídem (productos + combos) |
| `src/app/dashboard/promociones/[id]/edit/page.tsx` | Ídem |

---

## 12A.3 — Sección de propuestas de valor en landing page

### Assets existentes en `public/` (confirmados)
- `public/atencion-personalizada.png` (1.4MB)
- `public/variedad.png` (1.5MB)
- `public/calidad.png` (1.5MB)

### Requisitos
- Sección nueva insertada entre Revestimientos y Combos (después de la section `#revestimientos`)
- Fondo oscuro (`bg-charcoal-soft`), padding 24px vertical
- Texto institucional encima de los bloques:
  > "Nos renovamos constantemente para estar a la vanguardia. Amplia variedad de productos para transformar tus espacios — con calidad garantizada y años de trayectoria que nos respaldan."
- Tres bloques horizontales (grid 3 cols en desktop, 1 col en mobile):
  1. **Atención personalizada** — ícono: `public/atencion-personalizada.png`  
     Descripción: "Asesoramiento one-to-one para encontrar la superficie ideal para cada proyecto."
  2. **Variedad** — ícono: `public/variedad.png`  
     Descripción: "Cerámicas, porcelanatos, revestimientos y más — una amplia gama de estilos y formatos para cada espacio."
  3. **Calidad** — ícono: `public/calidad.png`  
     Descripción: "Trabajamos con primeras marcas y materiales seleccionados que garantizan durabilidad y terminaciones impecables."
- Cada bloque: ícono arriba (centrado, 80×80px, border-radius 12px, con borde sutil blanco), título (font-serif, text-warm-ivory), descripción (text-stone-gray, font-light)
- Fallback: si la imagen no carga, círculo placeholder con la inicial en #F5C200

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/app/page.tsx` | Agregar `<section id="valor">` después de section `#revestimientos` (antes de `<BundlesSection />`) |

---

## 12A.4 — Fix de mapa de ubicaciones (LocationSection.tsx)

### Problemas actuales
1. **Local Gutiérrez**: el pin en el mapa usa coordenadas `[-34.8012, -58.2089]` que apuntan al lugar equivocado. El link "Cómo llegar" (`googleMapsUrl`) usa esas coordenadas en la URL. Debe usar la **dirección textual** en el link en vez de coordenadas.
2. **Local Florencio Varela**: `confirmed: false`, dirección dice "Dirección a confirmar", sin pin en el mapa, sin botón "Cómo llegar".

### Fixes

**1. Local Gutiérrez — link "Cómo llegar" con dirección textual**
- Modificar `googleMapsUrl()` para aceptar dirección textual opcional. Si se pasa dirección, usarla como query param:
  `https://www.google.com/maps/dir/?api=1&destination=Camino+General+Belgrano+8093,+Gutiérrez,+Berazategui,+Buenos+Aires`
- Mantener coordenadas existentes `[-34.8012, -58.2089]` solo para el pin del mapa (Leaflet)
- Botón "Cómo llegar" en la card y en el popup del mapa deben abrir Google Maps con dirección textual

**2. Local Florencio Varela — activar con datos reales**
- Actualizar objeto en LOCATIONS array:
  ```ts
  {
    id: 'florencio-varela',
    name: 'Local Florencio Varela',
    address: 'Calle 1278 N° 743, Ingeniero Allan, Florencio Varela, Buenos Aires',
    coords: [-34.7931, -58.2810],
    confirmed: true,
  }
  ```
- El mapa ya tiene `forEach` que crea markers para todas las locations — al pasar `confirmed: true`, automáticamente recibe popup con botón "Cómo llegar"
- La card de dirección debajo del mapa ya se renderiza desde `LOCATIONS.map` — mostrará la dirección real con botón "Cómo llegar"

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/LocationSection.tsx` | `googleMapsUrl()` aceptar address string; actualizar LOCATIONS[1] con datos de Florencio Varela |

---

## 12B — Fix de acentos en PDF + registro de fuente

### Problema
El PDF usa `fontFamily: 'Helvetica'` (built-in de @react-pdf/renderer) que no tiene soporte completo para caracteres latinos extendidos. "Pérez" se renderiza como "Pýrez".

### Solución
1. Importar `Font` de `@react-pdf/renderer` y registrar Inter con URLs de Google Fonts
2. Cambiar `fontFamily: 'Helvetica'` a `fontFamily: 'Inter'` en el StyleSheet base
3. Verificar que la paleta de colores ya está correcta (del Paso 11.2b)

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/pdf/DocumentPDF.tsx` | Agregar `Font.register({ family: 'Inter', ... })`, cambiar Helvetica → Inter |

---

## Orden de ejecución

```
12A.1 — globals.css (nuevas variables --dash-*)
     └── layout.tsx (sidebar oscuro + active nav)
     └── Migrar todas las páginas del dashboard:
          1. products/new + products/[id]/edit (las más complejas, ~80 reemplazos c/u)
          2. combos/new + combos/[id]/edit
          3. promociones/new + promociones/[id]/edit
          4. documents/new (ya usa vars, solo renombrar)
          5. documents/page.tsx
          6. pages de listado (products, combos, promociones, orders, customers, etc.)
          7. settings/*, conversations/*, whatsapp, overview, notifications
          8. variants-editor.tsx
     └── next build (verificar)

12A.2 — ProductSearchSelect.tsx (componente nuevo)
     └── Integrar en documents/new
     └── Integrar en combos/new + combos/[id]/edit
     └── Integrar en promociones/new + promociones/[id]/edit
     └── next build (verificar)

12A.3 — page.tsx (agregar sección valor)
     └── next build (verificar)

12A.4 — LocationSection.tsx (link Gutiérrez + activar Florencio Varela)
     └── next build (verificar)

12B — DocumentPDF.tsx (Font.register + Inter)
     └── next build (verificar)
```

### Verificación final
- Sidebar oscuro (#111111) con item activo en dorado (#F5C200)
- Labels de formulario en #111111 (legibles), inputs con borde #D1CEC8 y foco dorado
- Botón primario dorado con texto negro (sin azul/verde/púrpura en ningún lado)
- Buscador de productos filtra en tiempo real con teclado funcional
- Sección de propuestas de valor visible en landing con íconos o placeholders dorados
- Local Gutiérrez: botón "Cómo llegar" abre Google Maps con dirección textual, no coordenadas
- Local Florencio Varela: dirección real visible, pin en mapa, botón "Cómo llegar" funcional
- PDF genera "Pérez" correctamente (no "Pýrez")
- `--brand-hover` actualizado a `#DBA900` en globals.css
- `next build` sin errores
