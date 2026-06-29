'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MetrosCalculator() {
  const [ancho, setAncho] = useState('')
  const [largo, setLargo] = useState('')
  const [m2porCaja, setM2porCaja] = useState('')
  const [resultado, setResultado] = useState<{
    total: number
    cajas: number
    conDesperdicio: boolean
  } | null>(null)
  const [showDesperdicio, setShowDesperdicio] = useState(false)

  function handleCalcular(conDesperdicio = false) {
    const w = parseFloat(ancho)
    const l = parseFloat(largo)
    const m2c = parseFloat(m2porCaja) || 1
    if (!(w > 0 && l > 0 && parseFloat(m2porCaja) > 0)) {
      setResultado(null)
      return
    }
    const total = w * l * (conDesperdicio ? 1.1 : 1)
    const cajas = Math.ceil(total / m2c)
    setResultado({ total, cajas, conDesperdicio })
  }

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
              onChange={(e) => setAncho(e.target.value)}
              className="w-full pb-2 bg-transparent border-b border-taupe/30 text-charcoal-soft text-lg font-light outline-none focus:border-charcoal-soft transition-colors duration-300 placeholder:text-stone-gray/30"
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
              onChange={(e) => setLargo(e.target.value)}
              className="w-full pb-2 bg-transparent border-b border-taupe/30 text-charcoal-soft text-lg font-light outline-none focus:border-charcoal-soft transition-colors duration-300 placeholder:text-stone-gray/30"
            />
          </div>

          {/* m² por caja + botón */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs tracking-[0.12em] uppercase text-stone-gray font-light mb-2">
                m² por caja
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Ej: 1.44"
                value={m2porCaja}
                onChange={(e) => setM2porCaja(e.target.value)}
                className="w-full pb-2 bg-transparent border-b border-taupe/30 text-charcoal-soft text-lg font-light outline-none focus:border-charcoal-soft transition-colors duration-300 placeholder:text-stone-gray/30"
              />
            </div>
            <button
              type="button"
              onClick={() => handleCalcular(false)}
              className="px-8 py-3 bg-charcoal-soft text-warm-ivory text-sm tracking-[0.08em] uppercase font-light rounded-full hover:bg-charcoal-soft/90 transition-all duration-300 whitespace-nowrap"
            >
              Calcular
            </button>
          </div>
        </div>

        {/* Resultado */}
        <AnimatePresence>
          {resultado && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-8 pt-6 border-t border-taupe/15"
            >
              <p className="text-stone-gray text-sm leading-relaxed">
                Para tu espacio de{' '}
                <span className="text-charcoal-soft font-medium">{ancho} × {largo} m</span>
                {' '}necesitás aproximadamente
              </p>
              <p className="mt-2">
                <span className="text-3xl md:text-4xl font-serif text-charcoal-soft tracking-[0.02em]">
                  {resultado.cajas}
                </span>
                <span className="text-stone-gray text-sm ml-2">
                  caja{resultado.cajas !== 1 ? 's' : ''}
                </span>
              </p>
              <p className="text-xs text-stone-gray/60 mt-1">
                {resultado.total.toFixed(2)} m² totales
                {resultado.conDesperdicio && ' (incluye 10% de desperdicio)'}
              </p>

              {/* Toggle desperdicio */}
              <button
                type="button"
                onClick={() => setShowDesperdicio(!showDesperdicio)}
                className="mt-4 text-xs tracking-[0.08em] uppercase text-stone-gray/60 hover:text-charcoal-soft transition-colors"
              >
                {showDesperdicio ? 'Ocultar' : '+ Agregar 10% de desperdicio'}
              </button>

              {showDesperdicio && !resultado.conDesperdicio && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3"
                >
                  <button
                    type="button"
                    onClick={() => handleCalcular(true)}
                    className="text-xs tracking-[0.08em] uppercase text-stone-gray underline underline-offset-4 hover:text-charcoal-soft transition-colors"
                  >
                    Calcular con 10% de desperdicio
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!resultado && ancho && largo && !m2porCaja && (
          <p className="mt-4 text-xs text-stone-gray/50">
            Completá los datos de la caja para obtener el resultado
          </p>
        )}
      </div>
    </div>
  )
}
