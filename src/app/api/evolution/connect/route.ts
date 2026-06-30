import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-org'
import {
  ensureInstance,
  getQrCode,
  deleteInstance,
  createInstance,
  fetchInstances,
  setWebhook,
} from '@/lib/evolution/evolution-api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.response

  const instanceName = process.env.EVOLUTION_INSTANCE || 'ceramicas-gutierrez'
  const webhookHost = process.env.WEBHOOK_BASE_URL || req.nextUrl.host
  const protocol = webhookHost.includes('host.docker.internal') || webhookHost.startsWith('localhost') ? 'http' : req.nextUrl.protocol.replace(':', '')
  const webhookUrl = `${protocol}://${webhookHost}/api/webhooks/whatsapp`

  try {
    // 1) First check if instance already exists in Evolution API
    const instances = await fetchInstances()
    const existing = instances.find((i: any) => i.name === instanceName)

    if (!existing) {
      // Instance doesn't exist — create it fresh
      console.log('[EVO CONNECT] creating new instance:', instanceName)
      const createRes = await createInstance(instanceName, webhookUrl)
      const freshQr = createRes?.qrcode?.base64 ?? null
      if (freshQr) {
        return NextResponse.json({ base64: freshQr, state: 'connecting' })
      }
      // QR may come from connect endpoint immediately after creation
      const qrAfterCreate = await getQrCode(instanceName)
      if (qrAfterCreate) {
        return NextResponse.json({ base64: qrAfterCreate, state: 'connecting' })
      }
      return NextResponse.json({ state: 'connecting' })
    }

    // Ensure webhook URL is up to date for existing instances
    await setWebhook(instanceName, webhookUrl)

    // 2) Instance exists — check state
    const result = await ensureInstance(instanceName, webhookUrl)
    if (result.qrBase64) {
      return NextResponse.json({ base64: result.qrBase64, state: 'connecting' })
    }

    const currentState = result.state?.state

    // Already connected — nothing to do
    if (currentState === 'open') {
      return NextResponse.json({ connected: true })
    }

    // 3) Not open and not connected — try to regenerate QR via connect endpoint
    console.log('[EVO CONNECT] reconnecting instance, current state:', currentState)
    const qr = await getQrCode(instanceName)
    if (qr) {
      return NextResponse.json({ base64: qr, state: 'connecting' })
    }

    // 4) Still no QR — try one more fresh connect attempt
    console.log('[EVO CONNECT] second connect attempt for state:', currentState)
    const qr2 = await getQrCode(instanceName)
    if (qr2) {
      return NextResponse.json({ base64: qr2, state: 'connecting' })
    }

    // 5) If everything failed, delete and recreate as last resort
    console.log('[EVO CONNECT] deleting and recreating instance as last resort')
    await deleteInstance(instanceName)
    await new Promise(r => setTimeout(r, 1000))
    const createRes = await createInstance(instanceName, webhookUrl)
    const freshQr = createRes?.qrcode?.base64 ?? null
    return NextResponse.json({ base64: freshQr, state: 'connecting' })
  } catch (err) {
    console.error('[EVO CONNECT]', err)
    return NextResponse.json({ error: 'Error al conectar con Evolution API' }, { status: 500 })
  }
}
