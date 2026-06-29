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
        <Link href="/dashboard/combos" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Nuevo Combo</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Combo *</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Combo Porcelanato Gris + Pegamento"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio del Combo ($) *</label>
          <input type="number" required min={0} step="0.01" value={form.bundle_price}
            onChange={e => setForm(f => ({ ...f, bundle_price: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[200px]"
          />
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Productos</label>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium">
              <Plus className="w-4 h-4" />
              Agregar producto
            </button>
          </div>
          {selectedProducts === 0 && (
            <p className="text-sm text-gray-400 mb-3">Agregá al menos un producto al combo</p>
          )}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select value={item.product_id}
                  onChange={e => updateItem(idx, 'product_id', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.category ? ` (${p.category})` : ''}
                    </option>
                  ))}
                </select>
                <label className="text-xs text-gray-500 whitespace-nowrap">Cant:</label>
                <input type="number" min={0} step="0.5" value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          Activo
        </label>

        <div className="pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear Combo'}
          </button>
        </div>
      </form>
    </div>
  )
}
