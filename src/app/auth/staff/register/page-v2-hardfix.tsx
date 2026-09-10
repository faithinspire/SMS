'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { TeacherService } from '@/services/teacher.service'
import { supabase } from '@/lib/supabase-client'

interface ClassOption {
  id: string
  class_id: string
  arm_id: string
  classes: {id: string; name: string; level: string}
  arms: {id: string; name: string}
}

interface SubjectOption {
  id: string
  name: string
  code: string
}

export default function StaffRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  
  const [schools, setSchools] = useState<any[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    schoolId: '',
    classId: '',
    subjectIds: [] as string[],
    password: '',
    confirmPassword: '',
  })

  // Load schools
  useEffect(() => {
    const loadSchools = async () => {
      try {
        console.log('📚 Fetching schools...')
        const list = await AuthService.getAllSchools()
        console.log('✅ Schools fetched:', list.length)
        setSchools(list)
      } catch (err) {
        console.error('❌ Error loading schools:', err)
        setError('Failed to load schools')
      }
    }
    loadSchools()
  }, [])

  // Load classes when school changes
  useEffect(() => {
    if (!formData.schoolId) {
      setClasses([])
      setSubjects([])
      return
    }

    const loadClassesAndSubjects = async () => {
      try {
        setError('')
        console.log('🔄 Fetching classes for school:', formData.schoolId)
        
        // Fetch classes
        const { data: classData, error: classError } = await supabase
          .from('class_arm_combos')
          .select('id, class_id, arm_id, classes(id, name, level), arms(id, name)')
          .eq('school_id', formData.schoolId)
          .limit(100)

        if (classError) throw classError
        
        console.log('✅ Classes fetched:', classData?.length || 0)
        setClasses(classData || [])

        // Fetch subjects
        console.log('🔄 Fetching subjects...')
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('id, name, code')
          .eq('school_id', formData.schoolId)
          .limit(100)

        if (subjectError) throw subjectError
        
        console.log('✅ Subjects fetched:', subjectData?.length || 0)
        setSubjects(subjectData || [])
      } catch (err: any) {
        console.error('❌ Error:', err)
        setError(`Failed to load data: ${err.message}`)
      }
    }

    loadClassesAndSubjects()
  }, [formData.schoolId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.fullName || !formData.email || !formData.schoolId || !formData.classId) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.subjectIds.length === 0) {
      setError('Please select at least one subject')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Register teacher
      console.log('📝 Registering teacher...')
      const user = await AuthService.registerTeacher({
        fullName: formData.fullName,
        email: formData.email,
        school_id: formData.schoolId,
        password: formData.password,
      })

      console.log('✅ Teacher registered:', user.id)

      // Assign subjects
      if (user.id) {
        try {
          const assignments = formData.subjectIds.map(subjectId => ({
            subjectId,
            classArmComboId: formData.classId,
          }))

          await TeacherService.assignSubjects(user.id, formData.schoolId, assignments)
          console.log('✅ Subjects assigned')
        } catch (err) {
          console.warn('⚠️ Could not assign subjects, but registration succeeded')
        }
      }

      setSuccess('✅ Registration successful! Redirecting...')
      setTimeout(() => router.push('/auth/staff/login'), 2000)
    } catch (err: any) {
      console.error('❌ Registration failed:', err)
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-blue-600">👨‍🏫 Teacher Registration</h1>
          <p className="text-center text-gray-600 mb-8">Create your account and assign classes</p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 rounded text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded lg:focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="teacher@school.com"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* School */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School *</label>
              <select
                name="schoolId"
                value={formData.schoolId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select School --</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            {/* Classes */}
            {formData.schoolId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                {classes.length > 0 ? (
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map(classItem => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.classes.name} - Arm {classItem.arms.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
                    ⏳ Loading classes...
                  </div>
                )}
              </div>
            )}

            {/* Subjects */}
            {formData.classId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjects * ({formData.subjectIds.length} selected)
                </label>
                {subjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-300 rounded bg-gray-50">
                    {subjects.map(subject => (
                      <label key={subject.id} className="flex items-center cursor-pointer p-2 hover:bg-blue-50 rounded">
                        <input
                          type="checkbox"
                          checked={formData.subjectIds.includes(subject.id)}
                          onChange={() => handleSubjectToggle(subject.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-2">
                          <strong>{subject.name}</strong>
                          <span className="text-gray-500 text-sm"> ({subject.code})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
                    ⏳ Loading subjects...
                  </div>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? '⏳ Registering...' : '✅ Register'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Already registered?{' '}
            <Link href="/auth/staff/login" className="text-blue-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
