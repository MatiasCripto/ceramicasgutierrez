import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { encrypt, decrypt, isEncrypted } from '@/lib/crypto/encryption'

export async function GET() {
  try {
    const sb = createServiceClient()
    const { data } = await sb.from('app_settings').select('value').eq('key', 'ai_config').maybeSingle()
    const ai = data?.value as { provider?: string; apiKey?: string; model?: string } | null

    const rawKey = ai?.apiKey ? decrypt(ai.apiKey) : ''
    return NextResponse.json({
      provider: ai?.provider ?? '',
      apiKey: rawKey ? '••••' + rawKey.slice(-4) : '',
      model: ai?.model ?? '',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json()
    if (!provider || !apiKey) return NextResponse.json({ error: 'provider and apiKey required' }, { status: 400 })

    const finalKey = isEncrypted(apiKey) ? apiKey : encrypt(apiKey)

    const sb = createServiceClient()
    await sb.from('app_settings').upsert({
      key: 'ai_config',
      value: { provider, apiKey: finalKey, model: model || 'deepseek-chat' },
    }, { onConflict: 'key' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
