// ── Order Service — Cerámicas Gutiérrez ──────────────────────
// Órdenes con items JSONB (sin order_items table).
// Flujo de estados: pending → esperando_pago → pago_en_revision → pago_confirmado → preparando → enviado → entregado → completado

import { createServiceClient } from '@/lib/supabase/service'

// ── Order creation types ────────────────────────────────────

export interface CreateOrderInput {
  customerId: string
  customerPhone: string
  customerName: string | null
  items: Array<{
    product_name: string
    category?: string
    color?: string
    finish?: string
    m2: number
    boxes: number
    price_per_m2: number
    total: number
  }>
  totalM2: number
  totalBoxes: number
  totalPrice: number
  paymentMethod: 'cash' | 'transfer'
  shippingMethod: 'pickup' | 'delivery'
  shippingAddress?: string | null
}

export interface CreateOrderResult {
  ok: boolean
  orderId?: string
  orderNumber?: string
  total?: number
  error?: string
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const sb = createServiceClient()
  const { data, error } = await sb.from('orders').insert({
    customer_id: input.customerId,
    customer_phone: input.customerPhone,
    customer_name: input.customerName,
    items: input.items,
    total_m2: input.totalM2,
    total_boxes: input.totalBoxes,
    total_price: input.totalPrice,
    payment_method: input.paymentMethod,
    shipping_method: input.shippingMethod === 'shipping' ? 'delivery' : input.shippingMethod,
    shipping_address: input.shippingAddress ?? null,
    status: 'pending',
    payment_status: 'pending',
  }).select('id').single()

  if (!data) {
    console.error('[ORDER] createOrder error:', error)
    return { ok: false, error: error?.message ?? 'Error al crear el pedido' }
  }

  await sb.from('order_events').insert({
    order_id: data.id,
    type: 'created',
    actor: 'customer',
    metadata: { customer_id: input.customerId, source: 'whatsapp' },
  })

  return {
    ok: true,
    orderId: data.id,
    orderNumber: data.id.slice(0, 8),
    total: input.totalPrice,
  }
}

// ── Pure validation ──────────────────────────────────────────

const EDITABLE_STATUSES = new Set(['pending', 'esperando_pago', 'pago_en_revision', 'pago_confirmado', 'preparando', 'enviado'])

export function canEditOrder(status: string): boolean {
  return EDITABLE_STATUSES.has(status)
}

const STATUS_FLOW = ['pending', 'esperando_pago', 'pago_en_revision', 'pago_confirmado', 'preparando', 'enviado', 'entregado', 'completado']

// Mapeo de estados legacy (DB existente) a los nuevos
const LEGACY_STATUS_MAP: Record<string, string> = {
  confirmed:  'pago_confirmado',
  paid:       'pago_confirmado',
  preparing:  'preparando',
  completed:  'completado',
  cancelled:  'cancelado',
  refunded:   'cancelado',
}

export function isValidTransition(current: string, target: string): boolean {
  // Cancelar siempre permitido
  if (target === 'cancelado') return true

  const normalized = LEGACY_STATUS_MAP[current] ?? current
  const currentIdx = STATUS_FLOW.indexOf(normalized)
  const targetIdx = STATUS_FLOW.indexOf(target)
  if (currentIdx === -1 || targetIdx === -1) return false
  return targetIdx > currentIdx
}

// ── DB operations ────────────────────────────────────────────

export async function getOrderWithDetails(orderId: string): Promise<any | null> {
  const sb = createServiceClient()
  try {
    const { data } = await sb.from('orders')
      .select('*, customer:customers(*)')
      .eq('id', orderId)
      .single()
    return data
  } catch (err) {
    console.error('[ORDER] Fetch error:', err)
    return null
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<boolean> {
  const sb = createServiceClient()
  try {
    const { data: order } = await sb.from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (!order) return false
    if (!isValidTransition(order.status, newStatus)) {
      console.error('[ORDER] Invalid transition:', order.status, '->', newStatus)
      return false
    }

    // Sincronizar payment_status según el nuevo status
    const paymentStatus = newStatus === 'pago_confirmado' || newStatus === 'preparando' || newStatus === 'enviado' || newStatus === 'entregado' || newStatus === 'completado'
      ? 'paid'
      : newStatus === 'cancelado'
      ? 'refunded'
      : 'pending'

    const { error } = await sb.from('orders').update({
      status: newStatus,
      payment_status: paymentStatus,
    }).eq('id', orderId)

    if (error) {
      console.error('[ORDER] Status update error:', error)
      return false
    }

    // Evento de auditoría
    await sb.from('order_events').insert({
      order_id: orderId,
      type: newStatus,
      actor_type: 'system', actor_id: null,
      metadata: { from: order.status, to: newStatus },
    })

    console.log('[ORDER] Status updated:', { orderId, from: order.status, to: newStatus })
    return true
  } catch (err) {
    console.error('[ORDER] Status update exception:', err)
    return false
  }
}

export async function addItemsToOrder(
  orderId: string,
  items: Array<{
    product_id?: string
    product_name: string
    m2: number
    boxes: number
    price_per_m2: number
    total: number
  }>,
): Promise<boolean> {
  const sb = createServiceClient()
  try {
    const { data: order } = await sb.from('orders')
      .select('id, status, items, total_m2, total_boxes, total_price')
      .eq('id', orderId)
      .single()

    if (!order || !canEditOrder(order.status)) {
      console.error('[ORDER] Cannot edit order:', orderId, 'status:', order?.status)
      return false
    }

    const currentItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items ?? [])
    const updatedItems = [...currentItems, ...items]

    const additionalM2 = items.reduce((sum, i) => sum + i.m2, 0)
    const additionalBoxes = items.reduce((sum, i) => sum + i.boxes, 0)
    const additionalTotal = items.reduce((sum, i) => sum + i.total, 0)

    const { error } = await sb.from('orders').update({
      items: updatedItems,
      total_m2: (order.total_m2 ?? 0) + additionalM2,
      total_boxes: (order.total_boxes ?? 0) + additionalBoxes,
      total_price: (order.total_price ?? 0) + additionalTotal,
    }).eq('id', orderId)

    if (error) {
      console.error('[ORDER] Add items error:', error)
      return false
    }

    await sb.from('order_events').insert({
      order_id: orderId,
      type: 'items_added',
      actor_type: 'system', actor_id: null,
      metadata: { items: items.map(i => i.product_name) },
    })

    console.log('[ORDER] Items added:', { orderId, count: items.length })
    return true
  } catch (err) {
    console.error('[ORDER] Add items exception:', err)
    return false
  }
}

export async function removeItemsFromOrder(
  orderId: string,
  productNames: string[],
): Promise<boolean> {
  const sb = createServiceClient()
  try {
    const { data: order } = await sb.from('orders')
      .select('id, status, items, total_m2, total_boxes, total_price')
      .eq('id', orderId)
      .single()

    if (!order || !canEditOrder(order.status)) return false

    const currentItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items ?? [])
    const remainingItems = currentItems.filter((i: any) => !productNames.includes(i.product_name))

    if (remainingItems.length === 0) {
      // Si no quedan items, cancelar la orden
      await updateOrderStatus(orderId, 'cancelado')
      return true
    }

    const removedItems = currentItems.filter((i: any) => productNames.includes(i.product_name))
    const removedM2 = removedItems.reduce((sum: number, i: any) => sum + (i.m2 ?? 0), 0)
    const removedBoxes = removedItems.reduce((sum: number, i: any) => sum + (i.boxes ?? 0), 0)
    const removedTotal = removedItems.reduce((sum: number, i: any) => sum + (i.total ?? 0), 0)

    const { error } = await sb.from('orders').update({
      items: remainingItems,
      total_m2: Math.max(0, (order.total_m2 ?? 0) - removedM2),
      total_boxes: Math.max(0, (order.total_boxes ?? 0) - removedBoxes),
      total_price: Math.max(0, (order.total_price ?? 0) - removedTotal),
    }).eq('id', orderId)

    if (error) {
      console.error('[ORDER] Remove items error:', error)
      return false
    }

    await sb.from('order_events').insert({
      order_id: orderId,
      type: 'items_removed',
      actor_type: 'system', actor_id: null,
      metadata: { items: productNames },
    })

    console.log('[ORDER] Items removed:', { orderId, items: productNames })
    return true
  } catch (err) {
    console.error('[ORDER] Remove items exception:', err)
    return false
  }
}
