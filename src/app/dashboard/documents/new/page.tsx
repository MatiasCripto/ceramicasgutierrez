'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, FileText, Search, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import ProductSearchSelect from '@/components/ProductSearchSelect'

interface ProductOption {
  id: string
  name: string
  category: string | null
  color: string | null
  finish: string | null
  price_per_m2: number | null
  m2_per_box: number | null
  images: string[]
}

interface CustomerOption {
  id: string
  full_name: string | null
  phone: string
}

interface DocItem {
  product_id: string
  product_name: string
  category: string | null
  color: string | null
  finish: string | null
  image_url: string | null
  m2: string
  boxes: number
  price_per_m2: number
  total: number
}

function formatPrice(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function NewDocumentPage() {
  const router = useRouter()
  const sb = createClient()

  const [docType, setDocType] = useState<'quote' | 'receipt'>('quote')
  const [products, setProducts] = useState<ProductOption[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [saving, setSaving] = useState(false)

  // Customer
  const [customerMode, setCustomerMode] = useState<'search' | 'manual'>('search')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Items
  const [items, setItems] = useState<DocItem[]>([
    { product_id: '', product_name: '', category: null, color: null, finish: null, image_url: null, m2: '', boxes: 0, price_per_m2: 0, total: 0 },
  ])

  // Validity
  const [validUntil, setValidUntil] = useState('')

  // Result
  const [result, setResult] = useState<{ pdfUrl: string | null; documentId: string; warning?: string } | null>(null)

  useEffect(() => {
    async function load() {
      const [prodRes, custRes] = await Promise.all([
        sb.from('products').select('id, name, category, color, finish, price_per_m2, m2_per_box, images').eq('active', true).order('name'),
        sb.from('customers').select('id, full_name, phone').order('full_name'),
      ])
      if (prodRes.data) setProducts(prodRes.data as ProductOption[])
      if (custRes.data) setCustomers(custRes.data as CustomerOption[])

      // Default valid_until: now + 48hs
      const d = new Date()
      d.setHours(d.getHours() + 48)
      setValidUntil(d.toISOString().slice(0, 16))
    }
    load()
  }, [])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const q = customerSearch.toLowerCase()
    return customers.filter(c =>
      (c.full_name?.toLowerCase() ?? '').includes(q) ||
      c.phone.includes(q)
    )
  }, [customers, customerSearch])

  function handleCustomerSelect(cust: CustomerOption) {
    setSelectedCustomerId(cust.id)
    setCustomerName(cust.full_name ?? '')
    setCustomerPhone(cust.phone)
    setCustomerSearch(cust.full_name ?? cust.phone)
  }

  function handleCustomerModeChange(mode: 'search' | 'manual') {
    setCustomerMode(mode)
    if (mode === 'manual') {
      setSelectedCustomerId('')
      setCustomerSearch('')
      setCustomerName('')
      setCustomerPhone('')
    }
  }

  function calcBoxes(m2: number, m2PerBox: number | null): number {
    if (!m2PerBox || m2PerBox <= 0) return 0
    return Math.ceil(m2 / m2PerBox)
  }

  function handleProductSelect(idx: number, productId: string) {
    const prod = products.find(p => p.id === productId)
    if (!prod) return
    const m2Val = parseFloat(items[idx].m2) || 0
    const m2PerBox = prod.m2_per_box ?? null
    const boxes = calcBoxes(m2Val, m2PerBox)
    const price = prod.price_per_m2 ?? 0
    const total = m2Val * price

    const newItems = [...items]
    newItems[idx] = {
      product_id: prod.id,
      product_name: prod.name,
      category: prod.category,
      color: prod.color,
      finish: prod.finish,
      image_url: prod.images?.[0] ?? null,
      m2: newItems[idx].m2,
      boxes,
      price_per_m2: price,
      total,
    }
    setItems(newItems)
  }

  function handleM2Change(idx: number, value: string) {
    const newItems = [...items]
    const m2Val = parseFloat(value) || 0
    const prod = products.find(p => p.id === newItems[idx].product_id)
    const m2PerBox = prod?.m2_per_box ?? null
    const boxes = calcBoxes(m2Val, m2PerBox)
    const price = newItems[idx].price_per_m2 || (prod?.price_per_m2 ?? 0)
    const total = m2Val * price

    newItems[idx] = {
      ...newItems[idx],
      m2: value,
      boxes,
      price_per_m2: price,
      total,
    }
    setItems(newItems)
  }

  function addItem() {
    setItems(prev => [...prev, {
      product_id: '', product_name: '', category: null, color: null, finish: null, image_url: null,
      m2: '', boxes: 0, price_per_m2: 0, total: 0,
    }])
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.total, 0),
    [items]
  )

  async function handleGenerate() {
    // Validations
    if (!customerName.trim() && !customerPhone.trim()) {
      alert('Ingresá el nombre o teléfono del cliente.')
      return
    }

    const validItems = items.filter(i => i.product_id && parseFloat(i.m2) > 0)
    if (validItems.length === 0) {
      alert('Agregá al menos un producto con cantidad válida.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        type: docType,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_id: selectedCustomerId || null,
        items: validItems.map(i => ({
          product_name: i.product_name,
          category: i.category,
          color: i.color,
          finish: i.finish,
          image_url: i.image_url,
          m2: parseFloat(i.m2),
          boxes: i.boxes,
          price_per_m2: i.price_per_m2,
          total: i.total,
        })),
        valid_until: docType === 'quote' ? new Date(validUntil).toISOString() : null,
      }

      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.redirectTo) {
          alert(data.error)
          router.push(data.redirectTo)
          return
        }
        alert(data.error || 'Error al generar el documento.')
        return
      }

      setResult({
        pdfUrl: data.pdfUrl,
        documentId: data.document.id,
        warning: data.warning,
      })
    } catch (err) {
      alert('Error de conexión: ' + String(err))
    }
    setSaving(false)
  }

  // If PDF was generated, show result
  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: '#dbeafe' }}>
          <FileText size={28} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {docType === 'quote' ? 'Presupuesto' : 'Comprobante'} generado
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {customerName || 'Cliente'} — {formatPrice(subtotal)}
          </p>
          {result.warning && (
            <p className="text-xs mt-2 px-4 py-2 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>
              {result.warning}
            </p>
          )}
        </div>

        {result.pdfUrl ? (
          <a
            href={result.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            <ExternalLink size={16} />
            Ver PDF
          </a>
        ) : (
          <p className="text-xs" style={{ color: '#dc2626' }}>
            No se pudo generar el PDF. Intentá de nuevo.
          </p>
        )}

        <div className="flex items-center justify-center gap-3 pt-4">
          <button onClick={() => { setResult(null); setItems([{ product_id: '', product_name: '', category: null, color: null, finish: null, image_url: null, m2: '', boxes: 0, price_per_m2: 0, total: 0 }]) }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
            Nuevo documento
          </button>
          <Link href="/dashboard/documents"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
            Volver a documentos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/documents" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} style={{ color: 'var(--muted)' }} />
        </Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
          <FileText size={18} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Nuevo documento</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Generá un presupuesto o comprobante de venta</p>
        </div>
      </div>

      {/* 1. Type */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Tipo de documento</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="docType" value="quote" checked={docType === 'quote'}
              onChange={() => setDocType('quote')} className="accent-blue-600" />
            <span className="text-sm font-medium">Presupuesto</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="docType" value="receipt" checked={docType === 'receipt'}
              onChange={() => setDocType('receipt')} className="accent-blue-600" />
            <span className="text-sm font-medium">Comprobante</span>
          </label>
        </div>
      </div>

      {/* 2. Customer */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Cliente</h2>

        <div className="flex items-center gap-3">
          <button onClick={() => handleCustomerModeChange('search')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${customerMode === 'search' ? 'text-white' : ''}`}
            style={customerMode === 'search' ? { background: 'var(--brand)' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>
            Buscar existente
          </button>
          <button onClick={() => handleCustomerModeChange('manual')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${customerMode === 'manual' ? 'text-white' : ''}`}
            style={customerMode === 'manual' ? { background: 'var(--brand)' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>
            Cliente nuevo
          </button>
        </div>

        {customerMode === 'search' ? (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
            <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
            {customerSearch && filteredCustomers.length > 0 && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 rounded-[var(--radius-md)] border shadow-lg bg-white max-h-48 overflow-y-auto"
                style={{ borderColor: 'var(--border)' }}>
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => handleCustomerSelect(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                    <span className="font-medium">{c.full_name || 'Sin nombre'}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--subtle)' }}>{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {customerSearch && filteredCustomers.length === 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>Sin resultados. Cambiá a "Cliente nuevo" para ingresar los datos manualmente.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
              className="px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              placeholder="Teléfono"
              className="px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
        )}

        {/* Show selected customer name/phone */}
        {(customerName || customerPhone) && customerMode === 'search' && (
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-[var(--radius-md)]"
            style={{ background: '#f0fdf4', color: '#065f46' }}>
            Cliente: {customerName}{customerPhone ? ` — ${customerPhone}` : ''}
          </div>
        )}
      </div>

      {/* 3. Products */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Productos</h2>
          <button onClick={addItem}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[var(--radius-md)] font-medium transition-colors hover:opacity-70"
            style={{ background: 'var(--surface-2)', color: 'var(--brand)' }}>
            <Plus size={14} /> Agregar producto
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-[var(--radius-md)]"
              style={{ background: 'var(--surface-2)' }}>
              <div className="flex-1 space-y-2">
                <ProductSearchSelect
                  products={products}
                  value={item.product_id}
                  onChange={(productId) => handleProductSelect(idx, productId)}
                />

                {item.product_id && (
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs" style={{ color: 'var(--subtle)' }}>m²</label>
                      <input type="number" step="0.01" min="0" value={item.m2}
                        onChange={e => handleM2Change(idx, e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 rounded-[var(--radius-md)] border text-sm bg-white outline-none"
                        style={{ borderColor: 'var(--border)' }} />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--subtle)' }}>Cajas</label>
                      <div className="w-full px-2 py-1.5 rounded-[var(--radius-md)] border text-sm bg-gray-50"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        {item.boxes || 0}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--subtle)' }}>$/m²</label>
                      <div className="w-full px-2 py-1.5 rounded-[var(--radius-md)] border text-sm bg-gray-50"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        {item.price_per_m2 ? formatPrice(item.price_per_m2) : '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--subtle)' }}>Subtotal</label>
                      <div className="w-full px-2 py-1.5 rounded-[var(--radius-md)] border text-sm font-medium bg-gray-50"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        {item.total ? formatPrice(item.total) : '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {items.length > 1 && (
                <button onClick={() => removeItem(idx)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50 mt-1">
                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Subtotal */}
        {subtotal > 0 && (
          <div className="flex justify-end pt-2">
            <div className="text-right">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Subtotal</span>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{formatPrice(subtotal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Validity (solo presupuesto) */}
      {docType === 'quote' && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Vigencia del presupuesto</h2>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Por defecto 48 horas desde ahora. Podés cambiarlo si querés dar más o menos tiempo.
          </p>
          <input type="datetime-local" value={validUntil}
            onChange={e => setValidUntil(e.target.value)}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }} />
        </div>
      )}

      {/* 5. Generate */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleGenerate} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--brand)' }}>
          <FileText size={16} />
          {saving ? 'Generando PDF...' : 'Generar PDF'}
        </button>
        <Link href="/dashboard/documents"
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
          Cancelar
        </Link>
      </div>
    </div>
  )
}
