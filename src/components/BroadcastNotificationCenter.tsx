'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { AuthService } from '@/services/auth.service'

interface Notification {
  id: string
  broadcast_id: string
  message: string
  sender_name: string
  recipient_role: string
  read: boolean
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

      // Query broadcast notifications for this user
      const { data, error } = await supabase
        .from('broadcast_notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[Notifications] Error:', error)
        setLoading(false)
        return
      }

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.read).length)
      setLoading(false)
    } catch (err) {
      console.error('[Notifications] Load error:', err)
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('broadcast_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (!error) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
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
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('broadcast_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)

      if (!error) {
        setNotifications(notifications.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
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
                    !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  {/* Sender Name */}
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-900">
                      {notification.sender_name || 'Administrator'}
                    </p>
                    {!notification.read && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-gray-700 text-sm mb-2 line-clamp-3">
                    {notification.message}
                  </p>

                  {/* Metadata */}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>📍 {notification.recipient_role}</span>
                    <span>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
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
