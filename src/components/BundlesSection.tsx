import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'

interface Product {
  id: string
  name: string
  price_per_m2: number | null
  price_per_unit: number | null
  m2_per_box: number | null
  images: string[]
  category: string | null
}

interface BundleItemData {
  product_id: string
  quantity: number
  product: Product | null
}

interface Bundle {
  id: string
  name: string
  bundle_price: number
  items: BundleItemData[]
}

export default async function BundlesSection() {
  const supabase = await createClient()

  const { data: bundles } = await supabase
    .from('bundles')
    .select('id, name, bundle_price')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (!bundles || bundles.length === 0) return null

  const enriched: Bundle[] = await Promise.all(
    bundles.map(async (b) => {
      const { data: items } = await supabase
        .from('bundle_items')
        .select('product_id, quantity')
        .eq('bundle_id', b.id)

      const itemData: BundleItemData[] = []
      if (items && items.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price_per_m2, price_per_unit, m2_per_box, images, category')
          .in('id', items.map((i) => i.product_id))

        const productMap = new Map((products ?? []).map((p) => [p.id, p]))

        for (const item of items) {
          const product = productMap.get(item.product_id) ?? null
          itemData.push({ product_id: item.product_id, quantity: item.quantity, product })
        }
      }

      return { id: b.id, name: b.name, bundle_price: Number(b.bundle_price), items: itemData }
    })
  )

  // Filter: only bundles that have items to display
  const validBundles = enriched.filter((b) => b.items.length > 0)
  if (validBundles.length === 0) return null

  function calculateIndividualTotal(items: BundleItemData[]): number {
    return items.reduce((sum, item) => {
      if (!item.product) return sum
      const { product } = item
      if (product.price_per_unit) {
        return sum + Number(product.price_per_unit) * item.quantity
      }
      if (product.price_per_m2 && product.m2_per_box) {
        return sum + Number(product.price_per_m2) * Number(product.m2_per_box) * item.quantity
      }
      return sum
    }, 0)
  }

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-warm-ivory to-sand-beige/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs tracking-[0.2em] uppercase text-stone-gray/60 font-light block mb-4">
            Ahorrá en tu proyecto
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.03em]">
            Combos especiales
          </h2>
          <p className="text-stone-gray text-sm md:text-base font-light mt-3 max-w-md mx-auto">
            Seleccionamos los productos que mejor combinan para que ahorres tiempo y dinero
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {validBundles.map((bundle) => {
            const individualTotal = calculateIndividualTotal(bundle.items)
            const savings = individualTotal - bundle.bundle_price
            const firstProductImage = bundle.items.find((i) => i.product?.images?.[0])?.product?.images?.[0]

            const whatsappMessage = encodeURIComponent(
              `Hola, me interesa el combo "${bundle.name}" (${formatCurrency(bundle.bundle_price)}). Quisiera más información.`
            )

            return (
              <article key={bundle.id} className="group bg-white/70 backdrop-blur-sm border border-sand-beige/40 rounded-sm overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-sand-beige/20 hover:-translate-y-1">
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden bg-sand-beige/20 relative">
                  {firstProductImage ? (
                    <img
                      src={firstProductImage}
                      alt={bundle.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-taupe/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}

                  {/* Savings badge */}
                  {savings > 0 && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="inline-block px-3 py-1.5 bg-emerald-700/90 text-white text-xs tracking-[0.1em] uppercase font-medium rounded-sm">
                        Ahorrá {formatCurrency(savings)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="font-serif text-xl text-charcoal-soft tracking-[0.02em]">
                    {bundle.name}
                  </h3>

                  {/* Products list */}
                  <ul className="space-y-2">
                    {bundle.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-stone-gray/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-taupe/30 flex-shrink-0" />
                        <span className="font-light">
                          {item.quantity > 1 ? `${item.quantity}x ` : ''}
                          {item.product?.name ?? 'Producto'}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Pricing */}
                  <div className="pt-3 border-t border-sand-beige/30">
                    <div className="flex items-baseline gap-3">
                      {savings > 0 && (
                        <span className="text-sm text-stone-gray/50 line-through">
                          {formatCurrency(individualTotal)}
                        </span>
                      )}
                      <span className="text-2xl text-charcoal-soft font-serif font-medium">
                        {formatCurrency(bundle.bundle_price)}
                      </span>
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-emerald-700/70 mt-1 font-light">
                        {Math.round((savings / individualTotal) * 100)}% de descuento
                      </p>
                    )}
                  </div>

                  {/* WhatsApp CTA */}
                  <a
                    href={`https://wa.me/549XXXXXXXXX?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-charcoal-soft/20 text-charcoal-soft text-xs tracking-[0.1em] uppercase font-light rounded-sm hover:bg-charcoal-soft hover:text-warm-ivory transition-all duration-500 group/btn w-full sm:w-auto"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Consultar
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
