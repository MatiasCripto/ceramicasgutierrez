import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth } from '@/lib/auth/require-org'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const { orgName, storeName, whatsappNumber, evolutionInstance, logoUrl } = await req.json()
    const sb = createServiceClient()

    // Get the first/only organization (single-tenant)
    const { data: org } = await sb.from('organizations').select('id').limit(1).single()
    if (!org) return NextResponse.json({ error: 'No organization' }, { status: 500 })
    const orgId = org.id

    // Find the store by organization
    let storeId: string | null = null
    if (evolutionInstance) {
      const { data } = await sb.from('stores').select('id').eq('evolution_instance', evolutionInstance).eq('organization_id', orgId).maybeSingle()
      if (data) storeId = data.id
    } else {
      const { data } = await sb.from('stores').select('id').eq('organization_id', orgId).limit(1).maybeSingle()
      if (data) storeId = data.id
    }
    if (!storeId) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }

    if (orgName) {
      await sb.from('organizations').update({ name: orgName }).eq('id', orgId)
    }
    const updates: Record<string, string | null> = {}
    if (storeName) updates.name = storeName
    if (whatsappNumber !== undefined) updates.whatsapp_number = whatsappNumber
    if (evolutionInstance !== undefined) updates.evolution_instance = evolutionInstance
    if (logoUrl !== undefined) updates.logo_url = logoUrl
    if (Object.keys(updates).length > 0) {
      await sb.from('stores').update(updates).eq('id', storeId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Settings Store API]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
