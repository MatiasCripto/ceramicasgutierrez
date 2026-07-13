import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'

interface ActivePromotion {
  id: string
  product_id: string | null
  bundle_id: string | null
  discount_type: 'percentage' | 'fixed_price'
  discount_value: number
  ends_at: string
}

export default async function PromoBanner() {
  const supabase = await createClient()

  const { data: promos } = await supabase
    .from('active_promotions')
    .select('id, product_id, bundle_id, discount_type, discount_value, ends_at')
    .order('ends_at', { ascending: true })
    .limit(1)

  const promo = (promos ?? [])[0] as ActivePromotion | undefined
  if (!promo) return null

  const discountLabel =
    promo.discount_type === 'percentage'
      ? `${promo.discount_value}% OFF`
      : `${formatCurrency(promo.discount_value)} de descuento`

  const endsIn = () => {
    const diff = new Date(promo.ends_at).getTime() - Date.now()
    if (diff <= 0) return null
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 0) return `¡Válido por ${days} día${days !== 1 ? 's' : ''} más!`
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `¡Solo por ${hours} hora${hours !== 1 ? 's' : ''} más!`
  }

  return (
    <a
      href="/promociones"
      className="block w-full bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white py-3 px-6 text-center transition-all duration-300 hover:from-red-800 hover:via-red-700 hover:to-red-800"
      aria-label="Ver promociones activas"
    >
      <span className="inline-flex items-center gap-3 text-sm tracking-[0.08em] uppercase font-light">
        <span className="inline-block px-2 py-0.5 bg-white/20 text-[10px] tracking-[0.15em] uppercase font-medium rounded-sm">
          {discountLabel}
        </span>
        <span className="hidden sm:inline">|</span>
        <span>Promoción activa — {endsIn() || 'No te lo pierdas'}</span>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </span>
    </a>
  )
}
