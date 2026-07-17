'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import AnimatedSection from '@/components/AnimatedSection'
import ShippingCalculator from '@/components/ShippingCalculator'
import { formatCurrency } from '@/lib/utils/formatters'
import { ArrowLeft, WhatsappIcon } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  size: string | null
  color: string | null
  finish: string | null
  brand: string | null
  price_per_m2: number | null
  price_per_unit: number | null
  m2_per_box: number | null
  stock_m2: number | null
  stock_units: number | null
  images: string[]
  attributes: string[] | null
}

const CATEGORY_LABELS: Record<string, string> = {
  piso: 'Piso',
  pared: 'Pared',
  bano: 'Baño',
  exterior: 'Exterior',
  griferia: 'Grifería',
  vanitory: 'Vanitory',
  pulido: 'Pulido y Rectificado',
  pegamento: 'Pegamento',
  pastina: 'Pastina',
  simil_madera: 'Símil Madera',
  sanitario: 'Sanitarios',
}

const WHATSAPP_NUMBER = '5491158885972'

export default function ProductDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [shippingInfo, setShippingInfo] = useState<{ address: string; cost: number | null; isFree: boolean } | null>(null)

  useEffect(() => {
    if (!params.id) return
    supabase
      .from('products')
      .select('id, name, description, category, size, color, finish, brand, price_per_m2, price_per_unit, m2_per_box, stock_m2, stock_units, images, attributes')
      .eq('id', params.id as string)
      .eq('active', true)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Product query error:', error)
          setProduct(null)
          setLoading(false)
          return
        }
        setProduct(data as Product | null)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-ivory">
        <NavBar />
        <FloatingWhatsApp />
        <div className="flex items-center justify-center h-screen">
          <div className="w-6 h-6 border border-charcoal-soft/20 border-t-charcoal-soft rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-warm-ivory">
        <NavBar />
        <FloatingWhatsApp />
        <div className="max-w-4xl mx-auto px-6 pt-32 text-center">
          <p className="text-stone-gray/60 text-sm font-light">Producto no encontrado</p>
          <Link href="/" className="text-sm text-stone-gray hover:text-charcoal-soft underline mt-4 inline-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const categoryLabel = CATEGORY_LABELS[product.category ?? ''] ?? product.category
  const isUnitCategory = ['griferia', 'vanitory', 'sanitario'].includes(product.category ?? '')
  const hasPricing = product.price_per_m2 != null || product.price_per_unit != null

  const baseMsg = `Hola! Quería consultar sobre ${product.name}${product.size ? ` (${product.size})` : ''}`
  const whatsappMessage = !shippingInfo
    ? encodeURIComponent(baseMsg)
    : encodeURIComponent(
        baseMsg +
          `\n\nDirección de entrega: ${shippingInfo.address}. Costo de envío calculado: ${
            shippingInfo.isFree ? 'Envío gratis' : formatCurrency(shippingInfo.cost!)
          }`
      )

  return (
    <div className="min-h-screen bg-warm-ivory">
      <NavBar />
      <FloatingWhatsApp />

      {/* Back link */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-stone-gray/60 hover:text-charcoal-soft transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Image gallery */}
          <AnimatedSection>
            <div className="space-y-4">
              <div className="aspect-[4/5] overflow-hidden bg-sand-beige/30 rounded-lg">
                {product.images?.[selectedImage] ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-warm-ivory to-sand-beige/50">
                    <svg className="w-24 h-24 text-taupe/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        selectedImage === i ? 'border-charcoal-soft' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Product info */}
          <AnimatedSection delay={0.1}>
            <div className="space-y-6">
              <div>
                {product.brand && (
                  <p className="text-xs tracking-[0.15em] uppercase text-stone-gray/50 mb-2">{product.brand}</p>
                )}
                <h1 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.02em]">
                  {product.name}
                </h1>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-charcoal-soft/5 text-stone-gray">
                  {categoryLabel}
                </span>
                {product.size && (
                  <span className="text-xs tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-charcoal-soft/5 text-stone-gray">
                    {product.size}
                  </span>
                )}
                {product.color && (
                  <span className="text-xs tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-charcoal-soft/5 text-stone-gray">
                    {product.color}
                  </span>
                )}
                {product.finish && (
                  <span className="text-xs tracking-[0.08em] uppercase px-3 py-1 rounded-full bg-charcoal-soft/5 text-stone-gray">
                    {product.finish}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-stone-gray/80 font-light leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Attributes */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.attributes.map((attr) => (
                    <span key={attr} className="text-[11px] tracking-[0.05em] px-2.5 py-1 rounded-md border border-stone-gray/15 text-stone-gray/60">
                      {attr.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="h-[1px] bg-stone-gray/10" />

              {/* Pricing */}
              <div className="space-y-2">
                {!isUnitCategory && product.price_per_m2 != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-gray/60">Precio por m²</span>
                    <span className="text-xl font-medium text-charcoal-soft">{formatCurrency(product.price_per_m2)}</span>
                  </div>
                )}
                {product.price_per_unit != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-gray/60">Precio por unidad</span>
                    <span className="text-xl font-medium text-charcoal-soft">{formatCurrency(product.price_per_unit)}</span>
                  </div>
                )}
                {!isUnitCategory && product.m2_per_box != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-gray/60">m² por caja</span>
                    <span className="text-sm text-charcoal-soft">{product.m2_per_box} m²</span>
                  </div>
                )}
                {isUnitCategory && product.stock_units != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-gray/60">Stock disponible</span>
                    <span className="text-sm text-charcoal-soft">{product.stock_units} unidades</span>
                  </div>
                )}
                {!isUnitCategory && product.stock_m2 != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-gray/60">Stock disponible</span>
                    <span className="text-sm text-charcoal-soft">{product.stock_m2} m²</span>
                  </div>
                )}
              </div>

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-full text-sm tracking-[0.1em] uppercase font-light transition-all duration-500 group"
                style={{ background: '#25D366', color: 'white' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Consultar por WhatsApp
              </a>

              {/* Shipping Calculator */}
              <ShippingCalculator onShippingCalculated={setShippingInfo} />

              {/* Nota de precio */}
              {!hasPricing && (
                <p className="text-xs text-stone-gray/40 text-center font-light">
                  Consultar precio por WhatsApp
                </p>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>

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
