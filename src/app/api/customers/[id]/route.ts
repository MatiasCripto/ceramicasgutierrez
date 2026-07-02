import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sb = createServiceClient()

  const { data: customer, error } = await sb.from('customers').select('*').eq('id', id).single()
  if (error || !customer) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const { data: orders } = await sb
    .from('orders')
    .select('*')
    .eq('customer_phone', customer.phone)
    .order('created_at', { ascending: false })

  return NextResponse.json({ customer, orders: orders ?? [] })
}
