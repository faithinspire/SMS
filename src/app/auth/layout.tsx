'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  
  // This layout will handle all auth routes and catch unknown ones
  return <>{children}</>
}
