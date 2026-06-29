// ── Conversation engine — Cerámicas Gutiérrez ────────────────
// Single-tenant: maneja conversaciones, clientes, pedidos y búsqueda
// de productos en el schema cerámico (sin variantes, sin multi-tenant)

import { createServiceClient } from '@/lib/supabase/service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BotContext } from '@/lib/types/whatsapp.types'
import { getProductEmoji } from '@/lib/bot/product-emoji-map'
import { calcM2ToBoxes } from '@/lib/commerce/retrieval'

function createContext(phone: string): BotContext {
  return {
    phone,
    customerId: null,
    customerName: null,
    state: 'idle',
    selectedProductId: null,
    lastMessageAt: new Date().toISOString(),
    messageCount: 0,
    isKnownCustomer: false,
  }
}

export async function getOrCreateConversation(phone: string, pushName?: string) {
  const sb = createServiceClient()

  // Buscar o crear cliente
  let { data: customer } = await sb.from('customers')
    .select('id, full_name')
    .eq('phone', phone)
    .maybeSingle()

  if (!customer) {
    const { data: newCustomer } = await sb.from('customers').insert({
      phone,
      full_name: pushName ?? null,
    }).select('id, full_name').single()
    customer = newCustomer ?? null
  }

  const customerId = customer?.id ?? null
  const customerName = customer?.full_name ?? pushName ?? null
  console.log('[CONV] getOrCreateConversation', { phone, customerId, customerName, customerFound: !!customer })

  // Buscar conversación abierta existente
  const { data: existing } = await sb.from('conversations')
    .select('id, status, context')
    .eq('customer_phone', phone)
    .in('status', ['open', 'bot', 'human'])
    .maybeSingle()

  if (existing) {
    const ctx = (existing.context as BotContext) ?? createContext(phone)
    if (customerId && !ctx.customerId) {
      ctx.customerId = customerId
      ctx.customerName = customerName
      ctx.isKnownCustomer = true
      await sb.from('conversations').update({
        customer_id: customerId,
        context: ctx,
      }).eq('id', existing.id)
    }
    return { conversationId: existing.id, context: ctx, isNew: false }
  }

  // Crear nueva conversación
  const ctx = createContext(phone)
  if (customerName) ctx.customerName = customerName
  if (customerId) { ctx.customerId = customerId; ctx.isKnownCustomer = true }

  const { data: conv } = await sb.from('conversations').insert({
    customer_id: customerId,
    customer_phone: phone,
    customer_name: customerName,
    status: 'bot',
    context: ctx,
  }).select('id').single()

  return { conversationId: conv?.id, context: ctx, isNew: true }
}

export async function saveMessage(convId: string, direction: 'inbound' | 'outbound', body: string) {
  const sb = createServiceClient()
  await sb.from('messages').insert({
    conversation_id: convId,
    direction,
    type: 'text',
    body,
  })
}

export async function updateContext(convId: string, ctx: BotContext) {
  ctx.lastMessageAt = new Date().toISOString()
  ctx.messageCount++
  const sb = createServiceClient()
  await sb.from('conversations').update({ context: ctx }).eq('id', convId)
}

// ── Data fetching for AI context ──────────────────────────────

export async function fetchProducts(sb: SupabaseClient) {
  const { data } = await sb.from('products')
    .select('id, name, description, category, size, color, finish, brand, price_per_m2, price_per_unit, m2_per_box, stock_m2, stock_units, images, attributes')
    .eq('active', true)
    .order('name')
    .limit(30)

  return data ?? []
}

export interface SearchProductsParams {
  search?: string
  category?: string
  maxPrice?: number
}

export async function searchProducts(sb: SupabaseClient, params: SearchProductsParams) {
  let query = sb.from('products')
    .select('id, name, description, category, size, color, finish, brand, price_per_m2, price_per_unit, m2_per_box, stock_m2, stock_units, images, attributes')
    .eq('active', true)

  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,color.ilike.%${params.search}%,description.ilike.%${params.search}%`
    )
  }
  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.maxPrice !== undefined) {
    query = query.lte('price_per_m2', params.maxPrice)
  }

  const { data } = await query.order('name').limit(30)
  return data ?? []
}

export async function fetchCustomerOrders(sb: SupabaseClient, customerId: string) {
  const { data } = await sb.from('orders')
    .select('id, status, total_price, payment_status, payment_method, shipping_method, shipping_address, items, total_m2, total_boxes, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5)

  return data ?? []
}

export async function fetchCustomerHistory(sb: SupabaseClient, customerId: string) {
  const { data } = await sb.from('orders')
    .select('items, total_m2, total_boxes, created_at')
    .eq('customer_id', customerId)
    .in('status', ['completed', 'paid'])
    .order('created_at', { ascending: false })
    .limit(5)

  const history: any[] = []
  data?.forEach((o: any) => {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items ?? [])
    items.forEach((i: any) => {
      history.push({
        productName: i.product_name,
        m2: i.m2,
        boxes: i.boxes,
        date: o.created_at?.slice(0, 10),
      })
    })
  })
  return history
}

// ── Conversation Locking (race condition guard) ────────────────

const DEFAULT_LOCK_TIMEOUT_MS = 30_000

export function acquireConversationLock(ctx: BotContext, staleTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS): boolean {
  if (ctx.processing && ctx.processingStartedAt) {
    const elapsed = Date.now() - new Date(ctx.processingStartedAt).getTime()
    if (elapsed < staleTimeoutMs) return false
    console.log('[LOCK] stale lock detected, elapsed:', elapsed, 'ms')
  }
  ctx.processing = true
  ctx.processingStartedAt = new Date().toISOString()
  return true
}

export function releaseConversationLock(ctx: BotContext): void {
  ctx.processing = false
  ctx.processingStartedAt = undefined
}

// ── Product Resolution (ceramic schema, no variants) ─────────

export function resolveCeramicProduct(
  products: any[],
  item: { productName?: string; productId?: string }
): any | null {
  if (item.productId) {
    const product = products.find((p: any) => p.id === item.productId)
    if (product) return product
    console.log('[RESOLVE] productId not found:', item.productId)
    return null
  }

  const productName = item.productName
  if (!productName) return null

  const product = products.find((p: any) =>
    p.name.toLowerCase().includes(productName.toLowerCase())
  )
  if (!product) {
    console.log('[RESOLVE] productName not found:', productName)
    return null
  }
  return product
}

// ── Checkout handler ────────────────────────────────────────────

export interface CheckoutInput {
  items: Array<{
    productName: string
    quantity: number
    m2?: number
    boxes?: number
    finish?: string
    size?: string
    color?: string
  }>
  shippingMethod?: 'delivery' | 'pickup'
  address?: string
  customerName?: string
  customerNote?: string
}

export interface CheckoutResult {
  ok: boolean
  orderId?: string
  orderNumber?: string
  total?: number
  itemsSummary?: string
  message?: string
}

export async function handleCheckout(
  sb: SupabaseClient,
  customerId: string,
  customerPhone: string,
  customerName: string | null,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const { items, shippingMethod, address, customerNote } = input
  if (!items.length) return { ok: false, message: 'No hay productos en la compra' }

  // Buscar productos por nombre
  const { data: allProducts } = await sb.from('products')
    .select('id, name, category, price_per_m2, price_per_unit, m2_per_box')
    .eq('active', true)

  if (!allProducts?.length) return { ok: false, message: 'Catálogo no disponible' }

  const orderItems: any[] = []
  let totalM2 = 0
  let totalBoxes = 0
  let totalPrice = 0

  for (const item of items) {
    const product = resolveCeramicProduct(allProducts, { productName: item.productName })
    if (!product) {
      console.log('[CHECKOUT] Product NOT FOUND:', item.productName)
      continue
    }

    const m2 = item.m2 ?? 0
    const m2PerBox = product.m2_per_box ?? 1
    const boxes = item.quantity || calcM2ToBoxes(m2, m2PerBox)
    const pricePerM2 = product.price_per_m2 ?? product.price_per_unit ?? 0
    const total = m2 * pricePerM2

    totalM2 += m2
    totalBoxes += boxes
    totalPrice += total

    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      m2,
      boxes,
      price_per_m2: pricePerM2,
      total,
    })
  }

  if (!orderItems.length) return { ok: false, message: 'No se pudieron identificar los productos' }

  // Crear orden en el schema cerámico (items como JSONB)
  const { data: order, error: orderError } = await sb.from('orders').insert({
    customer_id: customerId,
    customer_phone: customerPhone,
    customer_name: customerName,
    items: orderItems,
    total_m2: totalM2,
    total_boxes: totalBoxes,
    total_price: totalPrice,
    payment_status: 'pending',
    shipping_method: shippingMethod ?? null,
    shipping_address: address ?? null,
    notes: customerNote ?? null,
    status: 'pending',
  }).select('id').single()

  if (!order) {
    console.log('[CHECKOUT] Order insert failed:', orderError)
    return { ok: false, message: 'Error al crear el pedido' }
  }

  // Registrar evento de auditoría
  await sb.from('order_events').insert({
    order_id: order.id,
    type: 'created',
    actor_type: 'customer', actor_id: customerId,
    metadata: { customer_id: customerId, source: 'whatsapp' },
  })

  const itemsSummary = orderItems.map((i: any) =>
    `${getProductEmoji(i.product_name)} ${i.product_name} — ${i.m2}m², ${i.boxes} cajas — $${i.total.toFixed(2)}`
  ).join('\n')

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.id.slice(0, 8),
    total: totalPrice,
    itemsSummary,
  }
}
