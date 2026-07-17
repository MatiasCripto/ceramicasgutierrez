'use client'

import { useEffect, useState, useRef } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

const productLinks = [
  { label: 'Pulidos y Rectificados', href: '/pulidos-y-rectificados' },
  { label: 'Símil Madera', href: '/simil-madera' },
  { label: 'Pisos', href: '/pisos' },
  { label: 'Revestimientos', href: '/revestimientos' },
  { label: 'Griferías', href: '/griferias' },
  { label: 'Vanitorys', href: '/vanitory' },
  { label: 'Sanitarios', href: '/sanitarios' },
]

const otherLinks = [
  { label: 'Promociones', href: '/promociones' },
  { label: 'Confianza', href: '/#confianza' },
  { label: 'Locales', href: '/#locales' },
  { label: 'Calculadora', href: '/#calculadora' },
  { label: 'Contacto', href: '/#contacto' },
]

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const linkClass = (isScrolled: boolean) =>
    `text-xs lg:text-sm tracking-[0.04em] lg:tracking-[0.06em] uppercase font-light transition-colors duration-300 whitespace-nowrap flex-shrink-0 ${
      isScrolled ? 'text-stone-gray hover:text-charcoal-soft' : 'text-stone-gray/80 hover:text-white'
    }`

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
        <div
          className="hidden md:flex items-center gap-1 lg:gap-2"
        >
          {/* Productos dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${linkClass(scrolled)}`}
            >
              Productos
              <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-warm-ivory/95 backdrop-blur-md border border-sand-beige/30 rounded-xl shadow-lg py-2 animate-fade-in">
                {productLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2.5 text-sm tracking-[0.06em] uppercase font-light text-charcoal-soft hover:bg-charcoal-soft/5 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {otherLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={linkClass(scrolled)}
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
            <p className="px-3 py-2 text-[10px] tracking-[0.15em] uppercase text-stone-gray/40 font-semibold">Productos</p>
            {productLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-3 text-sm tracking-[0.08em] uppercase font-light text-charcoal-soft hover:text-stone-gray rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="h-[1px] bg-stone-gray/10 my-2" />
            {otherLinks.map((link) => (
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
