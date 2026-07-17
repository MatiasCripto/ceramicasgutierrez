import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import AnimatedSection from '@/components/AnimatedSection'
import MetrosCalculator from '@/components/MetrosCalculator'
import BundlesSection from '@/components/BundlesSection'
import LocationSectionLoader from '@/components/LocationSectionLoader'
import ScrollStory from '@/components/ScrollStory'
import ShippingCalculator from '@/components/ShippingCalculator'
import ScrollIndicator from '@/components/ScrollIndicator'
import ValueIcon from '@/components/ValueIcon'
import { formatCurrency } from '@/lib/utils/formatters'

interface FeaturedProduct {
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
  featured_order: number | null
}

const trustPillars = [
  {
    title: 'Atención personalizada',
    description: 'Asesoramiento one-to-one para encontrar la superficie ideal para cada proyecto.',
  },
  {
    title: 'Variedad',
    description: 'Cerámicas, porcelanatos, revestimientos y más — una amplia gama de estilos y formatos para cada espacio.',
  },
  {
    title: 'Calidad',
    description: 'Trabajamos con primeras marcas y materiales seleccionados que garantizan durabilidad y terminaciones impecables.',
  },
]

export default async function LandingPage() {
  const supabase = await createClient()

  const { data: featured } = await supabase
    .from('products')
    .select('id, name, description, category, size, color, finish, price_per_m2, m2_per_box, images, featured_order')
    .eq('featured_on_landing', true)
    .eq('active', true)
    .order('featured_order', { ascending: true })

  const products = (featured ?? []) as FeaturedProduct[]

  return (
    <div className="min-h-screen">
      <NavBar />
      <FloatingWhatsApp />

      {/* ===== HERO ===== */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute w-full h-full object-cover"
            style={{
              transform: 'scale(1.15) translateY(-3%)',
              objectPosition: 'center',
            }}
          >
            <source src="/videolanding.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Overlay degradado cálido */}
        <div className="absolute inset-0 bg-gradient-to-b from-warm-ivory/10 via-transparent to-charcoal-soft/60" />

        {/* Contenido del hero */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <div className="max-w-2xl">
            <img
              src="/logo.png"
              alt="Cerámicas Gutiérrez"
              className="h-14 sm:h-16 md:h-28 w-auto mx-auto mb-6 md:mb-10 drop-shadow-lg"
            />
            <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-white font-light tracking-[0.08em] uppercase leading-tight drop-shadow-lg mb-4 md:mb-5">
              Superficies que transforman espacios
            </h1>
            <p className="text-sm md:text-base text-white/70 tracking-[0.12em] uppercase font-light drop-shadow-md">
              Revestimientos y superficies — Gutiérrez, Berazategui
            </p>
          </div>
        </div>

        {/* Línea inferior + ubicación */}
        <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-white/20" />
            <span className="text-xs tracking-[0.15em] uppercase text-white/50 font-light whitespace-nowrap">
              Gutiérrez, Berazategui — Buenos Aires
            </span>
            <div className="h-[1px] flex-1 bg-white/20" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <ScrollIndicator />
        </div>
      </section>

      {/* ===== PULIDOS Y RECTIFICADOS — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="pulidos">
        <a href="/pulidos-y-rectificados" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="/pulidosrec.png"
              alt="Porcelanatos pulidos y rectificados de alto brillo en ambiente lujoso"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Pulidos y Rectificados
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                Porcelanatos de gran formato para ambientes premium
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== SÍMIL MADERA — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="simil-madera">
        <a href="/simil-madera" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1581236984294-6b15294d08f9?w=1600&q=80"
              alt="Piso de porcelanato símil madera con vetas naturales y juntas visibles, estilo moderno"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Símil Madera
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                La calidez de la madera con la durabilidad del porcelanato
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== PISOS — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="pisos">
        <a href="/pisos" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80"
              alt="Cerámicos para piso en ambiente lujoso con luz natural"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Pisos
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                Superficies que definen el carácter de cada ambiente
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== REVESTIMIENTOS — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="revestimientos">
        <a href="/revestimientos" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="/revestimiento.png"
              alt="Revestimiento de pared con porcelanatos en ambiente elegante con luz natural"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Revestimientos
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                Texturas y acabados que transforman paredes en experiencias
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== GRIFERÍAS — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="griferias">
        <a href="/griferias" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=80"
              alt="Grifería de diseño en baño moderno con acabados premium"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Griferías
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                Diseño y funcionalidad para cada espacio
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== VANITORY — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="vanitory">
        <a href="/vanitory" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="/vanitorys.png"
              alt="Vanitorys de diseño para baño moderno"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Vanitorys
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                Muebles de diseño para tu baño
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== SANITARIOS — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="sanitarios">
        <a href="/sanitarios" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="/sanitarios.png"
              alt="Sanitarios y artefactos de baño"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Sanitarios
              </h2>
              <p className="text-white/50 text-xs sm:text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-8 md:mb-10">
                Inodoros, lavatorios y accesorios para tu baño
              </p>

              <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out">
                <span className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.12em] uppercase font-light rounded-full hover:bg-white hover:text-charcoal-soft transition-all duration-500">
                  Explorar colección
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/15" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-light whitespace-nowrap">
                Cerámicas Gutiérrez
              </span>
              <div className="h-[1px] flex-1 bg-white/15" />
            </div>
          </div>
        </a>
      </section>

      {/* ===== STOCK PERMANENTE ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="stock">
        <a href="/productos" className="block w-full h-full group">
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="/stock.png"
              alt="Stock permanente"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Disponibilidad
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-3 md:mb-4">
                Stock Permanente
              </h2>
              <p className="text-white/60 text-sm md:text-base font-light max-w-lg mx-auto text-center leading-relaxed">
                Todos nuestros productos cuentan con stock disponible. Lo que ves en la web está listo para retirar o recibir en tu domicilio.
              </p>
            </AnimatedSection>
          </div>
        </a>
      </section>

      {/* ===== COMBOS ===== */}
      <BundlesSection />

      {/* ===== LOCALES ===== */}
      <LocationSectionLoader />

      {/* ===== CONFIANZA ===== */}
      <section className="py-24 px-6 bg-sand-beige/30" id="confianza">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.03em] text-center mb-3">
              Un referente en la zona
            </h2>
            <p className="text-stone-gray text-sm md:text-base text-center max-w-xl mx-auto mb-12 font-light leading-relaxed">
              Nos renovamos constantemente para estar a la vanguardia. Amplia variedad de
              productos para transformar tus espacios — con calidad garantizada y años de
              trayectoria que nos respaldan.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { img: '/atencion-personalizada.png', title: trustPillars[0].title, desc: trustPillars[0].description },
              { img: '/variedad.png', title: trustPillars[1].title, desc: trustPillars[1].description },
              { img: '/calidad.png', title: trustPillars[2].title, desc: trustPillars[2].description },
            ].map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.1} direction="up">
                <div className="text-center">
                  <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-xl bg-charcoal-soft/5 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    <ValueIcon src={item.img} title={item.title} />
                  </div>
                  <h3 className="text-sm font-medium text-charcoal-soft mb-1.5">{item.title}</h3>
                  <p className="text-xs text-stone-gray/70 font-light leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANIFICÁ TU ESPACIO ===== */}
      <section className="py-24 px-6 bg-warm-ivory" id="calculadora">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.03em] mb-4">
            Planificá tu espacio
          </h2>
          <p className="text-stone-gray text-sm md:text-base mb-12 font-light max-w-md mx-auto">
            Calculá cuánto material necesitás para tu proyecto
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <MetrosCalculator />
        </AnimatedSection>
      </section>

      {/* ===== STORYTELLING ===== */}
      <ScrollStory />

      {/* ===== CTA CONVERSACIÓN ===== */}
      <section className="py-24 px-6 bg-gradient-to-b from-warm-ivory to-sand-beige/30" id="contacto">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.03em] mb-4">
            ¿Un proyecto en mente?
          </h2>
          <p className="text-stone-gray text-sm md:text-base mb-10 font-light max-w-md mx-auto leading-relaxed">
            Asesoría personalizada para encontrar la superficie perfecta para tu espacio.
          </p>
          <a
            href="https://wa.me/5491158885972"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 md:px-8 py-3.5 border border-charcoal-soft text-charcoal-soft text-sm tracking-[0.1em] uppercase font-light rounded-full hover:bg-charcoal-soft hover:text-warm-ivory transition-all duration-500 group"
          >
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Conversemos
          </a>
        </AnimatedSection>
      </section>

      {/* ===== SHIPPING CALCULATOR ===== */}
      <section className="py-20 px-6 bg-gradient-to-b from-sand-beige/20 to-warm-ivory" id="shipping">
        <div className="max-w-lg mx-auto">
          <AnimatedSection>
            <div className="text-center mb-8">
              <h2 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.03em] mb-3">
                ¿Llegamos a tu zona?
              </h2>
              <p className="text-stone-gray text-sm font-light max-w-sm mx-auto leading-relaxed">
                Ingresá tu dirección y te decimos al instante si tenés envío gratis o cuánto sale.
              </p>
            </div>
            <ShippingCalculator />
          </AnimatedSection>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-6 bg-charcoal-soft">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/ceramicas.gutierrez"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Cerámicas Gutiérrez"
              className="text-stone-gray/50 hover:text-[#F5C200] transition-colors duration-300"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/ceramicasgutierrez"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook de Cerámicas Gutiérrez"
              className="text-stone-gray/50 hover:text-[#F5C200] transition-colors duration-300"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
          <div className="h-4 w-[1px] bg-stone-gray/20 hidden md:block" />
          <p className="text-xs text-stone-gray/60 tracking-[0.05em] font-light text-center">
            &copy; {new Date().getFullYear()} Cerámicas Gutiérrez — Gutiérrez, Berazategui
          </p>
        </div>
      </footer>
    </div>
  )
}
