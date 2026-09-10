'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)

  const roles = [
    {
      id: 'superadmin',
      title: 'Super Admin',
      icon: '👑',
      description: 'System administration',
      href: '/auth/superadmin/login',
      color: 'from-red-500 to-red-700',
    },
    {
      id: 'school-admin',
      title: 'School Admin',
      icon: '🏫',
      description: 'Manage school',
      href: '/auth/school-admin/login',
      color: 'from-blue-500 to-blue-700',
    },
    {
      id: 'principal',
      title: 'Principal',
      icon: '👔',
      description: 'Principal access',
      href: '/auth/principal/login',
      color: 'from-purple-500 to-purple-700',
    },
    {
      id: 'headmaster',
      title: 'Head Teacher',
      icon: '📚',
      description: 'Academic management',
      href: '/auth/headmaster/login',
      color: 'from-green-500 to-green-700',
    },
    {
      id: 'teacher',
      title: 'Teacher',
      icon: '👨‍🏫',
      description: 'Classroom management',
      href: '/auth/staff/login',
      color: 'from-yellow-500 to-yellow-700',
    },
    {
      id: 'accountant',
      title: 'Accountant',
      icon: '💰',
      description: 'Financial management',
      href: '/auth/accountant/login',
      color: 'from-pink-500 to-pink-700',
    },
    {
      id: 'student',
      title: 'Student',
      icon: '🎓',
      description: 'Student portal',
      href: '/auth/student/login',
      color: 'from-indigo-500 to-indigo-700',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="text-center pt-12 pb-8">
        <h1 className="text-5xl font-bold text-white mb-2">🎓 School Management System</h1>
        <p className="text-blue-200 text-xl">Select your role to continue</p>
      </div>

      {/* Role Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => (
            <Link href={role.href} key={role.id}>
              <div
                className={`h-full p-6 rounded-xl shadow-lg cursor-pointer transform transition-all duration-300 ${
                  hoveredRole === role.id ? 'scale-105 shadow-2xl' : 'hover:scale-105'
                } bg-gradient-to-br ${role.color} text-white`}
                onMouseEnter={() => setHoveredRole(role.id)}
                onMouseLeave={() => setHoveredRole(null)}
              >
                <div className="text-5xl mb-3 text-center">{role.icon}</div>
                <h2 className="text-2xl font-bold text-center mb-2">{role.title}</h2>
                <p className="text-center text-blue-100 text-sm">{role.description}</p>
                <div className="mt-4 text-center">
                  <span className="inline-block px-4 py-2 bg-white/20 rounded-lg text-sm font-semibold hover:bg-white/30 transition-all">
                    Login →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Registration Section */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">New Users</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/auth/student/register">
              <button className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                📚 Student Registration
              </button>
            </Link>
            <Link href="/auth/staff/register">
              <button className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                👨‍🏫 Staff Registration
              </button>
            </Link>
            <Link href="/school-admin/dashboard?fallback=true">
              <button className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                🔓 Demo Access
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-blue-200 text-sm">
        <p>School Management System v1.0 © 2024-2025</p>
      </div>
    </div>
  )
}

