'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { RegistrationConfigService } from '@/services/registration-config.service'
import type { ClassArmCombo, RegistrationClass, RegistrationArm, Stream, Subject } from '@/services/registration-config.service'

interface StudentRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  schoolId: string
  onSuccess?: (studentId: string) => void
}

export function StudentRegistrationModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: StudentRegistrationModalProps) {
  // UI State
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)

  // Form Data - Step 1: Personal Info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Form Data - Step 2: Parent Info
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')

  // Form Data - Step 3: Academic Placement
  const [selectedSection, setSelectedSection] = useState<'PRIMARY' | 'SECONDARY' | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedArmId, setSelectedArmId] = useState<string | null>(null)
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null)

  // Form Data - Step 4: Subject Selection
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  // Data State
  const [classes, setClasses] = useState<RegistrationClass[]>([])
  const [arms, setArms] = useState<RegistrationArm[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Load classes when section changes
  useEffect(() => {
    if (selectedSection && isOpen) {
      loadClasses()
    }
  }, [selectedSection, isOpen])

  // Load arms when class changes
  useEffect(() => {
    if (selectedClassId && isOpen) {
      loadArms()
    }
  }, [selectedClassId, isOpen])

  // Load streams when arm changes (for SS classes)
  useEffect(() => {
    if (selectedArmId && selectedClassId && isOpen) {
      loadStreams()
    }
  }, [selectedArmId, selectedClassId, isOpen])

  // Load subjects when academic placement is complete
  useEffect(() => {
    if (currentStep === 4 && selectedClassId && isOpen) {
      loadSubjects()
    }
  }, [currentStep, selectedClassId, isOpen])

  const loadClasses = async () => {
    if (!selectedSection) return
    setDataLoading(true)
    try {
      const loaded = await RegistrationConfigService.getClasses(schoolId, selectedSection)
      setClasses(loaded)
      setSelectedClassId(null)
      setArms([])
      setStreams([])
    } catch (err) {
      console.error('Error loading classes:', err)
      setError('Failed to load classes')
    } finally {
      setDataLoading(false)
    }
  }

  const loadArms = async () => {
    if (!selectedClassId) return
    setDataLoading(true)
    try {
      const loaded = await RegistrationConfigService.getArms(selectedClassId)
      setArms(loaded)
      setSelectedArmId(null)
      setStreams([])
    } catch (err) {
      console.error('Error loading arms:', err)
      setError('Failed to load arms')
    } finally {
      setDataLoading(false)
    }
  }

  const loadStreams = async () => {
    if (!selectedClassId) return
    setDataLoading(true)
    try {
      const loaded = await RegistrationConfigService.getStreams(selectedClassId)
      setStreams(loaded)
      setSelectedStreamId(null)
    } catch (err) {
      console.error('Error loading streams:', err)
      setStreams([])
    } finally {
      setDataLoading(false)
    }
  }

  const loadSubjects = async () => {
    setDataLoading(true)
    try {
      const allSubjects = await RegistrationConfigService.getSubjectsForSchool(schoolId)
      
      // Filter by class level
      const selectedClass = classes.find(c => c.id === selectedClassId)
      if (selectedClass) {
        const filtered = allSubjects.filter(s =>
          s.applicable_to_levels.includes(selectedClass.level)
        )
        setSubjects(filtered)
      }
      setSelectedSubjects([])
    } catch (err) {
      console.error('Error loading subjects:', err)
      setError('Failed to load subjects')
    } finally {
      setDataLoading(false)
    }
  }

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !dateOfBirth || !password.trim()) {
      setError('Please fill in all personal information fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError(null)
    setCurrentStep(2)
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentName.trim() || !parentPhone.trim()) {
      setError('Please fill in parent name and phone number')
      return
    }
    setError(null)
    setCurrentStep(3)
  }

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSection || !selectedClassId || !selectedArmId) {
      setError('Please complete academic placement (section, class, and arm)')
      return
    }
    // Streams are optional except for SS classes
    const selectedClass = classes.find(c => c.id === selectedClassId)
    const classLevel = selectedClass?.level
    if (classLevel !== undefined && classLevel >= 12 && streams.length > 0 && !selectedStreamId) {
      setError('Please select a stream for Senior Secondary classes')
      return
    }
    setError(null)
    setCurrentStep(4)
  }

  const handleStep4Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject')
      return
    }
    handleFinalSubmit()
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const handleFinalSubmit = async () => {
    if (loading) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const trimmedEmail = email.trim().toLowerCase()

      // Step 1: Create auth user
      const authResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          full_name: `${firstName} ${lastName}`,
          role: 'STUDENT',
          school_id: schoolId,
          user_type: 'STUDENT',
        }),
      })

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        throw new Error(errorData.error || 'Failed to create auth user')
      }

      const authData = await authResponse.json()
      const userId = authData.user?.id
      if (!userId) throw new Error('Failed to create auth user')

      // Step 2: Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          school_id: schoolId,
          email: trimmedEmail,
          full_name: `${firstName} ${lastName}`,
          role: 'STUDENT',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        })

      if (userError && userError.code !== '23505') {
        throw new Error(`Failed to create user record: ${userError.message}`)
      }

      // Step 3: Create student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: userId,
          school_id: schoolId,
          class_arm_combo_id: selectedArmId, // This references class_arm_combos, not arms
          date_of_birth: dateOfBirth,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (studentError) {
        throw new Error(`Failed to create student record: ${studentError.message}`)
      }

      const studentId = student?.id

      // Step 4: Enroll in subjects
      if (selectedSubjects.length > 0) {
        const enrollments = selectedSubjects.map(subjectId => ({
          student_id: studentId,
          subject_id: subjectId,
          school_id: schoolId,
          created_at: new Date().toISOString(),
        }))

        const { error: enrollError } = await supabase
          .from('student_subjects')
          .insert(enrollments)

        if (enrollError) {
          throw new Error(`Failed to enroll subjects: ${enrollError.message}`)
        }
      }

      setSuccess(`✅ Student ${firstName} ${lastName} registered successfully!`)

      // Reset form
      setCurrentStep(1)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setDateOfBirth('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setParentName('')
      setParentPhone('')
      setParentEmail('')
      setSelectedSection(null)
      setSelectedClassId(null)
      setSelectedArmId(null)
      setSelectedStreamId(null)
      setSelectedSubjects([])

      if (onSuccess && studentId) {
        onSuccess(studentId)
      }

      setTimeout(onClose, 2000)
    } catch (err: any) {
      console.error('Registration error:', err)
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
        <div className="sticky top-0 bg-gradient-to-r from-green-600 via-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">🎓 Register New Student</h2>
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

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                />
              </div>

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
              />

              <input
                type="date"
                placeholder="Date of Birth"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
              />

              <input
                type="password"
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
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

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
              >
                Continue to Parent Information →
              </button>
            </form>
          )}

          {/* Step 2: Parent Information */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Parent/Guardian Information</h3>

              <input
                type="text"
                placeholder="Parent/Guardian Name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
              />

              <input
                type="email"
                placeholder="Email (Optional)"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
              />

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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Continue to Academic Placement →
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Academic Placement */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Academic Placement</h3>

              {/* Section Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Select Section *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {['PRIMARY', 'SECONDARY'].map((section) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setSelectedSection(section as 'PRIMARY' | 'SECONDARY')}
                      className={`px-4 py-3 border-2 rounded-lg font-semibold transition ${
                        selectedSection === section
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {section === 'PRIMARY' ? '🎒 Primary' : '📚 Secondary'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Selection */}
              {selectedSection && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Select Class *
                  </label>
                  {dataLoading ? (
                    <p className="text-gray-600">Loading classes...</p>
                  ) : (
                    <select
                      value={selectedClassId || ''}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    >
                      <option value="">Choose a class...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Arm Selection */}
              {selectedClassId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Select Arm *
                  </label>
                  {dataLoading ? (
                    <p className="text-gray-600">Loading arms...</p>
                  ) : (
                    <select
                      value={selectedArmId || ''}
                      onChange={(e) => setSelectedArmId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    >
                      <option value="">Choose an arm...</option>
                      {arms.map((arm) => (
                        <option key={arm.id} value={arm.id}>
                          Arm {arm.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Stream Selection (for SS classes) */}
              {selectedArmId && streams.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Select Stream {streams.length > 0 ? '*' : '(Optional)'}
                  </label>
                  <select
                    value={selectedStreamId || ''}
                    onChange={(e) => setSelectedStreamId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                  >
                    <option value="">Choose a stream...</option>
                    {streams.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Continue to Subject Selection →
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Subject Selection */}
          {currentStep === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Subject Selection</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Select Subjects * ({selectedSubjects.length} selected)
                </label>
                {dataLoading ? (
                  <p className="text-gray-600">Loading subjects...</p>
                ) : subjects.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-300 rounded-lg p-4">
                    {subjects.map((subject) => (
                      <label
                        key={subject.id}
                        className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-600"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{subject.name}</p>
                          <p className="text-sm text-gray-600">{subject.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No subjects available for this class</p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedSubjects.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
                >
                  {loading ? 'Registering...' : 'Complete Registration →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
