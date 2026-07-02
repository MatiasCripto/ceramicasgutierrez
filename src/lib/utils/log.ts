/**
 * Structured logging helper.
 * Every log line includes conversation_id and timestamp ISO.
 * Single-tenant: sin orgId ni storeId.
 */

type LogMeta = {
  conversationId?: string | null
  phone?: string | null
  [key: string]: unknown
}

function iso(): string {
  return new Date().toISOString()
}

function prefix(tag: string): string {
  return `[${tag}]`
}

export function logInfo(tag: string, message: string, meta?: LogMeta) {
  const base = { ts: iso(), ...meta }
  console.log(prefix(tag), message, JSON.stringify(base))
}

export function logWarn(tag: string, message: string, meta?: LogMeta) {
  const base = { ts: iso(), ...meta }
  console.warn(prefix(tag), message, JSON.stringify(base))
}

export function logError(tag: string, message: string, err?: unknown, meta?: LogMeta) {
  const base = {
    ts: iso(),
    error: err instanceof Error ? err.message : String(err ?? ''),
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('; ') : undefined,
    ...meta,
  }
  console.error(prefix(tag), message, JSON.stringify(base))
}
