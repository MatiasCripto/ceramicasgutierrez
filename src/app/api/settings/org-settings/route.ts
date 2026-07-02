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

    // Get the first/only organization (single-tenant)
    const { data: org } = await sb.from('organizations')
      .select('id, settings')
      .limit(1)
      .single()
    if (!org) return NextResponse.json({ error: 'No organization' }, { status: 500 })

    const currentSettings = (org.settings ?? {}) as Record<string, unknown>

    // Merge new values into settings
    const updatedSettings: Record<string, unknown> = {
      ...currentSettings,
      businessType: businessType ?? currentSettings.businessType,
      salesPromptExtra: salesPromptExtra ?? currentSettings.salesPromptExtra,
    }

    // Remove keys set to empty string (user wants to clear them)
    if (body.businessType === '') delete updatedSettings.businessType
    if (body.salesPromptExtra === '') delete updatedSettings.salesPromptExtra

    await sb.from('organizations')
      .update({ settings: updatedSettings })
      .eq('id', org.id)

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
    const { data: org } = await sb.from('organizations')
      .select('settings')
      .limit(1)
      .single()
    if (!org) return NextResponse.json({ error: 'No organization' }, { status: 500 })

    const settings = (org.settings ?? {}) as Record<string, unknown>
    return NextResponse.json({
      businessType: settings.businessType ?? '',
      salesPromptExtra: settings.salesPromptExtra ?? '',
    })
  } catch (err) {
    console.error('[Org Settings GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
