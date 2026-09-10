'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { TeacherService } from '@/services/teacher.service'
import { TeacherPhotoService } from '@/services/teacher-photo.service'
import { RegistrationConfigService } from '@/services/registration-config.service'
import CanonicalSubjectService from '@/services/canonical-subject.service'
import type { RegistrationClass, RegistrationArm, ClassArmCombo } from '@/services/registration-config.service'
import type { CanonicalSubject } from '@/services/canonical-subject.service'

interface TeacherRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  schoolId: string
  onSuccess?: (teacherId: string) => void
}

export function TeacherRegistrationModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: TeacherRegistrationModalProps) {
  // UI State
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)

  // Form Data - Step 1
  const [teacherLevel, setTeacherLevel] = useState<'PRIMARY' | 'SECONDARY' | null>(null)

  // Form Data - Step 2: Personal Info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Form Data - Step 3: Bank Details
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [salary, setSalary] = useState('')

  // Form Data - Step 4: Teaching Assignment
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  // Data State
  const [combos, setCombos] = useState<ClassArmCombo[]>([])
  const [subjects, setSubjects] = useState<CanonicalSubject[]>([])

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && currentStep === 4) {
      loadTeachingData()
    }
  }, [isOpen, currentStep])

  const loadTeachingData = async () => {
    if (!teacherLevel) {
      setError('Teacher level not selected')
      return
    }

    // ✅ VALIDATE SCHOOL ID FIRST
    if (!schoolId || schoolId.trim() === '' || schoolId === 'undefined') {
      setError('❌ School ID is required. Please contact your school administrator.')
      console.error('❌ Empty or invalid school ID:', schoolId)
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(schoolId)) {
      setError(`❌ Invalid school ID format: ${schoolId}`)
      console.error('❌ Invalid school ID format:', schoolId)
      return
    }

    setDataLoading(true)
    setError(null)

    try {
      console.log(`📡 Loading teaching data for ${teacherLevel}...`)

      // Load combos for this teacher level
      const loadedCombos = await RegistrationConfigService.getClassArmCombos(
        schoolId,
        teacherLevel
      )

      console.log(`✅ Loaded ${loadedCombos.length} class-arm combos`)

      // ✅ NEW: Load subjects from canonical service instead of hardcoded
      const loadedSubjects = await CanonicalSubjectService.getAllSubjectsForSchool(schoolId)

      console.log(`✅ Loaded ${loadedSubjects.length} total subjects`)

      setCombos(loadedCombos)
      setSubjects(loadedSubjects)
    } catch (err: any) {
      console.error('❌ Error loading teaching data:', err)
      setError(`Failed to load teaching data: ${err.message}`)
    } finally {
      setDataLoading(false)
    }
  }

  // Get subjects for selected combo - filters by class level
  const getSubjectsForCombo = () => {
    if (!selectedComboId) return []

    const combo = combos.find(c => c.id === selectedComboId)
    if (!combo) return []

    const level = (combo.classes as any)?.level
    if (level === undefined || level === null) return []

    // ✅ NEW: Filter subjects by level using canonical service helper
    return subjects.filter(s => s.applicable_to_levels.includes(level))
  }

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Step 1: Validate level selection
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherLevel) {
      setError('Please select a teaching level')
      return
    }
    setError(null)
    setCurrentStep(2)
  }

  // Step 2: Validate personal info
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Trim whitespace from email to prevent validation errors
    const trimmedEmail = email.trim()
    if (!firstName.trim() || !lastName.trim() || !trimmedEmail || !phone.trim() || !password.trim()) {
      setError('Please fill in all personal information fields including password')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    // Update email to trimmed version
    setEmail(trimmedEmail)
    setError(null)
    setCurrentStep(3)
  }

  // Step 3: Validate bank details
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !bankName.trim() ||
      !accountNumber.trim() ||
      !accountName.trim() ||
      !salary.trim()
    ) {
      setError('Please fill in all bank details')
      return
    }
    setError(null)
    setCurrentStep(4)
  }

  // Step 4: Select teaching assignment
  const handleStep4Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComboId || selectedSubjects.length === 0) {
      setError('Please select a class and at least one subject')
      return
    }
    handleFinalSubmit()
  }

  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  // Final submit
  const handleFinalSubmit = async () => {
    if (loading) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('📝 Registering teacher...')
      
      // ✅ TRIM EMAIL TO PREVENT "INVALID EMAIL" ERROR
      const trimmedEmail = email.trim().toLowerCase()
      
      // Validate password
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Step 1: Create user in auth via backend API (avoids rate limit)
      // With retry logic for rate limit handling
      console.log('🔐 Creating auth user via backend API...')
      
      let authResponse: Response | null = null
      let lastError: any = null
      
      // Retry up to 3 times with exponential backoff (2s, 4s)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          authResponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: trimmedEmail,
              password: password,
              full_name: `${firstName} ${lastName}`,
              role: 'TEACHER',
              school_id: schoolId,
              user_type: 'STAFF',
            }),
          })

          // If we get a 429 (rate limit), wait and retry
          if (authResponse.status === 429 && attempt < 2) {
            const waitTime = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s
            console.warn(`⚠️ Rate limited on attempt ${attempt + 1}. Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }

          // If we got a response (success or other error), break out of retry loop
          break
        } catch (fetchErr: any) {
          lastError = fetchErr
          if (attempt < 2) {
            console.warn(`⚠️ Network error on attempt ${attempt + 1}, retrying...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
            continue
          }
        }
      }

      if (!authResponse) {
        throw lastError || new Error('Failed to connect to auth service after retries')
      }

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        const errorMsg = errorData.error || 'Failed to create auth user'
        
        // Better error messages for common issues
        if (authResponse.status === 429) {
          throw new Error(`Rate limited by auth service. Please try again in a moment. (${errorMsg})`)
        }
        throw new Error(`Auth error: ${errorMsg}`)
      }

      const authData = await authResponse.json()
      const userId = authData.user?.id
      if (!userId) throw new Error('Failed to create auth user')
      
      // Log if user already existed (non-critical)
      if (authData.user?.message) {
        console.log('ℹ️ ', authData.user.message)
      }

      console.log('✅ Auth user created:', userId)

      // Create user record in database - THIS IS CRITICAL
      console.log('👤 Creating user record in database...')
      const { error: userDbError } = await supabase
        .from('users')
        .insert({
          id: userId,
          school_id: schoolId,
          email: trimmedEmail,
          full_name: `${firstName} ${lastName}`,
          role: 'TEACHER',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (userDbError) {
        // Check if it's a duplicate key error (user already exists) - that's OK
        if (userDbError.code === '23505') {
          console.log('ℹ️ User record already exists in database')
        } else {
          console.error('❌ Critical error creating user record:', userDbError)
          throw new Error(`Failed to create user record: ${userDbError.message}`)
        }
      } else {
        console.log('✅ User record created in database')
      }

      // Step 2: Upload photo (optional)
      let photoUrl = null
      if (photoFile) {
        console.log('📤 Uploading teacher photo...')
        try {
          photoUrl = await TeacherPhotoService.uploadTeacherPhoto(
            schoolId,
            userId,
            photoFile
          )
          if (photoUrl) {
            console.log('✅ Photo uploaded:', photoUrl)
          } else {
            console.warn('⚠️ Photo upload skipped (RLS blocked)')
          }
        } catch (photoErr: any) {
          console.warn('⚠️ Photo upload failed, continuing without photo:', photoErr.message)
        }
      }

      // Step 3: Create teacher record
      console.log('💾 Creating teacher record...')
      const teacherId = await TeacherService.registerTeacher({
        school_id: schoolId,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: trimmedEmail,
        phone,
        photo_url: photoUrl || null,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        salary: parseFloat(salary),
        teaching_level: teacherLevel,
      })

      console.log('✅ Teacher created:', teacherId)

      // Step 4: Assign subjects to teacher
      console.log(`📚 Assigning ${selectedSubjects.length} subjects...`)
      // NOTE: subject_teacher_assignments.teacher_id references users(id), not teachers(id)
      // So we pass userId here, not teacherId from the teachers table
      await TeacherService.assignSubjectsToTeacher(userId, selectedSubjects, selectedComboId, schoolId)

      console.log('✅ Subjects assigned')

      // Step 5: Assign class to teacher
      console.log('🏫 Assigning class...')
      // NOTE: class_arm_combos.class_teacher_id references users(id), not teachers(id)
      await TeacherService.assignClassToTeacher(userId, selectedComboId)

      console.log('✅ Class assigned')

      setSuccess(`✅ Teacher ${firstName} ${lastName} registered successfully!`)
      setCurrentStep(1)

      // Reset form
      setTeacherLevel(null)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setPhone('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      setSalary('')
      setSelectedComboId(null)
      setSelectedSubjects([])

      // Call success callback
      if (onSuccess) {
        onSuccess(teacherId)
      }

      // Close after 2 seconds
      setTimeout(onClose, 2000)
    } catch (err: any) {
      console.error('❌ Registration error:', err)
      setError(`Registration failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">👨‍🏫 Register New Teacher</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition hover:scale-110"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1 flex flex-col gap-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    currentStep >= step ? 'bg-white' : 'bg-white/30'
                  }`}
                />
                <span className="text-xs text-white/70">Step {step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[calc(100vh-250px)] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg">
              <p className="font-semibold">{success}</p>
            </div>
          )}

          {/* Loading Indicator */}
          {dataLoading && currentStep === 4 && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-r-lg">
              <p className="font-semibold">📡 Loading classes and subjects...</p>
            </div>
          )}

          {/* Step 1: Select Level */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">What level do you teach?</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'PRIMARY', label: 'Primary School', icon: '🎓', desc: 'Prep, Nursery, KG, Primary 1-6' },
                    { value: 'SECONDARY', label: 'Secondary School', icon: '📚', desc: 'JSS 1-3 and SSS 1-3' },
                  ].map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setTeacherLevel(level.value as 'PRIMARY' | 'SECONDARY')}
                      className={`flex flex-col items-center gap-3 p-6 border-2 rounded-xl cursor-pointer transition-all transform hover:scale-105 ${
                        teacherLevel === level.value
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                      }`}
                    >
                      <span className="text-5xl">{level.icon}</span>
                      <div className="text-center">
                        <p className="font-bold text-gray-900">{level.label}</p>
                        <p className="text-sm text-gray-600">{level.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!teacherLevel}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
              >
                Continue to Personal Info →
              </button>
            </form>
          )}

          {/* Step 2: Personal Info */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="col-span-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="col-span-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="password"
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              {/* Photo Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="cursor-pointer">
                  <div className="text-center">
                    {photoPreview ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                        <p className="text-sm text-gray-600">Click to change photo</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">📷</span>
                        <p className="font-semibold text-gray-900">Upload Photo (Optional)</p>
                        <p className="text-sm text-gray-600">Click to select or drag and drop</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Continue to Bank Details →
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Bank Details */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Bank & Salary Details</h3>

              <input
                type="text"
                placeholder="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Account Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="number"
                placeholder="Monthly Salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Continue to Teaching Assignment →
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Teaching Assignment */}
          {currentStep === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Teaching Assignment</h3>

              {dataLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading classes...</p>
                </div>
              ) : (
                <>
                  {/* Class Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Select Class
                    </label>
                    <select
                      value={selectedComboId || ''}
                      onChange={(e) => {
                        setSelectedComboId(e.target.value)
                        setSelectedSubjects([])
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="">Choose a class...</option>
                      {combos.map((combo) => (
                        <option key={combo.id} value={combo.id}>
                          {(combo.classes as any)?.name || 'Unknown Class'} - Arm{' '}
                          {(combo.arms as any)?.name || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Selection */}
                  {selectedComboId && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Select Subjects
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4">
                        {getSubjectsForCombo().length > 0 ? (
                          getSubjectsForCombo().map((subject) => (
                            <label
                              key={subject.id}
                              className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSubjects.includes(subject.id)}
                                onChange={() => toggleSubject(subject.id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
                              />
                      <div>
                        <p className="font-semibold text-gray-900">{subject.name}</p>
                        <p className="text-sm text-gray-600">{subject.code}</p>
                      </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-gray-600">No subjects available for this class</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedComboId || selectedSubjects.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
                >
                  {loading ? 'Registering...' : '✅ Complete Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
