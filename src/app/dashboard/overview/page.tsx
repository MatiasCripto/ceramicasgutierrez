import { createClient } from '@/lib/supabase/server'
import DashboardOverview from '@/components/DashboardOverview'

export default async function OverviewPage() {
  const supabase = await createClient()

  // ── Date ranges ──
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Helper: fetch or fallback to zero
  async function countSince(from: string, table: string, filters?: Record<string, string>) {
    let q = supabase.from(table).select('id', { count: 'exact', head: true }).gte('created_at', from)
    if (filters) for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
    const { count } = await q
    return count ?? 0
  }

  // 1. KPIs
  const [currentSales, prevSales] = await Promise.all([
    supabase.from('orders').select('total_price').in('status', ['paid', 'completed']).gte('created_at', monthStart.toISOString()),
    supabase.from('orders').select('total_price').in('status', ['paid', 'completed']).gte('created_at', prevMonthStart.toISOString()).lte('created_at', prevMonthEnd.toISOString()),
  ])

  const ventasMes = (currentSales.data ?? []).reduce((s, o: any) => s + Number(o.total_price ?? 0), 0)
  const ventasPrev = (prevSales.data ?? []).reduce((s, o: any) => s + Number(o.total_price ?? 0), 0)

  const pedidosTotales = await countSince(monthStart.toISOString(), 'orders')
  const pedidosPrev = await countSince(prevMonthStart.toISOString(), 'orders')

  const pendientesNow = await countSince(monthStart.toISOString(), 'orders', { status: 'pending' })
  const pendientesPrev = await countSince(prevMonthStart.toISOString(), 'orders', { status: 'pending' })

  const clientesNuevos = await countSince(monthStart.toISOString(), 'customers')
  const clientesPrev = await countSince(prevMonthStart.toISOString(), 'customers')

  // 2. Daily sales for chart (last 30 days)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: dailySales } = await supabase
    .from('orders')
    .select('total_price, created_at')
    .in('status', ['paid', 'completed'])
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // 3. Order status distribution
  const { data: statusCounts } = await supabase
    .from('orders')
    .select('status')
    .gte('created_at', monthStart.toISOString())

  // 4. Recent 8 orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, total_price, status, created_at, customer_name, items')
    .order('created_at', { ascending: false })
    .limit(8)

  // 5. Top 5 products (by parsing orders items)
  const { data: monthOrders } = await supabase
    .from('orders')
    .select('items')
    .gte('created_at', monthStart.toISOString())

  // 6. WhatsApp activity
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const [whatsappActive, whatsappMessages] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('last_message_at', todayStart.toISOString()),
    supabase.from('conversations').select('messages_count').gte('last_message_at', weekStart.toISOString()),
  ])

  const conversacionesHoy = whatsappActive.count ?? 0
  const mensajesSemana = (whatsappMessages.data ?? []).reduce((s: number, c: any) => s + Number(c.messages_count ?? 0), 0)

  // ── Aggregate: daily sales ──
  const dayMap: Record<string, number> = {}
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    dayMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const o of (dailySales ?? [])) {
    const day = (o as any).created_at?.slice(0, 10)
    if (day && day in dayMap) dayMap[day] += Number((o as any).total_price ?? 0)
  }

  // Group into weeks (7-day buckets)
  const chartData: { label: string; ventas: number }[] = []
  const sortedDays = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b))
  for (let i = 0; i < sortedDays.length; i += 7) {
    const chunk = sortedDays.slice(i, i + 7)
    const start = chunk[0][0].slice(5)
    const end = chunk[chunk.length - 1][0].slice(5)
    const total = chunk.reduce((s, [, v]) => s + v, 0)
    chartData.push({ label: `${start}`, ventas: total })
  }

  // ── Aggregate: status distribution ──
  const statusLabels: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmado', paid: 'Pagado', completed: 'Completado', cancelled: 'Cancelado' }
  const statusColors: Record<string, string> = { pending: '#D97706', confirmed: '#2563EB', paid: '#22C55E', completed: '#22C55E', cancelled: '#EF4444' }
  const statusCount: Record<string, number> = {}
  for (const o of (statusCounts ?? [])) {
    const s = (o as any).status ?? 'unknown'
    statusCount[s] = (statusCount[s] ?? 0) + 1
  }
  const totalOrders = (statusCounts ?? []).length

  const statusData = Object.entries(statusCount).map(([key, count]) => ({
    key,
    label: statusLabels[key] ?? key,
    count,
    pct: totalOrders ? Math.round((count / totalOrders) * 100) : 0,
    color: statusColors[key] ?? '#888880',
  }))

  // ── Aggregate: top 5 products ──
  const productSales: Record<string, { qty: number; revenue: number }> = {}
  for (const o of (monthOrders ?? [])) {
    const items = (o as any).items as any[] ?? []
    for (const item of items) {
      const name = item.product_name ?? 'Desconocido'
      if (!productSales[name]) productSales[name] = { qty: 0, revenue: 0 }
      productSales[name].qty += item.boxes ?? item.qty ?? 0
      productSales[name].revenue += Number(item.total ?? 0)
    }
  }
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b.qty - a.qty)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }))
  const maxProductQty = topProducts[0]?.qty ?? 1

  return (
    <DashboardOverview
      ventasMes={ventasMes}
      ventasPrev={ventasPrev}
      pedidosTotales={pedidosTotales}
      pedidosPrev={pedidosPrev}
      pendientesNow={pendientesNow}
      pendientesPrev={pendientesPrev}
      clientesNuevos={clientesNuevos}
      clientesPrev={clientesPrev}
      chartData={chartData}
      statusData={statusData}
      recentOrders={recentOrders as any[] ?? []}
      topProducts={topProducts}
      maxProductQty={maxProductQty}
      conversacionesHoy={conversacionesHoy}
      mensajesSemana={mensajesSemana}
    />
  )
}
