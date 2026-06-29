// ── Commerce Product Retrieval — Cerámicas Gutiérrez ──────────
// Búsqueda directa sobre la tabla products (sin RPC ni multi-tenant).
// Atributos: categoría, color, tamaño, terminación, marca.

import { createServiceClient } from '@/lib/supabase/service'
import { extractKeywords } from '@/lib/bot/intent-classifier'
import type { CeramicProduct, Bundle, Promotion } from '@/lib/types/commerce.types'

export interface ProductSearchResult extends CeramicProduct {
  bundles?: Bundle[]
  activePromotion?: Promotion | null
}

interface RetrievalOptions {
  limit?: number
  categoryFilter?: string
  inStock?: boolean
}

export async function retrieveProducts(
  query: string,
  options: RetrievalOptions = {}
): Promise<ProductSearchResult[]> {
  const keywords = extractKeywords(query)
  const limit = options.limit ?? 5

  if (keywords.length === 0 && !options.categoryFilter) return []

  const sb = createServiceClient()

  let dbQuery = sb
    .from('products')
    .select('*')
    .eq('active', true)

  // Category filter
  const ceramicCategories = ['piso', 'pared', 'bano', 'exterior', 'pegamento', 'pastina']
  const mentionedCategory = ceramicCategories.find(cat =>
    query.toLowerCase().includes(cat)
  ) ?? options.categoryFilter

  if (mentionedCategory) {
    dbQuery = dbQuery.eq('category', mentionedCategory)
  }

  // Text search across multiple fields
  if (keywords.length > 0) {
    const tsquery = keywords
      .filter(k => k.length >= 2)
      .map(k => `${k}:*`)
      .join(' & ')

    if (tsquery) {
      dbQuery = dbQuery.textSearch('search_vector', tsquery, { config: 'spanish' })
    } else {
      // Fallback: ILIKE on name and color
      const conditions = keywords.filter(k => k.length >= 2)
      for (const kw of conditions) {
        dbQuery = dbQuery.or(
          `name.ilike.%${kw}%,color.ilike.%${kw}%,description.ilike.%${kw}%,brand.ilike.%${kw}%`
        )
      }
    }
  }

  const { data: products, error } = await dbQuery
    .order('name')
    .limit(limit)

  if (error || !products) return []

  // Enrich with bundles and promotions
  const enriched = await Promise.all(
    (products as CeramicProduct[]).map(p => enrichProduct(p))
  )

  if (options.inStock) {
    return enriched.filter(p => {
      if (p.category === 'pegamento' || p.category === 'pastina') {
        return (p.stock_units ?? 0) > 0
      }
      return (p.stock_m2 ?? 0) > 0
    })
  }

  return enriched
}

export async function getProductDetail(
  productId: string
): Promise<ProductSearchResult | null> {
  const sb = createServiceClient()

  const { data: product } = await sb
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle()

  if (!product) return null

  return enrichProduct(product as CeramicProduct)
}

async function enrichProduct(product: CeramicProduct): Promise<ProductSearchResult> {
  const sb = createServiceClient()
  const result: ProductSearchResult = { ...product }

  // Fetch associated bundles
  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('bundle_id, quantity, bundles!inner(id, name, bundle_price, active)')
    .eq('product_id', product.id)

  if (bundleItems && bundleItems.length > 0) {
    const bundleMap = new Map<string, Bundle>()
    for (const bi of bundleItems) {
      const bData = bi.bundles as unknown as { id: string; name: string; bundle_price: number; active: boolean }
      if (!bData.active) continue
      if (!bundleMap.has(bData.id)) {
        bundleMap.set(bData.id, {
          id: bData.id,
          name: bData.name,
          bundle_price: bData.bundle_price,
          active: true,
          items: [],
        })
      }
      bundleMap.get(bData.id)!.items.push({
        product_id: product.id,
        quantity: bi.quantity,
      })
    }
    result.bundles = [...bundleMap.values()]
  }

  // Fetch active promotion
  const { data: promo } = await sb
    .from('active_promotions')
    .select('*')
    .eq('product_id', product.id)
    .maybeSingle()

  if (promo) {
    result.activePromotion = promo as Promotion
  }

  return result
}

// ── Cálculos específicos de cerámicos ─────────────────────────

export function calcM2ToBoxes(m2: number, m2PerBox: number): number {
  if (!m2PerBox || m2PerBox <= 0) return 0
  return Math.ceil(m2 / m2PerBox)
}

export function calcPriceWithPromotion(
  basePrice: number,
  promotion: Promotion | null | undefined
): { finalPrice: number; discountLabel: string | null } {
  if (!promotion) return { finalPrice: basePrice, discountLabel: null }

  if (promotion.discount_type === 'percentage') {
    const discount = basePrice * (promotion.discount_value / 100)
    return {
      finalPrice: basePrice - discount,
      discountLabel: `${promotion.discount_value}% OFF`,
    }
  }

  // fixed_price — el precio se reemplaza
  return {
    finalPrice: promotion.discount_value,
    discountLabel: `Precio promocional: $${promotion.discount_value}`,
  }
}

export function estimateTotalM2(
  length: number,
  width: number
): number {
  return length * width
}

export function calcWaste(m2: number, wastePercent: number = 10): number {
  return m2 * (1 + wastePercent / 100)
}
