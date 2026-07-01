// ── Evolution message poll endpoint ──────────────────────────
// Triggers one cycle of polling the Evolution PostgreSQL database
// for new incoming messages and forwarding them to the webhook.
// Also starts automatic background polling on first access.

import { NextResponse } from 'next/server'
import { pollNewMessages, syncLastProcessedId } from '@/lib/evolution/message-poller'

let initialized = false
let pollInterval: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL_MS = 10_000 // 10 seconds

async function pollCycle() {
  try {
    if (!initialized) {
      await syncLastProcessedId()
      initialized = true
    }
    const result = await pollNewMessages()
    if (result.found > 0) {
      console.log(`[AUTO_POLLER] cycle: ${result.processed}/${result.found} processed, ${result.errors} errors`)
    }
  } catch (err) {
    console.error('[AUTO_POLLER] cycle error:', err)
  }
}

function startAutoPolling() {
  if (pollInterval) return
  // Do an initial sync
  syncLastProcessedId().then(() => { initialized = true })
  // Start polling in the background
  pollInterval = setInterval(pollCycle, POLL_INTERVAL_MS)
  console.log(`[AUTO_POLLER] started, polling every ${POLL_INTERVAL_MS / 1000}s`)
}

function stopAutoPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    console.log('[AUTO_POLLER] stopped')
  }
}

// Start auto-polling when the module is loaded
if (typeof globalThis !== 'undefined') {
  // Use a flag to avoid starting multiple intervals in dev (HMR)
  if (!(globalThis as any).__pollerStarted) {
    ;(globalThis as any).__pollerStarted = true
    startAutoPolling()
  }
}

export async function GET() {
  try {
    const result = await pollNewMessages()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[POLL_ROUTE] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST() {
  // Manual trigger: re-sync and poll
  try {
    await syncLastProcessedId()
    initialized = true
    const result = await pollNewMessages()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[POLL_ROUTE] POST error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
