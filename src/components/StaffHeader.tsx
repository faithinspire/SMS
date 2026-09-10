'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

interface Props {
  staffName: string
  schoolName: string
  staffPhoto?: string
  section?: string
}

export default function StaffHeader({ staffName, schoolName, staffPhoto, section }: Props) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserAndNotifications()
    const interval = setInterval(loadUserAndNotifications, 30000)
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

      const { data } = await supabase
        .from('broadcast_notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.read).length)
      setLoading(false)
    } catch (err) {
      console.error('Error loading notifications:', err)
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('broadcast_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
      if (unreadIds.length === 0) return

      await supabase
        .from('broadcast_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)

      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      
      // Clear all session/auth state
      await AuthService.logout()
      
      // Clear any cached context from localStorage
      localStorage.removeItem('teacher_context')
      localStorage.removeItem('student_context')
      localStorage.removeItem('admin_context')
      localStorage.removeItem('principal_context')
      localStorage.removeItem('fallback_session')
      localStorage.removeItem('auth_token')
      
      // Clear sessionStorage too
      sessionStorage.clear()
      
      // Force redirect to landing
      router.replace('/landing')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if error occurs
      router.replace('/landing')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      {/* Mobile Menu Backdrop */}
      {(showNotifications || showProfileMenu) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => {
            setShowNotifications(false)
            setShowProfileMenu(false)
          }}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Staff Info */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {staffPhoto && (
              <img
                src={staffPhoto}
                alt={staffName}
                className="h-10 sm:h-12 w-10 sm:w-12 rounded-full flex-shrink-0 object-cover"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {staffName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {schoolName} {section && `• ${section}`}
              </p>
            </div>
          </div>

          {/* Right: Notification Bell + Profile Menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors rounded-lg"
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
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="fixed bottom-auto top-20 left-4 right-4 sm:absolute sm:right-0 sm:left-auto sm:top-12 sm:w-96 w-full sm:max-w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto border border-gray-200">
                  {/* Header */}
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
                    <h3 className="font-bold text-sm">📢 Broadcasts</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <p className="text-sm">📭 No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                            !notification.read
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : ''
                          }`}
                          onClick={() =>
                            !notification.read && markAsRead(notification.id)
                          }
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {notification.sender_name || 'Admin'}
                            </p>
                            {!notification.read && (
                              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                            )}
                          </div>
                          <p className="text-gray-700 text-xs mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>📍 {notification.recipient_role}</span>
                            <span>
                              {new Date(
                                notification.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="bg-gray-50 px-4 py-2 rounded-b-lg text-center text-xs text-gray-600 border-t">
                      {notifications.length} total
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors rounded-lg"
                title="Profile Menu"
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
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Profile Menu Dropdown */}
              {showProfileMenu && (
                <div className="fixed bottom-auto top-20 left-4 right-4 sm:absolute sm:right-0 sm:left-auto sm:top-12 w-full sm:w-56 bg-white rounded-lg shadow-2xl z-50 border border-gray-200 overflow-hidden">
                  {/* User Info */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3">
                    <p className="font-bold text-sm">{staffName}</p>
                    <p className="text-xs text-blue-100">{schoolName}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="divide-y">
                    <button
                      onClick={() => {
                        router.push('/profile')
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
                    >
                      👤 My Profile
                    </button>
                    <button
                      onClick={() => {
                        router.push('/profile/settings')
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
                    >
                      ⚙️ Settings
                    </button>
                    <button
                      onClick={() => {
                        router.push('/profile/change-password')
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
                    >
                      🔐 Change Password
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="bg-red-50 p-3 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      {loggingOut ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Logging out...
                        </>
                      ) : (
                        <>
                          🚪 Logout
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
