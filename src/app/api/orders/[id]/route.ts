import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sb = createServiceClient()

  const { data: order, error } = await sb.from('orders').select('*').eq('id', id).single()
  if (error || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { data: events } = await sb.from('order_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ order, events: events ?? [] })
}
