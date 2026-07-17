'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import AnimatedSection from '@/components/AnimatedSection'
import { formatCurrency } from '@/lib/utils/formatters'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  size: string | null
  color: string | null
  finish: string | null
  price_per_m2: number | null
  price_per_unit: number | null
  m2_per_box: number | null
  stock_units: number | null
  images: string[]
  attributes: string[] | null
}

const SIZES = ['Todas', '30x30', '33x33', '35x60', '45x45', '50x50', '60x60', '75x75', '90x90']
const COLORS = ['Todos', 'Gris', 'Beige', 'Blanco', 'Marrón', 'Negro', 'Crema']
const FINISHES = ['Todos', 'Mate', 'Brillante', 'Rectificado']
const USE_TAGS = ['Interior', 'Exterior', 'Alto tránsito']

export default function SanitariosPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedSize, setSelectedSize] = useState('Todas')
  const [selectedColor, setSelectedColor] = useState('Todos')
  const [selectedFinish, setSelectedFinish] = useState('Todos')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, description, category, size, color, finish, price_per_m2, price_per_unit, m2_per_box, stock_units, images, attributes')
      .eq('category', 'sanitario')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setProducts((data ?? []) as Product[])
        setLoading(false)
      })
  }, [])

  const filtered = products.filter(p => {
    if (selectedSize !== 'Todas' && p.size?.trim() !== selectedSize) return false
    if (selectedColor !== 'Todos' && p.color?.trim().toLocaleLowerCase() !== selectedColor.toLocaleLowerCase()) return false
    if (selectedFinish !== 'Todos' && p.finish?.trim().toLocaleLowerCase() !== selectedFinish.toLocaleLowerCase()) return false
    if (selectedTags.length > 0) {
      const attrs = p.attributes ?? []
      const searchable = [
        ...attrs.map(a => a.toLocaleLowerCase().trim()),
        (p.category ?? '').toLocaleLowerCase().trim(),
        p.name.toLocaleLowerCase(),
        (p.description ?? '').toLocaleLowerCase().trim(),
      ]
      const matchesTag = selectedTags.some(tag => {
        const lower = tag.toLocaleLowerCase().trim()
        return searchable.some(s =>
          s.includes(lower) ||
          s.replace(/\s+/g, '_') === lower.replace(/\s+/g, '_')
        )
      })
      if (!matchesTag) return false
    }
    return true
  })

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <NavBar />
      <FloatingWhatsApp />

      {/* Header */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src="/sanitarios.png"
          alt="Sanitarios"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 z-10">
          <AnimatedSection>
            <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light block mb-3">Colección</span>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-light tracking-[0.06em] uppercase">
              Sanitarios
            </h1>
          </AnimatedSection>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-20 bg-warm-ivory/95 backdrop-blur-sm border-b border-charcoal-soft/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs tracking-[0.08em] uppercase">
            {/* Medidas */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-gray/60 mr-1">Medidas</span>
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    selectedSize === s
                      ? 'bg-charcoal-soft text-warm-ivory'
                      : 'text-stone-gray/70 hover:text-charcoal-soft hover:bg-charcoal-soft/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Color */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-gray/60 mr-1">Color</span>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    selectedColor === c
                      ? 'bg-charcoal-soft text-warm-ivory'
                      : 'text-stone-gray/70 hover:text-charcoal-soft hover:bg-charcoal-soft/5'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Acabado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-gray/60 mr-1">Acabado</span>
              {FINISHES.map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFinish(f)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    selectedFinish === f
                      ? 'bg-charcoal-soft text-warm-ivory'
                      : 'text-stone-gray/70 hover:text-charcoal-soft hover:bg-charcoal-soft/5'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {USE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full border transition-all duration-300 ${
                    selectedTags.includes(tag)
                      ? 'bg-charcoal-soft text-warm-ivory border-charcoal-soft'
                      : 'text-stone-gray/70 border-stone-gray/20 hover:border-charcoal-soft/30 hover:text-charcoal-soft'
                  }`}
                >
                  {tag}
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
                  <Link href={`/productos/${product.id}`}>
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
                        {product.price_per_unit
                          ? `${formatCurrency(product.price_per_unit)} / unidad`
                          : product.price_per_m2
                          ? `${formatCurrency(product.price_per_m2)} / m²`
                          : 'Consultar precio'}
                      </p>
                      <button className="mt-3 text-xs tracking-[0.1em] uppercase text-stone-gray border-b border-stone-gray/30 pb-0.5 hover:text-charcoal-soft hover:border-charcoal-soft transition-all duration-300">
                        Ver detalle
                      </button>
                    </div>
                  </article>
                </Link>
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
