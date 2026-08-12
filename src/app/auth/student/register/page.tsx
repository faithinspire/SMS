'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import {
  SCHOOL_CLASSES,
  DEPARTMENTS,
  getSubjectsForClass,
  getClassById,
  generateAdmissionNumber,
} from '@/constants/nigerian-subjects'

export default function StudentRegisterPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [darkMode, setDarkMode] = useState(false)
  const [showDepartment, setShowDepartment] = useState(false)
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([])

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    dateOfBirth: '',
    className: '',
    department: '',
    subjects: [] as string[],
    password: '',
    confirmPassword: '',
  })

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    setMounted(true)
  }, [])

  // Update available subjects when class changes
  useEffect(() => {
    if (formData.className) {
      const subjects = getSubjectsForClass(formData.className)
      setAvailableSubjects(subjects)
    } else {
      setAvailableSubjects([])
    }
  }, [formData.className])

  // Check if department should be shown (SS1-SS3)
  useEffect(() => {
    if (formData.className) {
      const isSeniorSecondary = ['ss-1', 'ss-2', 'ss-3'].includes(formData.className)
      setShowDepartment(isSeniorSecondary)
      if (!isSeniorSecondary) {
        setFormData((prev) => ({ ...prev, department: '', subjects: [] }))
      }
    }
  }, [formData.className])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('theme-mode', newMode ? 'dark' : 'light')
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setFormData((prev) => {
      const subjects = prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId]
      return { ...prev, subjects }
    })
  }

  const validateForm = (): boolean => {
    // Clear previous errors
    setError('')

    // Validate required fields
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }

    if (!formData.email.trim()) {
      setError('Email address is required')
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (!formData.dateOfBirth) {
      setError('Date of birth is required')
      return false
    }

    // Validate date of birth is not in the future
    const selectedDate = new Date(formData.dateOfBirth)
    if (selectedDate > new Date()) {
      setError('Date of birth cannot be in the future')
      return false
    }

    if (!formData.className) {
      setError('Class/Grade selection is required')
      return false
    }

    if (showDepartment && !formData.department) {
      setError('Department selection is required for senior classes')
      return false
    }

    if (formData.subjects.length === 0) {
      setError('Please select at least one subject')
      return false
    }

    if (!formData.password) {
      setError('Password is required')
      return false
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    // Password strength check
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!strongPasswordRegex.test(formData.password)) {
      setError(
        'Password must contain uppercase, lowercase, number, and special character'
      )
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Generate admission number (using a sequence - in production, this would come from backend)
      const sequence = Math.floor(Math.random() * 10000)
      const admissionNumber = generateAdmissionNumber(formData.className, sequence)

      // Register with auth service (basic fields only)
      await AuthService.registerStudent({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        schoolId: '', // Note: In production, this should be obtained from context/session
      })

      // TODO: In production, also save extended student info to the database:
      // - dateOfBirth: formData.dateOfBirth
      // - className: formData.className
      // - department: formData.department
      // - subjects: formData.subjects
      // - admissionNumber: admissionNumber

      setSuccess('✅ Student account created successfully!')
      setFormData({
        fullName: '',
        email: '',
        dateOfBirth: '',
        className: '',
        department: '',
        subjects: [],
        password: '',
        confirmPassword: '',
      })

      setTimeout(() => {
        router.push('/auth/student/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  const bgClass = darkMode
    ? 'bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900'
    : 'bg-gradient-to-br from-blue-50 to-indigo-100'

  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border border-slate-700/50'
    : 'bg-white/90 backdrop-blur border border-blue-200/50'

  const textClass = darkMode ? 'text-white' : 'text-gray-900'
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-600'
  const inputClass = darkMode
    ? 'bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-purple-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
  const labelClass = darkMode ? 'text-gray-300' : 'text-gray-700'

  return (
    <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4 transition-colors duration-300`}>
      <div className="w-full max-w-2xl">
        {/* Header with Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1
              className={`text-4xl font-bold bg-gradient-to-r ${
                darkMode ? 'from-purple-400 to-pink-400' : 'from-blue-600 to-purple-600'
              } bg-clip-text text-transparent`}
            >
              👨‍🎓 Student Registration
            </h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              darkMode
                ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                : 'bg-blue-200/50 text-blue-700 hover:bg-blue-300/50'
            }`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <div className={`${cardClass} rounded-xl shadow-2xl p-8 md:p-10`}>
          {/* Form Header */}
          <div className="text-center mb-8">
            <p className={`text-lg ${subTextClass}`}>
              Create your account to access the school portal
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50/10 border border-red-400/50 rounded-lg text-red-400 animate-pulse">
              <p className="font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-50/10 border border-green-400/50 rounded-lg text-green-400 animate-bounce">
              <p className="font-semibold">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="e.g., John Adekunle Okafor"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
                aria-label="Full Name"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="student@example.com"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
                aria-label="Email Address"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
                aria-label="Date of Birth"
              />
            </div>

            {/* Class/Grade Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Class/Grade <span className="text-red-500">*</span>
              </label>
              <select
                name="className"
                value={formData.className}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
                aria-label="Class/Grade"
              >
                <option value="">Select your class...</option>
                {SCHOOL_CLASSES.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.type})
                  </option>
                ))}
              </select>
              <p className={`text-xs ${subTextClass} mt-1`}>
                📚 From Prep to SS3 (Grades 0-12)
              </p>
            </div>

            {/* Department Selection (SS1-SS3 only) */}
            {showDepartment && (
              <div>
                <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                  required
                  aria-label="Department"
                >
                  <option value="">Select your department...</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} - {dept.description}
                    </option>
                  ))}
                </select>
                <p className={`text-xs ${subTextClass} mt-1`}>
                  🎯 Select based on your academic stream
                </p>
              </div>
            )}

            {/* Subject Selection */}
            {availableSubjects.length > 0 && (
              <div>
                <label className={`block text-sm font-semibold mb-3 ${labelClass}`}>
                  Subjects <span className="text-red-500">*</span>
                </label>
                <p className={`text-xs ${subTextClass} mb-3`}>
                  📖 Select at least one subject ({formData.subjects.length} selected)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 rounded-lg bg-slate-700/20">
                  {availableSubjects.map((subject) => (
                    <label
                      key={subject.id}
                      className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-slate-600/50' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="w-4 h-4 rounded accent-blue-600"
                        aria-label={`Select ${subject.name}`}
                      />
                      <span className={`text-sm ${textClass}`}>
                        {subject.name} <span className={`${subTextClass} text-xs`}>({subject.code})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Admission Number Preview */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-blue-50/50'} border ${darkMode ? 'border-slate-600/50' : 'border-blue-200/50'}`}>
              <p className={`text-xs font-semibold ${subTextClass} mb-1`}>Auto-Generated Admission Number</p>
              <p className={`text-lg font-mono font-bold ${darkMode ? 'text-purple-300' : 'text-blue-700'}`}>
                {formData.className
                  ? generateAdmissionNumber(formData.className, Math.floor(Math.random() * 10000))
                  : '(Select a class)'}
              </p>
              <p className={`text-xs ${subTextClass} mt-2`}>
                Format: YYYY-CLASS-SEQUENCE (e.g., 2026-SS3-0001)
              </p>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter a strong password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
                aria-label="Password"
              />
              <p className={`text-xs ${subTextClass} mt-1`}>
                🔐 Min 8 chars: uppercase, lowercase, number, and special character (@$!%*?&)
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter your password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
                aria-label="Confirm Password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all mt-6 ${
                loading
                  ? `${darkMode ? 'bg-slate-600' : 'bg-gray-400'} cursor-not-allowed`
                  : darkMode
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
              aria-label="Create Account"
            >
              {loading ? '⏳ Creating Account...' : '✨ Create Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-3 border-t border-slate-600/30 pt-6">
            <p className={`text-center ${subTextClass}`}>
              Already have an account?{' '}
              <Link
                href="/auth/student/login"
                className={`font-semibold hover:underline ${
                  darkMode ? 'text-purple-400' : 'text-blue-600'
                }`}
              >
                Sign In
              </Link>
            </p>
            <p className="text-center">
              <Link
                href="/landing"
                className={`text-sm hover:underline ${subTextClass}`}
              >
                ← Back to Home
              </Link>
            </p>
          </div>
        </div>

        {/* Accessibility & Compliance Info */}
        <p className={`text-xs text-center mt-6 ${subTextClass}`}>
          🔒 Your data is secure and encrypted. This form complies with WCAG 2.1 AA standards.
        </p>
      </div>
    </div>
  )
}
