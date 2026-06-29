'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface ProductOption {
  id: string
  name: string
}

interface BundleItemRow {
  product_id: string
  quantity: string
}

export default function EditComboPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [form, setForm] = useState({ name: '', bundle_price: '', active: true })
  const [items, setItems] = useState<BundleItemRow[]>([])

  useEffect(() => {
    if (!params.id) return
    async function load() {
      const sb = createClient()
      const [bundleRes, itemsRes, prodRes] = await Promise.all([
        sb.from('bundles').select('*').eq('id', params.id as string).single(),
        sb.from('bundle_items').select('product_id, quantity').eq('bundle_id', params.id as string),
        sb.from('products').select('id, name').eq('active', true).order('name'),
      ])
      const bundle = bundleRes.data
      if (bundle) {
        setForm({
          name: bundle.name ?? '',
          bundle_price: bundle.bundle_price != null ? String(bundle.bundle_price) : '',
          active: bundle.active ?? true,
        })
      }
      setItems(
        ((itemsRes.data ?? []) as { product_id: string; quantity: number }[]).map(it => ({
          product_id: it.product_id,
          quantity: String(it.quantity),
        }))
      )
      setProducts((prodRes.data ?? []) as ProductOption[])
      setLoading(false)
    }
    load()
  }, [params.id])

  function addItem() {
    setItems(prev => [...prev, { product_id: '', quantity: '1' }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: 'product_id' | 'quantity', value: string) {
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

    const { error } = await sb.from('bundles').update({
      name: form.name,
      bundle_price: Number(form.bundle_price),
      active: form.active,
    }).eq('id', params.id as string)

    if (error) {
      setSaving(false)
      alert('Error al guardar: ' + error.message)
      return
    }

    // Replace items: delete all, re-insert
    await sb.from('bundle_items').delete().eq('bundle_id', params.id as string)

    const bundleItems = validItems.map(it => ({
      bundle_id: params.id as string,
      product_id: it.product_id,
      quantity: Number(it.quantity) || 1,
    }))
    await sb.from('bundle_items').insert(bundleItems)

    setSaving(false)
    router.push('/dashboard/combos')
    router.refresh()
  }

  if (loading) return <div className="text-sm text-gray-500">Cargando...</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/combos" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Editar Combo</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Combo *</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Productos</label>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium">
              <Plus className="w-4 h-4" />Agregar producto
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select value={item.product_id}
                  onChange={e => updateItem(idx, 'product_id', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <label className="text-xs text-gray-500">Cant:</label>
                <input type="number" min={0} step="0.5" value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none"
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-2 text-red-400 hover:text-red-600">
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

        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href="/dashboard/combos"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
