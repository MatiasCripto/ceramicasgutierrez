// ── Payment Account Service ───────────────────────────────────
// Business logic for selecting the best payment account.
// Single-tenant: sin orgId.

import { getActiveAccounts } from '@/lib/repositories/payment-account.repository'
import type { PaymentAccount } from '@/lib/types'

export interface AccountSelectionOptions {
  paymentMethod?: string
  currency?: string
}

export async function chooseBestAccount(
  sb: any,
  options?: AccountSelectionOptions,
): Promise<PaymentAccount | null> {
  const accounts = await getActiveAccounts(sb)
  if (!accounts.length) return null

  const { paymentMethod, currency } = options ?? {}

  if (paymentMethod && currency) {
    const match = accounts.find(a =>
      a.payment_method === paymentMethod && a.currency === currency
    )
    if (match) return match
  }

  if (paymentMethod) {
    const match = accounts.find(a => a.payment_method === paymentMethod)
    if (match) return match
  }

  if (currency) {
    const match = accounts.find(a => a.currency === currency)
    if (match) return match
  }

  const defaultAccount = accounts.find(a => a.is_default)
  if (defaultAccount) return defaultAccount

  return accounts[0]
}

export function formatAccountMessage(account: PaymentAccount): string {
  const lines: string[] = ['Perfecto 😊\n', 'Te paso los datos para realizar la transferencia:\n']

  if (account.bank_name) lines.push(`🏦 Banco: ${account.bank_name}`)
  if (account.account_holder) lines.push(`👤 Titular: ${account.account_holder}`)
  if (account.alias) lines.push(`🔑 Alias: ${account.alias}`)
  if (account.cvu) lines.push(`💳 CVU: ${account.cvu}`)
  if (account.instructions) lines.push(`\n📝 ${account.instructions}`)

  lines.push('\nCuando realices el pago enviame el comprobante por acá 📸')

  return lines.join('\n')
}
