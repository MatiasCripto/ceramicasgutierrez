import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-org'
import { logoutInstance } from '@/lib/evolution/evolution-api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.response

  const instanceName = process.env.EVOLUTION_INSTANCE || 'concierge-wpp'

  try {
    await logoutInstance(instanceName)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[EVO DISCONNECT]', err)
    return NextResponse.json({ ok: true })
  }
}
