import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'

interface ProductRow {
  id: string
  name: string
  category: string | null
  size: string | null
  color: string | null
  finish: string | null
  price_per_m2: number | null
  m2_per_box: number | null
  stock_m2: number | null
  images: string[]
  featured_on_landing: boolean
  active: boolean
}

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, size, color, finish, price_per_m2, m2_per_box, stock_m2, images, featured_on_landing, active')
    .order('created_at', { ascending: false })

  const rows = (products ?? []) as ProductRow[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Productos</h2>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay productos todavía. ¡Creá el primero!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Medida</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Color</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Terminación</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">$ / m²</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock m²</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Destacado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">—</div>
                        )}
                      </div>
                      <span className={`font-medium ${product.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{product.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{product.size ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{product.color ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{product.finish ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {product.price_per_m2 ? formatCurrency(product.price_per_m2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${(product.stock_m2 ?? 0) <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock_m2 != null ? `${product.stock_m2} m²` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.featured_on_landing ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sí
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
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
