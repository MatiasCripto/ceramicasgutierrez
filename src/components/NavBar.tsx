'use client'

import { useEffect, useState } from 'react'

const links = [
  { label: 'Pisos', href: '/pisos' },
  { label: 'Revestimientos', href: '/revestimientos' },
  { label: 'Colección', href: '/#coleccion' },
  { label: 'Confianza', href: '/#confianza' },
  { label: 'Calculadora', href: '/#calculadora' },
  { label: 'Contacto', href: '/#contacto' },
]

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)

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
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo1.png" alt="Cerámicas Gutiérrez" className="w-9 h-9 rounded-full object-cover" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm tracking-[0.08em] uppercase font-light transition-colors duration-300 ${
                scrolled ? 'text-stone-gray hover:text-charcoal-soft' : 'text-stone-gray/80 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
