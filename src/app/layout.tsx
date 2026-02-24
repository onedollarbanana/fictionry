import type { Metadata } from 'next'
import { Inter, Merriweather, Lora, Literata, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CookieConsent } from '@/components/cookie-consent'
import { GenreOnboardingWrapper } from '@/components/onboarding/genre-onboarding-wrapper'
import { OfflineIndicator } from '@/components/offline-indicator'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const merriweather = Merriweather({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-merriweather' })
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' })
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-source-sans' })
const literata = Literata({ subsets: ['latin'], variable: '--font-literata' })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fictionry.com'),
  title: 'Fictionry - The Modern Way to Read and Write Fiction',
  description: 'Discover and share incredible fiction on Fictionry. A modern platform for authors to publish serial fiction and readers to find their next favorite story across every genre.',
  keywords: ['web fiction', 'online stories', 'read fiction online', 'write fiction', 'serial fiction', 'webnovel', 'free stories', 'fantasy fiction', 'romance fiction', 'mystery fiction', 'sci-fi fiction', 'fiction platform'],
  authors: [{ name: 'Fictionry' }],
  openGraph: {
    title: 'Fictionry - The Modern Way to Read and Write Fiction',
    description: 'A modern platform for web fiction authors and readers',
    type: 'website',
    siteName: 'Fictionry',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Fictionry — The Modern Way to Read and Write Fiction',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fictionry - The Modern Way to Read and Write Fiction',
    description: 'A modern platform for web fiction authors and readers',
    images: ['/og-default.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fictionry',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7c3aed' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} ${merriweather.variable} ${lora.variable} ${literata.variable} ${sourceSans.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <CookieConsent />
            <GenreOnboardingWrapper />
          </ToastProvider>
          <OfflineIndicator />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
