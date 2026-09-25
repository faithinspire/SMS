'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'

export default function SchoolAdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>School Admin Dashboard</h1>
      <p>User: {user?.full_name || 'Unknown'}</p>
    </div>
  )
}
