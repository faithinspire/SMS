import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import PWAInstaller from '@/components/PWAInstaller'
import BottomNavigation from '@/components/BottomNavigation'

export const metadata: Metadata = {
  title: 'FTECH School Management System',
  description: 'Comprehensive school management system for teachers, students, administrators, and accountants',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FTECH SMS',
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  icons: [
    {
      rel: 'icon',
      url: '/ftech-logo.png',
    },
    {
      rel: 'apple-touch-icon',
      url: '/ftech-logo.png',
    },
    {
      rel: 'icon',
      url: '/icons/icon-192x192.png',
      sizes: '192x192',
    },
  ],
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FTECH SMS" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/ftech-logo.png" />
        <link rel="apple-touch-icon" href="/ftech-logo.png" />
        <link rel="shortcut icon" href="/ftech-logo.png" />
      </head>
      <body>
        <PWAInstaller />
        {children}
        <BottomNavigation />
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
