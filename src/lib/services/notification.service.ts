// ── Notification Service ──────────────────────────────────────
// Creates notifications for key events across the system.
// Single-tenant: sin organization_id.

import { insertNotification } from '@/lib/repositories/notification.repository'

type NotificationInput = {
  type: string
  title: string
  description?: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(sb: any, input: NotificationInput) {
  await insertNotification(sb, input)
  console.log('[NOTIFICATION] created:', input.type)
}

export async function notifyNewOrder(
  sb: any,
  orderId: string,
  orderNumber: string,
  total: number,
) {
  await createNotification(sb, {
    type: 'new_order',
    title: `Nuevo pedido #${orderNumber}`,
    description: `Pedido por $${total.toFixed(2)}`,
    entity_type: 'order',
    entity_id: orderId,
  })
}

export async function notifyPaymentProof(
  sb: any,
  orderId: string,
  proofId: string,
) {
  await createNotification(sb, {
    type: 'payment_proof',
    title: 'Nuevo comprobante de pago',
    description: 'Un cliente subió un comprobante para revisar',
    entity_type: 'payment_proof',
    entity_id: proofId,
    metadata: { order_id: orderId },
  })
}
