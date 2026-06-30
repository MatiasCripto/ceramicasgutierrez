'use client'

import dynamic from 'next/dynamic'

const LocationSection = dynamic(() => import('./LocationSection'), { ssr: false })

export default function LocationSectionLoader() {
  return <LocationSection />
}
