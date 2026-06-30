'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Save, Upload, X, FileText } from 'lucide-react'
import Link from 'next/link'

export default function BillingSettingsPage() {
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<'idle' | 'success' | 'error'>('idle')

  const [businessName, setBusinessName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await sb.from('business_info').select('*').limit(1).maybeSingle()
        if (data) {
          setBusinessName(data.business_name ?? '')
          setTaxId(data.tax_id ?? '')
          setAddress(data.address ?? '')
          setPhone(data.phone ?? '')
          setEmail(data.email ?? '')
          setLogoUrl(data.logo_url ?? '')
        }
      } catch { /* dev mode */ }
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await sb.storage.from('business-assets').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) { alert('Error al subir logo: ' + uploadError.message); return }
      const { data: urlData } = sb.storage.from('business-assets').getPublicUrl(path)
      setLogoUrl(urlData.publicUrl)
    } catch { alert('Error al subir imagen') }
    setUploading(false)
    e.target.value = ''
  }

  function removeLogo() {
    setLogoUrl('')
  }

  async function handleSave() {
    setSaving(true)
    setSaved('idle')
    try {
      const { error } = await sb.from('business_info').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        business_name: businessName || null,
        tax_id: taxId || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      if (error) {
        setSaved('error')
      } else {
        setSaved('success')
        setTimeout(() => setSaved('idle'), 3000)
      }
    } catch {
      setSaved('error')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <a href="/settings" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>General</a>
          <a href="/settings/payments" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Pagos</a>
          <a href="/settings/agent" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Agente</a>
          <span className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium text-white"
            style={{ background: 'var(--brand)' }}>Facturación</span>
        </div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Sub-nav */}
      <div className="flex items-center gap-2 mb-2">
        <a href="/settings" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>General</a>
        <a href="/settings/payments" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Pagos</a>
        <a href="/settings/agent" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Agente</a>
        <span className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium text-white"
          style={{ background: 'var(--brand)' }}>Facturación</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center"
          style={{ background: 'var(--brand-subtle)', color: 'var(--brand)' }}>
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Datos de facturación</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Estos datos aparecerán en el encabezado de todos los presupuestos y comprobantes que generes.
          </p>
        </div>
      </div>

      {saved === 'success' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-medium"
          style={{ background: '#f0fdf4', color: '#065f46' }}>
          <Save size={14} />
          Datos guardados correctamente
        </div>
      )}

      <div className="card p-6 space-y-5">
        {/* Logo uploader */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Logo del negocio</label>
          {logoUrl ? (
            <div className="relative inline-block">
              <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-[var(--radius-md)] border"
                style={{ borderColor: 'var(--border)' }} />
              <button onClick={removeLogo}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-24 h-24 rounded-[var(--radius-md)] border-2 border-dashed cursor-pointer transition-colors hover:opacity-70"
              style={{ borderColor: 'var(--border)' }}>
              {uploading ? (
                <div className="w-5 h-5 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <Upload size={20} style={{ color: 'var(--muted)' }} />
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload}
                className="hidden" />
            </label>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
            PNG, JPG o WebP. Se mostrará en el PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              <Building2 size={12} /> Razón social
            </label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
              placeholder="Cerámicas Gutiérrez SRL"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              <FileText size={12} /> CUIT / CUIL
            </label>
            <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)}
              placeholder="30-12345678-9"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              <Building2 size={12} /> Dirección
            </label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Av. Siempre Viva 123"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              <FileText size={12} /> Teléfono
            </label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+54 11 1234-5678"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              <FileText size={12} /> Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="info@ceramicasgutierrez.com"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand)' }}>
            <Save size={15} />
            {saving ? 'Guardando...' : saved === 'success' ? 'Guardado' : 'Guardar'}
          </button>
        </div>

        {saved === 'error' && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#dc2626' }}>
            Error al guardar. Intentá de nuevo.
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-md)] p-4 text-xs space-y-2"
        style={{ background: 'var(--surface-2)' }}>
        <p className="font-medium">¿Para qué sirve?</p>
        <p style={{ color: 'var(--muted)' }}>
          Estos datos aparecen en el encabezado de todos los presupuestos y comprobantes que generes desde{' '}
          <Link href="/dashboard/documents" className="underline">Documentos</Link>.
          Completalos una sola vez y se aplicarán automáticamente.
        </p>
      </div>
    </div>
  )
}
