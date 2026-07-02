import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/bot/order-service'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'status es requerido' }, { status: 400 })
    }

    const ok = await updateOrderStatus(id, status)

    if (!ok) {
      return NextResponse.json({ error: 'Transición de estado no válida' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
