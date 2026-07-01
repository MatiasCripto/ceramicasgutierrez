import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface PromotionRow {
  id: string
  product_id: string | null
  bundle_id: string | null
  discount_type: 'percentage' | 'fixed_price'
  discount_value: number
  starts_at: string
  ends_at: string
  active: boolean
}

export default async function PromocionesPage() {
  const supabase = await createClient()

  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, product_id, bundle_id, discount_type, discount_value, starts_at, ends_at, active')
    .order('created_at', { ascending: false })

  const rows = (promotions ?? []) as PromotionRow[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Promociones</h2>
        <Link
          href="/dashboard/promociones/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-[var(--radius-md)] hover:opacity-90 transition-opacity" style={{ background: 'var(--brand)' }}
        >
          <Plus className="w-4 h-4" />
          Nueva Promoción
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay promociones todavía. ¡Creá la primera!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Descuento</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Desde</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Hasta</th>
                <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Estado</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((promo) => (
                <tr key={promo.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {promo.product_id ? 'Producto' : 'Combo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                    {promo.discount_type === 'percentage'
                      ? `${promo.discount_value}% OFF`
                      : `${formatCurrency(promo.discount_value)} de descuento`}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatDate(promo.starts_at)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatDate(promo.ends_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {promo.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--subtle)' }}>
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/promociones/${promo.id}/edit`}
                      className="text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--brand)' }}
                    >
                      Editar
                    </Link>
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
