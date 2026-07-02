import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { data: products } = await sb
    .from('products')
    .select(`
      id, name, description, price, images, brand,
      active, featured_on_landing, created_at
    `)
    .order('created_at', { ascending: false })

  return NextResponse.json(products ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, category, size, color, finish, brand, price_per_m2, price_per_unit, m2_per_box, stock_m2, stock_units, images, active, featured_on_landing } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const sb = createServiceClient()
  const { data, error } = await sb.from('products').insert({
    name, description, category, size, color, finish, brand,
    price_per_m2, price_per_unit, m2_per_box, stock_m2, stock_units,
    images: images ?? [],
    active: active ?? true,
    featured_on_landing: featured_on_landing ?? false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createServiceClient()
  const { data, error } = await sb.from('products').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createServiceClient()
  const { error } = await sb.from('products').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
