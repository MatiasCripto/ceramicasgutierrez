import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth } from '@/lib/auth/require-org'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const body = await req.json()
    const { businessType, salesPromptExtra } = body
    const sb = createServiceClient()

    // Read current settings from app_settings (single-tenant)
    const { data: existing } = await sb.from('app_settings')
      .select('value')
      .eq('key', 'org_settings')
      .maybeSingle()

    const currentSettings = (existing?.value ?? {}) as Record<string, unknown>

    // Merge new values
    const updatedSettings: Record<string, unknown> = {
      ...currentSettings,
      businessType: businessType ?? currentSettings.businessType,
      salesPromptExtra: salesPromptExtra ?? currentSettings.salesPromptExtra,
    }

    if (body.businessType === '') delete updatedSettings.businessType
    if (body.salesPromptExtra === '') delete updatedSettings.salesPromptExtra

    await sb.from('app_settings').upsert({
      key: 'org_settings',
      value: updatedSettings,
    }, { onConflict: 'key' })

    return NextResponse.json({ ok: true, settings: updatedSettings })
  } catch (err) {
    console.error('[Org Settings API]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const sb = createServiceClient()
    const { data } = await sb.from('app_settings')
      .select('value')
      .eq('key', 'org_settings')
      .maybeSingle()

    const settings = (data?.value ?? {}) as Record<string, unknown>
    return NextResponse.json({
      businessType: settings.businessType ?? '',
      salesPromptExtra: settings.salesPromptExtra ?? '',
    })
  } catch (err) {
    console.error('[Org Settings GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
