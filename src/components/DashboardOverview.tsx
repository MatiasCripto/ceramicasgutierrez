'use client'

import {
  TrendingUp, ShoppingCart, Clock, Users, BarChart3, MessageCircle,
} from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartItem {
  label: string
  ventas: number
}

interface StatusItem {
  key: string
  label: string
  count: number
  pct: number
  color: string
}

interface RecentOrder {
  id: string
  customer_name: string | null
  total_price: number | null
  status: string
  created_at: string
  items: any[] | null
}

interface TopProduct {
  name: string
  qty: number
  revenue: number
}

interface Props {
  ventasMes: number
  ventasPrev: number
  pedidosTotales: number
  pedidosPrev: number
  pendientesNow: number
  pendientesPrev: number
  clientesNuevos: number
  clientesPrev: number
  chartData: ChartItem[]
  statusData: StatusItem[]
  recentOrders: RecentOrder[]
  topProducts: TopProduct[]
  maxProductQty: number
  conversacionesHoy: number
  mensajesSemana: number
}

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const statusBadge: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pendiente',   color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  confirmed:  { label: 'Confirmado',  color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  paid:       { label: 'Pagado',      color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  completed:  { label: 'Completado',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  cancelled:  { label: 'Cancelado',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

function KpiCard({
  label,
  value,
  prev,
  icon,
}: {
  label: string
  value: string
  prev: number
  icon: React.ReactNode
}) {
  const numValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0
  const diff = prev > 0 ? ((numValue - prev) / prev) * 100 : numValue > 0 ? 100 : 0
  const isUp = diff >= 0

  return (
    <div className="rounded-xl p-6 flex flex-col justify-between"
      style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--dash-dark-muted)' }}>
          {label}
        </span>
        <span style={{ color: '#F5C200' }}>{icon}</span>
      </div>
      <div className="text-[28px] font-bold" style={{ color: 'var(--dash-dark-text)' }}>
        {value}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span style={{ color: isUp ? '#22C55E' : '#EF4444', fontSize: 13 }}>
          {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
        </span>
        <span className="text-xs" style={{ color: 'var(--dash-dark-muted)' }}>vs. mes anterior</span>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg"
      style={{ background: '#2A2A2A', color: '#F0F0F0', border: '1px solid #F5C200' }}>
      <p className="text-xs mb-1" style={{ color: '#888880' }}>Semana {label}</p>
      <p style={{ color: '#F5C200', fontWeight: 700 }}>{ars(payload[0].value)}</p>
    </div>
  )
}

export default function DashboardOverview({
  ventasMes, ventasPrev, pedidosTotales, pedidosPrev,
  pendientesNow, pendientesPrev, clientesNuevos, clientesPrev,
  chartData, statusData, recentOrders, topProducts, maxProductQty,
  conversacionesHoy, mensajesSemana,
}: Props) {
  return (
    <div className="space-y-5" style={{ background: 'var(--dash-dark-bg)', minHeight: '100%' }}>
      {/* ───── ROW 1: KPI cards ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ventas del mes" value={ars(ventasMes)} prev={ventasPrev} icon={<TrendingUp size={20} />} />
        <KpiCard label="Pedidos totales" value={String(pedidosTotales)} prev={pedidosPrev} icon={<ShoppingCart size={20} />} />
        <KpiCard label="Pedidos pendientes" value={String(pendientesNow)} prev={pendientesPrev} icon={<Clock size={20} />} />
        <KpiCard label="Clientes nuevos" value={String(clientesNuevos)} prev={clientesPrev} icon={<Users size={20} />} />
      </div>

      {/* ───── ROW 2: Chart + Status ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: '#F5C200' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--dash-dark-text)' }}>Ventas por semana</h2>
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--dash-dark-muted)' }}>
              Sin datos de ventas este mes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#888880', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888880', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}K` : v}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,194,0,0.06)' }} />
                <Bar dataKey="ventas" fill="#F5C200" radius={[4, 4, 0, 0]} maxBarSize={40}
                  onMouseEnter={(_, i) => i} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status distribution */}
        <div className="rounded-xl p-5"
          style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--dash-dark-text)' }}>Distribución de estados</h2>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--dash-dark-muted)' }}>
              Sin pedidos este mes
            </div>
          ) : (
            <div className="space-y-4">
              {statusData.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--dash-dark-text)' }}>{s.label}</span>
                    <span className="text-xs" style={{ color: s.color }}>{s.count} ({s.pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--dash-dark-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───── ROW 3: Recent orders + Top products ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders table */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--dash-dark-text)' }}>Últimos pedidos</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-5 pb-5 text-sm" style={{ color: 'var(--dash-dark-muted)' }}>
              Sin pedidos aún
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#0F0F0F' }}>
                    <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>Cliente</th>
                    <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>Productos</th>
                    <th className="text-right px-4 py-2.5 font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>Total</th>
                    <th className="text-center px-4 py-2.5 font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>Estado</th>
                    <th className="text-right px-4 py-2.5 font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => {
                    const badge = statusBadge[o.status] ?? { label: o.status, color: '#888880', bg: 'transparent' }
                    const itemsCount = (o.items as any[] ?? []).length
                    return (
                      <tr key={o.id} className="transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--dash-dark-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#222222'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => window.location.href = `/dashboard/orders/${o.id}`}>
                        <td className="px-4 py-3" style={{ color: 'var(--dash-dark-text)' }}>{o.customer_name ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--dash-dark-muted)' }}>{itemsCount} prod.</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: '#F5C200' }}>{ars(o.total_price ?? 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--dash-dark-muted)' }}>
                          {new Date(o.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/dashboard/orders"
            className="block px-5 py-3 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: '#F5C200', borderTop: '1px solid var(--dash-dark-border)' }}>
            Ver todos los pedidos →
          </Link>
        </div>

        {/* Top products */}
        <div className="rounded-xl p-5"
          style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--dash-dark-text)' }}>Productos más vendidos</h2>
          {topProducts.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--dash-dark-muted)' }}>
              Sin ventas este mes
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium" style={{ color: 'var(--dash-dark-muted)' }}>{i + 1}.</span>
                      <span className="text-sm truncate" style={{ color: 'var(--dash-dark-text)' }}>{p.name}</span>
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap ml-2" style={{ color: '#F5C200' }}>{p.qty} unid.</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'var(--dash-dark-border)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(p.qty / maxProductQty) * 100}%`, background: '#F5C200' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───── ROW 4: WhatsApp activity ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 flex items-center gap-4"
          style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,194,0,0.12)' }}>
            <MessageCircle size={18} style={{ color: '#F5C200' }} />
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: 'var(--dash-dark-text)' }}>{conversacionesHoy}</div>
            <div className="text-xs" style={{ color: 'var(--dash-dark-muted)' }}>Conversaciones activas hoy</div>
          </div>
        </div>
        <div className="rounded-xl p-5 flex items-center gap-4"
          style={{ background: 'var(--dash-dark-card)', border: '1px solid var(--dash-dark-border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,194,0,0.12)' }}>
            <MessageCircle size={18} style={{ color: '#F5C200' }} />
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: 'var(--dash-dark-text)' }}>{mensajesSemana}</div>
            <div className="text-xs" style={{ color: 'var(--dash-dark-muted)' }}>Mensajes esta semana</div>
          </div>
        </div>
      </div>
    </div>
  )
}
