'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, Phone, MapPin, Mail, ShoppingBag, DollarSign, Clock } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, PAYMENT_LABELS, SHIPPING_LABELS } from '@/lib/utils/formatters'

interface Order {
  id: string
  status: string
  total_price: number
  total_m2: number
  total_boxes: number
  payment_method: string
  shipping_method: string
  created_at: string
}

interface CustomerData {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  total_orders: number
  lifetime_value: number
  last_order_at: string | null
  created_at: string
  notes: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  paid: '#10b981',
  preparing: '#6366f1',
  completed: '#10b981',
  cancelled: '#ef4444',
  refunded: '#f59e0b',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/customers/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.customer) {
          setCustomer(data.customer)
          setOrders(data.orders ?? [])
        }
      })
      .catch(err => console.error('[CUSTOMER] fetch error:', err))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</div>
  if (!customer) return <div className="text-sm" style={{ color: 'var(--muted)' }}>Cliente no encontrado</div>

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/customers')}
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--brand)' }}>
            {customer.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{customer.full_name}</h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Cliente desde {formatDate(customer.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} style={{ color: 'var(--muted)' }} />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} style={{ color: 'var(--muted)' }} />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} style={{ color: 'var(--muted)' }} />
              <span>{customer.address}</span>
            </div>
          )}
        </div>
        {customer.notes && (
          <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--subtle)' }}>Notas:</span>
            <p className="mt-0.5">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={14} style={{ color: 'var(--brand)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Órdenes</span>
          </div>
          <p className="text-xl font-bold">{customer.total_orders ?? 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} style={{ color: 'var(--success)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Gasto Total</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(customer.lifetime_value ?? 0)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} style={{ color: 'var(--info)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Última compra</span>
          </div>
          <p className="text-xl font-bold text-sm">
            {customer.last_order_at ? formatDate(customer.last_order_at) : 'Nunca'}
          </p>
        </div>
      </div>

      {/* Orders */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm">Historial de Pedidos</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Sin pedidos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th className="text-left px-4 py-2 font-medium">Pedido</th>
                  <th className="text-left px-4 py-2 font-medium">Estado</th>
                  <th className="text-left px-4 py-2 font-medium">Pago</th>
                  <th className="text-left px-4 py-2 font-medium">Envío</th>
                  <th className="text-right px-4 py-2 font-medium">m²</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-right px-4 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}
                    className="border-t cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                  >
                    <td className="px-4 py-2 font-medium">#{o.id?.slice(0, 8)}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] font-medium"
                        style={{ background: STATUS_COLORS[o.status] + '20', color: STATUS_COLORS[o.status] }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>
                      {PAYMENT_LABELS[o.payment_method] ?? o.payment_method ?? '—'}
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>
                      {SHIPPING_LABELS[o.shipping_method] ?? o.shipping_method ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{o.total_m2?.toFixed(2) ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(o.total_price ?? 0)}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--muted)' }}>
                      {formatDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
