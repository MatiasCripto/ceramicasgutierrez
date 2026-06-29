import Link from 'next/link'
import { Package, ShoppingBag, Tags, LayoutDashboard, MessageCircle, MessageSquare, ShoppingCart, Users, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Productos', icon: Package },
  { href: '/dashboard/combos', label: 'Combos', icon: ShoppingBag },
  { href: '/dashboard/promociones', label: 'Promociones', icon: Tags },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: MessageSquare },
  { href: '/dashboard/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Cerámicas Gutiérrez</h1>
          <p className="text-sm text-gray-500 mt-1">Panel del dueño</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon className="w-5 h-5" />
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
