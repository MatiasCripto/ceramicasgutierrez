'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'piso', label: 'Piso' },
  { value: 'pared', label: 'Pared' },
  { value: 'bano', label: 'Baño' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'pegamento', label: 'Pegamento' },
  { value: 'pastina', label: 'Pastina' },
]

const FINISHES = [
  { value: 'mate', label: 'Mate' },
  { value: 'brillante', label: 'Brillante' },
  { value: 'rectificado', label: 'Rectificado' },
]

export default function NewProductPage() {
  const router = useRouter()
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

    const { error } = await sb.from('products').insert(payload)

    setSaving(false)
    if (error) {
      alert('Error al crear: ' + error.message)
      return
    }
    router.push('/dashboard/products')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/products" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Nuevo Producto</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description} rows={3}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Categoría + Marca */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input type="text" value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Medida + Color + Terminación */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medida</label>
            <input type="text" value={form.size} placeholder="60x60"
              onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input type="text" value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terminación</label>
            <select value={form.finish}
              onChange={e => setForm(f => ({ ...f, finish: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {FINISHES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* Precios */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio por m² ($)</label>
            <input type="number" min={0} step="0.01" value={form.price_per_m2}
              onChange={e => setForm(f => ({ ...f, price_per_m2: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio por unidad ($)</label>
            <input type="number" min={0} step="0.01" value={form.price_per_unit}
              onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* m² por caja + Stock */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">m² por caja</label>
            <input type="number" min={0} step="0.01" value={form.m2_per_box}
              onChange={e => setForm(f => ({ ...f, m2_per_box: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock (m²)</label>
            <input type="number" min={0} step="0.01" value={form.stock_m2}
              onChange={e => setForm(f => ({ ...f, stock_m2: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock (unidades)</label>
            <input type="number" min={0} step="1" value={form.stock_units}
              onChange={e => setForm(f => ({ ...f, stock_units: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Atributos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atributos <span className="text-gray-400 font-normal">(separados por coma)</span>
          </label>
          <input type="text" value={form.attributes}
            onChange={e => setForm(f => ({ ...f, attributes: e.target.value }))}
            placeholder="antideslizante, alto tránsito, interior"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Imágenes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
          <div className="flex flex-wrap gap-3">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors text-gray-400">
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

        {/* Toggles */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Activo
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.featured_on_landing}
              onChange={e => setForm(f => ({ ...f, featured_on_landing: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Destacado en landing
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
