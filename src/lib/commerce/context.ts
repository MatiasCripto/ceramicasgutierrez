// ── Commerce Context Builder — Cerámicas Gutiérrez ───────────
// Construye el contexto para la IA con datos de cerámicos.

import type { CommerceContext } from '@/lib/types/commerce.types'

export function buildCommerceContext(data: CommerceContext): string {
  let ctx = ''

  if (data.products && data.products.length > 0) {
    ctx += '--- PRODUCTOS DISPONIBLES ---\n'
    data.products.forEach((p) => {
      let line = `- ${p.name}`
      if (p.category) line += ` | ${p.category}`
      if (p.size) line += ` | ${p.size}`
      if (p.color) line += ` | ${p.color}`
      if (p.finish) line += ` | ${p.finish}`
      if (p.brand) line += ` | ${p.brand}`

      if (p.price_per_m2) {
        line += ` | $${p.price_per_m2}/m²`
        if (p.m2_per_box) line += ` | ${p.m2_per_box}m² por caja`
      }
      if (p.price_per_unit) {
        line += ` | $${p.price_per_unit}/unidad`
      }
      if (p.attributes && p.attributes.length > 0) {
        line += ` | [${p.attributes.join(', ')}]`
      }

      ctx += line + '\n'
    })
  }

  if (data.bundles && data.bundles.length > 0) {
    ctx += '\n--- COMBOS DISPONIBLES ---\n'
    data.bundles.forEach((b) => {
      ctx += `- ${b.name}: $${b.bundle_price}\n`
    })
  }

  if (data.activePromotion) {
    const p = data.activePromotion
    ctx += `\n--- PROMOCIÓN VIGENTE ---\n`
    ctx += `${p.discount_type === 'percentage' ? `${p.discount_value}% OFF` : `Precio fijo: $${p.discount_value}`}\n`
  }

  if (data.customer) {
    ctx += `\n--- CLIENTE ---\n`
    ctx += `Nombre: ${data.customer.name}\n`
    ctx += `Compras anteriores: ${data.customer.totalOrders}\n`
  }

  return ctx
}

export function buildPromptForAI(
  mode: string,
  ctx: CommerceContext,
  userMessage: string
): string {
  const parts: string[] = []
  parts.push(buildCommerceContext(ctx))

  if (mode === 'search' && ctx.products && ctx.products.length > 0 && ctx.bundles && ctx.bundles.length > 0) {
    parts.push('Cuando recomiendes un producto que tenga un combo asociado, ofrecé el combo como upsell (ej: "¿Querés que te cotice también con pegamento y pastina?").')
  } else if (mode === 'product_detail' && ctx.products && ctx.products.length === 1) {
    const p = ctx.products[0]
    parts.push(`Respondé con el detalle completo de "${p.name}" — categoría, medidas, color, terminación, precio.`)
    parts.push(`Si el producto tiene m2_per_box, ofrecete a calcular cuántas cajas necesita según los m² del ambiente.`)
  }

  parts.push('')
  parts.push(`Mensaje del cliente: "${userMessage}"`)
  return parts.join('\n')
}
