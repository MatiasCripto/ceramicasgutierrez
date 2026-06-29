import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  const { count: bundleCount } = await supabase
    .from('bundles')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  const { count: featuredCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('featured_on_landing', true)
    .eq('active', true)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumen</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Productos activos"
          value={productCount ?? 0}
          href="/dashboard/products"
          color="blue"
        />
        <DashboardCard
          title="Combos activos"
          value={bundleCount ?? 0}
          href="/dashboard/combos"
          color="green"
        />
        <DashboardCard
          title="Destacados en landing"
          value={featuredCount ?? 0}
          href="/dashboard/products"
          color="purple"
        />
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  href,
}: {
  title: string
  value: number
  href: string
  color: string
}) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </Link>
  )
}
