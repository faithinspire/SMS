'use client'

import Link from 'next/link'

export interface DashboardHeaderProps {
  school: {
    id: string
    name: string
    logo_url?: string
  } | null
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
  darkMode?: boolean
  onThemeToggle?: () => void
  onLogout?: () => void
  title?: string
  subtitle?: string
}

export default function DashboardHeader({
  school,
  user,
  darkMode = false,
  onThemeToggle,
  onLogout,
  title,
  subtitle,
}: DashboardHeaderProps) {
  const bgClass = darkMode
    ? 'bg-gradient-to-r from-gray-900 via-purple-900 to-gray-800 border-b border-purple-700/50'
    : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 border-b border-purple-400/30'
  
  const textClass = darkMode ? 'text-white' : 'text-white'
  const secondaryTextClass = darkMode ? 'text-gray-300' : 'text-blue-100'

  return (
    <div className={`${bgClass} shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Header Row */}
        <div className="flex items-center justify-between mb-3">
          {/* Left: School Branding */}
          <div className="flex items-center gap-4 min-w-0">
            {/* School Logo */}
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
                className="h-12 w-12 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">
                  {school?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* School Info */}
            <div className="min-w-0">
              <h2 className={`${textClass} text-lg sm:text-xl font-bold truncate`}>
                {school?.name || 'School Management System'}
              </h2>
              {title && (
                <p className={`${secondaryTextClass} text-xs sm:text-sm truncate`}>
                  {title}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Theme Toggle */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
              </button>
            )}

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 sm:px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg font-semibold text-xs sm:text-sm transition-colors duration-200"
              >
                🚪 Logout
              </button>
            )}
          </div>
        </div>

        {/* User Info Row (Mobile-friendly) */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className={secondaryTextClass}>
            <div>
              👤 {user?.name || 'User'}
              {user?.role && (
                <span className="ml-2 px-2 py-1 bg-white/10 rounded inline-block">
                  {user.role}
                </span>
              )}
            </div>
            {user?.email && (
              <div className="text-xs opacity-75">{user.email}</div>
            )}
          </div>
          {subtitle && (
            <div className={secondaryTextClass}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  )
}
