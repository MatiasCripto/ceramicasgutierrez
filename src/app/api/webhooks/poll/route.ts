// ── Evolution message poll endpoint ──────────────────────────
// Solo se activa cuando se llama explicitamente a GET o POST.
// No hay auto-arranque para evitar ECONNREFUSED en produccion
// (la DB de Evolution corre dentro de Docker sin puerto expuesto).

import { NextResponse } from 'next/server'
import { pollNewMessages, syncLastProcessedId } from '@/lib/evolution/message-poller'

export async function GET() {
  try {
    const result = await pollNewMessages()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[POLL_ROUTE] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST() {
  try {
    await syncLastProcessedId()
    const result = await pollNewMessages()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[POLL_ROUTE] POST error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
