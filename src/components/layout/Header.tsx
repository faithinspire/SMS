'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

interface HeaderProps {
  userFullName?: string;
  userPhoto?: string;
  schoolName?: string;
  schoolLogo?: string;
}

export default function Header({
  userFullName,
  userPhoto,
  schoolName,
  schoolLogo,
}: HeaderProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-4 flex justify-between items-center">
        {/* Logo and School Name */}
        <div className="flex items-center gap-3">
          {schoolLogo && (
            <img
              src={schoolLogo}
              alt={schoolName}
              className="h-10 w-10 rounded-md"
            />
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{schoolName}</h1>
            <p className="text-xs text-gray-500">School Management System</p>
          </div>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
          >
            {userPhoto && (
              <img
                src={userPhoto}
                alt={userFullName}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userFullName}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Profile
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
