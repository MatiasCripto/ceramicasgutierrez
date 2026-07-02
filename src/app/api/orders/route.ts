import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth } from '@/lib/auth/require-org'

const ORDER_SELECT = `
  id, customer_id, status, total,
  payment_method, payment_status, shipping_address,
  notes, source, created_at, updated_at,
  customer:customers(full_name, phone, email)
`

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false })

  console.log('[ORDERS GET] error:', error)
  console.log('[ORDERS GET] data:', data)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(Array.isArray(data) ? data : [])
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.response

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createServiceClient()
  const { data, error } = await sb.from('orders').update(updates).eq('id', id).select(ORDER_SELECT).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
