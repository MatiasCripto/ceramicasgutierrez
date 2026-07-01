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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Productos</h1>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--brand)' }}
        >
          <Plus size={16} />
          Nuevo Producto
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay productos todavía. ¡Creá el primero!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Producto</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Medida</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Color</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Terminación</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>$ / m²</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Stock m²</th>
                <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Destacado</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--subtle)' }}>—</div>
                        )}
                      </div>
                      <span className="font-medium" style={{ color: product.active ? 'var(--foreground)' : 'var(--subtle)', textDecoration: product.active ? 'none' : 'line-through' }}>
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: 'var(--muted)' }}>{product.category ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{product.size ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{product.color ?? '—'}</td>
                  <td className="px-4 py-3 capitalize" style={{ color: 'var(--muted)' }}>{product.finish ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                    {product.price_per_m2 ? formatCurrency(product.price_per_m2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium" style={{ color: (product.stock_m2 ?? 0) <= 0 ? 'var(--danger)' : 'var(--foreground)' }}>
                      {product.stock_m2 != null ? `${product.stock_m2} m²` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.featured_on_landing ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                        Sí
                      </span>
                    ) : (
                      <span style={{ color: 'var(--subtle)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="text-sm font-medium transition-opacity hover:opacity-70"
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
