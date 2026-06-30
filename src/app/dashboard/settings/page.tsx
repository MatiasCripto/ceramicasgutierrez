'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Cpu, Smartphone, Save } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // AI config
  const [aiProvider, setAiProvider] = useState('deepseek')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('deepseek-chat')

  // WhatsApp settings (evolution instance only — number is the instance JID)
  const [evolutionInstance, setEvolutionInstance] = useState('')

  useEffect(() => {
    async function load() {
      const sb = createClient()
      // Load AI config
      const { data: aiData } = await sb.from('app_settings').select('value').eq('key', 'ai_config').maybeSingle()
      if (aiData?.value) {
        const ai = aiData.value as { provider?: string; apiKey?: string; model?: string }
        if (ai.provider) setAiProvider(ai.provider)
        if (ai.apiKey) setAiApiKey(ai.apiKey)
        if (ai.model) setAiModel(ai.model)
      }
      // Load WhatsApp config
      const { data: waData } = await sb.from('app_settings').select('value').eq('key', 'whatsapp_settings').maybeSingle()
      if (waData?.value) {
        const wa = waData.value as { evolution_instance?: string }
        if (wa.evolution_instance) setEvolutionInstance(wa.evolution_instance)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const sb = createClient()

    // Save AI config — encrypt only if not already encrypted
    const isApiKeyDirty = aiApiKey && !aiApiKey.includes('••••')
    if (isApiKeyDirty) {
      await fetch('/api/settings/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, apiKey: aiApiKey, model: aiModel }),
      })
    } else if (aiProvider || aiModel) {
      await sb.from('app_settings').upsert({
        key: 'ai_config',
        value: { provider: aiProvider, apiKey: aiApiKey, model: aiModel },
      }, { onConflict: 'key' })
    }

    // Save WhatsApp settings
    await sb.from('app_settings').upsert({
      key: 'whatsapp_settings',
      value: { evolution_instance: evolutionInstance || null },
    }, { onConflict: 'key' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="w-6 h-6 rounded-full animate-spin mx-auto" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium text-white"
          style={{ background: 'var(--brand)' }}>General</span>
        <a href="/dashboard/settings/payments" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Pagos</a>
        <a href="/dashboard/settings/agent" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Agente</a>
        <a href="/dashboard/settings/billing" className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Facturación</a>
      </div>

      <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Configuración</h1>

      {/* WhatsApp */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>WhatsApp</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Configuración de la instancia de Evolution API. El número de WhatsApp se gestiona desde la
          conexión vía QR en la página de WhatsApp.
        </p>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            <Smartphone size={12} /> Instancia de Evolution
          </label>
          <input
            type="text"
            value={evolutionInstance}
            onChange={e => setEvolutionInstance(e.target.value)}
            placeholder="concierge"
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
            Nombre de la instancia en Evolution API. Por defecto: &quot;concierge&quot;
          </p>
        </div>
      </div>

      {/* AI Agent */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Agente de IA</h2>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            <Cpu size={12} /> Proveedor
          </label>
          <select
            value={aiProvider}
            onChange={e => setAiProvider(e.target.value)}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="groq">Groq</option>
            <option value="google">Google Gemini</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            <Cpu size={12} /> API Key
          </label>
          <input
            type="password"
            value={aiApiKey}
            onChange={e => setAiApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            <Cpu size={12} /> Modelo
          </label>
          <input
            type="text"
            value={aiModel}
            onChange={e => setAiModel(e.target.value)}
            placeholder="deepseek-chat"
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm bg-transparent outline-none transition-colors focus:border-[var(--brand)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
            Ej: gpt-4o, claude-sonnet-4-20250514, deepseek-chat, gemini-2.0-flash, llama-3.3-70b-versatile
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--brand)' }}
      >
        <Save size={16} />
        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Cambios'}
      </button>
    </div>
  )
}
