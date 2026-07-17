'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'sanitario', label: 'Sanitarios' },
  { value: 'simil_madera', label: 'Símil Madera' },
  { value: 'pulido', label: 'Pulido y Rectificado' },
  { value: 'piso', label: 'Piso' },
  { value: 'pared', label: 'Pared' },
  { value: 'bano', label: 'Baño' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'griferia', label: 'Grifería' },
  { value: 'vanitory', label: 'Vanitory' },
  { value: 'pegamento', label: 'Pegamento' },
  { value: 'pastina', label: 'Pastina' },
]

const FINISHES = [
  { value: 'mate', label: 'Mate' },
  { value: 'brillante', label: 'Brillante' },
  { value: 'rectificado', label: 'Rectificado' },
]

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    size: '',
    color: '',
    finish: '',
    brand: '',
    price_per_m2: '',
    price_per_unit: '',
    m2_per_box: '',
    stock_m2: '0',
    stock_units: '0',
    attributes: '',
    active: true,
    featured_on_landing: false,
  })

  useEffect(() => {
    if (!params.id) return
    async function load() {
      try {
        const sb = createClient()
        const { data } = await sb.from('products').select('*').eq('id', params.id as string).single()
        if (data) {
          setForm({
            name: data.name ?? '',
            description: data.description ?? '',
            category: data.category ?? '',
            size: data.size ?? '',
            color: data.color ?? '',
            finish: data.finish ?? '',
            brand: data.brand ?? '',
            price_per_m2: data.price_per_m2 != null ? String(data.price_per_m2) : '',
            price_per_unit: data.price_per_unit != null ? String(data.price_per_unit) : '',
            m2_per_box: data.m2_per_box != null ? String(data.m2_per_box) : '',
            stock_m2: data.stock_m2 != null ? String(data.stock_m2) : '0',
            stock_units: data.stock_units != null ? String(data.stock_units) : '0',
            attributes: Array.isArray(data.attributes) ? data.attributes.join(', ') : '',
            active: data.active ?? true,
            featured_on_landing: data.featured_on_landing ?? false,
          })
          setImageUrls(data.images ?? [])
        }
      } catch {
        // dev mode
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const sb = createClient()
      const ext = file.name.split('.').pop()
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await sb.storage.from('product_images').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) { alert('Error al subir: ' + uploadError.message); return }
      const { data: urlData } = sb.storage.from('product_images').getPublicUrl(path)
      setImageUrls(prev => [...prev, urlData.publicUrl])
    } catch { alert('Error al subir imagen') }
    setUploading(false)
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImageUrls(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const sb = createClient()

    const tags = form.attributes
      ? form.attributes.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      size: form.size || null,
      color: form.color || null,
      finish: form.finish || null,
      brand: form.brand || null,
      price_per_m2: form.price_per_m2 ? Number(form.price_per_m2) : null,
      price_per_unit: form.price_per_unit ? Number(form.price_per_unit) : null,
      m2_per_box: form.m2_per_box ? Number(form.m2_per_box) : null,
      stock_m2: Number(form.stock_m2) || 0,
      stock_units: Number(form.stock_units) || 0,
      images: imageUrls,
      attributes: tags,
      featured_on_landing: form.featured_on_landing,
      active: form.active,
    }

    const { error } = await sb.from('products').update(payload).eq('id', params.id as string)

    setSaving(false)
    if (error) {
      alert('Error al guardar: ' + error.message)
      return
    }
    router.push('/dashboard/products')
    router.refresh()
  }

  if (loading) {
    return <div className="text-sm" style={{color: 'var(--dash-text-secondary)'}}>Cargando...</div>
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/products" className="p-2 rounded-lg hover:bg-[var(--dash-row-hover)] transition-colors" style={{color: 'var(--dash-text-secondary)'}}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold" style={{color: 'var(--dash-text-primary)'}}>Editar Producto</h2>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[var(--dash-radius-lg)] p-6 space-y-5" style={{background: 'var(--dash-card)', border: '1px solid var(--dash-card-border)'}}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Nombre *</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Descripción</label>
          <textarea value={form.description} rows={3}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none" style={{borderColor: 'var(--dash-input-border)'}}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Categoría</label>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            >
              <option value="">Seleccionar</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Marca</label>
            <input type="text" value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Medida</label>
            <input type="text" value={form.size} placeholder="60x60"
              onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Color</label>
            <input type="text" value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Terminación</label>
            <select value={form.finish}
              onChange={e => setForm(f => ({ ...f, finish: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            >
              <option value="">—</option>
              {FINISHES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Precio por m² ($)</label>
            <input type="number" min={0} step="0.01" value={form.price_per_m2}
              onChange={e => setForm(f => ({ ...f, price_per_m2: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Precio por unidad ($)</label>
            <input type="number" min={0} step="0.01" value={form.price_per_unit}
              onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>m² por caja</label>
            <input type="number" min={0} step="0.01" value={form.m2_per_box}
              onChange={e => setForm(f => ({ ...f, m2_per_box: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Stock (m²)</label>
            <input type="number" min={0} step="0.01" value={form.stock_m2}
              onChange={e => setForm(f => ({ ...f, stock_m2: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>Stock (unidades)</label>
            <input type="number" min={0} step="1" value={form.stock_units}
              onChange={e => setForm(f => ({ ...f, stock_units: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--dash-text-primary)'}}>
            Atributos <span className="font-normal" style={{color: 'var(--dash-text-muted)'}}>(separados por coma)</span>
          </label>
          <input type="text" value={form.attributes}
            onChange={e => setForm(f => ({ ...f, attributes: e.target.value }))}
            placeholder="antideslizante, alto tránsito, interior"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{borderColor: 'var(--dash-input-border)'}}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--dash-text-primary)'}}>Imágenes</label>
          <div className="flex flex-wrap gap-3">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border" style={{borderColor: 'var(--dash-card-border)'}}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed cursor-pointer hover:bg-[var(--dash-row-hover)] transition-colors" style={{borderColor: 'var(--dash-input-border)', color: 'var(--dash-text-muted)'}}>
              {uploading ? (
                <span className="text-xs">Subiendo...</span>
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded" style={{borderColor: 'var(--dash-input-border)', color: 'var(--dash-gold)'}}
            />
            Activo
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.featured_on_landing}
              onChange={e => setForm(f => ({ ...f, featured_on_landing: e.target.checked }))}
              className="rounded" style={{borderColor: 'var(--dash-input-border)', color: 'var(--dash-gold)'}}
            />
            Destacado en landing
          </label>
        </div>

        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-[var(--dash-gold)] text-sm font-medium rounded-lg hover:bg-[var(--dash-gold-hover)] transition-colors disabled:opacity-50" style={{color: '#111111'}}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href="/dashboard/products"
            className="px-6 py-2.5 border text-sm font-medium rounded-lg hover:bg-[var(--dash-row-hover)] transition-colors" style={{borderColor: 'var(--dash-input-border)', color: 'var(--dash-text-primary)'}}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
