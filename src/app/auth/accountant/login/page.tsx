'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

export default function AccountantLoginPage() {
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
      const result = await AuthService.login({
        email: formData.email,
        password: formData.password,
      })

      // Verify user is accountant
      if (result.user.role !== 'ACCOUNTANT') {
        setError(`Invalid credentials. Expected accountant, got ${result.user.role}`)
        return
      }

      router.push('/accountant/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  const bgClass = darkMode
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50'
  const cardClass = darkMode
    ? 'bg-slate-800/90 backdrop-blur-xl border-slate-700/50'
    : 'bg-white/90 backdrop-blur-xl border-green-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'
  const inputClass = darkMode
    ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400'
    : 'bg-green-50/50 border-green-300 text-gray-900 placeholder-gray-500'

  return (
    <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💰</div>
          <h1 className={`text-4xl font-black mb-2 ${textClass}`}>
            Accountant Portal
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Financial Management System
          </p>
        </div>

        {/* Login Card */}
        <div className={`${cardClass} border rounded-2xl shadow-2xl p-8`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textClass}`}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg transition-all ${inputClass}`}
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textClass}`}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg transition-all ${inputClass}`}
                placeholder="••••••••"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-100/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Back to Landing */}
            <Link
              href="/landing"
              className={`block text-center text-sm font-semibold ${
                darkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Back to Login Selection
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
