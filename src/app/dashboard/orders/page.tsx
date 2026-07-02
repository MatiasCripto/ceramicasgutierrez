'use client'

import { useEffect, useState } from 'react'

interface Order {
  id: string; status: string; total: number; created_at: string
  customer?: { full_name: string } | null
  items?: { id: string }[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:           { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  awaiting_payment:  { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  payment_under_review: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  payment_confirmed: { bg: 'var(--success-bg)', color: 'var(--success)' },
  preparing:         { bg: 'var(--info-bg)', color: 'var(--info)' },
  shipped:           { bg: 'var(--info-bg)', color: 'var(--info)' },
  delivered:         { bg: 'var(--success-bg)', color: 'var(--success)' },
  completed:         { bg: 'var(--success-bg)', color: 'var(--success)' },
  cancelled:         { bg: 'var(--danger-bg)', color: 'var(--danger)' },
  refunded:          { bg: 'var(--danger-bg)', color: 'var(--danger)' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  awaiting_payment: 'Esperando pago',
  payment_under_review: 'Pago en revisión',
  payment_confirmed: 'Pago confirmado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/orders')
      .then(r => {
        if (!r.ok) throw new Error(`GET /api/orders returned ${r.status}`)
        return r.json()
      })
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(err => console.error('[ORDERS] fetch failed:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter ? orders.filter(o => o.status === filter) : orders

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold">Pedidos</h1>

      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'awaiting_payment', 'payment_under_review', 'payment_confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium transition-colors ${
              filter === s ? 'text-white' : ''
            }`}
            style={{
              background: filter === s ? 'var(--brand)' : 'var(--surface-2)',
              color: filter === s ? '#fff' : 'var(--muted)',
            }}
          >
            {s ? STATUS_LABELS[s] : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay pedidos</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th className="text-left px-4 py-3 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-t cursor-pointer hover:bg-[var(--surface-2)] transition-colors" style={{ borderColor: 'var(--border)' }}
                  onClick={() => window.location.href = `/orders/${o.id}`}
                >
                  <td className="px-4 py-3 font-medium">#{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{o.customer?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5"
                      style={{ background: STATUS_STYLES[o.status]?.bg ?? 'var(--surface-2)', color: STATUS_STYLES[o.status]?.color ?? 'var(--muted)' }}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">${o.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--muted)' }}>
                    {new Date(o.created_at).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
