'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Landing() {
  const [activeRole, setActiveRole] = useState('school-admin')
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'dark'
    setIsDark(theme === 'dark')
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const roles = [
    { id: 'superadmin', name: 'Super Admin', icon: '👑', color: 'red', path: '/auth/superadmin/login' },
    { id: 'school-admin', name: 'School Admin', icon: '🏫', color: 'blue', path: '/auth/school-admin/login' },
    { id: 'principal', name: 'Principal', icon: '👨‍💼', color: 'indigo', path: '/auth/principal/login' },
    { id: 'headmaster', name: 'Headmaster', icon: '🎓', color: 'purple', path: '/auth/headmaster/login' },
    { id: 'teacher', name: 'Teacher', icon: '👨‍🏫', color: 'green', path: '/auth/staff/login' },
    { id: 'accountant', name: 'Accountant', icon: '💰', color: 'yellow', path: '/auth/accountant/login' },
    { id: 'student', name: 'Student', icon: '👨‍🎓', color: 'orange', path: '/auth/student/login' },
  ]

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="text-3xl font-bold">📚 School Management System</div>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-4 py-2 rounded ${isDark ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-white'}`}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Welcome</h1>
          <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Your Gateway to Education</p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-8 text-center">Select Your Role</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`p-4 rounded-lg transition ${
                  activeRole === role.id
                    ? `${isDark ? 'bg-blue-600' : 'bg-blue-500'} text-white`
                    : `${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`
                }`}
              >
                <div className="text-3xl mb-2">{role.icon}</div>
                <div className="font-semibold text-sm">{role.name}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="flex justify-center mb-12">
          <Link
            href={roles.find((r) => r.id === activeRole)?.path || '/'}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
          >
            Sign In
          </Link>
        </section>

        <section className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-8`}>
          <h2 className="text-2xl font-bold mb-6 text-center">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📖', title: 'Academic Management', desc: 'Manage lessons and assignments' },
              { icon: '👥', title: 'Student Tracking', desc: 'Monitor student progress' },
              { icon: '💰', title: 'Accounting', desc: 'Handle payments' },
              { icon: '📊', title: 'Reports', desc: 'Generate analytics' },
              { icon: '🔐', title: 'Security', desc: 'Multi-level access control' },
              { icon: '📱', title: 'Mobile Friendly', desc: 'Access anywhere' },
            ].map((feature, i) => (
              <div key={i} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white border'}`}>
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-bold mb-1">{feature.title}</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t py-6 mt-12`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>© 2026 School Management System</p>
        </div>
      </footer>
    </div>
  )
}
