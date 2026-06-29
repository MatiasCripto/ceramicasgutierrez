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
  description: string | null
  category: string | null
  size: string | null
  color: string | null
  finish: string | null
  price_per_m2: number | null
  m2_per_box: number | null
  images: string[]
  attributes: string[] | null
}

const AMBIENTES = ['Todos', 'Baño', 'Cocina', 'Living', 'Exterior']
const VISUAL_CATEGORIES = ['Todas', 'Piedra', 'Mármol', 'Cemento', 'Madera']

const CATEGORY_MAP: Record<string, string[]> = {
  'Baño': ['bano'],
  'Cocina': ['cocina'],
  'Living': ['living'],
  'Exterior': ['exterior'],
}

export default function RevestimientosPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedAmbiente, setSelectedAmbiente] = useState('Todos')
  const [selectedVisual, setSelectedVisual] = useState('Todas')

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, description, category, size, color, finish, price_per_m2, m2_per_box, images, attributes')
      .in('category', ['pared', 'bano', 'exterior'])
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setProducts((data ?? []) as Product[])
        setLoading(false)
      })
  }, [])

  const filtered = products.filter(p => {
    if (selectedAmbiente !== 'Todos') {
      const cats = CATEGORY_MAP[selectedAmbiente] ?? []
      if (!cats.includes(p.category ?? '')) return false
    }
    if (selectedVisual !== 'Todas') {
      const attrs = p.attributes ?? []
      const attrSet = new Set(attrs.map(a => a.toLowerCase()))
      const nameLower = p.name.toLowerCase()
      const descLower = (p.description ?? '').toLowerCase()
      const visualLower = selectedVisual.toLowerCase()
      const matchesField =
        attrSet.has(visualLower) ||
        nameLower.includes(visualLower) ||
        descLower.includes(visualLower)
      if (!matchesField) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-warm-ivory">
      <NavBar />
      <FloatingWhatsApp />

      {/* Header */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1600&q=80"
          alt="Revestimientos cerámicos"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 z-10">
          <AnimatedSection>
            <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light block mb-3">Colección</span>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-light tracking-[0.06em] uppercase">
              Revestimientos
            </h1>
          </AnimatedSection>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-20 bg-warm-ivory/95 backdrop-blur-sm border-b border-charcoal-soft/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs tracking-[0.08em] uppercase">
            {/* Ambiente */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-gray/60 mr-1">Ambiente</span>
              {AMBIENTES.map(a => (
                <button
                  key={a}
                  onClick={() => setSelectedAmbiente(a)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    selectedAmbiente === a
                      ? 'bg-charcoal-soft text-warm-ivory'
                      : 'text-stone-gray/70 hover:text-charcoal-soft hover:bg-charcoal-soft/5'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            {/* Categoría visual */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-gray/60 mr-1">Categoría</span>
              {VISUAL_CATEGORIES.map(vc => (
                <button
                  key={vc}
                  onClick={() => setSelectedVisual(vc)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    selectedVisual === vc
                      ? 'bg-charcoal-soft text-warm-ivory'
                      : 'text-stone-gray/70 hover:text-charcoal-soft hover:bg-charcoal-soft/5'
                  }`}
                >
                  {vc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-6 h-6 border border-charcoal-soft/20 border-t-charcoal-soft rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-stone-gray/60 text-sm py-20 font-light">
              No encontramos productos con esos filtros. Probá con otras opciones.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14">
              {filtered.map((product, index) => (
                <AnimatedSection key={product.id} delay={index * 0.1}>
                  <article className="group cursor-pointer">
                    <div className="aspect-[4/5] overflow-hidden bg-sand-beige/30 relative">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-warm-ivory to-sand-beige/50">
                          <svg className="w-16 h-16 text-taupe/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-charcoal-soft/0 group-hover:bg-charcoal-soft/20 transition-all duration-500" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <h3 className="font-serif text-lg md:text-xl text-charcoal-soft tracking-[0.02em]">
                        {product.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tracking-[0.08em] uppercase text-stone-gray font-light">
                        {product.size && <span>{product.size}</span>}
                        {product.finish && <span>{product.finish}</span>}
                        {product.color && <span>{product.color}</span>}
                      </div>
                      <p className="text-sm text-charcoal-soft/80 font-medium">
                        {product.price_per_m2
                          ? `${formatCurrency(product.price_per_m2)} / m²`
                          : 'Consultar precio'}
                      </p>
                      <button className="mt-3 text-xs tracking-[0.1em] uppercase text-stone-gray border-b border-stone-gray/30 pb-0.5 hover:text-charcoal-soft hover:border-charcoal-soft transition-all duration-300">
                        Ver detalle
                      </button>
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
