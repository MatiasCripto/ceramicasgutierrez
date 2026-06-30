import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import AnimatedSection from '@/components/AnimatedSection'
import MetrosCalculator from '@/components/MetrosCalculator'
import BundlesSection from '@/components/BundlesSection'
import LocationSectionLoader from '@/components/LocationSectionLoader'
import ScrollStory from '@/components/ScrollStory'
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
              className="h-20 md:h-28 w-auto mx-auto mb-10 drop-shadow-lg"
            />
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-light tracking-[0.08em] uppercase leading-tight drop-shadow-lg mb-5">
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

      {/* ===== PISOS — BLOQUE PREMIUM ===== */}
      <section className="relative h-screen w-full overflow-hidden" id="pisos">
        <a href="/pisos" className="block w-full h-full group">
          {/* Imagen de ambiente */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80"
              alt="Ambiente con pisos cerámicos"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          {/* Overlay degradado */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          {/* Contenido */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-4">
                Pisos
              </h2>
              <p className="text-white/50 text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-10">
                Superficies que definen el carácter de cada ambiente
              </p>

              {/* Botón que aparece en hover */}
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

          {/* Línea decorativa inferior */}
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
          {/* Imagen de ambiente */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1600&q=80"
              alt="Ambiente con revestimientos cerámicos"
              className="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105"
            />
          </div>

          {/* Overlay degradado */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-all duration-700 group-hover:from-black/80 group-hover:via-black/40" />

          {/* Contenido */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
            <AnimatedSection>
              <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-light mb-6 block text-center">
                Colección
              </span>
              <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-[0.06em] uppercase text-center mb-4">
                Revestimientos
              </h2>
              <p className="text-white/50 text-sm md:text-base font-light tracking-[0.05em] text-center max-w-md mx-auto mb-10">
                Texturas y acabados que transforman paredes en experiencias
              </p>

              {/* Botón que aparece en hover */}
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

          {/* Línea decorativa inferior */}
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
                  <div className="w-[120px] h-[120px] rounded-xl bg-charcoal-soft/5 flex items-center justify-center mx-auto mb-4 overflow-hidden">
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
            href="https://wa.me/549XXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3.5 border border-charcoal-soft text-charcoal-soft text-sm tracking-[0.1em] uppercase font-light rounded-full hover:bg-charcoal-soft hover:text-warm-ivory transition-all duration-500 group"
          >
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Conversemos
          </a>
        </AnimatedSection>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-6 bg-charcoal-soft">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6">
          <p className="text-xs text-stone-gray/60 tracking-[0.05em] font-light text-center">
            &copy; {new Date().getFullYear()} Cerámicas Gutiérrez — Gutiérrez, Berazategui
          </p>
        </div>
      </footer>
    </div>
  )
}
