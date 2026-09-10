'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import EnhancedHeader from '@/components/EnhancedHeader'

interface Broadcast {
  id: string
  title: string
  message: string
  broadcast_type: string
  target_role?: string
  created_by: string
  created_at: string
  created_by_name?: string
  is_read: boolean
}

export default function TeacherBroadcastsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBroadcasts()
  }, [])

  const loadBroadcasts = async () => {
    try {
      setLoading(true)
      setError('')

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        router.push('/auth/staff/login')
        return
      }

      setUser(currentUser)
      setContext(currentUser)
      console.log('[TeacherBroadcasts] Loading for:', currentUser.role)

      // Load broadcasts for the school that are either:
      // 1. For all staff (target_role = null)
      // 2. For the user's role
      const { data: broadcastData, error: broadcastError } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .or(`target_role.is.null,target_role.eq.${currentUser.role}`)
        .order('created_at', { ascending: false })

      if (broadcastError) {
        console.error('[TeacherBroadcasts] Error loading:', broadcastError)
        setError('Failed to load broadcasts')
        return
      }

      // Enrich with creator names and read status
      const enrichedBroadcasts = await Promise.all(
        (broadcastData || []).map(async (broadcast: any) => {
          let createdByName = 'Unknown'
          if (broadcast.created_by) {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', broadcast.created_by)
              .single()
            createdByName = userData?.full_name || 'Unknown'
          }

          // Check if user has read this broadcast
          const { data: readData } = await supabase
            .from('broadcast_read_status')
            .select('id')
            .eq('broadcast_id', broadcast.id)
            .eq('user_id', currentUser.id)
            .single()

          return {
            ...broadcast,
            created_by_name: createdByName,
            is_read: !!readData,
          }
        })
      )

      setBroadcasts(enrichedBroadcasts)
      console.log('[TeacherBroadcasts] Loaded', enrichedBroadcasts.length, 'broadcasts')
    } catch (err: any) {
      console.error('[TeacherBroadcasts] Error:', err)
      setError(err.message || 'Failed to load broadcasts')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (broadcastId: string) => {
    try {
      // Check if already marked as read
      const { data: existingRead } = await supabase
        .from('broadcast_read_status')
        .select('id')
        .eq('broadcast_id', broadcastId)
        .eq('user_id', user?.id)
        .single()

      if (!existingRead) {
        // Mark as read
        await supabase
          .from('broadcast_read_status')
          .insert([
            {
              broadcast_id: broadcastId,
              user_id: user?.id,
              read_at: new Date().toISOString(),
            },
          ])

        // Update local state
        setBroadcasts(prev =>
          prev.map(b => b.id === broadcastId ? { ...b, is_read: true } : b)
        )
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleBroadcastClick = (broadcastId: string) => {
    setExpandedId(expandedId === broadcastId ? null : broadcastId)
    if (expandedId !== broadcastId) {
      markAsRead(broadcastId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <EnhancedHeader
          staffName="Loading..."
          schoolName="School"
          userRole="Teacher"
        />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-pink-500"></div>
        </div>
      </div>
    )
  }

  const unreadCount = broadcasts.filter(b => !b.is_read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <EnhancedHeader
        staffName={context?.full_name || 'Teacher'}
        schoolName={context?.school_id || 'School'}
        userRole="Teacher"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            📢 Broadcasts {unreadCount > 0 && <span className="text-red-600">({unreadCount})</span>}
          </h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread broadcast${unreadCount !== 1 ? 's' : ''}`
              : 'All broadcasts read'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Broadcasts List */}
        <div className="space-y-4">
          {broadcasts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
              <p className="text-lg">📭 No broadcasts for you yet</p>
              <p className="text-sm mt-2">Check back later for important announcements</p>
            </div>
          ) : (
            broadcasts.map((broadcast) => {
              const typeEmoji = broadcast.broadcast_type === 'URGENT' ? '🔴' 
                : broadcast.broadcast_type === 'UPDATE' ? '📝'
                : broadcast.broadcast_type === 'REMINDER' ? '🔔'
                : '📢'

              const isExpanded = expandedId === broadcast.id

              return (
                <button
                  key={broadcast.id}
                  onClick={() => handleBroadcastClick(broadcast.id)}
                  className={`w-full text-left rounded-lg shadow-md transition-all ${
                    isExpanded
                      ? 'bg-blue-50 border-2 border-blue-400'
                      : broadcast.is_read
                      ? 'bg-white border border-gray-200 hover:border-gray-300'
                      : 'bg-yellow-50 border-2 border-yellow-300 hover:border-yellow-400'
                  }`}
                >
                  {/* Summary */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 flex items-start gap-3">
                        <span className="text-2xl mt-1">{typeEmoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{broadcast.title}</h3>
                            {!broadcast.is_read && (
                              <span className="inline-block w-3 h-3 bg-red-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {broadcast.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>👤 {broadcast.created_by_name}</span>
                            <span>📅 {new Date(broadcast.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xl mt-1 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-white">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {broadcast.message}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                        <p>📤 Sent by: <strong>{broadcast.created_by_name}</strong></p>
                        <p>📅 Date: <strong>{new Date(broadcast.created_at).toLocaleString()}</strong></p>
                        {broadcast.is_read && (
                          <p className="text-green-600">✓ Read</p>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
