/** @type {import('next').NextConfig} */

// Attempt to load next-pwa, but run without it if not installed
let withPWA;
try {
  const pwaConfig = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      // Don't cache localhost pages during development - they change frequently
      {
        urlPattern: /^http:\/\/localhost.*/i,
        handler: 'NetworkOnly',
        options: {
          cacheName: 'localhost-dev',
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts-stylesheets',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
          },
        },
      },
      {
        urlPattern: /^https:\/\/egdreueuspmuxhezdpqm\.supabase\.co\/(rest|auth)\/.*/i,
        handler: 'NetworkOnly',  // Never cache API calls, always fetch fresh
        options: {
          cacheName: 'supabase-api',
        },
      },
      {
        urlPattern: /^https:\/\/egdreueuspmuxhezdpqm\.supabase\.co\/(storage)\/.*/i,
        handler: 'StaleWhileRevalidate',  // Cache storage (images) but serve stale while revalidating
        options: {
          cacheName: 'supabase-storage',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-images',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
    ],
  })
  withPWA = pwaConfig
} catch (error) {
  console.warn('⚠️ next-pwa not installed. Install with: npm install next-pwa')
  withPWA = (config) => config // passthrough if not installed
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      minimize: !isServer,
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Allow development server to be accessed from other IPs on the network
  allowedDevOrigins: ['*.local', 'localhost', '127.0.0.1'],
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
