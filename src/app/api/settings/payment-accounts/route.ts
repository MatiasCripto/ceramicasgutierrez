import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireAuth } from '@/lib/auth/require-org'

function createCookieClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() { /* read-only */ },
      },
    },
  )
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const sb = createCookieClient(req)
    const { data, error } = await sb.from('payment_accounts')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    if (error) console.error('[PAYMENT-ACCOUNTS GET] error:', error)

    return NextResponse.json(data ?? null)
  } catch (err) {
    console.error('[PAYMENT-ACCOUNTS GET] exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const body = await req.json()
    const { bank_name, account_holder, alias, cvu } = body
    if (!bank_name || !account_holder) {
      return NextResponse.json({ error: 'bank_name and account_holder are required' }, { status: 400 })
    }

    const sb = createCookieClient(req)

    // Deactivate any existing active accounts
    const { error: deactivateErr } = await sb.from('payment_accounts')
      .update({ is_active: false })
      .eq('is_active', true)
    if (deactivateErr) {
      console.error('[PAYMENT-ACCOUNTS POST] deactivate error:', deactivateErr)
      return NextResponse.json({ error: deactivateErr.message }, { status: 500 })
    }

    // Only use columns that exist in the actual DB schema
    const payload = {
      bank_name,
      account_holder,
      alias: alias ?? null,
      cvu: cvu ?? null,
      is_active: true,
    }

    // Upsert by bank_name + account_holder
    const { data: existing, error: existingErr } = await sb.from('payment_accounts')
      .select('id')
      .eq('bank_name', bank_name)
      .eq('account_holder', account_holder)
      .maybeSingle()
    if (existingErr) console.error('[PAYMENT-ACCOUNTS POST] existing check:', existingErr)

    let result; let lastError
    if (existing) {
      const { data, error } = await sb.from('payment_accounts').update(payload).eq('id', existing.id).select('*').maybeSingle()
      result = data; lastError = error
    } else {
      const { data, error } = await sb.from('payment_accounts').insert(payload).select('*').maybeSingle()
      result = data; lastError = error
    }

    if (lastError) {
      console.error('[PAYMENT-ACCOUNTS POST] upsert error:', JSON.stringify(lastError))
      return NextResponse.json({ error: lastError.message }, { status: 500 })
    }

    console.log('[PAYMENT-ACCOUNTS POST] success:', result?.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[PAYMENT-ACCOUNTS POST] exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.response

    const sb = createCookieClient(req)
    const { error } = await sb.from('payment_accounts')
      .update({ is_active: false })
      .eq('is_active', true)

    if (error) {
      console.error('[PAYMENT-ACCOUNTS DELETE] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PAYMENT-ACCOUNTS DELETE] exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
