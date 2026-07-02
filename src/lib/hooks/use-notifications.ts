// ── useNotifications Hook ─────────────────────────────────────
// Realtime subscription for admin notifications.
// Single-tenant: sin organization_id.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

interface UseNotificationsOptions {
  limit?: number
}

export function useNotifications({ limit = 50 }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    const sb = createClient()

    const { data } = await sb.from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    setNotifications((data ?? []) as Notification[])

    const { count } = await sb.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    setUnreadCount(count ?? 0)
    setLoading(false)
  }, [limit])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Realtime subscription
  useEffect(() => {
    const sb = createClient()
    const channel = sb.channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => {
        loadNotifications()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      }, () => {
        loadNotifications()
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [loadNotifications])

  const markAsRead = useCallback(async (id: string) => {
    const sb = createClient()
    await sb.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    const sb = createClient()
    await sb.from('notifications').update({ read: true }).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
