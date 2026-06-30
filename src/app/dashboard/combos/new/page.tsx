'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface ProductOption {
  id: string
  name: string
  category: string | null
}

interface BundleItemRow {
  product_id: string
  quantity: string
}

export default function NewComboPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [form, setForm] = useState({ name: '', bundle_price: '', active: true })
  const [items, setItems] = useState<BundleItemRow[]>([{ product_id: '', quantity: '1' }])

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data } = await sb.from('products')
        .select('id, name, category')
        .eq('active', true)
        .order('name')
      setProducts((data ?? []) as ProductOption[])
    }
    load()
  }, [])

  function addItem() {
    setItems(prev => [...prev, { product_id: '', quantity: '1' }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof BundleItemRow, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const sb = createClient()

    const validItems = items.filter(it => it.product_id)
    if (validItems.length === 0) {
      alert('Agregá al menos un producto al combo')
      setSaving(false)
      return
    }

    const { data: bundle, error } = await sb.from('bundles').insert({
      name: form.name,
      bundle_price: Number(form.bundle_price),
      active: form.active,
    }).select('id').single()

    if (error || !bundle) {
      setSaving(false)
      alert('Error al crear combo: ' + (error?.message ?? 'desconocido'))
      return
    }

    const bundleItems = validItems.map(it => ({
      bundle_id: bundle.id,
      product_id: it.product_id,
      quantity: Number(it.quantity) || 1,
    }))

    const { error: itemsError } = await sb.from('bundle_items').insert(bundleItems)

    setSaving(false)
    if (itemsError) {
      alert('Error al agregar productos: ' + itemsError.message)
      return
    }
    router.push('/dashboard/combos')
    router.refresh()
  }

  const selectedProducts = items.filter(it => it.product_id).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/combos" className="p-2 rounded-lg transition-colors" style={{color: 'var(--dash-text-secondary)'}}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold" style={{color: 'var(--dash-text-primary)'}}>Nuevo Combo</h2>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[var(--dash-radius-lg)] p-6 space-y-5" style={{background: 'var(--dash-card)', border: '1px solid var(--dash-card-border)'}}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Nombre del Combo *</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Combo Porcelanato Gris + Pegamento"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Precio del Combo ($) *</label>
          <input type="number" required min={0} step="0.01" value={form.bundle_price}
            onChange={e => setForm(f => ({ ...f, bundle_price: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none max-w-[200px]" style={{borderColor: 'var(--dash-input-border)'}}
          />
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{color: 'var(--dash-text-primary)'}}>Productos</label>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1 text-sm font-medium" style={{color: 'var(--dash-gold)'}}>
              <Plus className="w-4 h-4" />
              Agregar producto
            </button>
          </div>
          {selectedProducts === 0 && (
            <p className="text-sm mb-3" style={{color: 'var(--dash-text-muted)'}}>Agregá al menos un producto al combo</p>
          )}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select value={item.product_id}
                  onChange={e => updateItem(idx, 'product_id', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
                >
                  <option value="">Seleccionar producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.category ? ` (${p.category})` : ''}
                    </option>
                  ))}
                </select>
                <label className="text-xs whitespace-nowrap" style={{color: 'var(--dash-text-secondary)'}}>Cant:</label>
                <input type="number" min={0} step="0.5" value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  className="w-20 px-3 py-2 rounded-lg text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            className="rounded" style={{borderColor: 'var(--dash-input-border)', color: 'var(--dash-gold)'}}
          />
          Activo
        </label>

        <div className="pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50" style={{background: 'var(--dash-gold)', color: '#111111'}}
          >
            {saving ? 'Creando...' : 'Crear Combo'}
          </button>
        </div>
      </form>
    </div>
  )
}
