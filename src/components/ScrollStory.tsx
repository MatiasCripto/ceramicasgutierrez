'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const scenes = [
  {
    id: 1,
    title: 'Moderno',
    subtitle: 'Porcelanato rectificado — 60×60',
    description: 'Líneas limpias, superficies continuas. Una estética contemporánea que amplía los espacios.',
    image: '/moderno.png',
    gradient: 'from-stone-gray/30 via-warm-ivory to-stone-gray/20',
  },
  {
    id: 2,
    title: 'Cálido',
    subtitle: 'Cerámico rústico — 45×45',
    description: 'La textura de la madera en cerámica. Ambientes acogedores con la durabilidad del gres.',
    image: '/calido.png',
    gradient: 'from-amber-900/20 via-warm-ivory to-amber-700/15',
  },
  {
    id: 3,
    title: 'Luminoso',
    subtitle: 'Revestimiento brillante — 30×60',
    description: 'Blanco puro y reflejos sutiles. La luz se multiplica en cada superficie.',
    image: '/luminoso.png',
    gradient: 'from-blue-100/60 via-white to-blue-50/40',
  },
  {
    id: 4,
    title: 'Natural',
    subtitle: 'Piso exterior antideslizante',
    description: 'Diseño y resistencia para exteriores. Texturas orgánicas que conectan con el entorno.',
    image: '/natural.png',
    gradient: 'from-emerald-900/20 via-warm-ivory to-stone-gray/20',
  },
]

export default function StoryCarousel() {
  const [[current, direction], setPage] = useState([0, 0])
  const [isPlaying, setIsPlaying] = useState(true)

  const paginate = useCallback(
    (newDirection: number) => {
      setPage(([prev]) => {
        const next = (prev + newDirection + scenes.length) % scenes.length
        return [next, newDirection]
      })
    },
    []
  )

  const goTo = useCallback((index: number) => {
    setPage(([prev]) => [index, index > prev ? 1 : -1])
  }, [])

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => paginate(1), 5000)
    return () => clearInterval(timer)
  }, [isPlaying, paginate])

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  }

  const scene = scenes[current]

  return (
    <section className="relative h-screen overflow-hidden bg-warm-ivory" id="storytelling">
      {/* Título fijo */}
      <div className="absolute top-20 left-0 right-0 z-20 text-center px-6">
        <p className="text-xs tracking-[0.2em] uppercase text-stone-gray/60 font-light">
          Un espacio, mil miradas
        </p>
      </div>

      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={scene.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className={`absolute inset-0 bg-gradient-to-br ${scene.gradient}`}
        >
          {/* Imagen de escena */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full max-w-4xl mx-auto px-6">
              <div className="aspect-[4/3] rounded-sm overflow-hidden shadow-lg">
                <img
                  src={scene.image}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Degradado inferior para legibilidad del texto */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-warm-ivory via-warm-ivory/70 to-transparent z-10" />

          {/* Texto */}
          <div className="absolute bottom-20 left-0 right-0 px-6 text-center z-20">
            <p className="text-xs tracking-[0.15em] uppercase text-stone-gray font-light mb-3">
              {scene.subtitle}
            </p>
            <h3 className="text-3xl md:text-5xl font-serif text-charcoal-soft tracking-[0.03em] mb-3">
              {scene.title}
            </h3>
            <p className="text-sm md:text-base text-stone-gray max-w-md mx-auto leading-relaxed">
              {scene.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controles */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-6 px-6">
        {/* Flecha izquierda */}
        <button
          onClick={() => { paginate(-1); setIsPlaying(false) }}
          className="text-stone-gray/50 hover:text-charcoal-soft transition-colors p-1"
          aria-label="Anterior"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Dots */}
        <div className="flex gap-2">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { goTo(i); setIsPlaying(false) }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === current
                  ? 'bg-charcoal-soft w-8'
                  : 'bg-stone-gray/20 w-1.5 hover:bg-stone-gray/40'
              }`}
              aria-label={`Ir a escena ${i + 1}`}
            />
          ))}
        </div>

        {/* Flecha derecha */}
        <button
          onClick={() => { paginate(1); setIsPlaying(false) }}
          className="text-stone-gray/50 hover:text-charcoal-soft transition-colors p-1"
          aria-label="Siguiente"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  )
}
