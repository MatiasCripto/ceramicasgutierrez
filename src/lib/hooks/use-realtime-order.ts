// ── useRealtimeOrder Hook ─────────────────────────────────────
// Realtime subscription for the order detail page.
// Single-tenant: sin organization_id.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, PaymentProof } from '@/lib/types'

interface UseRealtimeOrderOptions {
  orderId: string | null
}

export function useRealtimeOrder({ orderId }: UseRealtimeOrderOptions) {
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrder = useCallback(async () => {
    if (!orderId) return
    const sb = createClient()

    const { data } = await sb.from('orders')
      .select('*, customer:customers(*)')
      .eq('id', orderId)
      .single()
    setOrder(data as unknown as Order)

    const { data: proofs } = await sb.from('payment_proofs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    setPaymentProofs((proofs ?? []) as PaymentProof[])

    setLoading(false)
  }, [orderId])

  useEffect(() => { loadOrder() }, [loadOrder])

  // Realtime subscription for order changes
  useEffect(() => {
    if (!orderId) return
    const sb = createClient()

    const channel = sb.channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, () => { loadOrder() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
        filter: `order_id=eq.${orderId}`,
      }, () => { loadOrder() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_proofs',
        filter: `order_id=eq.${orderId}`,
      }, () => { loadOrder() })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [orderId, loadOrder])

  return { order, paymentProofs, loading, refresh: loadOrder }
}
