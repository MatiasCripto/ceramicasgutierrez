// ── useRealtimeOrders Hook ────────────────────────────────────
// Realtime subscription for the orders list page.
// Single-tenant: sin organization_id.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'

interface UseRealtimeOrdersOptions {
  limit?: number
}

export function useRealtimeOrders({ limit = 50 }: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('orders')
      .select('*, customer:customers(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(limit)
    setOrders((data ?? []) as unknown as Order[])
    setLoading(false)
  }, [limit])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Realtime subscription for INSERT/UPDATE/DELETE
  useEffect(() => {
    const sb = createClient()
    const channel = sb.channel('orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, () => { loadOrders() })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [loadOrders])

  return { orders, loading, refresh: loadOrders }
}
