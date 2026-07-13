'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/formatters'

const STORE_LAT = -34.7889
const STORE_LNG = -58.2756
const EARTH_RADIUS_KM = 6371
const FREE_KM = 3
const COST_PER_KM = 3000
const FREE_TOTAL_THRESHOLD = 200000

interface ShippingResult {
  address: string
  distance: number
  cost: number | null
  isFree: boolean
  reason: 'threshold' | 'zone' | 'paid'
}

interface ShippingCalculatorProps {
  cartTotal?: number
  onShippingCalculated?: (result: ShippingResult) => void
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ShippingCalculator({ cartTotal, onShippingCalculated }: ShippingCalculatorProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ShippingResult | null>(null)

  const calculateShipping = async () => {
    const trimmed = address.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=ar`,
        { headers: { 'User-Agent': 'CeramicasGutierrez/1.0' } }
      )
      if (!res.ok) {
        setError('No pudimos encontrar esa dirección. Probá con más detalles (calle, ciudad, provincia).')
        return
      }

      const data = await res.json()
      if (!data?.[0]) {
        setError('No encontramos esa dirección. Probá incluyendo la localidad.')
        return
      }

      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      const distance = haversineKm(STORE_LAT, STORE_LNG, lat, lng)

      let isFree: boolean
      let cost: number | null
      let reason: ShippingResult['reason']

      if (cartTotal != null && cartTotal >= FREE_TOTAL_THRESHOLD) {
        isFree = true
        cost = 0
        reason = 'threshold'
      } else if (distance <= FREE_KM) {
        isFree = true
        cost = 0
        reason = 'zone'
      } else {
        const billableKm = Math.ceil((distance - FREE_KM) * 10) / 10
        cost = billableKm * COST_PER_KM
        isFree = false
        reason = 'paid'
      }

      const shipResult: ShippingResult = {
        address: trimmed,
        distance: Math.round(distance * 10) / 10,
        cost,
        isFree,
        reason,
      }

      setResult(shipResult)
      onShippingCalculated?.(shipResult)
    } catch {
      setError('Error al calcular el envío. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-warm-ivory border border-stone-gray/15 rounded-xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-charcoal-soft/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="font-serif text-lg text-charcoal-soft tracking-[0.02em]">
          Calculá tu envío
        </h3>
      </div>

      <p className="text-xs text-stone-gray/60 font-light leading-relaxed">
        Ingresá tu dirección para calcular el costo de envío a tu zona.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') calculateShipping() }}
          placeholder="Ingresá tu dirección"
          autoComplete="off"
          className="flex-1 px-4 py-2.5 text-sm text-charcoal-soft bg-white border border-stone-gray/20 rounded-lg placeholder:text-stone-gray/40 focus:outline-none focus:border-charcoal-soft/30 transition-colors"
        />
        <button
          onClick={calculateShipping}
          disabled={loading || !address.trim()}
          className="px-5 py-2.5 text-sm font-medium tracking-[0.08em] uppercase rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:brightness-95"
          style={{ backgroundColor: '#F5C200', color: '#1a1a1a' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border border-current/30 border-t-current rounded-full animate-spin" />
              Calculando
            </span>
          ) : (
            'Calcular envío'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600/80 font-light">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2 pt-1">
          <div className="h-[1px] bg-stone-gray/10" />
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-stone-gray/50 font-light">
                Distancia estimada: <span className="text-charcoal-soft font-medium">{result.distance} km</span>
              </p>
              {result.isFree ? (
                <p className="text-sm font-medium" style={{ color: '#2e7d32' }}>
                  {result.reason === 'threshold'
                    ? '¡Tu pedido tiene envío gratis por superar los $200.000!'
                    : 'Envío gratis (dentro de la zona de cobertura)'}
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-charcoal-soft">
                    Costo de envío: {formatCurrency(result.cost!)}
                  </p>
                  <p className="text-[11px] text-stone-gray/50 font-light">
                    ${COST_PER_KM.toLocaleString()} por km desde el km {FREE_KM}
                  </p>
                </div>
              )}
            </div>
            {result.isFree && (
              <svg className="w-6 h-6 flex-shrink-0" style={{ color: '#2e7d32' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
