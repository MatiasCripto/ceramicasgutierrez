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
    const { bank_name, account_holder, alias, cvu, payment_method, currency, priority, instructions, is_default } = body
    if (!bank_name || !account_holder) {
      return NextResponse.json({ error: 'bank_name and account_holder are required' }, { status: 400 })
    }

    const sb = createServiceClient()

    // Deactivate any existing active accounts
    const { error: deactivateErr } = await sb.from('payment_accounts')
      .update({ is_active: false })
      .eq('is_active', true)
    if (deactivateErr) {
      console.error('[PAYMENT-ACCOUNTS POST] deactivate error:', deactivateErr)
      return NextResponse.json({ error: deactivateErr.message }, { status: 500 })
    }

    // Build payload with only columns that exist in both schema versions
    // Common columns: bank_name, account_holder, alias, cvu, is_active, priority
    // Extra columns (may not exist): payment_method, currency, is_default, instructions
    const payload: Record<string, unknown> = {
      bank_name,
      account_holder,
      alias: alias ?? null,
      cvu: cvu ?? null,
      is_active: true,
      priority: priority ?? 0,
    }
    // Only include extra columns if the schema supports them (the payment_method field
    // is always sent, so we try with it first; if it fails we'll fall back)
    if (payment_method !== undefined) payload.payment_method = payment_method
    if (currency !== undefined) payload.currency = currency
    if (instructions !== undefined) payload.instructions = instructions
    if (is_default !== undefined) payload.is_default = is_default

    // Check if row exists by bank_name + account_holder (no updated_at — doesn't exist in schema)
    const { data: existing, error: existingErr } = await sb.from('payment_accounts')
      .select('id')
      .eq('bank_name', bank_name)
      .eq('account_holder', account_holder)
      .maybeSingle()
    if (existingErr) console.error('[PAYMENT-ACCOUNTS POST] existing check:', existingErr)

    let result; let lastError
    if (existing) {
      const { data, error } = await sb.from('payment_accounts').update(payload).eq('id', existing.id).select('*').single()
      result = data; lastError = error
    } else {
      const { data, error } = await sb.from('payment_accounts').insert(payload).select('*').single()
      result = data; lastError = error
    }

    if (lastError) {
      console.error('[PAYMENT-ACCOUNTS POST] upsert error:', JSON.stringify(lastError))
      // If the error is about a missing column, retry without extra columns
      if (lastError.message?.includes('does not exist') || lastError.code === 'PGRST204') {
        console.log('[PAYMENT-ACCOUNTS POST] retrying with only base columns')
        const minimal = { bank_name, account_holder, alias: alias ?? null, cvu: cvu ?? null, is_active: true, priority: priority ?? 0 }
        if (existing) {
          const { data, error: retryErr } = await sb.from('payment_accounts').update(minimal).eq('id', existing.id).select('*').single()
          if (retryErr) {
            console.error('[PAYMENT-ACCOUNTS POST] retry also failed:', retryErr)
            return NextResponse.json({ error: retryErr.message }, { status: 500 })
          }
          result = data
        } else {
          const { data, error: retryErr } = await sb.from('payment_accounts').insert(minimal).select('*').single()
          if (retryErr) {
            console.error('[PAYMENT-ACCOUNTS POST] retry also failed:', retryErr)
            return NextResponse.json({ error: retryErr.message }, { status: 500 })
          }
          result = data
        }
      } else {
        return NextResponse.json({ error: lastError.message }, { status: 500 })
      }
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

    const sb = createServiceClient()
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
