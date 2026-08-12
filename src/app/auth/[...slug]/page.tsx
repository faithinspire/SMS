'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CatchAllAuthPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect any unknown auth routes to landing page
    router.replace('/landing')
  }, [router])

  return null
}
