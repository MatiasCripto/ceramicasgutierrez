import { createServiceClient } from '@/lib/supabase/service'
import { FileText, Plus, ExternalLink, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type DocRow = {
  id: string
  type: 'quote' | 'receipt'
  customer_name: string | null
  customer_phone: string | null
  total_price: number | null
  valid_until: string | null
  pdf_url: string | null
  created_at: string
  order_id: string | null
}

function formatPrice(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false
  return new Date(validUntil) < new Date()
}

export default async function DocumentsPage() {
  const sb = createServiceClient()
  const { data: documents } = await sb
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false }) as { data: DocRow[] | null }

  const docs = documents ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Documentos</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Presupuestos y comprobantes de venta
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/documents/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--brand)' }}
        >
          <Plus size={16} />
          Nuevo documento
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--subtle)' }} />
          <p className="text-sm font-medium mb-1">No hay documentos todavía</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Generá tu primer presupuesto o comprobante desde acá.
          </p>
          <Link
            href="/dashboard/documents/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            <Plus size={16} />
            Nuevo documento
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Cliente</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Total</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>Estado</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--muted)' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const expired = doc.type === 'quote' && isExpired(doc.valid_until)
                return (
                  <tr key={doc.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        doc.type === 'quote'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {doc.type === 'quote' ? 'Presupuesto' : 'Comprobante'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {doc.customer_name ?? '—'}
                      </div>
                      {doc.customer_phone && (
                        <div className="text-xs" style={{ color: 'var(--subtle)' }}>{doc.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                      {formatPrice(doc.total_price)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {expired ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#dc2626' }}>
                          <AlertTriangle size={12} /> Vencido
                        </span>
                      ) : doc.type === 'quote' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#059669' }}>
                          <Clock size={12} /> Vigente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#6b7280' }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.pdf_url ? (
                        <a
                          href={doc.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-70"
                          style={{ color: 'var(--brand)' }}
                        >
                          <ExternalLink size={12} /> Ver PDF
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
