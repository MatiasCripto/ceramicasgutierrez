'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, CreditCard, Truck, Clock } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters'

const STATUS_FLOW = ['pending', 'esperando_pago', 'pago_en_revision', 'pago_confirmado', 'preparando', 'enviado', 'entregado', 'completado']

const STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: 'Pendiente',        color: '#92400e', bg: '#fef3c7' },
  esperando_pago:  { label: 'Esperando pago',    color: '#9a3412', bg: '#ffedd5' },
  pago_en_revision:{ label: 'Pago en revisión',  color: '#1e40af', bg: '#dbeafe' },
  pago_confirmado: { label: 'Pago confirmado',   color: '#065f46', bg: '#d1fae5' },
  preparando:      { label: 'Preparando',        color: '#3730a3', bg: '#e0e7ff' },
  enviado:         { label: 'Enviado',           color: '#6b21a8', bg: '#f3e8ff' },
  entregado:       { label: 'Entregado',         color: '#0e7490', bg: '#cffafe' },
  completado:      { label: 'Completado',        color: '#065f46', bg: '#d1fae5' },
  cancelado:       { label: 'Cancelado',         color: '#991b1b', bg: '#fee2e2' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:         '#f59e0b',
  esperando_pago:  '#ea580c',
  pago_en_revision:'#3b82f6',
  pago_confirmado: '#10b981',
  preparando:      '#6366f1',
  enviado:         '#9333ea',
  entregado:       '#06b6d4',
  completado:      '#10b981',
  cancelado:       '#ef4444',
}

interface OrderItem {
  product_name: string
  m2?: number
  boxes?: number
  price_per_m2?: number
  total?: number
}

interface OrderEvent {
  id: string
  type: string
  actor_type: string
  actor_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  created: 'Pedido creado',
  pending: 'Pendiente',
  esperando_pago: 'Esperando pago',
  pago_en_revision: 'Pago en revisión',
  pago_confirmado: 'Pago confirmado',
  preparando: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  completado: 'Completado',
  cancelado: 'Cancelado',
  items_added: 'Productos agregados',
  items_removed: 'Productos removidos',
  proof_received: 'Comprobante recibido',
  payment_proof_approved: 'Pago aprobado',
  payment_proof_rejected: 'Pago rechazado',
}

function getEventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, ' ')
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any | null>(null)
  const [events, setEvents] = useState<OrderEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/orders/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.order) {
          setOrder(data.order)
          setEvents(data.events ?? [])
        }
      })
      .catch(err => console.error('[ORDER] fetch error:', err))
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleUpdateStatus(newStatus: string) {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Error al cambiar estado')
        setUpdating(false)
        return
      }
      setOrder({ ...order, status: newStatus })
      // Refresh events
      const data = await fetch(`/api/orders/${params.id}`).then(r => r.json())
      if (data.events) setEvents(data.events)
    } catch {
      alert('Error de red')
    }
    setUpdating(false)
  }

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</div>
  if (!order) return <div className="text-sm" style={{ color: 'var(--muted)' }}>Pedido no encontrado</div>

  const items: OrderItem[] = Array.isArray(order.items) ? order.items : []
  const statusCfg = STATUSES[order.status] ?? { bg: '#f3f4f6', color: '#6b7280' }
  const currentIdx = STATUS_FLOW.indexOf(order.status)
  const total = order.total_price ?? items.reduce((s, i) => s + (i.total ?? 0), 0)

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/orders')}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors"
            style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold">Pedido #{order.id?.slice(0, 8)}</h1>
          <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] font-medium"
            style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>
        {order.status !== 'cancelado' && order.status !== 'completado' && (
          <button onClick={() => handleUpdateStatus('cancelado')} disabled={updating}
            className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium text-white"
            style={{ background: '#ef4444' }}>
            Cancelar pedido
          </button>
        )}
      </div>

      {/* Status transitions */}
      <div className="card p-5">
        <div className="flex items-center gap-1">
          {STATUS_FLOW.map((s, i) => {
            const color = STATUS_COLORS[s] ?? '#6b7280'
            const done = i <= currentIdx
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full transition-colors"
                  style={{ background: done ? color : 'var(--surface-2)' }}
                />
                <span className="text-[10px] text-center leading-tight" style={{ color: done ? color : 'var(--subtle)' }}>
                  {STATUSES[s]?.label ?? s}
                </span>
              </div>
            )
          })}
        </div>

        {order.status !== 'cancelado' && order.status !== 'completado' && (
          <div className="mt-4 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-medium w-full mb-1" style={{ color: 'var(--subtle)' }}>
              Asignar estado manual:
            </span>
            {STATUS_FLOW.slice(currentIdx + 1).map(s => (
              <button key={s} onClick={() => handleUpdateStatus(s)} disabled={updating}
                className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-opacity disabled:opacity-50 text-white"
                style={{ background: STATUS_COLORS[s] ?? '#6b7280' }}>
                {STATUSES[s]?.label ?? s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer + Payment info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User size={14} style={{ color: 'var(--muted)' }} />
            Cliente
          </div>
          {order.customer_name && <p className="text-sm font-medium">{order.customer_name}</p>}
          {order.customer_phone && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{order.customer_phone}</p>
          )}
          {order.shipping_address && (
            <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--subtle)' }}>Dirección de envío:</span>
              <p className="mt-0.5">{order.shipping_address}</p>
            </div>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CreditCard size={14} style={{ color: 'var(--muted)' }} />
            Pago y envío
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--muted)' }}>Pago</span>
              <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] font-medium"
                style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {order.payment_status ?? '—'}
              </span>
            </div>
            {order.payment_method && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--muted)' }}>Método</span>
                <span>{order.payment_method}</span>
              </div>
            )}
            {order.shipping_method && (
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>
                  <Truck size={12} className="inline mr-1" />
                  Envío
                </span>
                <span>{order.shipping_method}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {events.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock size={14} style={{ color: 'var(--muted)' }} />
            Línea de tiempo
          </div>
          <div className="relative pl-6 space-y-0">
            {events.map((ev, idx) => {
              const isLast = idx === events.length - 1
              return (
                <div key={ev.id} className="relative pb-4">
                  {!isLast && (
                    <div className="absolute left-[-11px] top-3 bottom-0 w-px"
                      style={{ background: 'var(--border)' }} />
                  )}
                  <div className="absolute left-[-15px] top-0.5 w-2 h-2 rounded-full"
                    style={{ background: STATUS_COLORS[ev.type] ?? '#6b7280' }} />
                  <div className="text-sm">{getEventLabel(ev.type)}</div>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--subtle)' }}>
                    <span>{new Date(ev.created_at).toLocaleString('es-AR')}</span>
                    <span className="capitalize">{ev.actor_type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm">Productos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th className="text-left px-4 py-2 font-medium">Producto</th>
                <th className="text-right px-4 py-2 font-medium">m²</th>
                <th className="text-right px-4 py-2 font-medium">Cajas</th>
                <th className="text-right px-4 py-2 font-medium">Precio/m²</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2 font-medium">{item.product_name}</td>
                  <td className="px-4 py-2 text-right">{item.m2?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{item.boxes ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    {item.price_per_m2 ? formatCurrency(item.price_per_m2) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {item.total ? formatCurrency(item.total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-2 text-right text-xs" style={{ color: 'var(--muted)' }}>
                  Total
                </td>
                <td className="px-4 py-2 text-right text-sm font-medium">
                  {order.total_m2?.toFixed(2) ?? '—'}
                </td>
                <td className="px-4 py-2 text-right text-sm font-medium">
                  {order.total_boxes ?? '—'}
                </td>
                <td />
                <td className="px-4 py-2 text-right font-bold">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs" style={{ color: 'var(--subtle)' }}>
        Creado {formatDateTime(order.created_at)}
        {order.notes && <p className="mt-1">Notas: {order.notes}</p>}
      </div>
    </div>
  )
}
