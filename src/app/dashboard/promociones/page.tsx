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
        <h2 className="text-2xl font-bold text-gray-900">Promociones</h2>
        <Link
          href="/dashboard/promociones/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Promoción
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay promociones todavía. ¡Creá la primera!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descuento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Desde</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hasta</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((promo) => (
                <tr key={promo.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {promo.product_id ? 'Producto' : 'Combo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {promo.discount_type === 'percentage'
                      ? `${promo.discount_value}% OFF`
                      : `${formatCurrency(promo.discount_value)} de descuento`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(promo.starts_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(promo.ends_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {promo.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/promociones/${promo.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
