'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import AnimatedSection from '@/components/AnimatedSection'
import { formatCurrency } from '@/lib/utils/formatters'

interface Product {
  id: string
  name: string
  price_per_m2: number | null
  price_per_unit: number | null
  images: string[]
  size: string | null
  color: string | null
  finish: string | null
  category: string | null
}

interface BundleItem {
  product_id: string
  quantity: number
  product_name: string
}

interface Bundle {
  id: string
  name: string
  bundle_price: number | null
  items: BundleItem[]
}

interface Promotion {
  id: string
  product_id: string | null
  bundle_id: string | null
  discount_type: 'percentage' | 'fixed_price'
  discount_value: number
  starts_at: string
  ends_at: string
  product: Product | null
  bundle: Bundle | null
}

function getTimeRemaining(endsAt: string): string {
  const now = Date.now()
  const end = new Date(endsAt).getTime()
  const diff = end - now
  if (diff <= 0) return 'Finalizada'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `Termina en ${days} día${days !== 1 ? 's' : ''}`
  }
  if (hours > 0) {
    return `Termina en ${hours} hora${hours !== 1 ? 's' : ''}`
  }
  return 'Termina en menos de 1 hora'
}

function calculateDiscountedPrice(
  originalPrice: number,
  discountType: 'percentage' | 'fixed_price',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return originalPrice * (1 - discountValue / 100)
  }
  return originalPrice - discountValue
}

export default function PromocionesPage() {
  const supabase = createClient()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPromotions() {
      try {
        // Fetch active promotions from the view
        const { data: promoData, error: promoError } = await supabase
          .from('active_promotions')
          .select('*')
          .order('ends_at', { ascending: true })

        if (promoError) {
          console.error('Error fetching promotions:', promoError)
          setLoading(false)
          return
        }

        if (!promoData || promoData.length === 0) {
          setPromotions([])
          setLoading(false)
          return
        }

        // Enrich each promotion with product or bundle data
        const enriched: Promotion[] = await Promise.all(
          promoData.map(async (promo) => {
            const base: Promotion = {
              id: promo.id,
              product_id: promo.product_id,
              bundle_id: promo.bundle_id,
              discount_type: promo.discount_type,
              discount_value: promo.discount_value,
              starts_at: promo.starts_at,
              ends_at: promo.ends_at,
              product: null,
              bundle: null,
            }

            if (promo.product_id) {
              const { data: productData } = await supabase
                .from('products')
                .select('id, name, price_per_m2, price_per_unit, images, size, color, finish, category')
                .eq('id', promo.product_id)
                .single()

              if (productData) {
                base.product = productData as Product
              }
            } else if (promo.bundle_id) {
              const { data: bundleData } = await supabase
                .from('bundles')
                .select('id, name, bundle_price')
                .eq('id', promo.bundle_id)
                .single()

              if (bundleData) {
                // Fetch bundle items with product names
                const { data: itemsData } = await supabase
                  .from('bundle_items')
                  .select('product_id, quantity')
                  .eq('bundle_id', promo.bundle_id)

                let items: BundleItem[] = []
                if (itemsData && itemsData.length > 0) {
                  const productIds = itemsData.map((item) => item.product_id)
                  const { data: productsData } = await supabase
                    .from('products')
                    .select('id, name')
                    .in('id', productIds)

                  const productMap = new Map(
                    (productsData ?? []).map((p) => [p.id, p.name])
                  )

                  items = itemsData.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    product_name: productMap.get(item.product_id) ?? 'Producto',
                  }))
                }

                base.bundle = {
                  id: bundleData.id,
                  name: bundleData.name,
                  bundle_price: bundleData.bundle_price,
                  items,
                }
              }
            }

            return base
          })
        )

        setPromotions(enriched)
      } catch (err) {
        console.error('Error loading promotions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPromotions()
  }, [])

  return (
    <div className="min-h-screen bg-warm-ivory">
      <NavBar />
      <FloatingWhatsApp />

      {/* Header */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80"
          alt="Promociones"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 z-10">
          <AnimatedSection>
            <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light block mb-3">
              Ofertas especiales
            </span>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-light tracking-[0.06em] uppercase">
              Promociones
            </h1>
          </AnimatedSection>
        </div>
      </section>

      {/* Promotions grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-6 h-6 border border-charcoal-soft/20 border-t-charcoal-soft rounded-full animate-spin mx-auto" />
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-stone-gray/60 text-sm font-light">
                No hay promociones activas en este momento. Volvé a visitarnos pronto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14">
              {promotions.map((promo, index) => (
                <AnimatedSection key={promo.id} delay={index * 0.1}>
                  <article className="group">
                    {/* Image */}
                    <div className="aspect-[4/5] overflow-hidden bg-sand-beige/30 relative">
                      {promo.product?.images?.[0] ? (
                        <img
                          src={promo.product.images[0]}
                          alt={promo.product.name}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                        />
                      ) : promo.bundle ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-warm-ivory to-sand-beige/50">
                          <svg className="w-16 h-16 text-taupe/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-warm-ivory to-sand-beige/50">
                          <svg className="w-16 h-16 text-taupe/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-charcoal-soft/0 group-hover:bg-charcoal-soft/20 transition-all duration-500" />

                      {/* Discount badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <span className="inline-block px-3 py-1.5 bg-red-600/90 text-white text-xs tracking-[0.1em] uppercase font-medium rounded-sm">
                          {promo.discount_type === 'percentage'
                            ? `-${promo.discount_value}%`
                            : `-${formatCurrency(promo.discount_value)}`}
                        </span>
                      </div>

                      {/* Countdown badge */}
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-block px-3 py-1.5 bg-charcoal-soft/80 text-warm-ivory text-[10px] tracking-[0.08em] uppercase font-light rounded-sm">
                          {getTimeRemaining(promo.ends_at)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-4 space-y-1.5">
                      {promo.product ? (
                        <>
                          <h3 className="font-serif text-lg md:text-xl text-charcoal-soft tracking-[0.02em]">
                            {promo.product.name}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tracking-[0.08em] uppercase text-stone-gray font-light">
                            {promo.product.size && <span>{promo.product.size}</span>}
                            {promo.product.finish && <span>{promo.product.finish}</span>}
                            {promo.product.color && <span>{promo.product.color}</span>}
                          </div>

                          {/* Pricing */}
                          {promo.product.price_per_m2 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-stone-gray/50 line-through">
                                {formatCurrency(promo.product.price_per_m2)} / m²
                              </p>
                              <p className="text-lg text-charcoal-soft font-serif font-medium">
                                {formatCurrency(
                                  calculateDiscountedPrice(
                                    promo.product.price_per_m2,
                                    promo.discount_type,
                                    promo.discount_value
                                  )
                                )}{' '}
                                <span className="text-sm font-light text-stone-gray">/ m²</span>
                              </p>
                            </div>
                          )}
                        </>
                      ) : promo.bundle ? (
                        <>
                          <h3 className="font-serif text-lg md:text-xl text-charcoal-soft tracking-[0.02em]">
                            {promo.bundle.name}
                          </h3>
                          <ul className="text-xs text-stone-gray/70 space-y-1 mt-1">
                            {promo.bundle.items.map((item, i) => (
                              <li key={i} className="font-light">
                                {item.quantity > 1 ? `${item.quantity}x ` : ''}
                                {item.product_name}
                              </li>
                            ))}
                          </ul>

                          {/* Pricing */}
                          {promo.bundle.bundle_price && (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-stone-gray/50 line-through">
                                {formatCurrency(promo.bundle.bundle_price)}
                              </p>
                              <p className="text-lg text-charcoal-soft font-serif font-medium">
                                {formatCurrency(
                                  calculateDiscountedPrice(
                                    promo.bundle.bundle_price,
                                    promo.discount_type,
                                    promo.discount_value
                                  )
                                )}
                              </p>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </article>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-charcoal-soft">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-stone-gray/60 tracking-[0.05em] font-light">
            &copy; {new Date().getFullYear()} Cerámicas Gutiérrez — Gutiérrez, Berazategui
          </p>
        </div>
      </footer>
    </div>
  )
}
