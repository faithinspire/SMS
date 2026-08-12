'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

export default function SuperAdminRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [darkMode, setDarkMode] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    setSuccess('')

    // Validation
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('All fields are required')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await AuthService.registerSuperAdmin({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      })

      setSuccess('✅ Super Admin account created successfully!')
      setFormData({ fullName: '', email: '', password: '', confirmPassword: '' })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/superadmin/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950'
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    } flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div className={`${
          darkMode ? 'bg-slate-800' : 'bg-white'
        } rounded-lg shadow-xl p-8 transition-colors duration-300`}>
          {/* Theme Toggle */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                darkMode
                  ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-gray-900'}`}>👑 Super Admin</h1>
            <p className={darkMode ? 'text-gray-400 mt-1' : 'text-gray-600 mt-1'}>Create Your Account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'border-gray-300'
                }`}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'border-gray-300'
                }`}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'border-gray-300'
                }`}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'border-gray-300'
                }`}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold disabled:bg-gray-400 transition-colors mt-6"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-6`}>
            Already have an account?{' '}
            <Link
              href="/auth/superadmin/login"
              className={`font-semibold hover:underline ${
                darkMode ? 'text-purple-300 hover:text-purple-200' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Sign In
            </Link>
          </p>

          {/* Back to Landing */}
          <p className="text-center mt-4">
            <Link
              href="/landing"
              className={`text-sm transition-colors ${
                darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
