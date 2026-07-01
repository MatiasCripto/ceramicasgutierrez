// ── Evolution API message poller ──────────────────────────────
// Polls the Evolution PostgreSQL database for new incoming WhatsApp
// messages and forwards them to the webhook handler.
// This is a workaround for Evolution API v2.3.7's broken webhook.

import { Pool } from 'pg'

const EVO_DB_URL = process.env.EVOLUTION_DATABASE_URL || 'postgresql://evolution:evolution_pass@localhost:5433/evolution'
const WEBHOOK_URL = process.env.WEBHOOK_POLL_TARGET || 'http://localhost:3010/api/webhooks/whatsapp'
const INSTANCE_ID = process.env.EVOLUTION_INSTANCE_DB_ID || 'fd2a1693-da10-44d7-ac92-ce059f392248'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: EVO_DB_URL, max: 1 })
  }
  return pool
}

// Track last processed message ID
let lastProcessedId: string | null = null

export function setLastProcessedId(id: string | null) {
  lastProcessedId = id
}

export function getLastProcessedId(): string | null {
  return lastProcessedId
}

export interface PollResult {
  found: number
  processed: number
  errors: number
  lastId: string | null
}

/**
 * Find the latest processed message ID by looking at the most recent
 * incoming message in the Evolution Message table.
 */
export async function syncLastProcessedId(): Promise<string | null> {
  const client = getPool()
  try {
    const { rows } = await client.query(
      `SELECT id FROM public."Message"
       WHERE "instanceId" = $1
         AND key->>'fromMe' = 'false'
         AND (message->>'conversation' IS NOT NULL AND message->>'conversation' != '')
       ORDER BY "messageTimestamp" DESC
       LIMIT 1`,
      [INSTANCE_ID]
    )
    if (rows.length > 0) {
      lastProcessedId = rows[0].id
      console.log('[POLLER] synced lastProcessedId:', lastProcessedId)
    }
    return lastProcessedId
  } catch (err) {
    console.error('[POLLER] syncLastProcessedId error:', err)
    return lastProcessedId
  }
}

/**
 * Poll for new incoming messages from the Evolution DB and forward
 * them to the webhook handler via HTTP POST.
 */
export async function pollNewMessages(): Promise<PollResult> {
  const client = getPool()
  const result: PollResult = { found: 0, processed: 0, errors: 0, lastId: null }

  try {
    // Query for unprocessed incoming text messages
    const query = lastProcessedId
      ? `SELECT id, key, "pushName", message, "messageType", "messageTimestamp"
         FROM public."Message"
         WHERE "instanceId" = $1
           AND key->>'fromMe' = 'false'
           AND id > $2
           AND (message->>'conversation' IS NOT NULL AND message->>'conversation' != '')
         ORDER BY "messageTimestamp" ASC
         LIMIT 20`
      : `SELECT id, key, "pushName", message, "messageType", "messageTimestamp"
         FROM public."Message"
         WHERE "instanceId" = $1
           AND key->>'fromMe' = 'false'
           AND (message->>'conversation' IS NOT NULL AND message->>'conversation' != '')
         ORDER BY "messageTimestamp" ASC
         LIMIT 20`

    const params = lastProcessedId ? [INSTANCE_ID, lastProcessedId] : [INSTANCE_ID]
    const { rows } = await client.query(query, params)

    result.found = rows.length
    if (rows.length === 0) return result

    console.log('[POLLER] found', rows.length, 'new message(s)')

    for (const row of rows) {
      try {
        // Construct an Evolution-style webhook payload
        const remoteJid = row.key?.remoteJid || ''
        const conversationText = row.message?.conversation || ''
        const phone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '')

        if (!phone || !conversationText) {
          console.log('[POLLER] skip row', row.id, ': no phone or text')
          lastProcessedId = row.id
          result.lastId = row.id
          continue
        }

        const payload = {
          event: 'messages.upsert',
          instance: process.env.EVOLUTION_INSTANCE || 'ceramicas-gutierrez',
          data: {
            key: {
              remoteJid,
              fromMe: false,
              id: row.key?.id || row.id,
            },
            pushName: row.pushName || '',
            message: {
              conversation: conversationText,
            },
            messageType: row.messageType || 'conversation',
            messageTimestamp: row.messageTimestamp || Math.floor(Date.now() / 1000),
          },
        }

        // Forward to the webhook handler via HTTP POST
        console.log('[POLLER] forwarding msg from', phone, 'text:', conversationText.slice(0, 60))
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          result.processed++
          lastProcessedId = row.id
          result.lastId = row.id
          console.log('[POLLER] processed:', row.id)
        } else {
          const text = await response.text()
          console.error('[POLLER] webhook returned', response.status, 'for', row.id, ':', text.slice(0, 200))
          result.errors++
          // Still advance cursor to avoid infinite retry of bad messages
          lastProcessedId = row.id
          result.lastId = row.id
        }
      } catch (err) {
        console.error('[POLLER] error processing', row.id, ':', err)
        result.errors++
        lastProcessedId = row.id
        result.lastId = row.id
      }
    }

    return result
  } catch (err) {
    console.error('[POLLER] query error:', err)
    return result
  }
}
