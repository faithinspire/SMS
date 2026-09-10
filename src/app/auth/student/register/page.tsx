'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { RegistrationConfigService } from '@/services/registration-config.service'

const generateAdmissionNumber = (classId?: string, sequence?: number): string => {
  const seq = sequence || Math.floor(Math.random() * 10000)
  const timestamp = Date.now().toString().slice(-4)
  return `ADM-${timestamp}-${seq.toString().padStart(5, '0')}`
}

export default function StudentRegisterPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [darkMode, setDarkMode] = useState(false)
  const [showDepartment, setShowDepartment] = useState(false)
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    dateOfBirth: '',
    school_id: '',
    className: '',
    department: '',
    subjects: [] as string[],
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    loadInitialData()
  }, [mounted])

  const loadInitialData = async () => {
    try {
      setLoadingData(true)
      const schoolsData = await RegistrationConfigService.getSchools()
      setSchools(schoolsData || [])
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError('Failed to load schools')
    } finally {
      setLoadingData(false)
    }
  }

  const loadClassData = async () => {
    if (!formData.school_id) {
      setClasses([])
      return
    }
    try {
      const classesData = await RegistrationConfigService.getClassesBySchool(formData.school_id)
      setClasses(classesData || [])
    } catch (err) {
      console.error('Error loading classes:', err)
      setError('Failed to load classes')
    }
  }

  const loadSubjects = async () => {
    if (!formData.className) {
      setAvailableSubjects([])
      return
    }
    try {
      const subjectsData = await RegistrationConfigService.getSubjectsByClass(formData.className)
      setAvailableSubjects(subjectsData || [])

      const ss3Class = formData.className?.toUpperCase().includes('SS3')
      setShowDepartment(ss3Class || false)
    } catch (err) {
      console.error('Error loading subjects:', err)
      setError('Failed to load subjects')
    }
  }

  useEffect(() => {
    loadClassData()
  }, [formData.school_id])

  useEffect(() => {
    loadSubjects()
  }, [formData.className])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('theme-mode', newMode ? 'dark' : 'light')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId],
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.email.includes('@')) {
      setError('Valid email is required')
      return false
    }
    if (!formData.dateOfBirth) {
      setError('Date of birth is required')
      return false
    }
    if (!formData.school_id) {
      setError('School is required')
      return false
    }
    if (!formData.className) {
      setError('Class is required')
      return false
    }
    if (showDepartment && !formData.department) {
      setError('Department is required for SS3 students')
      return false
    }
    if (formData.subjects.length === 0) {
      setError('At least one subject is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    try {
      setLoading(true)
      const result = await AuthService.registerStudent({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        school_id: formData.school_id,
        className: formData.className,
        department: formData.department,
        subjects: formData.subjects,
        admissionNumber: generateAdmissionNumber(formData.className),
      })

      if (result.success) {
        setSuccess('Registration successful! Redirecting to login...')
        setTimeout(() => router.push('/auth/student/login'), 2000)
      } else {
        setError(result.message || 'Registration failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  const bgClass = darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'
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

        {/* Form Header */}
        <div className="text-center mb-8">
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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

        {loadingData ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading schools and classes...
          </div>
        ) : (
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

            {/* Email */}
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

            {/* School Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                School <span className="text-red-500">*</span>
              </label>
              <select
                name="school_id"
                value={formData.school_id}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
              >
                <option value="">Select a school</option>
                {schools.map((school: any) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                Class <span className="text-red-500">*</span>
              </label>
              <select
                name="className"
                value={formData.className}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Selection (SS3 Only) */}
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
                >
                  <option value="">Select department</option>
                  <option value="science">Science</option>
                  <option value="arts">Arts</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
            )}

            {/* Subjects */}
            {availableSubjects.length > 0 && (
              <div>
                <label className={`block text-sm font-semibold mb-3 ${labelClass}`}>
                  Select Subjects <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {availableSubjects.map((subject: any) => (
                    <label key={subject.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`text-sm ${labelClass}`}>{subject.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
                placeholder="Min. 6 characters"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
              />
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
                placeholder="Confirm password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : darkMode
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/50 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50 text-white'
              }`}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>

            {/* Login Link */}
            <div className="text-center space-y-2">
              <p className={`text-sm ${labelClass}`}>
                Already have an account?
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
                  className={`text-sm hover:underline ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  ← Back to Home
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
