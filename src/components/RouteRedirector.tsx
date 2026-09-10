'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * EMERGENCY REDIRECT COMPONENT
 * Intercepts any requests to old /cbt-take/ route
 * and redirects to correct /cbt/ route
 * 
 * This runs on EVERY page to catch lingering old code
 */
export default function RouteRedirector() {
  const router = useRouter()

  useEffect(() => {
    // Check if current URL contains old route
    const currentPath = window.location.pathname
    
    if (currentPath.includes('/cbt-take/')) {
      console.warn('🚨 OLD ROUTE DETECTED:', currentPath)
      console.log('📍 REDIRECTING to correct route...')
      
      // Extract exam ID from old route
      // Old: /student/cbt-take/[exam-id]
      // New: /student/cbt/[exam-id]
      const newPath = currentPath.replace('/cbt-take/', '/cbt/')
      
      console.log('✅ Redirecting to:', newPath)
      window.location.href = newPath
    }
  }, [router])

  return null // This component doesn't render anything
}
