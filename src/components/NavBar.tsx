'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Pisos', href: '/pisos' },
  { label: 'Revestimientos', href: '/revestimientos' },
  { label: 'Promociones', href: '/promociones' },
  { label: 'Colección', href: '/#coleccion' },
  { label: 'Confianza', href: '/#confianza' },
  { label: 'Locales', href: '/#locales' },
  { label: 'Calculadora', href: '/#calculadora' },
  { label: 'Contacto', href: '/#contacto' },
]

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 animate-fade-in-down transition-all duration-500 ${
        scrolled
          ? 'bg-warm-ivory/90 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.05)]'
          : 'bg-transparent'
      }`}
      style={{ animationDelay: '0.3s' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo1.png" alt="Cerámicas Gutiérrez" className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover" />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm tracking-[0.08em] uppercase font-light transition-colors duration-300 whitespace-nowrap ${
                scrolled ? 'text-stone-gray hover:text-charcoal-soft' : 'text-stone-gray/80 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 rounded-lg transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: scrolled ? '#2E2A27' : '#FFFFFF' }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-warm-ivory/95 backdrop-blur-md border-t border-sand-beige/30 shadow-lg">
          <div className="px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-3 text-sm tracking-[0.08em] uppercase font-light text-charcoal-soft hover:text-stone-gray rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
