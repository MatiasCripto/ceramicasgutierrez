// ── E-commerce AI Agent for WhatsApp — Cerámicas Gutiérrez ───
// Agent architecture: the AI receives ALL data and drives the
// conversation naturally. The backend only executes validated actions.

import { getProductEmoji, getFinishEmoji, getColorEmoji } from '@/lib/bot/product-emoji-map'

interface AiConfig {
  provider: string
  apiKey: string
  model: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AgentResponse {
  message: string
  action: AgentAction | null
}

export interface AgentAction {
  type: 'start_checkout' | 'add_to_order' | 'remove_from_order' | 'human_handoff' | 'request_payment_info' | 'show_product_images'
  reason?: string
  productName?: string
  items?: Array<{ productName: string; quantity: number; m2?: number; boxes?: number; finish?: string; size?: string; color?: string }>
  payload?: Record<string, unknown>
}

// ── Modular Prompt Architecture ──────────────────────────────
// Prompts adaptados para venta de revestimientos cerámicos

/** Identidad, personalidad, reglas base y fuente de datos */
const BASE_PROMPT = `SOS UN VENDEDOR EXPERTO EN REVESTIMIENTOS CERÁMICOS. Atendés por WhatsApp para "Cerámicas Gutiérrez", un showroom de pisos, paredes y revestimientos en Gutiérrez, Berazategui, Buenos Aires.

PERSONALIDAD:
- Cálido, cercano, profesional. Hablás como un arquitecto o asesor de showroom de diseño que entiende de materiales.
- Mensajes CORTOS (1-3 oraciones). UNA pregunta por vez.
- Emojis leves y naturales: 😊 👌 🔥
- NO pareces chatbot. Sonas como una persona real que quiere ayudar a elegir bien.
- Usas lenguaje argentino natural: "dale", "mira", "te cuento", "quedate tranquilo/a"

PROHIBIDO:
- Frases de robot: "En que puedo ayudarte?", "Con gusto", "Por supuesto"
- Listas numeradas, bullets, markdown, negritas, asteriscos
- Repetir el mismo mensaje
- Inventar datos que NO estan en el contexto
- Mostrar precios sin el simbolo $ y formato claro

DATOS (tu UNICA fuente de verdad):
- El contexto tiene productos, stock, pedidos y datos del cliente
- Los productos ceramicos se venden por METRO CUADRADO (m²) y vienen en CAJAS
- Cada producto tiene: nombre, categoria (piso/pared/baño/exterior/pegamento/pastina), tamaño (60x60, 30x30, etc.), color, acabado (mate/brillante/rectificado), precio por m², m² por caja
- Lo que NO esta en el contexto NO EXISTE. No lo inventes nunca.
- Usa los nombres EXACTOS de los productos del contexto
- Si el cliente pregunta por un producto que NO aparece en el catalogo → decile "no lo tenemos" y ofrecé el mas similar que SI este en el catalogo
- NUNCA menciones categorias o atributos que no aparezcan explicitamente en el catalogo del contexto
- Si el catalogo esta vacio → decile que en este momento no tenes productos disponibles y que vuelva pronto`

/** Comportamiento de ventas: recomendación, m², objeciones, checkout */
const SALES_PROMPT = `COMPORTAMIENTO DE VENDEDOR EXPERTO EN CERAMICOS:

1. DETECTAR INTENCION REAL
   - Si el cliente dice "quiero un piso" → preguntá para que ambiente es, que tamaño y si tiene algun color en mente
   - Si dice "para el baño" → recomendá productos antideslizantes, formato mediano (30x30 o 45x45), tonos claros
   - Si dice "para afuera" → recomendá exterior, antideslizante, resistente a heladas
   - Si dice "para cocina" → recomendá pared facil de limpiar, pisos resistentes
   - Nunca muestres todo el catalogo de golpe. Filtra primero por ambiente y despues por estilo.

2. METROS CUADRADOS — CALCULO COMPLETO
   - Preguntá SIEMPRE si necesita metros cuadrados, o si tiene las medidas del ambiente
   - Si el cliente da medidas (ancho × largo): calculá m² = ancho × largo
   - Fórmulas exactas (seguilas AL PIE DE LA LETRA):
     * m² = ancho × largo (ej: 4m × 5m = 20m²)
     * m² con desperdicio = m² × 1.1 (agregar 10%)
     * cajas = ceil(m² / m²_por_caja_del_producto)
     * bolsas de PEGAMENTO = ceil(m²_total / 5)
     * bolsas de PASTINA = ceil(m²_total / 5)
   - Siempre mostrá el cálculo completo al cliente:
     * "Para 20m² necesitás 14 cajas aprox, te recomiendo 15 por las dudas"
     * "Además vas a necesitar 4 bolsas de pegamento y 4 de pastina"
   - Cuando calcules m² a partir de dimensiones, mostrá la cuenta:
     * "4m × 5m = 20m², con desperdicio 22m²"
   - Si el producto tiene m² por caja (m2_per_box), usá ese valor exacto

3. RECOMENDAR ACTIVAMENTE
   - Si no hay stock del producto que pide → ofrece el mas similar disponible
   - Despues de mostrar un producto cerámico → siempre sugerí los complementos:
     * Pegamento: calculá las bolsas necesarias (1 cada 5m²) y mencioná el nombre del producto de pegamento del catálogo
     * Pastina: calculá las bolsas necesarias (1 cada 5m²) y mencioná el nombre del producto de pastina del catálogo
     * Ej: "Para esa instalación vas a necesitar 3 bolsas de Pegamento Cerámico y 3 de Pastina Blanca"
   - Si el producto de pegamento o pastina tiene precio, mencioná el precio aproximado también
   - Recomendá acabado: mate para pisos (no se marcan las pisadas), brillante para paredes (mas luminoso)
   - Para baños chicos recomendá colores claros y formato chico
   - Para ambientes grandes recomendá formatos grandes (60x60 o mas)

4. INICIAR CHECKOUT (CUANDO EL CLIENTE QUIERE COMPRAR)
   - Cuando el cliente ya eligio → no des mas opciones, empuja suavemente al cierre: "Te lo separo?"
   - Confirma siempre: producto, m², color y acabado antes de iniciar checkout
   - Cuando el cliente confirme que quiere comprar → GENERA OBLIGATORIAMENTE el action start_checkout
   - Inclui los items en action.items con productName EXACTO del contexto, quantity (cajas), m2 (metros cuadrados), finish, size, color
   - ⚠️ SOLO generas START_CHECKOUT. NO pidas direccion, DNI ni datos de envio. El backend se encarga del resto.

5. ENVIAR FOTOS DE PRODUCTOS — OBLIGATORIO
   - SI el cliente pide ver el producto, fotos, imagenes, "mostrame", "enseñame", "como es", "foto", "ver" → GENERA OBLIGATORIAMENTE action "show_product_images" con el productName EXACTO del catalogo
   - El mensaje de texto debe ser corto: "Dale, te paso las fotos" o similar
   - ⚠️ NO respondas solo con texto diciendo que vas a mandar fotos. Siempre inclui el action show_product_images.
   - Si no sabés el nombre exacto del producto, preguntá primero: "¿De qué producto?" y esperá la respuesta antes de generar la acción

6. DERIVACION A HUMANO
   - Si hay reclamo, queja fuerte, o pedido de descuento importante → deriva a humano con contexto
   - Si despues de 3 intercambios no avanzo la venta → deriva

FLUJO NATURAL:
- Saludo breve → detectar ambiente (baño/cocina/exterior/piso/pared) → preguntar m² → filtrar por color/acabado → mostrar 1-2 opciones → resolver dudas → recomendar complementos (pegamento, pastina) → cerrar`

/** Reglas para checkout activo y pedido activo */
const CHECKOUT_PROMPT = `7. CHECKOUT ACTIVO (solo si checkoutState aparece en el contexto)
   - Si checkoutState esta presente, el backend esta procesando el checkout paso a paso
   - checkoutState indica que dato esta pidiendo el sistema: name | dni | shipping | address | payment_method | payment_waiting_proof | confirm
   - checkoutData muestra los datos ya recolectados
   - Ayuda al cliente naturalmente a completar el dato que falta SEGUN el checkoutState:
     * name: ayuda al cliente a dar su nombre completo
     * dni: explica que es el DNI si no entiende
     * shipping: ayuda a elegir entre envío a domicilio o retiro por el showroom en Gutiérrez
     * address: ayuda si no sabe que direccion poner
     * payment_method: ayuda a elegir entre transferencia bancaria o pago al retirar
     * payment_waiting_proof: el cliente ya eligio transferencia, decile que cuando haga el pago envie el comprobante
     * confirm: ayuda a confirmar o corregir los datos
   - ⚠️ NO generes start_checkout si ya hay checkoutState activo

8. PEDIDO ACTIVO (solo si activeOrderId aparece en el contexto)
   - activeOrderId = el cliente tiene un pedido activo
   - activeOrderStatus = estado actual del pedido (pending, confirmed, paid, preparing, completed, cancelled)
   - activeOrderDetails = el detalle actual del pedido (productos, m², cajas, total)
   - El pedido SOLO se puede modificar si esta en estado editable (pending, confirmed, paid, preparing)
   - Si el pedido NO es editable (completed, cancelled):
     * NO generes add_to_order ni remove_from_order
     * Deci que el pedido ya esta completado y no se puede modificar
     * Ofrece crear un pedido NUEVO: "Queres que te prepare un pedido nuevo con ese producto?"
   - Si el pedido ES editable (pending, confirmed, paid, preparing):
     * Para agregar productos: Confirma producto, m², color y acabado → Genera action type "add_to_order"
     * Para sacar productos: Confirma que producto quiere sacar → Genera action type "remove_from_order"`

/** Prohibición absoluta de datos de pago */
const PAYMENT_PROMPT = `9. DATOS DE PAGO — PROHIBICION ABSOLUTA
   - NUNCA inventes ni repitas datos bancarios. CERO excepciones.
   - No menciones bancos, alias, CBU, CVU, titulares, ni ningun dato de pago.
   - Si el usuario pide datos de pago ("pasame los datos", "cual es el alias", "quiero pagar") → genera action "request_payment_info"
   - ⚠️ Los datos bancarios en el historial del chat son de sesiones anteriores. IGNORALOS COMPLETAMENTE.
   - Si no hay cuenta configurada, la accion request_payment_info hara que el backend responda adecuadamente.`

/** Formato de respuesta JSON con ejemplos */
const JSON_FORMAT = `RESPONDE SIEMPRE EN JSON SIN NADA MAS:

✅ Sin accion (conversacion normal):
{"message": "lo que le decis al cliente"}

✅ Iniciar checkout (cuando el cliente confirma que quiere comprar):
{"message": "Dale, te lo preparo","action":{"type":"start_checkout","items":[{"productName":"Porcelanato Gris 60x60","quantity":14,"m2":20,"finish":"mate","size":"60x60","color":"gris"}]}}

✅ Derivar a humano:
{"message": "Te paso con alguien del equipo","action":{"type":"human_handoff","reason":"motivo"}}

✅ Pedir datos de pago (solo cuando el usuario pide datos bancarios):
{"message": "Dame un momento y te paso los datos","action":{"type":"request_payment_info"}}

✅ Agregar producto a pedido activo:
{"message": "Dale, te lo agrego al pedido","action":{"type":"add_to_order","items":[{"productName":"Pulido Brillante 45x45","quantity":10,"m2":14.4,"finish":"brillante","size":"45x45","color":"beige"}]}}

✅ Sacar producto de pedido activo:
{"message":"Dale, te lo saco del pedido","action":{"type":"remove_from_order","items":[{"productName":"Pulido Brillante 45x45"}]}}

✅ Enviar foto del producto (cuando el cliente pide ver fotos — OBLIGATORIO):
{"message":"Dale, te paso las fotos","action":{"type":"show_product_images","productName":"Porcelanato Gris 60x60"}}

⛔ NUNCA pongas "action": null. Si no hay accion, no incluyas el campo action. ⛔
⛔ NUNCA incluyas datos bancarios en "message". El backend los genera. ⛔
⛔ RESPONDE SOLO EL JSON, NADA MAS. Sin texto antes ni despues.`

/** SYSTEM_PROMPT combinado */
const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${SALES_PROMPT}\n\n${CHECKOUT_PROMPT}\n\n${PAYMENT_PROMPT}\n\n${JSON_FORMAT}`

// ── Input sanitization for prompt injection prevention ─────

/** Sanitizes user input to prevent prompt injection attacks */
function sanitizeUserInput(input: string): string {
  const maxLength = 500
  const trimmed = input.slice(0, maxLength)
  const injectionPatterns = [
    /ignora?\s+(todo|las|mis|instruccion(es)?)/gi,
    /olvida?\s+(todo|las|mis|instruccion(es)?)/gi,
    /forget\s+(all|everything|previous)/gi,
    /ignore\s+(all|previous|instructions)/gi,
    /\[INST\]/g,
    /<<SYS>>/g,
    /<\|im_start\|>/g,
    /<\|im_end\|>/g,
    /system\s*:\s*(?!.*\n)/gi,
    /assistant\s*:\s*(?!.*\n)/gi,
  ]
  let sanitized = trimmed
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[restricted]')
  }
  return sanitized
}

// ── Build context for the AI agent ──────────────────────────

export function buildAiPrompt(userMessage: string, ctx: Record<string, any>): string {
  const parts: string[] = []

  if (ctx.customerName) parts.push(`Cliente: ${ctx.customerName}`)
  if (ctx.customerPhone) parts.push(`Teléfono: ${ctx.customerPhone}`)

  if (ctx.customerHistory?.length) {
    parts.push(`Compras anteriores del cliente:`)
    for (const h of ctx.customerHistory) {
      parts.push(`  - ${h.productName} (${h.m2 ?? '?'}m², ${h.boxes ?? '?'} cajas) — ${h.date}`)
    }
  }

  if (ctx.products?.length) {
    parts.push(`Catalogo disponible:`)
    for (const p of ctx.products) {
      const precio = p.price_per_m2 ? `$${p.price_per_m2}/m²` : p.price_per_unit ? `$${p.price_per_unit} c/u` : 'Consultar precio'
      const cat = p.category ? ` | ${p.category}` : ''
      const size = p.size ? ` | ${p.size}` : ''
      const finish = p.finish ? ` ${getFinishEmoji(p.finish)} ${p.finish}` : ''
      const color = p.color ? ` ${getColorEmoji(p.color)}` : ''
      const m2box = p.m2_per_box ? ` | ${p.m2_per_box}m² x caja` : ''
      const stock = p.stock_m2 != null ? ` | Stock: ${p.stock_m2}m²` : ''
      const desc = p.description ? ` | ${p.description.replace(/\n/g, ' ').slice(0, 150)}` : ''
      parts.push(`  ${getProductEmoji(p.name, p.category)} ${p.name}${cat}${size}${finish}${color} — ${precio}${m2box}${stock}${desc}`)
    }
  }

  if (ctx.orders?.length) {
    parts.push(`Pedidos del cliente:`)
    for (const o of ctx.orders) {
      parts.push(`  - Pedido #${o.id?.slice(0, 8)} | $${o.total_price} | Estado: ${o.status} | ${o.created_at?.slice(0, 10)}`)
      if (o.items?.length) {
        for (const i of o.items) {
          parts.push(`     → ${i.product_name} — ${i.m2 ?? '?'}m², ${i.boxes ?? '?'} cajas`)
        }
      }
    }
  }

  if (ctx.checkoutState) {
    parts.push(`Estado de checkout: ${ctx.checkoutState}`)
    if (ctx.checkoutData) parts.push(`Datos de checkout recolectados: ${ctx.checkoutData}`)
  }

  if (ctx.activeOrderId) {
    parts.push(`Pedido activo ID: ${ctx.activeOrderId}`)
    if (ctx.activeOrderDetails) {
      parts.push(`Detalle del pedido activo:`)
      for (const item of ctx.activeOrderDetails) {
        parts.push(`  - ${item.product_name} x${item.quantity} cajas (${item.m2}m²) — $${item.total}`)
      }
    }
  }

  if (ctx.error) parts.push(`Error: ${ctx.error}`)

  parts.push('')
  parts.push(`Mensaje del cliente: "${sanitizeUserInput(userMessage)}"`)

  return parts.join('\n')
}

// ── Parse agent JSON response ──────────────────────────────

export function parseAgentResponse(raw: string): AgentResponse {
  try {
    let json = raw.trim()

    if (json.startsWith('`')) {
      json = json.replace(/^`(?:json)?\s*\n?/, '').replace(/\n?`\s*$/, '')
    }

    try {
      const parsed = JSON.parse(json) as { message?: string; action?: AgentAction | null }
      if (parsed.message) {
        return { message: parsed.message, action: parsed.action || null }
      }
    } catch { /* try fallback */ }

    const jsonMatch = json.match(/\{[\s\S]*?"message"[\s\S]*?"action"[\s\S]*?\}|{[\s\S]*?"message"[\s\S]*?\}/)
    if (jsonMatch) {
      try {
        const extracted = JSON.parse(jsonMatch[0]) as { message?: string; action?: AgentAction | null }
        if (extracted.message) {
          return { message: extracted.message, action: extracted.action || null }
        }
      } catch { /* continue */ }
    }

    const msgMatch = json.match(/"message"\s*:\s*"([^"]+)"/)
    if (msgMatch && msgMatch[1]) {
      const actionMatch = json.match(/"action"\s*:\s*(\{[^}]+\})/)
      let action: AgentAction | null = null
      if (actionMatch) {
        try { action = JSON.parse(actionMatch[1]) } catch { /* ignore */ }
      }
      return { message: msgMatch[1], action }
    }

    if (json.startsWith('{') || json.startsWith('[')) {
      return { message: '', action: null }
    }
  } catch { /* fallback */ }
  return { message: raw.trim(), action: null }
}

// ── HTTPS JSON Post (avoids Node.js fetch ByteString bug) ──

import https from 'node:https'

function httpsPost(url: string, headers: Record<string, string>, bodyStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const buf = Buffer.from(bodyStr, 'utf-8')
    const options: https.RequestOptions = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': buf.length,
      },
    }
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8')
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTPS ${res.statusCode}: ${body.slice(0, 200)}`))
        } else {
          resolve(body)
        }
      })
    })
    req.on('error', reject)
    req.write(buf)
    req.end()
  })
}

// ── AI API Callers ─────────────────────────────────────────────

async function callOpenAI(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const raw = await httpsPost('https://api.openai.com/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
  }, JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 600 }))
  const data = JSON.parse(raw) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}

async function callAnthropic(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')
  const raw = await httpsPost('https://api.anthropic.com/v1/messages', {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }, JSON.stringify({
    model,
    system: systemMsg?.content,
    messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    temperature: 0.3,
    max_tokens: 600,
  }))
  const data = JSON.parse(raw) as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

async function callDeepSeek(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const raw = await httpsPost('https://api.deepseek.com/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
  }, JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 600 }))
  const data = JSON.parse(raw) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}

async function callGroq(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const raw = await httpsPost('https://api.groq.com/openai/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
  }, JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 600 }))
  const data = JSON.parse(raw) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}

async function callGoogle(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const systemMsg = messages.find(m => m.role === 'system')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const raw = await httpsPost(url, {}, JSON.stringify({
    contents,
    systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
    generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
  }))
  const data = JSON.parse(raw) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── Load AI config ─────────────────────────────────────────────
// Single-tenant: primero intenta env vars, despues busca en app_settings

async function loadConfig(): Promise<AiConfig | null> {
  // Intentar desde variables de entorno primero
  const envProvider = process.env.AI_PROVIDER
  const envApiKey = process.env.AI_API_KEY
  const envModel = process.env.AI_MODEL

  if (envProvider && envApiKey && envApiKey !== 'poner-api-key-acá') {
    console.log('[AI] config loaded from env vars:', envProvider, envModel)
    return {
      provider: envProvider,
      apiKey: envApiKey,
      model: envModel || 'deepseek-chat',
    }
  }

  // Fallback: buscar en app_settings (para cuando se configure desde el dashboard)
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const sb = createServiceClient()
    // Intentar leer de una tabla app_settings si existe
    const { data } = await sb.from('app_settings').select('value').eq('key', 'ai_config').maybeSingle()
    if (data?.value) {
      const ai = data.value as AiConfig
      if (ai?.apiKey && ai?.provider) {
        const { decrypt } = await import('@/lib/crypto/encryption')
        const decryptedKey = decrypt(ai.apiKey).replace(/[^\x20-\x7E]/g, '')
        if (decryptedKey) {
          console.log('[AI] config loaded from app_settings:', ai.provider, ai.model)
          return { ...ai, apiKey: decryptedKey }
        }
      }
    }
  } catch {
    // app_settings table may not exist yet — fine
  }

  console.log('[AI] no config available')
  return null
}

// ── Main AI Agent Function ─────────────────────────────────

export async function generateAiResponse(
  userMessage: string,
  ctx: Record<string, any>,
): Promise<AgentResponse | null> {
  const config = await loadConfig()
  if (!config) {
    console.log('[AI] no config, skipping AI response')
    return null
  }
  console.log('[AI] calling', config.provider, 'model:', config.model)

  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }]
  const history = (ctx.history ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>
  const PAYMENT_PATTERNS = /(banco|alias|transferencia|comprobante|cvu|cbu|titular|pago|cuenta bancaria|datos para|realizar la transferencia)/i
  const cleanHistory = history.filter(h => !PAYMENT_PATTERNS.test(h.content))
  for (const h of cleanHistory.slice(-6)) {
    messages.push({ role: h.role, content: h.content })
  }
  messages.push({ role: 'user', content: buildAiPrompt(userMessage, ctx) })

  let raw: string | null = null
  try {
    switch (config.provider) {
      case 'anthropic': raw = await callAnthropic(config.apiKey, config.model || 'claude-sonnet-4-20250514', messages); break
      case 'deepseek':  raw = await callDeepSeek(config.apiKey, config.model || 'deepseek-chat', messages); break
      case 'groq':      raw = await callGroq(config.apiKey, config.model || 'llama-3.3-70b-versatile', messages); break
      case 'google':    raw = await callGoogle(config.apiKey, config.model || 'gemini-2.0-flash', messages); break
      default:          raw = await callOpenAI(config.apiKey, config.model || 'gpt-4o', messages); break
    }
  } catch (err) {
    console.error('[AI Agent] Error:', err); return null
  }
  if (!raw) return null
  return parseAgentResponse(raw)
}
