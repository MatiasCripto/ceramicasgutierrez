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
  metadataBase: new URL('https://ceramicasgutierrez.com'),
  title: 'Cerámicas Gutiérrez | Cerámicos, Porcelanatos, Griferías y Vanitorios en Buenos Aires',
  description: 'Descubrí nuestra amplia variedad de cerámicos, porcelanatos pulidos y rectificados, símil madera, revestimientos, griferías y vanitorios. Cerámicas Gutiérrez — calidad y estilo para tu hogar.',
  keywords: [
    'ceramicos Buenos Aires',
    'porcelanato pulido rectificado',
    'simil madera ceramico',
    'revestimiento pared porcelanato',
    'griferia baño',
    'vanitory',
    'ceramicas para piso',
    'ceramicas para pared',
    'ceramicas Argentina',
    'porcelanato brilloso',
    'ceramicas Gutierrez',
  ],
  icons: {
    icon: '/logo1.png',
    apple: '/logo1.png',
  },
  openGraph: {
    title: 'Cerámicas Gutiérrez | Cerámicos, Porcelanatos, Griferías y Vanitorios en Buenos Aires',
    description: 'Descubrí nuestra amplia variedad de cerámicos, porcelanatos pulidos y rectificados, símil madera, revestimientos, griferías y vanitorios.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Cerámicas Gutiérrez',
    url: 'https://ceramicasgutierrez.com',
    images: [
      {
        url: '/logo1.png',
        width: 512,
        height: 512,
        alt: 'Cerámicas Gutiérrez',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cerámicas Gutiérrez | Cerámicos, Porcelanatos, Griferías y Vanitorios en Buenos Aires',
    description: 'Descubrí nuestra amplia variedad de cerámicos, porcelanatos pulidos y rectificados, símil madera, revestimientos, griferías y vanitorios.',
    images: ['/logo1.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://ceramicasgutierrez.com',
    languages: {
      'es-AR': 'https://ceramicasgutierrez.com',
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'Cerámicas Gutiérrez',
              description: 'Showroom de cerámicos, porcelanatos, griferías y vanitorios en Gutiérrez, Berazategui, Buenos Aires.',
              url: 'https://ceramicasgutierrez.com',
              telephone: '+54 11 5888-5972',
              areaServed: 'Buenos Aires, Argentina',
              serviceType: [
                'Venta de cerámicos',
                'Porcelanatos',
                'Griferías',
                'Vanitorios',
                'Revestimientos',
                'Símil Madera',
                'Porcelanatos Pulidos y Rectificados',
              ],
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Gutiérrez',
                addressRegion: 'Berazategui',
                addressCountry: 'AR',
              },
            }),
          }}
        />
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
