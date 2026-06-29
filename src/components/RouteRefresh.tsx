'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

/**
 * Envuelve los children del root layout. Usa pathname como key para forzar
 * a React a DESTRUIR y RE-CREAR desde cero todo el árbol de componentes
 * en CADA navegación (incluyendo back/forward).
 *
 * Esto arregla el bug donde Next.js App Router restaura páginas del cache
 * con el estado congelado de Framer Motion (whileInView + once:true).
 */
export default function RouteRefresh({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  console.log(`🔵 ROUTE-REFRESH render key:${pathname}`)
  return <div key={pathname}>{children}</div>
}
