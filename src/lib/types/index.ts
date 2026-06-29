export * from './commerce.types'
export * from './whatsapp.types'

// ── Auth / Profile ─────────────────────────────────────────────

export type UserRole = 'owner' | 'admin'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  organization_id?: string
  is_active?: boolean
}

export interface Organization {
  id: string
  name: string
  slug?: string
  logo_url?: string | null
  plan?: string
  settings?: Record<string, any>
  trial_ends_at?: string | null
  trial_used?: boolean
  active?: boolean
  created_at?: string
}

export interface Store {
  id: string
  organization_id?: string
  name: string
  logo_url?: string | null
  address?: string | null
  phone?: string | null
  whatsapp_number?: string | null
  timezone?: string
  settings?: Record<string, any>
  is_active?: boolean
  evolution_instance?: string | null
  variant_attr1?: string
  variant_attr2?: string
  created_at?: string
}

// ── Products ───────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  size: string | null
  color: string | null
  finish: string | null
  brand: string | null
  price_per_m2: number | null
  price_per_unit: number | null
  m2_per_box: number | null
  stock_m2: number | null
  stock_units: number | null
  images: string[]
  attributes: string[]
  featured_on_landing: boolean
  active: boolean
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  size?: string
  color?: string
  finish?: string
  stock?: number
  price?: number
}

// ── Customers ──────────────────────────────────────────────────

export interface Customer {
  id: string
  phone: string
  full_name: string | null
  address: string | null
  total_orders: number
  lifetime_value: number
  last_contact_at: string | null
  created_at: string
}

export interface CustomerScore {
  customer_id: string
  recency_score: number
  frequency_score: number
  monetary_score: number
  rfm_score: number
  segment?: string
  last_order_at?: string | null
  avg_ticket?: number
}

// ── Orders ──────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'preparing' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItem {
  product_id: string
  product_name: string
  m2: number
  boxes: number
  price_per_m2: number
  total: number
}

export interface Order {
  id: string
  customer_id: string | null
  customer_phone: string | null
  customer_name: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  items: OrderItem[]
  total_m2: number | null
  total_boxes: number | null
  total_price: number | null
  payment_method: string | null
  shipping_method: string | null
  shipping_address: string | null
  notes: string | null
  created_at: string
  updated_at: string
  customer?: Customer | null
}

// ── Order Events ────────────────────────────────────────────────

export type OrderEventType = 'created' | 'confirmed' | 'paid' | 'preparing' | 'completed' | 'cancelled' | 'items_added' | 'items_removed' | 'payment_proof_approved' | 'payment_proof_rejected' | string
export type OrderEventActorType = 'system' | 'admin' | 'customer' | 'bot'

export interface OrderEvent {
  id: string
  order_id: string
  type: string
  actor_type: string
  actor_id: string | null
  metadata: Record<string, any>
  created_at: string
}

// ── Payment Proofs ──────────────────────────────────────────────

export interface PaymentProof {
  id: string
  order_id: string
  image_url: string
  status: 'pending' | 'approved' | 'rejected'
  extracted_amount: number | null
  reviewed_at: string | null
  created_at: string
}

// ── Payment Accounts ───────────────────────────────────────────

export interface PaymentAccount {
  id: string
  bank_name: string
  account_holder: string
  alias: string | null
  cvu: string | null
  is_active: boolean
  priority: number
  created_at: string
  payment_method?: string
  currency?: string
  is_default?: boolean
  instructions?: string
}

// ── Conversations ──────────────────────────────────────────────

export interface Conversation {
  id: string
  customer_id: string | null
  customer_phone: string
  customer_name: string | null
  channel: string | null
  channel_contact_id: string | null
  status: 'open' | 'closed' | 'bot' | 'human'
  context: Record<string, any>
  human_takeover: boolean
  created_at: string
  updated_at: string
  customer?: { full_name: string | null; phone: string | null; email: string | null }
}

export interface Message {
  id: string
  conversation_id: string
  channel_message_id: string | null
  direction: 'inbound' | 'outbound'
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  body: string | null
  media_url: string | null
  metadata: Record<string, any>
  sent_at: string
  created_at: string
}

// ── Notifications ──────────────────────────────────────────────

export interface Notification {
  id: string
  type: string
  title: string
  description: string | null
  entity_type: string | null
  entity_id: string | null
  read: boolean
  created_at: string
}

// ── Misc ──────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
}

export interface RfmConfig {
  recency: number
  frequency: number
  monetary: number
}

export interface CheckoutItem {
  productName: string
  quantity: number
  m2?: number
  boxes?: number
  finish?: string
  size?: string
  color?: string
  attribute_values?: Record<string, string>
  productId?: string
  variantId?: string
}

export interface CheckoutSession {
  state: string
  items: CheckoutItem[]
  customerName?: string
  dni?: string
  shippingMethod?: 'shipping' | 'pickup'
  address?: string
  locality?: string
  references?: string
  pickup?: boolean
  paymentMethod?: string
  storeName: string
}
