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
  userRole?: string
}

export default function EnhancedHeader({
  staffName,
  schoolName,
  staffPhoto,
  section,
  userRole = 'Staff',
}: Props) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    loadUserAndNotifications()
    const interval = setInterval(loadUserAndNotifications, 30000)

    // Track scroll for header effects
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', handleScroll)
    }
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

      // Force redirect to landing page
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
    <div
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20'
          : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 shadow-2xl'
      }`}
    >
      {/* Animated background gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-5">
          {/* Main Header Content */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo + School/Staff Info */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 group">
              {/* Profile Image with Premium Border */}
              {staffPhoto && (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <img
                    src={staffPhoto}
                    alt={staffName}
                    className="relative h-12 sm:h-14 w-12 sm:w-14 rounded-full flex-shrink-0 object-cover ring-2 ring-white/50 shadow-lg transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              )}

              {/* Text Content */}
              <div className="min-w-0">
                <div className={`transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                  <h1 className="text-lg sm:text-2xl font-bold truncate leading-tight">
                    {staffName}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-xs sm:text-sm truncate font-medium ${scrolled ? 'text-gray-600' : 'text-white/90'}`}>
                      {schoolName}
                    </p>
                    {section && (
                      <>
                        <span className={`${scrolled ? 'text-gray-400' : 'text-white/50'}`}>•</span>
                        <p className={`text-xs sm:text-sm truncate font-medium ${scrolled ? 'text-gray-600' : 'text-white/90'}`}>
                          {section}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Notifications + Profile Menu */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Role Badge */}
              <div
                className={`hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                  scrolled
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
                }`}
              >
                <span className="text-lg">🎓</span>
                <span>{userRole}</span>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                    scrolled
                      ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
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
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-500 rounded-full shadow-lg">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto rounded-2xl shadow-2xl z-50 border border-white/20 backdrop-blur-xl bg-white/95">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-3 rounded-t-2xl flex justify-between items-center">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <span>📢</span>
                        <span>Broadcasts</span>
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <p className="text-sm">📭 No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
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
                                <span className="inline-block w-2.5 h-2.5 bg-blue-600 rounded-full mt-1"></span>
                              )}
                            </div>
                            <p className="text-gray-700 text-xs mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex justify-between text-xs text-gray-500">
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
                      <div className="bg-gray-50/50 px-4 py-2 rounded-b-2xl text-center text-xs text-gray-600 border-t">
                        {notifications.length} message{notifications.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    scrolled
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
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
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl z-50 border border-white/20 backdrop-blur-xl bg-white/95 overflow-hidden">
                    {/* User Info */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-4">
                      <p className="font-bold text-sm">{staffName}</p>
                      <p className="text-xs text-white/90">{schoolName}</p>
                      <p className="text-xs text-white/75 mt-1">{userRole}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="divide-y divide-gray-100">
                      <button
                        onClick={() => {
                          router.push('/profile')
                          setShowProfileMenu(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium flex items-center gap-2"
                      >
                        <span>👤</span>
                        <span>My Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/profile/settings')
                          setShowProfileMenu(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium flex items-center gap-2"
                      >
                        <span>⚙️</span>
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/profile/change-password')
                          setShowProfileMenu(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium flex items-center gap-2"
                      >
                        <span>🔐</span>
                        <span>Change Password</span>
                      </button>
                    </div>

                    {/* Logout Button */}
                    <div className="bg-red-50/50 p-2 border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-red-400 disabled:to-red-300 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl"
                      >
                        {loggingOut ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Logging out...</span>
                          </>
                        ) : (
                          <>
                            <span>🚪</span>
                            <span>Logout</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Welcome Message - Below Header */}
          <div className={`mt-3 sm:mt-4 transition-all duration-300 ${scrolled ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}`}>
            <p className={`text-sm sm:text-base font-medium ${scrolled ? 'text-gray-600' : 'text-white/90'}`}>
              Welcome back, <span className="font-bold">{staffName.split(' ')[0]}</span>! Manage your classroom intelligently.
            </p>
          </div>
        </div>
      </div>

      {/* Subtle bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
  )
}
