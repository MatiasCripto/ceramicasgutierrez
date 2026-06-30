'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingBag, Tags, LayoutDashboard, MessageCircle, MessageSquare, ShoppingCart, Users, Settings, FileText } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Productos', icon: Package },
  { href: '/dashboard/combos', label: 'Combos', icon: ShoppingBag },
  { href: '/dashboard/promociones', label: 'Promociones', icon: Tags },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: MessageSquare },
  { href: '/dashboard/documents', label: 'Documentos', icon: FileText },
  { href: '/dashboard/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--dash-bg)' }}>
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: 'var(--dash-sidebar)' }}>
        {/* Logo area */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid #222222' }}>
          <h1 className="text-[15px] font-semibold text-white tracking-tight">Cerámicas Gutiérrez</h1>
          <p className="text-xs mt-0.5" style={{ color: '#888888' }}>Panel del dueño</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 mx-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: active ? '#1C1C1C' : 'transparent',
                  color: active ? 'var(--dash-text-sidebar-active)' : 'var(--dash-text-sidebar)',
                }}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: active ? 'var(--dash-text-sidebar-active)' : '#888888' }} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
