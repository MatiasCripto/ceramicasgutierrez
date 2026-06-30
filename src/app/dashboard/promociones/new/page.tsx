'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ProductOption {
  id: string
  name: string
  category: string | null
}

interface BundleOption {
  id: string
  name: string
}

export default function NewPromocionPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [bundles, setBundles] = useState<BundleOption[]>([])
  const [form, setForm] = useState({
    applies_to: 'product' as 'product' | 'bundle',
    product_id: '',
    bundle_id: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_price',
    discount_value: '',
    starts_at: '',
    ends_at: '',
    active: true,
  })

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [prodRes, bundleRes] = await Promise.all([
        sb.from('products').select('id, name, category').eq('active', true).order('name'),
        sb.from('bundles').select('id, name').eq('active', true).order('name'),
      ])
      setProducts((prodRes.data ?? []) as ProductOption[])
      setBundles((bundleRes.data ?? []) as BundleOption[])
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const sb = createClient()

    const payload: Record<string, unknown> = {
      ...(form.applies_to === 'product'
        ? { product_id: form.product_id, bundle_id: null }
        : { bundle_id: form.bundle_id, product_id: null }),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      active: form.active,
    }

    if (form.applies_to === 'product' && !form.product_id) {
      alert('Seleccioná un producto')
      setSaving(false)
      return
    }
    if (form.applies_to === 'bundle' && !form.bundle_id) {
      alert('Seleccioná un combo')
      setSaving(false)
      return
    }

    const { error } = await sb.from('promotions').insert(payload)

    setSaving(false)
    if (error) {
      alert('Error al crear promoción: ' + error.message)
      return
    }
    router.push('/dashboard/promociones')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/promociones" className="p-2 rounded-lg transition-colors" style={{background: 'var(--dash-row-hover)', color: 'var(--dash-text-secondary)'}}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold" style={{color: 'var(--dash-text-primary)'}}>Nueva Promoción</h2>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[var(--dash-radius-lg)] p-6 space-y-5" style={{background: 'var(--dash-card)', border: '1px solid var(--dash-card-border)'}}>
        {/* Aplica a */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--dash-text-primary)'}}>Aplica a</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="applies_to" checked={form.applies_to === 'product'}
                onChange={() => setForm(f => ({ ...f, applies_to: 'product', product_id: '', bundle_id: '' }))}
                style={{color: 'var(--dash-gold)'}}
              />
              Producto
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="applies_to" checked={form.applies_to === 'bundle'}
                onChange={() => setForm(f => ({ ...f, applies_to: 'bundle', product_id: '', bundle_id: '' }))}
                style={{color: 'var(--dash-gold)'}}
              />
              Combo
            </label>
          </div>
        </div>

        {/* Producto / Combo selector */}
        {form.applies_to === 'product' ? (
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Producto *</label>
            <select required value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{borderColor: 'var(--dash-input-border)'}}
            >
              <option value="">Seleccionar producto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.category ? ` (${p.category})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Combo *</label>
            <select required value={form.bundle_id}
              onChange={e => setForm(f => ({ ...f, bundle_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{borderColor: 'var(--dash-input-border)'}}
            >
              <option value="">Seleccionar combo</option>
              {bundles.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo de descuento */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--dash-text-primary)'}}>Tipo de descuento</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="discount_type" checked={form.discount_type === 'percentage'}
                onChange={() => setForm(f => ({ ...f, discount_type: 'percentage' }))}
                style={{color: 'var(--dash-gold)'}}
              />
              Porcentaje (%)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="discount_type" checked={form.discount_type === 'fixed_price'}
                onChange={() => setForm(f => ({ ...f, discount_type: 'fixed_price' }))}
                style={{color: 'var(--dash-gold)'}}
              />
              Precio fijo ($)
            </label>
          </div>
        </div>

        {/* Valor */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>
            {form.discount_type === 'percentage' ? 'Porcentaje de descuento' : 'Monto de descuento ($)'} *
          </label>
          <input type="number" required min={0} step={form.discount_type === 'percentage' ? '1' : '0.01'}
            value={form.discount_value}
            onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
            placeholder={form.discount_type === 'percentage' ? 'Ej: 15' : 'Ej: 5000'}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none max-w-[200px]"
            style={{borderColor: 'var(--dash-input-border)'}}
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Desde *</label>
            <input type="datetime-local" required value={form.starts_at}
              onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Hasta *</label>
            <input type="datetime-local" required value={form.ends_at}
              onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            className="rounded border"
            style={{borderColor: 'var(--dash-input-border)', color: 'var(--dash-gold)'}}
          />
          Activa
        </label>

        <div className="pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{background: 'var(--dash-gold)', color: '#111111'}}
          >
            {saving ? 'Creando...' : 'Crear Promoción'}
          </button>
        </div>
      </form>
    </div>
  )
}
