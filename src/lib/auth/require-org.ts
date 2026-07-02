import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type AuthSuccess = { authorized: true; userId: string }
type AuthFailure = { authorized: false; response: NextResponse }
export type AuthResult = AuthSuccess | AuthFailure

/**
 * Lightweight auth check: verifies the user has a valid Supabase session.
 * Single-tenant: no organization check, just "is this user logged in?"
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !anonKey) {
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Supabase not configured' }, { status: 500 }),
      }
    }
    const cookieClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() { /* read-only */ },
      },
    })
    const { data: { user }, error } = await cookieClient.auth.getUser()
    if (error || !user) {
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }
    return { authorized: true, userId: user.id }
  } catch (err) {
    console.error('[AUTH] requireAuth error:', err)
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Authentication failed' }, { status: 500 }),
    }
  }
}
