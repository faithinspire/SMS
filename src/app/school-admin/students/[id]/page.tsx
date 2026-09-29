'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface StudentProfile {
  id: string
  user_id: string
  school_id: string
  admission_number: string
  date_of_birth: string | null
  class_arm_combo_id: string
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'
  photo_url: string | null
  user: {
    id: string
    full_name: string
    email: string
    phone: string | null
    photo_url: string | null
    status: string
  }
  class_arm_combo: {
    id: string
    class: { id: string; name: string }
    arm: { id: string; name: string }
  }
}

interface ClassArmCombo {
  id: string
  class: { id: string; name: string }
  arm: { id: string; name: string }
}

const supabase = createClient()

export default function StudentEditPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classArmCombos, setClassArmCombos] = useState<ClassArmCombo[]>([])
  const [schoolId, setSchoolId] = useState<string>('')

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [classArmComboId, setClassArmComboId] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE')

  // Get current school on mount
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userProfile } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          setSchoolId(userProfile.school_id)
        }
      } catch (error) {
        console.error('Error getting school:', error)
      }
    }

    getCurrentSchool()
  }, [])

  // Load class/arm combos
  useEffect(() => {
    const loadClassArmCombos = async () => {
      if (!schoolId) return

      try {
        const { data, error: fetchError } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            class:class_id (
              id,
              name
            ),
            arm:arm_id (
              id,
              name
            )
          `)
          .eq('school_id', schoolId)

        if (fetchError) throw fetchError
        setClassArmCombos(data || [])
      } catch (error) {
        console.error('Error loading class/arm combos:', error)
      }
    }

    if (schoolId) {
      loadClassArmCombos()
    }
  }, [schoolId])

  // Load student data
  useEffect(() => {
    if (schoolId) {
      loadStudentData()
    }
  }, [schoolId, studentId])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          school_id,
          admission_number,
          date_of_birth,
          status,
          class_arm_combo_id,
          photo_url,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            photo_url,
            status
          ),
          class_arm_combo:class_arm_combo_id (
            id,
            class:class_id (
              id,
              name
            ),
            arm:arm_id (
              id,
              name
            )
          )
        `)
        .eq('id', studentId)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Student record not found')

      setStudent(data as StudentProfile)
      setFullName(data.user.full_name)
      setEmail(data.user.email)
      setPhone(data.user.phone || '')
      setAdmissionNumber(data.admission_number)
      setDateOfBirth(data.date_of_birth || '')
      setClassArmComboId(data.class_arm_combo_id)
      setStatus(data.status)
    } catch (err: any) {
      console.error('Error loading student:', err)
      setError(err.message || 'Failed to load student record')
      toast.error('Failed to load student record')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) return

    if (!fullName.trim() || !email.trim() || !admissionNumber.trim() || !classArmComboId) {
      setError('Name, email, admission number, and class are required')
      toast.error('Name, email, admission number, and class are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
        })
        .eq('id', student.user_id)

      if (userError) throw userError

      // Update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({
          admission_number: admissionNumber.trim(),
          date_of_birth: dateOfBirth || null,
          class_arm_combo_id: classArmComboId,
          status,
        })
        .eq('id', studentId)

      if (studentError) throw studentError

      toast.success('Student record updated successfully')
      router.back()
    } catch (err: any) {
      console.error('Error saving student:', err)
      const errorMsg = err.message || 'Failed to save student record'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student record...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Student record not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 font-semibold"
          >
            ← Back to Students
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Student Profile</h1>
          <p className="text-gray-600 mt-2">Update student information</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Personal Information Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Academic Information Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Academic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Admission Number *</label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Class/Arm *</label>
                <select
                  value={classArmComboId}
                  onChange={(e) => setClassArmComboId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Class/Arm</option>
                  {classArmCombos.map((combo) => (
                    <option key={combo.id} value={combo.id}>
                      {combo.class.name} {combo.arm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
