// ── WhatsApp webhook payload validators ──────────────────────
// Evolution API does NOT send HMAC signatures in webhook headers.
// Signature verification is entirely OPTIONAL — only enforced when
// BOTH WEBHOOK_SECRET is set AND x-evolution-signature header is present.
// Rate limiting and payload parsing are always enforced.

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import type { EvolutionWebhookPayload, EvolutionMessageData } from '@/lib/types/whatsapp.types'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export interface ValidatedPayload {
  payload: EvolutionWebhookPayload
  rawBody: string
  phone: string
  text: string
  pushName?: string
  msgId?: string
}

/**
 * HMAC-SHA256 verification of Evolution API webhook payload.
 *
 * Evolution API does NOT send HMAC signatures, so this is entirely OPTIONAL.
 * - If WEBHOOK_SECRET is unset or placeholder → skip (always allowed)
 * - If WEBHOOK_SECRET is set AND x-evolution-signature header is present → verify
 * - If WEBHOOK_SECRET is set AND header is missing → warn but allow
 * - If header is present but invalid → reject (catches config issues)
 */
function verifySignature(rawBody: string, signatureHeader: string | null): { ok: boolean; reason?: string } {
  // WEBHOOK_SECRET not configured → skip signature check entirely
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'placeholder') {
    return { ok: true }
  }

  // Missing signature header — Evolution API doesn't send one, so allow
  if (!signatureHeader) {
    console.warn('[WEBHOOK] missing x-evolution-signature header — allowing request (Evolution API does not sign webhooks)')
    return { ok: true }
  }

  // Header IS present → verify it
  try {
    const expected = createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
    const match = expected === signatureHeader
    if (!match) {
      return { ok: false, reason: 'HMAC signature mismatch' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: `HMAC verification error: ${err}` }
  }
}

export async function validateWebhookPayload(req: NextRequest): Promise<
  { ok: true; data: ValidatedPayload } | { ok: false; response: NextResponse }
> {
  // 1. Read raw body for HMAC
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Cannot read body' }, { status: 400 }) }
  }

  // 2. Verify HMAC signature
  const sigResult = verifySignature(rawBody, req.headers.get('x-evolution-signature'))
  if (!sigResult.ok) {
    console.warn('[WEBHOOK] HMAC verification failed:', sigResult.reason)
    return { ok: false, response: NextResponse.json({ error: 'Invalid signature' }, { status: 401 }) }
  }

  // 3. Parse JSON payload
  let payload: EvolutionWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }

  // 4. Filter events (case-insensitive: Evolution API may send "messages.upsert" or "MESSAGES_UPSERT")
  const eventMatch = payload.event?.toLowerCase() === 'messages.upsert'
  if (!eventMatch) {
    console.log('[WEBHOOK] skipping event type:', payload.event, '(expected messages.upsert)')
    return { ok: false, response: NextResponse.json({ ok: true }) }
  }

  const data = payload.data as EvolutionMessageData
  if (data.key?.fromMe) {
    console.log('[WEBHOOK] skipping own message (fromMe=true)')
    return { ok: false, response: NextResponse.json({ ok: true }) }
  }

  // 5. Extract phone and text
  // Handle @lid JID format (LinkedIn Device ID) by falling back to top-level sender field
  let jid = data.key?.remoteJid ?? ''
  let phone = jid.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '').replace(/@lid$/, '')
  // If @lid format produced no extractable number, use the top-level sender field
  if (!phone || jid.endsWith('@lid')) {
    const senderJid = (payload as any).sender ?? ''
    phone = senderJid.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '') || phone
    if (senderJid) jid = senderJid // prefer sender JID for downstream use
  }
  const text = data.message?.conversation || data.message?.extendedTextMessage?.text || ''
  const pushName = data.pushName
  const msgId = data.key?.id

  if (!phone || !text) {
    console.log('[WEBHOOK] skip: no phone or text', { phone, hasText: !!text })
    return { ok: false, response: NextResponse.json({ ok: true }) }
  }

  // 6. Rate limit: 30 messages per minute per phone
  const rateCheck = checkRateLimit(`webhook:${phone}`, 30, 60_000)
  if (!rateCheck.allowed) {
    console.warn('[WEBHOOK] rate limit exceeded for', phone)
    return { ok: false, response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }

  return {
    ok: true,
    data: { payload, rawBody, phone, text, pushName, msgId },
  }
}
