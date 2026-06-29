// ── Checkout State Machine — Cerámicas Gutiérrez ──────────────
// Pure functions - NO side effects, NO Supabase imports.
// Backend controls the flow; AI only converses naturally.

import { buildProductPresentation } from '@/lib/bot/product-emoji-map'

export type CheckoutState = 'idle' | 'name' | 'dni' | 'shipping' | 'address' | 'payment_method' | 'payment_waiting_proof' | 'proof_received' | 'confirm' | 'completed'

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
  dni?: string
  shippingMethod?: 'shipping' | 'pickup'
  address?: string
  locality?: string
  references?: string
  pickup: boolean
  paymentMethod?: 'transfer' | 'cash_on_delivery' | 'pickup_payment'
  storeName?: string
}

export interface CheckoutResult {
  session: CheckoutSession
  response: string
  action?: { type: 'checkout' | 'human_handoff'; reason?: string }
}

export const AI_GENERATE = '__AI_GENERATE__'

// ── Sentinels for human intent detection ─────────────────────

const CONFIRM_WORDS = /^(s[ií]|si|dale|ok|confirmo|confirmar|perfecto|de acuerdo|est[aá] bien|adelante|mandale|vamos|sip|sisi|obvio|claro|yes|ye[ps])\b/i
const DENY_WORDS = /^(no|nop|nel|no quiero|no estoy seguro|despu[eé]s|cancelar|mejor no|para|tengo que pensar|lo pienso)\b/i
const SHIPPING_WORDS = /(env[ií]o|domicilio|casa|correo|env[ií]ar|envi[aá]|reparto|courier|paquete)/i
const PICKUP_WORDS = /(retiro|local|tienda|paso a buscar|buscar|recojo|retirar|sucursal|negocio|vengo|showroom)/i
const HELP_WORDS = /(humano|persona|agente|hablar con alguien|asesor|ayuda|no entiendo)/i
const TRANSFER_WORDS = /(transferencia|banco|bancaria|transferir|cbu|cvu|alias|dep[oó]sito|cuenta)/i
const CASH_WORDS = /(efectivo|contra entrega|contraentrega|contado|pago al recibir|en mano|billete|cash)/i
const PICKUP_PAY_WORDS = /(pago al retirar|al retirar|pago en el local|en el local|abono|pago cuando|pagar cuando|ah[ií]|cuando pase|cuando vaya|retiro y pago|en persona)/i

// ── Init ────────────────────────────────────────────────────

export function initCheckout(
  items: CheckoutItem[],
  existingData?: { customerName?: string; dni?: string; address?: string },
): CheckoutSession {
  const hasName = !!existingData?.customerName
  const hasDni = !!existingData?.dni
  const hasAddress = !!existingData?.address

  if (hasName && hasDni && hasAddress) {
    return {
      state: 'payment_method',
      items,
      customerName: existingData!.customerName,
      dni: existingData!.dni,
      address: existingData!.address,
      shippingMethod: 'shipping',
      pickup: false,
    }
  }

  if (hasName && hasDni) {
    return {
      state: 'shipping',
      items,
      customerName: existingData!.customerName,
      dni: existingData!.dni,
      pickup: false,
    }
  }

  if (hasName) {
    return {
      state: 'dni',
      items,
      customerName: existingData!.customerName,
      pickup: false,
    }
  }

  return {
    state: 'name',
    items,
    pickup: false,
  }
}

// ── Process message in current state ───────────────────────

export function processCheckoutMessage(
  text: string,
  session: CheckoutSession,
): CheckoutResult {
  const trimmed = text.trim()

  if (HELP_WORDS.test(trimmed)) {
    return {
      session,
      response: AI_GENERATE,
      action: { type: 'human_handoff', reason: 'Cliente solicitó atención humana durante checkout' },
    }
  }

  switch (session.state) {
    case 'name':
      return handleNameState(trimmed, session)
    case 'dni':
      return handleDniState(trimmed, session)
    case 'shipping':
      return handleShippingState(trimmed, session)
    case 'address':
      return handleAddressState(trimmed, session)
    case 'payment_method':
      return handlePaymentMethodState(trimmed, session)
    case 'payment_waiting_proof':
      return handlePaymentWaitingProofState(trimmed, session)
    case 'proof_received':
      return { session, response: AI_GENERATE }
    case 'confirm':
      return handleConfirmState(trimmed, session)
    case 'completed':
      return { session, response: AI_GENERATE }
    default:
      return { session, response: AI_GENERATE }
  }
}

// ── State handlers ─────────────────────────────────────────

function handleNameState(text: string, session: CheckoutSession): CheckoutResult {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return {
      session: { ...session, state: 'dni', customerName: text },
      response: 'Gracias. ¿Me decís tu DNI?',
    }
  }

  if (DENY_WORDS.test(text)) {
    return {
      session,
      response: AI_GENERATE,
      action: { type: 'human_handoff', reason: 'Usuario no quiso dar nombre durante checkout' },
    }
  }

  return { session, response: AI_GENERATE }
}

function handleDniState(text: string, session: CheckoutSession): CheckoutResult {
  const digits = text.replace(/\D/g, '')

  if (digits.length >= 6 && digits.length <= 9) {
    return {
      session: { ...session, state: 'shipping', dni: digits },
      response: 'Gracias. ¿Cómo preferís recibirlo? ¿Envío a domicilio'
        + (session.storeName ? ` o retiro en ${session.storeName}?` : ' o retiro por el showroom?'),
    }
  }

  if (DENY_WORDS.test(text) || /no (tengo|tiene|s[eé])/i.test(text)) {
    return {
      session,
      response: AI_GENERATE,
      action: { type: 'human_handoff', reason: 'Usuario no pudo o no quiso dar DNI' },
    }
  }

  return { session, response: AI_GENERATE }
}

function handleShippingState(text: string, session: CheckoutSession): CheckoutResult {
  const lower = text.toLowerCase()

  if (SHIPPING_WORDS.test(lower) || /a (mi |la )?casa/i.test(lower) || /domicilio/i.test(lower)) {
    return {
      session: { ...session, state: 'address', shippingMethod: 'shipping', pickup: false },
      response: '¿Cuál es tu dirección completa? Incluí localidad si querés.',
    }
  }

  if (PICKUP_WORDS.test(lower) || /paso/i.test(lower) || /voy/i.test(lower) || /retiro/i.test(lower)) {
    return {
      session: { ...session, state: 'payment_method', shippingMethod: 'pickup', pickup: true },
      response: '¿Cómo preferís pagar? ¿Transferencia bancaria o pago al retirar'
        + (session.storeName ? ` por ${session.storeName}?` : ' por el showroom?'),
    }
  }

  return { session, response: AI_GENERATE }
}

function handleAddressState(text: string, session: CheckoutSession): CheckoutResult {
  if (text.length >= 5) {
    let address = text
    let locality: string | undefined

    const parts = text.split(/[,;-]/).map((s: string) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      address = parts[0]
      locality = parts.slice(1).join(', ')
    }

    return {
      session: { ...session, state: 'payment_method', address, locality: locality || undefined },
      response: '¿Cómo preferís pagar? ¿Transferencia bancaria o efectivo contra entrega?',
    }
  }

  return { session, response: AI_GENERATE }
}

function handlePaymentMethodState(text: string, session: CheckoutSession): CheckoutResult {
  const lower = text.toLowerCase()

  if (TRANSFER_WORDS.test(lower) || /transferencia/i.test(lower)) {
    return {
      session: { ...session, state: 'payment_waiting_proof', paymentMethod: 'transfer' },
      response: AI_GENERATE,
    }
  }

  if (CASH_WORDS.test(lower) && session.shippingMethod === 'shipping') {
    const nextSession: CheckoutSession = { ...session, state: 'confirm', paymentMethod: 'cash_on_delivery' }
    const summary = buildSummary(nextSession)
    return {
      session: nextSession,
      response: `Perfecto. Confirmamos:\n\n${summary}\n\n¿Está todo bien para generar el pedido?`,
    }
  }

  if (PICKUP_PAY_WORDS.test(lower) || (session.pickup && (CASH_WORDS.test(lower) || CONFIRM_WORDS.test(lower)))) {
    const nextSession: CheckoutSession = { ...session, state: 'confirm', shippingMethod: 'pickup', pickup: true, paymentMethod: 'pickup_payment' }
    const summary = buildSummary(nextSession)
    return {
      session: nextSession,
      response: `Perfecto. Confirmamos:\n\n${summary}\n\n¿Está todo bien para generar el pedido?`,
    }
  }

  return { session, response: AI_GENERATE }
}

function handlePaymentWaitingProofState(text: string, session: CheckoutSession): CheckoutResult {
  if (CONFIRM_WORDS.test(text)) {
    return {
      session,
      response: 'Perfecto, cuando hagas la transferencia enviame el comprobante por acá 📸',
    }
  }

  if (DENY_WORDS.test(text)) {
    return {
      session: { ...session, state: 'payment_method', paymentMethod: undefined },
      response: 'Sin problema. ¿Cómo preferís pagar entonces?',
    }
  }

  const PROOF_SENT = /(ya (te )?(lo |la )?(mand[eé]|envi[eé]|pas[eé]|subi[eé])|te lo mand[eé]|lo envi[eé]|comprobante enviado|ya pagu[eé]|ya transfer[ií])/i
  if (PROOF_SENT.test(text)) {
    return {
      session: { ...session, state: 'proof_received' },
      response: 'Perfecto, ya lo recibí 👍 En cuanto se acredite la transferencia te confirmo y despachamos el pedido.',
    }
  }

  const PRODUCT_QUESTION = /(qu[eé] (m[aá]s|otro|ten[eé]s|productos|hay)|cat[aá]logo|mostrame|productos)/i
  if (PRODUCT_QUESTION.test(text)) {
    return {
      session,
      response: 'Cuando quieras te cuento más sobre los productos 😊 Pero primero terminemos con el pago — enviame el comprobante de la transferencia cuando lo hagas 📸',
    }
  }

  return {
    session,
    response: 'Cuando hagas la transferencia enviame el comprobante por acá 📸 Si querés cambiar el método de pago decime "no" y elegimos otro.',
  }
}

function handleConfirmState(text: string, session: CheckoutSession): CheckoutResult {
  if (CONFIRM_WORDS.test(text)) {
    return {
      session: { ...session, state: 'completed' },
      response: AI_GENERATE,
      action: { type: 'checkout' },
    }
  }

  if (DENY_WORDS.test(text)) {
    return {
      session: { ...session, state: 'name', customerName: undefined, dni: undefined, address: undefined },
      response: 'Sin problema. Contame de nuevo, ¿cuál es tu nombre completo?',
    }
  }

  return { session, response: AI_GENERATE }
}

// ── Helpers ────────────────────────────────────────────────

function buildSummary(session: CheckoutSession): string {
  const items = session.items
    .map(i => buildProductPresentation(i.productName, i.quantity))
    .join('\n')

  const method = session.pickup
    ? session.storeName ? `Retiro en ${session.storeName}` : 'Retiro por el showroom'
    : `Envío a ${session.address}${session.locality ? `, ${session.locality}` : ''}`

  const payment = session.paymentMethod === 'transfer'
    ? 'Transferencia bancaria'
    : session.paymentMethod === 'cash_on_delivery'
    ? 'Efectivo contra entrega'
    : session.paymentMethod === 'pickup_payment'
    ? 'Pago al retirar'
    : ''

  const paymentLine = payment ? `\n💳 ${payment}` : ''

  return `${items}\n\n📦 ${method}${paymentLine}`
}

export function buildCheckoutContext(session: CheckoutSession): string {
  const parts: string[] = []
  if (session.customerName) parts.push(`Nombre: ${session.customerName}`)
  if (session.dni) parts.push(`DNI: ${session.dni}`)
  if (session.shippingMethod) {
    parts.push(`Método: ${session.shippingMethod === 'pickup'
      ? session.storeName ? `Retiro en ${session.storeName}` : 'Retiro por el showroom'
      : 'Envío a domicilio'}`)
  }
  if (session.address) parts.push(`Dirección: ${session.address}`)
  if (session.locality) parts.push(`Localidad: ${session.locality}`)
  if (session.paymentMethod) {
    const payLabel = session.paymentMethod === 'transfer' ? 'Transferencia' : session.paymentMethod === 'cash_on_delivery' ? 'Efectivo contra entrega' : 'Pago al retirar'
    parts.push(`Pago: ${payLabel}`)
  }
  return parts.join(' | ')
}
