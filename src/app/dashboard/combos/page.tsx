import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'

export default async function CombosPage() {
  const supabase = await createClient()

  const { data: bundles } = await supabase
    .from('bundles')
    .select('id, name, bundle_price, active, created_at')
    .order('created_at', { ascending: false })

  const rows = bundles ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Combos</h2>
        <Link
          href="/dashboard/combos/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-[var(--radius-md)] hover:opacity-90 transition-opacity" style={{ background: 'var(--brand)' }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Combo
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay combos todavía. ¡Creá el primero!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Nombre</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Precio Combo</th>
                <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Estado</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((bundle) => (
                <tr key={bundle.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>{bundle.name}</td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(bundle.bundle_price)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {bundle.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--subtle)' }}>
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/combos/${bundle.id}/edit`}
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
      )}
    </div>
  )
}
