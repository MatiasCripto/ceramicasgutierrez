// ── Commerce Brain — Cerámicas Gutiérrez ─────────────────────
// Orquestador principal simplificado para single-tenant cerámico.
// Flujo: mensaje → intención → búsqueda → contexto → respuesta.

import { classifyIntent } from '@/lib/bot/intent-classifier'
import { retrieveProducts, getProductDetail } from './retrieval'
import { buildCommerceContext, buildPromptForAI } from './context'
import type { CommerceContext } from '@/lib/types/commerce.types'
import type { BotContext } from '@/lib/types/whatsapp.types'

export async function processCommerceMessage(
  message: string,
  ctx: BotContext
): Promise<{
  response: string
  newContext: Record<string, any>
  action?: { type: string; payload: Record<string, unknown> }
}> {
  const intent = classifyIntent(message)

  switch (intent) {
    case 'search_products':
    case 'catalog': {
      const results = await retrieveProducts(message, { limit: 5, inStock: true })

      if (results.length === 0) {
        return {
          response: 'No encontré productos que coincidan con tu búsqueda. ¿Querés que te muestre las categorías que tenemos?',
          newContext: { lastSearch: message, searchResults: [] },
        }
      }

      // Check if any result has associated bundles
      const bundles = results.flatMap(r => r.bundles ?? []).filter((b, i, a) =>
        a.findIndex(bb => bb.id === b.id) === i
      )

      const commerceCtx: CommerceContext = {
        products: results,
        bundles: bundles.length > 0 ? bundles : undefined,
        state: 'search_products',
      }

      return {
        response: buildPromptForAI('search', commerceCtx, message),
        newContext: { lastSearch: message, searchResults: results },
        action: { type: 'search_products', payload: { count: results.length } },
      }
    }

    case 'get_product': {
      // Check if the message references a product from a previous search
      const prevResults = (ctx.searchResults ?? []) as any[]
      if (prevResults.length > 0) {
        const lowerMsg = message.toLowerCase()
        const matched = prevResults.find((p: any) =>
          lowerMsg.includes(p.name.toLowerCase())
        )

        if (matched) {
          const detail = await getProductDetail(matched.id)
          if (!detail) {
            return { response: 'No pude encontrar los detalles de ese producto.', newContext: {} }
          }

          const commerceCtx: CommerceContext = {
            products: [detail],
            bundles: detail.bundles,
            state: 'product_detail',
          }

          return {
            response: buildPromptForAI('product_detail', commerceCtx, message),
            newContext: {},
          }
        }
      }

      // No previous context — search fresh
      const results = await retrieveProducts(message, { limit: 1 })
      if (results.length === 0) {
        return { response: '¿Sobre qué producto querés saber más? Decime el nombre.', newContext: {} }
      }

      const commerceCtx: CommerceContext = {
        products: results,
        bundles: results[0]?.bundles,
        state: 'product_detail',
      }

      return {
        response: buildPromptForAI('product_detail', commerceCtx, message),
        newContext: {},
      }
    }

    case 'checkout': {
      return {
        response: 'Para finalizar tu pedido, necesito que me confirmes: ¿qué producto querés, cuántos m² necesitás, y tu dirección?',
        newContext: {},
        action: { type: 'checkout', payload: {} },
      }
    }

    case 'human_handoff': {
      return {
        response: 'Te paso con un asesor para ayudarte mejor. En un momento te atiende.',
        newContext: {},
        action: { type: 'human_handoff', payload: {} },
      }
    }

    default: {
      // Unknown intent — try a general product search
      const results = await retrieveProducts(message, { limit: 3, inStock: true })
      if (results.length > 0) {
        const commerceCtx: CommerceContext = {
          products: results,
          state: ctx.state as string ?? 'general',
        }
        return {
          response: buildPromptForAI('general', commerceCtx, message),
          newContext: { searchResults: results },
        }
      }

      return {
        response: '¿En qué puedo ayudarte? Puedo contarte sobre nuestros productos, darte precios, o ayudarte a calcular cuántas cajas necesitás.',
        newContext: {},
      }
    }
  }
}
