'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { AuthService } from '@/services/auth.service'

interface Notification {
  id: string
  broadcast_id: string
  title: string
  message: string
  sender_name: string
  is_read: boolean
  created_at: string
}

export default function BroadcastNotificationCenter() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserAndNotifications()
    const interval = setInterval(loadUserAndNotifications, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadUserAndNotifications = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        setLoading(false)
        return
      }

      setUser(currentUser)

      // Query broadcasts with broadcast_recipients join to get user's broadcasts
      const { data, error } = await supabase
        .from('broadcasts')
        .select(
          `
          id,
          title,
          message,
          created_at,
          users!created_by (full_name),
          broadcast_recipients (
            id,
            is_read
          )
        `
        )
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[Notifications] Error:', error)
        setNotifications([])
        setLoading(false)
        return
      }

      // Filter broadcasts where current user is a recipient
      const userBroadcasts = (data || [])
        .map((broadcast: any) => {
          const recipientRecord = broadcast.broadcast_recipients?.find(
            (r: any) => r.id  // Just check if recipient record exists
          )
          return {
            id: broadcast.id,
            broadcast_id: broadcast.id,
            title: broadcast.title,
            message: broadcast.message,
            sender_name: broadcast.users?.full_name || 'Administrator',
            is_read: recipientRecord?.is_read || false,
            created_at: broadcast.created_at,
          }
        })
        .filter((b: any) => {
          // Only show broadcasts where user is a recipient
          return (data || []).some((broadcast: any) =>
            broadcast.broadcast_recipients?.some(
              (r: any) => r.id
            )
          )
        })

      setNotifications(userBroadcasts)
      setUnreadCount(
        userBroadcasts.filter((n: any) => !n.is_read).length
      )
      setLoading(false)
    } catch (err) {
      console.error('[Notifications] Load error:', err)
      setNotifications([])
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      // Find the broadcast_recipients record for this user
      const { data: recipients, error: fetchError } = await supabase
        .from('broadcast_recipients')
        .select('id')
        .eq('broadcast_id', notificationId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !recipients) {
        console.error('[Notifications] Error finding recipient record:', fetchError)
        return
      }

      // Update the broadcast_recipients record
      const { error: updateError } = await supabase
        .from('broadcast_recipients')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', recipients.id)

      if (!updateError) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (err) {
      console.error('[Notifications] Mark read error:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id)

      if (unreadIds.length === 0 || !user) return

      // Update all unread broadcast_recipients records for this user
      const { data: unreadRecipients } = await supabase
        .from('broadcast_recipients')
        .select('id')
        .in('broadcast_id', unreadIds)
        .eq('user_id', user.id)

      if (unreadRecipients && unreadRecipients.length > 0) {
        const { error: updateError } = await supabase
          .from('broadcast_recipients')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in(
            'id',
            unreadRecipients.map((r: any) => r.id)
          )

        if (!updateError) {
          setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
          setUnreadCount(0)
        }
      }
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err)
    }
  }

  if (loading || !user) {
    return null
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
        title="Notifications"
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

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-lg">📢 Broadcasts</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">📭 No notifications yet</p>
              <p className="text-sm mt-2">Broadcasts will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  {/* Sender Name and Title */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">
                        {notification.title || notification.sender_name || 'Administrator'}
                      </p>
                      <p className="text-xs text-gray-600">
                        From: {notification.sender_name}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1 ml-2"></span>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-gray-700 text-sm mb-2 line-clamp-3">
                    {notification.message}
                  </p>

                  {/* Metadata */}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>📅 {new Date(notification.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 rounded-b-lg text-center text-sm text-gray-600 border-t">
              Total: {notifications.length} broadcasts
            </div>
          )}
        </div>
      )}
    </div>
  )
}
