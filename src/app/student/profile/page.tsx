'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StudentPhotoDisplay from '@/components/StudentPhotoDisplay'
import Link from 'next/link'

interface StudentProfile {
  id: string
  user_id: string
  admission_number: string
  class_arm_combo_id?: string
  photo_url?: string
  date_of_birth?: string
  phone?: string
  address?: string
  department?: string
}

interface ClassInfo {
  id: string
  class_name: string
  arm?: string
  form_level?: string
}

export default function StudentProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    date_of_birth: '',
  })

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser || currentUser.role !== 'STUDENT') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Load school
        if (currentUser.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id, name, logo_url, address, phone')
            .eq('id', currentUser.school_id)
            .single()
          setSchool(schoolData)
        }

        // Load student profile
        const { data: profileData } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setFormData({
            phone: profileData.phone || '',
            address: profileData.address || '',
            date_of_birth: profileData.date_of_birth || '',
          })

          // Load class if assigned
          if (profileData.class_arm_combo_id) {
            const { data: classData } = await supabase
              .from('class_arm_combos')
              .select(`
                id,
                classes(id, name, level),
                arms(id, name)
              `)
              .eq('id', profileData.class_arm_combo_id)
              .maybeSingle()
            if (classData) {
              // Transform to expected format
              const transformedClass = {
                id: classData.id,
                class_name: classData.classes?.name || 'Unknown',
                arm: classData.arms?.name || 'Unknown',
                form_level: classData.classes?.level || 'Unknown'
              }
              setClassInfo(transformedClass)
            }
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading profile:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (!photoSuccess) return
    const timer = setTimeout(() => {
      setPhotoSuccess(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [photoSuccess])

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]

      setPhotoError(null)
      setPhotoSuccess(null)

      if (!file) return

      if (!profile?.id || !user?.school_id) {
        setPhotoError('Student profile incomplete')
        return
      }

      if (!file.type.startsWith('image/')) {
        setPhotoError('Please select a valid image file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Image must be less than 5MB')
        return
      }

      setUploadingPhoto(true)

      try {
        const formDataObj = new FormData()
        formDataObj.append('file', file)
        formDataObj.append('student_id', profile.id)
        formDataObj.append('school_id', user.school_id)

        const uploadResponse = await fetch('/api/student/upload-photo', {
          method: 'POST',
          body: formDataObj,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok || !uploadResult.success) {
          setPhotoError(`Failed: ${uploadResult.error || 'Unknown error'}`)
          return
        }

        setProfile(prev => prev ? { ...prev, photo_url: uploadResult.photo_url } : null)
        setPhotoSuccess('✅ Photo uploaded successfully!')

        if (e.target) {
          e.target.value = ''
        }
      } catch (err: any) {
        setPhotoError(`Error: ${err.message}`)
      } finally {
        setUploadingPhoto(false)
      }
    },
    [profile?.id, user?.school_id]
  )

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveProfile = async () => {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('students')
        .update({
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.date_of_birth,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev => prev ? {
        ...prev,
        phone: formData.phone,
        address: formData.address,
        date_of_birth: formData.date_of_birth,
      } : null)

      setIsEditing(false)
      setPhotoSuccess('✅ Profile updated successfully!')
      setTimeout(() => setPhotoSuccess(null), 3000)
    } catch (err: any) {
      setPhotoError(`Failed to update profile: ${err.message}`)
    }
  }

  const handleLogout = async () => {
    await AuthService.logout()
    router.push('/auth/student/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Unauthorized</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">👤 My Profile</h1>
              <p className="text-pink-100 mt-1">{school?.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/student/dashboard">
              <button className="px-6 py-2 bg-pink-500 hover:bg-pink-400 text-white rounded-lg font-semibold transition">
                ← Dashboard
              </button>
            </Link>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Photo Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📸 Profile Photo</h2>

          <div className="flex flex-col md:flex-row md:items-center md:gap-12 mb-8">
            {/* Photo Display */}
            <div className="flex flex-col items-center md:items-start">
              <StudentPhotoDisplay
                photoUrl={profile?.photo_url}
                studentName={user.full_name}
                size="lg"
              />
              <p className="text-sm text-gray-600 mt-4 text-center md:text-left">
                {profile?.photo_url ? 'Current photo' : 'No photo uploaded yet'}
              </p>
            </div>

            {/* Upload Section */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload New Photo</h3>

              {photoError && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700">
                  <p className="font-medium">{photoError}</p>
                </div>
              )}

              {photoSuccess && (
                <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded text-green-700">
                  <p className="font-medium">{photoSuccess}</p>
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="block px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium cursor-pointer transition text-center"
                  style={{ opacity: uploadingPhoto ? 0.7 : 1, cursor: uploadingPhoto ? 'not-allowed' : 'pointer' }}
                >
                  {uploadingPhoto ? '⏳ Uploading...' : '📤 Choose Photo'}
                </label>
                <p className="text-sm text-gray-600">
                  • Maximum size: 5MB<br />
                  • Supported formats: JPG, PNG, GIF<br />
                  • Square images work best
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">ℹ️ Personal Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                isEditing
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isEditing ? '❌ Cancel' : '✏️ Edit'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {user.full_name}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {user.email}
              </div>
            </div>

            {/* Admission Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Admission Number</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {profile?.admission_number}
              </div>
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {classInfo ? `${classInfo.class_name} ${classInfo.arm || ''}` : 'Not assigned'}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleFormChange('date_of_birth', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="p-3 bg-gray-100 rounded-lg text-gray-900">
                  {profile?.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString()
                    : 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="e.g., +234 XXX XXX XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="p-3 bg-gray-100 rounded-lg text-gray-900">
                  {profile?.phone || 'Not provided'}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              {isEditing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  placeholder="Enter your home address"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="p-3 bg-gray-100 rounded-lg text-gray-900">
                  {profile?.address || 'Not provided'}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              >
                💾 Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Academic Information Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎓 Academic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">School</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {school?.name}
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900">
                {profile?.department || 'Not assigned'}
              </div>
            </div>

            {/* School Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">School Address</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900">
                {school?.address || 'Not provided'}
              </div>
            </div>

            {/* School Phone */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">School Phone</label>
              <div className="p-3 bg-gray-100 rounded-lg text-gray-900">
                {school?.phone || 'Not provided'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/student/dashboard"
            className="block p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow hover:shadow-lg transition"
          >
            <p className="text-2xl mb-2">📊</p>
            <p className="font-semibold">Back to Dashboard</p>
          </Link>
          <Link
            href="/student/cbt"
            className="block p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow hover:shadow-lg transition"
          >
            <p className="text-2xl mb-2">✏️</p>
            <p className="font-semibold">Take CBT Exams</p>
          </Link>
          <Link
            href="/student/results"
            className="block p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow hover:shadow-lg transition"
          >
            <p className="text-2xl mb-2">📈</p>
            <p className="font-semibold">View Results</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
