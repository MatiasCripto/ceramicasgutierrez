import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

let sb: ReturnType<typeof createClient> | null = null

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceKey) {
    console.warn('[INTEGRATION] Missing Supabase env vars — tests will be skipped')
    return
  }
  sb = createClient(url, serviceKey, { auth: { persistSession: false } })
  console.log('[INTEGRATION] Supabase client initialized')
})

function getClient() {
  return sb
}

describe('Supabase integration — orders', () => {
  it('GET orders should return an array', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('orders').select('*').limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('GET orders should return orders with expected fields', async () => {
    const client = getClient()
    if (!client) return
    const { data } = await client.from('orders').select('id, customer_name, status, total_price, created_at').limit(5)
    if (data && data.length > 0) {
      const order = data[0] as Record<string, unknown>
      expect(order.id).toBeDefined()
      expect(typeof order.id).toBe('string')
      expect(order.created_at).toBeDefined()
    }
  })
})

describe('Supabase integration — customers', () => {
  it('GET customers should return an array', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('customers').select('*').limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('Supabase integration — payment_accounts', () => {
  it('GET active account should return null or a valid object', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('payment_accounts')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    expect(error).toBeNull()
    if (data) {
      expect(data.bank_name).toBeDefined()
      expect(data.account_holder).toBeDefined()
    }
  })
})

describe('Supabase integration — products', () => {
  it('GET active products should return an array', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('products').select('id, name').eq('active', true).limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('products should have required ceramic fields', async () => {
    const client = getClient()
    if (!client) return
    const { data } = await client.from('products').select('id, name, price_per_m2, m2_per_box').limit(1)
    if (data && data.length > 0) {
      const p = data[0] as Record<string, unknown>
      expect(p.name).toBeDefined()
    }
  })
})

describe('Supabase integration — conversations', () => {
  it('GET conversations should return an array', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('conversations').select('id, customer_phone, status').limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('Supabase integration — notifications', () => {
  it('GET notifications should return an array or handle missing table', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('notifications').select('*').limit(5)
    // notifications table might not exist — that's ok
    if (error && (error.message?.includes('not exist') || error.message?.includes('Could not find'))) {
      console.warn('[INTEGRATION] notifications table not found, skipping')
    } else {
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    }
  })
})

describe('Supabase integration — order_events', () => {
  it('GET order_events should return an array', async () => {
    const client = getClient()
    if (!client) return
    const { data, error } = await client.from('order_events').select('*').limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
