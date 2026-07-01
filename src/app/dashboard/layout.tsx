'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Package, ShoppingBag, Tags, LayoutDashboard, MessageCircle, MessageSquare, ShoppingCart, Users, Settings, FileText, Menu, X } from 'lucide-react'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--dash-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-60 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ background: 'var(--dash-sidebar)' }}>
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 py-4 lg:px-6 lg:py-5" style={{ borderBottom: '1px solid #222222' }}>
          <div className="min-w-0">
            <h1 className="text-sm lg:text-[15px] font-semibold text-white tracking-tight truncate">Cerámicas Gutiérrez</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#888888' }}>Panel del dueño</p>
          </div>
          <button className="lg:hidden p-1 -mr-1" onClick={() => setSidebarOpen(false)} style={{ color: '#888888' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 lg:py-3 space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 lg:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: active ? '#1C1C1C' : 'transparent',
                  color: active ? 'var(--dash-text-sidebar-active)' : 'var(--dash-text-sidebar)',
                }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: active ? 'var(--dash-text-sidebar-active)' : '#888888' }} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3" style={{ background: 'var(--dash-sidebar)', borderBottom: '1px solid #222222' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: '#CCCCCC' }}>
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-white truncate">Cerámicas Gutiérrez</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
