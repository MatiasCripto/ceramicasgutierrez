// ── Checkout State Machine — Cerámicas Gutiérrez ──────────────
// Deterministic, no AI involvement.
// States: idle → name (skip if known) → shipping → payment_method → confirm → completed

export type CheckoutState = 'idle' | 'name' | 'shipping' | 'payment_method' | 'confirm' | 'completed'

export interface CheckoutItem {
  productName: string
  quantity: number
  m2?: number
  boxes?: number
  finish?: string
  size?: string
  color?: string
  productId?: string
}

export interface CheckoutSession {
  state: CheckoutState
  items: CheckoutItem[]
  customerName?: string
  shippingMethod?: 'pickup' | 'delivery'
  address?: string
  paymentMethod?: 'cash' | 'transfer'
}

export interface CheckoutResult {
  session: CheckoutSession
  response: string
  action?: { type: 'create_order' | 'send_payment_info' | 'cancel' }
}

// ── Intent detection ─────────────────────────────────────────

const CONFIRM = /^(s[ií]|si|dale|ok|confirmo|confirmar|perfecto|de acuerdo|est[aá] bien|adelante|mandale|vamos|sip|sisi|obvio|claro|yes|ye[ps]|tr[aá]te|dalo)\b/i
const CANCEL = /^(no|nop|cancelar|cancel|mejor no|para|tengo que pensar|lo pienso|despu[eé]s|no quiero)\b/i

function isPickup(text: string): boolean {
  return /(retiro|local|tienda|paso a buscar|buscar|recojo|retirar|showroom|voy a buscar|paso|recojo)/i.test(text)
}

function isDelivery(text: string): boolean {
  return /(domicilio|env[ií]o|casa|correo|env[ií]ar|envi[aá]|reparto|courier|a mi casa|al domicilio|delivery)/i.test(text)
}

function isCash(text: string): boolean {
  return /(efectivo|contado|contra entrega|contraentrega|billete|cash|en mano|al retirar|pago al recibir)/i.test(text)
}

function isTransfer(text: string): boolean {
  return /(transferencia|banco|bancaria|transferir|cbu|cvu|alias|dep[oó]sito|cuenta)/i.test(text)
}

// ── Init ────────────────────────────────────────────────────

export function initCheckout(
  items: CheckoutItem[],
  existingCustomerName?: string | null,
): CheckoutSession {
  if (existingCustomerName) {
    return {
      state: 'shipping',
      items,
      customerName: existingCustomerName,
    }
  }
  return {
    state: 'name',
    items,
  }
}

// ── Process message in current state ───────────────────────

export function processCheckoutMessage(
  text: string,
  session: CheckoutSession,
): CheckoutResult {
  const trimmed = text.trim()

  switch (session.state) {
    case 'name':
      return handleName(trimmed, session)
    case 'shipping':
      return handleShipping(trimmed, session)
    case 'payment_method':
      return handlePaymentMethod(trimmed, session)
    case 'confirm':
      return handleConfirm(trimmed, session)
    default:
      return { session, response: '' }
  }
}

// ── State handlers ─────────────────────────────────────────

function handleName(text: string, session: CheckoutSession): CheckoutResult {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return {
      session: { ...session, state: 'shipping', customerName: text },
      response: `Gracias ${words[0]}. ¿Cómo querés recibir el pedido?
➡️ *Retiro* por el showroom: Camino General Belgrano 8093, Gutiérrez, Berazategui (o Calle 1278 N° 743, Ingeniero Allan, Florencio Varela)
➡️ *Envío a domicilio*`,
    }
  }
  return {
    session,
    response: '¿Me decís tu nombre completo para el pedido?',
  }
}

function handleShipping(text: string, session: CheckoutSession): CheckoutResult {
  if (isPickup(text)) {
    return {
      session: { ...session, state: 'payment_method', shippingMethod: 'pickup' },
      response: 'Perfecto. Retirás por:\n📍 Camino General Belgrano 8093, Gutiérrez, Berazategui\n📍 Calle 1278 N° 743, Ingeniero Allan, Florencio Varela\n\n¿Cómo preferís pagar? ¿Efectivo (al retirar) o transferencia bancaria?',
    }
  }

  if (isDelivery(text)) {
    return {
      session: { ...session, state: 'payment_method', shippingMethod: 'delivery' },
      response: '¿A qué dirección te lo enviamos? (incluí calle, número y localidad)',
    }
  }

  // If text is longer than 5 chars, treat as address (customer replied with address directly)
  if (text.length >= 5) {
    return {
      session: { ...session, state: 'payment_method', shippingMethod: 'delivery', address: text },
      response: 'Gracias. ¿Cómo preferís pagar? ¿Efectivo (contra entrega) o transferencia bancaria?',
    }
  }

  return {
    session,
    response: '¿Lo retirás por el local o preferís envío a domicilio?',
  }
}

function handlePaymentMethod(text: string, session: CheckoutSession): CheckoutResult {
  if (isCash(text)) {
    const nextSession: CheckoutSession = { ...session, state: 'confirm', paymentMethod: 'cash' }
    return {
      session: nextSession,
      response: `Perfecto. Confirmamos el pedido:\n\n${buildSummary(nextSession)}\n\n¿Está todo bien para generar el pedido?`,
    }
  }

  if (isTransfer(text)) {
    const nextSession: CheckoutSession = { ...session, state: 'confirm', paymentMethod: 'transfer' }
    return {
      session: nextSession,
      response: `Perfecto. Te paso los datos bancarios para la transferencia.\n\nConfirmamos el pedido:\n\n${buildSummary(nextSession)}\n\n¿Está todo bien para generar el pedido?`,
      action: { type: 'send_payment_info' },
    }
  }

  return {
    session,
    response: '¿Pagás en efectivo o por transferencia bancaria?',
  }
}

function handleConfirm(text: string, session: CheckoutSession): CheckoutResult {
  if (CONFIRM.test(text)) {
    return {
      session: { ...session, state: 'completed' },
      response: '',
      action: { type: 'create_order' },
    }
  }

  if (CANCEL.test(text)) {
    return {
      session: { ...session, state: 'idle' },
      response: 'Sin problema, cancelamos el pedido. Si querés comprar más adelante acá estoy.',
      action: { type: 'cancel' },
    }
  }

  return {
    session,
    response: `Acá va el resumen de nuevo:\n\n${buildSummary(session)}\n\n¿Confirmás el pedido?`,
  }
}

// ── Helpers ────────────────────────────────────────────────

export function buildSummary(session: CheckoutSession): string {
  const lines: string[] = []
  for (const i of session.items) {
    const price = `$${((i.m2 ?? 0) * 1).toFixed(2)}`
    lines.push(`• ${i.productName}${i.color ? ` (${i.color})` : ''}${i.finish ? ` — ${i.finish}` : ''} — ${i.m2 ?? '?'}m², ${i.quantity} cajas`)
  }

  // Calculate totals from items
  let totalM2 = 0
  let totalBoxes = 0
  for (const i of session.items) {
    totalM2 += i.m2 ?? 0
    totalBoxes += i.quantity
  }

  lines.push(``)
  lines.push(`📐 Total: ${totalM2.toFixed(2)}m² — ${totalBoxes} cajas`)

  if (session.shippingMethod === 'pickup') {
    lines.push(`📍 Retiro por el showroom en Gutiérrez`)
  } else if (session.shippingMethod === 'delivery') {
    lines.push(`📍 Envío a: ${session.address ?? 'a confirmar'}`)
  }

  if (session.paymentMethod === 'cash') {
    lines.push(`💵 Pago en efectivo`)
  } else if (session.paymentMethod === 'transfer') {
    lines.push(`💳 Pago por transferencia bancaria`)
  }

  return lines.join('\n')
}

export function buildCheckoutContext(session: CheckoutSession): string {
  const parts: string[] = []
  if (session.customerName) parts.push(`Nombre: ${session.customerName}`)
  if (session.shippingMethod) {
    parts.push(`Envío: ${session.shippingMethod === 'pickup' ? 'Retiro' : 'Domicilio'}`)
  }
  if (session.address) parts.push(`Dirección: ${session.address}`)
  if (session.paymentMethod) parts.push(`Pago: ${session.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}`)
  return parts.join(' | ')
}
