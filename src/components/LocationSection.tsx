'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Location {
  id: string
  name: string
  address: string
  coords: [number, number]
  confirmed: boolean
}

const LOCATIONS: Location[] = [
  {
    id: 'gutierrez',
    name: 'Local Gutiérrez',
    address: 'Camino General Belgrano 8093, Gutiérrez, Berazategui, Buenos Aires',
    coords: [-34.8012, -58.2089],
    confirmed: true,
  },
  {
    id: 'florencio-varela',
    name: 'Local Florencio Varela',
    address: 'Calle 1278 N° 743, Ingeniero Allan, Florencio Varela, Buenos Aires',
    coords: [-34.7931, -58.2810],
    confirmed: true,
  },
]

function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export default function LocationSection() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [-34.8087, -58.2391],
        zoom: 13,
        scrollWheelZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      LOCATIONS.forEach((loc) => {
        const marker = L.marker(loc.coords).addTo(map)
        if (loc.confirmed) {
          const directionsUrl = googleMapsUrl(loc.address)
          marker.bindPopup(`
            <strong>${loc.name}</strong><br/>
            ${loc.address}<br/>
            <br/>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:6px 14px;background:#2E2A27;color:#F5F1EB;
                      text-decoration:none;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;
                      border-radius:2px;margin-top:4px;">
              Cómo llegar
            </a>
          `)
        }
      })

      // Fit map to show both markers
      const group = L.featureGroup(LOCATIONS.map((loc) => L.marker(loc.coords)))
      map.fitBounds(group.getBounds().pad(0.15))

      mapInstanceRef.current = map
    }

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-sand-beige/20 to-warm-ivory" id="locales">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs tracking-[0.2em] uppercase text-stone-gray/60 font-light block mb-4">
            Visitanos
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal-soft tracking-[0.03em]">
            Nuestros locales
          </h2>
          <p className="text-stone-gray text-sm md:text-base font-light mt-3 max-w-md mx-auto">
            Encontranos en nuestros showrooms para ver los productos en persona
          </p>
        </div>

        {/* Map */}
        <div
          ref={mapRef}
          className="w-full h-[350px] md:h-[450px] rounded-sm overflow-hidden shadow-lg border border-sand-beige/30 mb-10 z-0"
          style={{ minHeight: '350px' }}
        />

        {/* Address cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className="bg-white/70 backdrop-blur-sm border border-sand-beige/40 rounded-sm p-6 transition-all duration-500 hover:shadow-lg hover:shadow-sand-beige/20"
            >
              <div className="flex items-start gap-3">
                {/* Pin icon */}
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-charcoal-soft/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>

                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-xl text-charcoal-soft tracking-[0.02em] mb-1">
                    {loc.name}
                  </h3>
                  <p className="text-sm text-stone-gray/80 font-light mb-3">
                    {loc.address}
                    {!loc.confirmed && (
                      <span className="block text-xs text-stone-gray/40 italic mt-1">
                        // TODO: confirmar dirección Florencio Varela
                      </span>
                    )}
                  </p>
                  {loc.confirmed ? (
                    <a
                      href={googleMapsUrl(loc.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase font-light px-4 py-2 border border-charcoal-soft/20 text-charcoal-soft rounded-sm hover:bg-charcoal-soft hover:text-warm-ivory transition-all duration-500 min-h-[40px]"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Cómo llegar
                    </a>
                  ) : (
                    <span className="text-xs text-stone-gray/40 italic">
                      Dirección a confirmar
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
