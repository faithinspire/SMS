'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

export default function SchoolAdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [darkMode, setDarkMode] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'light') {
      setDarkMode(false)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme-mode', darkMode ? 'dark' : 'light')
    }
  }, [darkMode, mounted])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)

    try {
      await AuthService.login({
        email: formData.email,
        password: formData.password,
      })

      router.push('/school-admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  const bgClass = darkMode
    ? 'bg-gradient-to-br from-slate-950 via-purple-900 to-slate-950'
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100'
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white'
  const textColor = darkMode ? 'text-white' : 'text-gray-900'
  const labelColor = darkMode ? 'text-gray-300' : 'text-gray-700'
  const inputBg = darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'

  return (
    <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4 transition-all duration-300`}>
      <div className="w-full max-w-md">
        <div className={`${cardBg} rounded-lg shadow-2xl p-8 transition-all duration-300`}>
          {/* Theme Toggle */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                darkMode
                  ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                  : 'bg-slate-300/50 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold ${textColor}`}>🏫 School Admin</h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Sign In to Your Account</p>
          </div>

          {error && (
            <div className={`mb-4 p-4 rounded-lg ${
              darkMode
                ? 'bg-red-900/30 border border-red-700 text-red-300'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-2`}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-2`}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 transition-all mt-6 transform hover:scale-105"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className={`text-center mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Link
              href="/landing"
              className={`hover:underline text-sm ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-900'}`}
            >
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
