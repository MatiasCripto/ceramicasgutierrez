// ── Payment Settings Service — Single-Tenant ───────────────────
// Lee la cuenta bancaria activa de mayor prioridad desde payment_accounts.
// La IA NUNCA genera datos de pago — este servicio los obtiene de la DB.

export type ResolvedPaymentData = {
  bank_name: string
  account_holder: string
  alias: string | null
  cvu: string | null
  source: 'payment_accounts'
}

/**
 * Obtiene la cuenta bancaria activa de mayor prioridad.
 * Single-tenant: consulta directa a payment_accounts sin organization_id.
 */
export async function getStorePaymentSettings(sb: any): Promise<ResolvedPaymentData | null> {
  console.log('[PAYMENT_SETTINGS] looking up best active account by priority')

  try {
    const { data } = await sb.from('payment_accounts')
      .select('bank_name, account_holder, alias, cvu')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      console.log('[PAYMENT_SETTINGS] no active account found')
      return null
    }

    console.log('[PAYMENT_SETTINGS] account found:', data.bank_name)
    return {
      bank_name: data.bank_name,
      account_holder: data.account_holder,
      alias: data.alias,
      cvu: data.cvu,
      source: 'payment_accounts',
    }
  } catch (err) {
    console.error('[PAYMENT_SETTINGS] error:', err)
    return null
  }
}

/**
 * Formatea los datos de pago en un mensaje legible para WhatsApp.
 * Función pura — sin efectos secundarios.
 */
export function formatPaymentSettings(settings: ResolvedPaymentData): string {
  const lines: string[] = ['Perfecto 😊\n', 'Te paso los datos para realizar la transferencia:\n']

  if (settings.bank_name) lines.push(`🏦 Banco: ${settings.bank_name}`)
  if (settings.account_holder) lines.push(`👤 Titular: ${settings.account_holder}`)
  if (settings.alias) lines.push(`🔑 Alias: ${settings.alias}`)
  if (settings.cvu) lines.push(`💳 CVU: ${settings.cvu}`)

  lines.push('\nCuando realices el pago enviame el comprobante por acá 📸')

  return lines.join('\n')
}
