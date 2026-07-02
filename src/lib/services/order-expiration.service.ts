// ── Order Expiration Service ──────────────────────────────────
// Business logic for expiring unpaid orders.
// Single-tenant: sin organization loop.

import { getExpirationSettings } from '@/lib/repositories/order-expiration.repository'
import { releaseStockForOrder } from '@/lib/services/stock-reservation.service'
import { recordOrderEvent } from '@/lib/services/order-event.service'

export async function expireOverdueOrders(sb: any): Promise<number> {
  const settings = await getExpirationSettings(sb)
  if (!settings?.enabled) return 0

  const expirationMinutes = settings.expiration_minutes ?? 1440
  const autoReleaseStock = settings.auto_release_stock ?? false

  const cutoff = new Date(Date.now() - expirationMinutes * 60 * 1000).toISOString()
  const { data: orders } = await sb.from('orders')
    .select('id')
    .eq('status', 'awaiting_payment')
    .lt('created_at', cutoff)
    .limit(50)

  if (!orders?.length) return 0

  let totalExpired = 0

  for (const order of orders) {
    try {
      await sb.from('orders').update({ status: 'expired' }).eq('id', order.id)

      await recordOrderEvent(sb, {
        order_id: order.id,
        type: 'expired',
        actor_type: 'system',
        metadata: { reason: 'payment_timeout', expiration_minutes },
      })

      if (autoReleaseStock) {
        await releaseStockForOrder(sb, order.id)
      }

      totalExpired++
      console.log('[EXPIRATION] expired order:', order.id)
    } catch (err) {
      console.error('[EXPIRATION] failed to expire order:', order.id, err)
    }
  }

  return totalExpired
}
