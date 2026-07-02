import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit } from '@/lib/utils/rate-limit'

const JOB_SECRET = process.env.JOB_SECRET

const WORKFLOWS: Record<string, (entityType: string, entityId: string) => Promise<string>> = {
  cart_abandonment_24h: async (entityType, entityId) => {
    const sb = createServiceClient()
    const { data: customer } = await sb.from('customers').select('id, full_name, phone').eq('id', entityId).maybeSingle()
    if (!customer) return 'SKIP: customer not found'
    const c = customer as { id: string; full_name: string; phone?: string }
    const { data: cart } = await sb.from('carts').select('id').eq('customer_id', c.id).gte('expires_at', new Date().toISOString()).maybeSingle()
    if (!cart) return 'SKIP: no active cart'
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY ?? '' },
      body: JSON.stringify({
        number: c.phone,
        textMessage: { text: '¡Hola! 😊 Te recordamos que tenés productos en tu carrito esperando. ¿Querés finalizar tu compra?' },
        options: { delay: 1200, presence: 'composing' },
      }),
    })
    return 'cart_abandonment_24h sent'
  },

  post_purchase_7d: async (entityType, entityId) => {
    const sb = createServiceClient()
    const { data: order } = await sb.from('orders')
      .select('id, total, customer:customers(id, full_name, phone)')
      .eq('id', entityId).maybeSingle()
    if (!order) return 'SKIP: order not found'
    const o = order as unknown as { id: string; total: number; customer: { id: string; full_name: string; phone: string } }
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY ?? '' },
      body: JSON.stringify({
        number: o.customer.phone,
        textMessage: { text: `¡Hola ${o.customer.full_name}! 😊 ¿Cómo te quedó tu pedido de $${o.total}? Si necesitás algo más, acá estoy.` },
        options: { delay: 1200, presence: 'composing' },
      }),
    })
    return 'post_purchase sent'
  },

  reengagement_30d: async (entityType, entityId) => {
    const sb = createServiceClient()
    const { data: customer } = await sb.from('customers').select('id, full_name, phone').eq('id', entityId).maybeSingle()
    if (!customer) return 'SKIP: customer not found'
    const c = customer as { full_name: string; phone: string }
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY ?? '' },
      body: JSON.stringify({
        number: c.phone,
        textMessage: { text: `¡Hola ${c.full_name}! 😊 Hace tiempo que no pasás por acá. Tenemos novedades que te pueden interesar. ¿Querés ver?` },
        options: { delay: 1200, presence: 'composing' },
      }),
    })
    return 'reengagement sent'
  },
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!JOB_SECRET) {
    return NextResponse.json({ error: 'Job secret not configured' }, { status: 503 })
  }
  if (auth !== JOB_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workflow, entityType, entityId } = await req.json()
  if (!workflow || !entityType || !entityId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rl = checkRateLimit(`job:${workflow}`, 10, 60_000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many jobs' }, { status: 429 })

  const sb = createServiceClient()
  const { data: existing } = await sb.from('automation_logs')
    .select('id, executed_at')
    .eq('workflow', workflow)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'success')
    .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true, skipped: true })

  const handler = WORKFLOWS[workflow]
  if (!handler) return NextResponse.json({ error: `Unknown workflow: ${workflow}` }, { status: 400 })

  try {
    const result = await handler(entityType, entityId)
    await sb.from('automation_logs').insert({
      workflow,
      entity_type: entityType,
      entity_id: entityId,
      status: 'success',
      payload: { result },
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const errorMsg = String(err)
    await sb.from('automation_logs').insert({
      workflow,
      entity_type: entityType,
      entity_id: entityId,
      status: 'error',
      error: errorMsg,
    })
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 })
  }
}
