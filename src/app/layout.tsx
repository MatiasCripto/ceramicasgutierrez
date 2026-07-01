import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/hooks/auth-context'
import RouteRefresh from '@/components/RouteRefresh'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cerámicas Gutiérrez — Superficies que transforman espacios',
  description: 'Showroom en Gutiérrez, Berazategui. Revestimientos y superficies de diseño.',
  icons: {
    icon: '/logo1.png',
    apple: '/logo1.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`h-full antialiased ${playfair.variable} ${inter.variable}`}
    >
      <head>
        <link rel="icon" href="/logo1.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans text-charcoal-soft bg-warm-ivory">
        <AuthProvider>
          <RouteRefresh>
            {children}
          </RouteRefresh>
        </AuthProvider>
      </body>
    </html>
  )
}
