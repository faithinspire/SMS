'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Broadcast {
  id: string
  title: string
  message: string
  created_by: string
  created_at: string
  sender_name?: string
  is_read: boolean
}

interface BroadcastInboxProps {
  userId: string
  userRole: 'TEACHER' | 'STAFF' | 'PRINCIPAL' | 'SCHOOL_ADMIN'
  schoolId: string
  unreadCount?: number
  onUnreadCountChange?: (count: number) => void
}

export default function BroadcastInbox({
  userId,
  userRole,
  schoolId,
  unreadCount = 0,
  onUnreadCountChange,
}: BroadcastInboxProps) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')

  useEffect(() => {
    loadBroadcasts()
    // Set up real-time listener
    const subscription = supabase
      .channel(`broadcasts_${schoolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcasts',
          filter: `school_id=eq.${schoolId}`,
        },
        () => loadBroadcasts()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [schoolId])

  const loadBroadcasts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('broadcasts')
        .select(
          `
          id,
          title,
          message,
          created_by,
          created_at,
          users!created_by (full_name),
          broadcast_recipients (
            id,
            user_id,
            is_read
          )
        `
        )
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading broadcasts:', error)
        return
      }

      // Filter broadcasts for current user and map data
      const userBroadcasts = (data || [])
        .filter((b: any) => {
          // Check if user is a recipient or if broadcast is for all staff
          const recipient = b.broadcast_recipients?.[0]
          return !recipient || recipient.user_id === userId
        })
        .map((b: any) => ({
          id: b.id,
          title: b.title,
          message: b.message,
          created_by: b.created_by,
          created_at: b.created_at,
          sender_name: b.users?.full_name || 'School Admin',
          is_read: b.broadcast_recipients?.[0]?.is_read || false,
        }))

      setBroadcasts(userBroadcasts)

      // Update unread count
      const unread = userBroadcasts.filter(b => !b.is_read).length
      if (onUnreadCountChange) {
        onUnreadCountChange(unread)
      }
    } catch (error) {
      console.error('Failed to load broadcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (broadcastId: string) => {
    try {
      // Find the recipient record
      const { data: recipients, error: fetchError } = await supabase
        .from('broadcast_recipients')
        .select('id')
        .eq('broadcast_id', broadcastId)
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        console.error('Error fetching recipient:', fetchError)
        return
      }

      // Update read status
      const { error: updateError } = await supabase
        .from('broadcast_recipients')
        .update({ is_read: true })
        .eq('id', recipients.id)

      if (updateError) {
        console.error('Error marking as read:', updateError)
        return
      }

      // Reload broadcasts
      await loadBroadcasts()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const openBroadcast = (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast)
    setShowModal(true)
    if (!broadcast.is_read) {
      markAsRead(broadcast.id)
    }
  }

  const filteredBroadcasts = broadcasts.filter(b => {
    if (filter === 'unread') return !b.is_read
    return true
  })

  return (
    <>
      {/* Inbox Icon with Badge */}
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition"
        title="Broadcast Inbox"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Broadcast Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">📢 Broadcast Inbox</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {broadcasts.length} message{broadcasts.length !== 1 ? 's' : ''} • {unreadCount} unread
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-2xl font-bold hover:text-blue-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="border-b flex gap-4 px-6 pt-4">
              <button
                onClick={() => setFilter('unread')}
                className={`pb-3 px-2 font-medium transition-colors border-b-2 ${
                  filter === 'unread'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({broadcasts.filter(b => !b.is_read).length})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`pb-3 px-2 font-medium transition-colors border-b-2 ${
                  filter === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({broadcasts.length})
              </button>
            </div>

            {/* Broadcast List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-600">Loading broadcasts...</div>
              ) : filteredBroadcasts.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  {filter === 'unread' ? 'No unread messages' : 'No broadcasts yet'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredBroadcasts.map(broadcast => (
                    <button
                      key={broadcast.id}
                      onClick={() => openBroadcast(broadcast)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                        !broadcast.is_read ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${!broadcast.is_read ? 'text-blue-900' : 'text-gray-900'}`}>
                            {broadcast.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {broadcast.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            From: {broadcast.sender_name} •{' '}
                            {new Date(broadcast.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {!broadcast.is_read && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Detail Modal */}
      {selectedBroadcast && showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedBroadcast(null)
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedBroadcast.title}</h2>
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="text-2xl font-bold hover:text-blue-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>From:</strong> {selectedBroadcast.sender_name} •{' '}
                  {new Date(selectedBroadcast.created_at).toLocaleString()}
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-900">
                  {selectedBroadcast.message}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
              >
                Back to Inbox
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
