import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth } from '@/lib/auth/require-org'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const sb = createServiceClient()
    const { data, error } = await sb.from('payment_accounts')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    if (error) console.log('[GET_ERR]', error?.message || error)

    return NextResponse.json(data ?? null)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const body = await req.json()
    const { bank_name, account_holder, alias, cvu, payment_method, currency, priority, instructions, is_default } = body
    if (!bank_name || !account_holder) {
      return NextResponse.json({ error: 'bank_name and account_holder are required' }, { status: 400 })
    }

    const sb = createServiceClient()

    // Deactivate any existing active accounts
    await sb.from('payment_accounts')
      .update({ is_active: false })
      .eq('is_active', true)

    // Upsert the new account
    const { data: existing, error: existingError } = await sb.from('payment_accounts')
      .select('id')
      .eq('bank_name', bank_name)
      .eq('account_holder', account_holder)
      .maybeSingle()
    if (existingError) console.log('[SAVE_ERR] existing check failed:', existingError)

    let result; let lastError
    if (existing) {
      const { data, error } = await sb.from('payment_accounts').update({
        alias: alias ?? null,
        cvu: cvu ?? null,
        payment_method: payment_method ?? 'transfer',
        currency: currency ?? 'ARS',
        priority: priority ?? 0,
        instructions: instructions ?? null,
        is_default: is_default ?? false,
        is_active: true,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id).select('*').single()
      result = data; lastError = error
    } else {
      const { data, error } = await sb.from('payment_accounts').insert({
        bank_name,
        account_holder,
        alias: alias ?? null,
        cvu: cvu ?? null,
        payment_method: payment_method ?? 'transfer',
        currency: currency ?? 'ARS',
        priority: priority ?? 0,
        instructions: instructions ?? null,
        is_default: is_default ?? false,
        is_active: true,
      }).select('*').single()
      result = data; lastError = error
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const sb = createServiceClient()
    await sb.from('payment_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
