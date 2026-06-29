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
      // Call API route for encryption (uses service_role)
      await fetch('/api/settings/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, apiKey: aiApiKey, model: aiModel }),
      })
    } else if (aiProvider || aiModel) {
      // Only provider/model changed, upsert with existing (already encrypted) key
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
        <div className="w-6 h-6 border border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      {/* WhatsApp */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-sm">WhatsApp</h2>
        </div>
        <p className="text-xs text-gray-500">
          Configuración de la instancia de Evolution API. El número de WhatsApp se gestiona desde la
          conexión vía QR en la página de WhatsApp.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instancia de Evolution</label>
          <input
            type="text"
            value={evolutionInstance}
            onChange={e => setEvolutionInstance(e.target.value)}
            placeholder="concierge"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Nombre de la instancia en Evolution API. Por defecto: &quot;concierge&quot;
          </p>
        </div>
      </div>

      {/* AI Agent */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-sm">Agente de IA</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <select
            value={aiProvider}
            onChange={e => setAiProvider(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="groq">Groq</option>
            <option value="google">Google Gemini</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={aiApiKey}
            onChange={e => setAiApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <input
            type="text"
            value={aiModel}
            onChange={e => setAiModel(e.target.value)}
            placeholder="deepseek-chat"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Ej: gpt-4o, claude-sonnet-4-20250514, deepseek-chat, gemini-2.0-flash, llama-3.3-70b-versatile
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Cambios'}
      </button>
    </div>
  )
}
