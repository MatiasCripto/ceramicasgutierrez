export interface BotContext {
  phone: string
  customerId: string | null
  customerName: string | null
  state: string
  selectedProductId: string | null
  lastMessageAt: string
  messageCount: number
  isKnownCustomer: boolean

  processing?: boolean
  processingStartedAt?: string

  activeOrderId?: string
  lastOrderId?: string

  history?: Array<{ role: 'user' | 'assistant'; content: string }>

  // Checkout session
  checkoutItems?: any[]
  checkoutName?: string
  checkoutShippingMethod?: string
  checkoutAddress?: string
  checkoutPaymentMethod?: string

  // Order disambiguation
  pendingOrderIds?: string[]
  awaitingOrderSelection?: boolean

  [key: string]: unknown
}

export type BotIntent = 'greeting' | 'search' | 'detail' | 'checkout' | 'handoff' | 'fallback' | 'greet' | 'search_products' | 'get_product' | 'add_to_cart' | 'buy' | 'remove_from_cart' | 'view_cart' | 'cart' | 'cancel_order' | 'track_order' | 'apply_coupon' | 'catalog' | 'human_handoff' | 'human' | 'thanks' | 'help' | 'unknown'

export interface EvolutionMessageData {
  key?: { id?: string; remoteJid?: string; fromMe?: boolean }
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { url?: string; mimetype?: string }
  }
  pushName?: string
}

export interface EvolutionWebhookPayload {
  event?: string
  instance?: string
  data?: EvolutionMessageData
  sender?: string
}
