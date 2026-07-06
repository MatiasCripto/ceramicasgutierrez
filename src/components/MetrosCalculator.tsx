'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MetrosCalculator() {
  const [ancho, setAncho] = useState('')
  const [largo, setLargo] = useState('')
  const [m2Directo, setM2Directo] = useState('')
  const [resultado, setResultado] = useState<{
    m2: number
    m2ConDesperdicio: number
  } | null>(null)

  function handleCalcular() {
    let totalM2 = 0
    if (m2Directo) {
      totalM2 = parseFloat(m2Directo)
    } else {
      const w = parseFloat(ancho)
      const l = parseFloat(largo)
      if (!(w > 0 && l > 0)) return
      totalM2 = w * l
    }
    if (!(totalM2 > 0)) return

    setResultado({ m2: totalM2, m2ConDesperdicio: totalM2 * 1.1 })
  }

  const bolsas = resultado ? Math.ceil(resultado.m2ConDesperdicio / 5) : 0
  const whatsappMsg = resultado
    ? encodeURIComponent(`Hola, necesito asesoramiento para cubrir ${resultado.m2.toFixed(2)} m²`)
    : ''

  const hasInput = ancho || largo || m2Directo

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-taupe/20 shadow-lg shadow-stone-gray/5 p-8 md:p-10">
        <div className="space-y-6">
          {/* Ancho */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase text-stone-gray font-light mb-2">
              Ancho (m)
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Ej: 4"
              value={ancho}
              onChange={(e) => { setAncho(e.target.value); setResultado(null) }}
              disabled={!!m2Directo}
              className="w-full pb-2 bg-transparent border-b border-taupe/30 text-charcoal-soft text-lg font-light outline-none focus:border-charcoal-soft transition-colors duration-300 placeholder:text-stone-gray/30 disabled:opacity-30"
            />
          </div>

          {/* Largo */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase text-stone-gray font-light mb-2">
              Largo (m)
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Ej: 5"
              value={largo}
              onChange={(e) => { setLargo(e.target.value); setResultado(null) }}
              disabled={!!m2Directo}
              className="w-full pb-2 bg-transparent border-b border-taupe/30 text-charcoal-soft text-lg font-light outline-none focus:border-charcoal-soft transition-colors duration-300 placeholder:text-stone-gray/30 disabled:opacity-30"
            />
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-taupe/20" />
            <span className="text-xs text-stone-gray/40 font-light">o</span>
            <span className="flex-1 h-px bg-taupe/20" />
          </div>

          {/* m² directo */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase text-stone-gray font-light mb-2">
              m² totales (si ya sabés la medida)
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Ej: 20"
              value={m2Directo}
              onChange={(e) => { setM2Directo(e.target.value); setResultado(null) }}
              disabled={!!(ancho && largo)}
              className="w-full pb-2 bg-transparent border-b border-taupe/30 text-charcoal-soft text-lg font-light outline-none focus:border-charcoal-soft transition-colors duration-300 placeholder:text-stone-gray/30 disabled:opacity-30"
            />
          </div>

          {/* Botón calcular */}
          <button
            type="button"
            onClick={handleCalcular}
            disabled={!((ancho && largo) || m2Directo)}
            className="w-full px-5 md:px-8 py-3 bg-charcoal-soft text-warm-ivory text-sm tracking-[0.08em] uppercase font-light rounded-full hover:bg-charcoal-soft/90 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Calcular
          </button>
        </div>

        {/* Resultado */}
        <AnimatePresence>
          {resultado && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-8 pt-6 border-t border-taupe/15 space-y-3"
            >
              <p className="text-sm text-stone-gray">
                {m2Directo ? (
                  <>
                    Para{' '}
                    <span className="text-charcoal-soft font-medium">{resultado.m2.toFixed(2)} m²</span>
                  </>
                ) : (
                  <>
                    Para tu espacio de{' '}
                    <span className="text-charcoal-soft font-medium">{ancho} × {largo} m</span>
                  </>
                )}
              </p>

              <div>
                <p className="text-xs text-stone-gray/60">m² totales</p>
                <p className="text-2xl font-serif text-charcoal-soft">{resultado.m2.toFixed(2)} m²</p>
              </div>

              <div>
                <p className="text-xs text-stone-gray/60">m² con 10% de desperdicio recomendado</p>
                <p className="text-2xl font-serif text-charcoal-soft">{resultado.m2ConDesperdicio.toFixed(2)} m²</p>
              </div>

              <div className="pt-3 border-t border-taupe/15">
                <p className="text-xs tracking-[0.08em] uppercase text-stone-gray/60 font-light mb-3">
                  También necesitarás
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-stone-gray">
                    <span className="text-lg font-serif text-charcoal-soft">{bolsas}</span>
                    <span className="ml-2">bolsa{bolsas !== 1 ? 's' : ''} de pegamento</span>
                  </p>
                  <p className="text-sm text-stone-gray">
                    <span className="text-lg font-serif text-charcoal-soft">{bolsas}</span>
                    <span className="ml-2">bolsa{bolsas !== 1 ? 's' : ''} de pastina</span>
                  </p>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/5491158885972?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-full hover:bg-[#20bd5a] transition-colors"
              >
                Consultar por WhatsApp
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {!resultado && hasInput && !((ancho && largo) || m2Directo) && (
          <p className="mt-4 text-xs text-stone-gray/50">
            Completá largo y ancho, o los m² totales, para calcular
          </p>
        )}
      </div>
    </div>
  )
}
