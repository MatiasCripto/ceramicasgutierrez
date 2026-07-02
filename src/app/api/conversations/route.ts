import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter')

  let query = sb
    .from('conversations')
    .select(`
      id, channel, status, human_takeover, last_message_at, created_at,
      customer:customers(id, full_name, phone),
      messages:messages(body, created_at)
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)

  if (filter === 'human') {
    query = query.eq('human_takeover', true)
  } else if (filter) {
    query = query.eq('status', filter)
  }

  const { data } = await query

  return NextResponse.json(data ?? [])
}
