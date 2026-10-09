'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { X, ChevronRight, AlertCircle, Loader } from 'lucide-react'

interface ProfessionalStaffRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  schoolId: string
  onSuccess?: () => void
}

type StaffRole = 'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT' | 'ADMINISTRATOR' | 'SUPPORT_STAFF' | ''

interface ComboOption {
  id: string
  class_name: string
  arm_name: string
  label: string
  school_level: string
}

interface SubjectOption {
  id: string
  name: string
  code: string
}

const ROLE_LABELS: Record<StaffRole, { label: string; emoji: string; steps: number }> = {
  TEACHER: { label: 'Teacher', emoji: '👨‍🏫', steps: 5 },
  PRINCIPAL: { label: 'Principal', emoji: '🎓', steps: 3 },
  HEAD_TEACHER: { label: 'Head Teacher', emoji: '📚', steps: 3 },
  ACCOUNTANT: { label: 'Accountant', emoji: '💰', steps: 3 },
  ADMINISTRATOR: { label: 'Administrator', emoji: '⚙️', steps: 3 },
  SUPPORT_STAFF: { label: 'Support Staff', emoji: '🤝', steps: 3 },
  '': { label: 'Select Role', emoji: '?', steps: 0 },
}

export default function ProfessionalStaffRegistrationModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: ProfessionalStaffRegistrationModalProps) {
  // ============================================================================
  // STATE: UI & Navigation
  // ============================================================================
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // ============================================================================
  // STATE: All Form Fields
  // ============================================================================

  // Step 1: Role Selection
  const [role, setRole] = useState<StaffRole>('')

  // Step 2: Personal Information (All roles)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Step 3: Employment Information (All roles)
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')

  // Step 4: Teacher-Specific (Teachers only)
  const [teachingLevel, setTeachingLevel] = useState<'PRIMARY' | 'SECONDARY' | ''>('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [salary, setSalary] = useState('')

  // Step 5: Teacher Class/Subject Assignment (Teachers only)
  const [classArmCombos, setClassArmCombos] = useState<ComboOption[]>([])
  const [selectedComboId, setSelectedComboId] = useState('')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  // Common for all: Password
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  if (!isOpen) return null

  const totalSteps = role ? ROLE_LABELS[role].steps : 1
  const isTeacher = role === 'TEACHER'

  // ============================================================================
  // HANDLERS: Data Loading
  // ============================================================================

  const loadTeachingData = async () => {
    if (!teachingLevel) {
      setError('Please select a teaching level')
      return false
    }

    setIsLoadingData(true)
    setError(null)

    try {
      console.log('[Staff Reg Modal] Loading teaching data:', { teachingLevel, schoolId })

      // Load class-arm combos
      console.log('[Staff Reg Modal] Fetching class-arm combos...')
      const classResponse = await fetch(
        `/api/teaching/class-combos?schoolId=${encodeURIComponent(schoolId)}&section=${encodeURIComponent(teachingLevel)}`,
        { method: 'GET' }
      )

      if (!classResponse.ok) {
        const errorData = await classResponse.json()
        throw new Error(errorData.error || `Classes API error: ${classResponse.status}`)
      }

      const loadedCombos = await classResponse.json()
      if (!Array.isArray(loadedCombos)) {
        throw new Error('Invalid response format from classes API')
      }

      console.log('[Staff Reg Modal] ✅ Loaded', loadedCombos.length, 'class combos')
      setClassArmCombos(loadedCombos)

      // Load subjects
      console.log('[Staff Reg Modal] Fetching subjects...')
      const subjectsResponse = await fetch(
        `/api/teaching/canonical-subjects?schoolId=${encodeURIComponent(schoolId)}`,
        { method: 'GET' }
      )

      if (!subjectsResponse.ok) {
        const errorData = await subjectsResponse.json()
        throw new Error(errorData.error || `Subjects API error: ${subjectsResponse.status}`)
      }

      const loadedSubjects = await subjectsResponse.json()
      if (!Array.isArray(loadedSubjects)) {
        throw new Error('Invalid response format from subjects API')
      }

      console.log('[Staff Reg Modal] ✅ Loaded', loadedSubjects.length, 'subjects')
      setSubjects(loadedSubjects)

      return true
    } catch (err: any) {
      console.error('[Staff Reg Modal] Error loading teaching data:', err.message)
      setError(`Failed to load teaching data: ${err.message}`)
      return false
    } finally {
      setIsLoadingData(false)
    }
  }

  // ============================================================================
  // HANDLERS: Form Validation
  // ============================================================================

  const validateStep1 = (): boolean => {
    if (!role) {
      setError('Please select a staff role')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email address is required')
      return false
    }
    if (!phone.trim()) {
      setError('Phone number is required')
      return false
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (!position.trim()) {
      setError('Position/Title is required')
      return false
    }
    if (!department.trim()) {
      setError('Department is required')
      return false
    }
    return true
  }

  const validateStep4Teacher = (): boolean => {
    if (!teachingLevel) {
      setError('Teaching level is required')
      return false
    }
    if (!bankName.trim()) {
      setError('Bank name is required')
      return false
    }
    if (!accountNumber.trim()) {
      setError('Account number is required')
      return false
    }
    if (!accountName.trim()) {
      setError('Account holder name is required')
      return false
    }
    if (!salary || parseFloat(salary) <= 0) {
      setError('Valid salary is required')
      return false
    }
    return true
  }

  const validateStep5Teacher = (): boolean => {
    if (!selectedComboId) {
      setError('Please select a class and arm')
      return false
    }
    if (selectedSubjectIds.length === 0) {
      setError('Please select at least one subject')
      return false
    }
    return true
  }

  // ============================================================================
  // HANDLERS: Navigation
  // ============================================================================

  const handleNext = async () => {
    setError(null)

    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    if (currentStep === 3 && !validateStep3()) return
    if (currentStep === 4 && isTeacher && !validateStep4Teacher()) return
    if (currentStep === 5 && isTeacher && !validateStep5Teacher()) return

    // Special handling for Step 4 Teachers: load data before proceeding
    if (currentStep === 4 && isTeacher) {
      const success = await loadTeachingData()
      if (!success) return
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  // ============================================================================
  // HANDLERS: Form Submission
  // ============================================================================

  const handleSubmit = async () => {
    setError(null)

    // Final validation
    if (currentStep === 5 && isTeacher && !validateStep5Teacher()) return

    setIsSubmitting(true)

    try {
      console.log('[Staff Reg Modal] Submitting registration...')

      const payload = {
        schoolId,
        staffCategory: role,
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        phone,
        password,
        position,
        department,
        ...(isTeacher && {
          teachingLevel,
          bankName,
          accountNumber,
          accountName,
          salary: salary ? parseFloat(salary) : null,
          classArmComboId: selectedComboId,
          subjectIds: selectedSubjectIds,
        }),
      }

      const response = await fetch('/api/school-admin/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Registration failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('[Staff Reg Modal] ✅ Registration successful')

      toast.success(`${ROLE_LABELS[role].label} registered successfully!`)

      // Reset form
      resetForm()

      if (onSuccess) {
        setTimeout(onSuccess, 500)
      }

      setTimeout(onClose, 1000)
    } catch (err: any) {
      console.error('[Staff Reg Modal] Submission error:', err)
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setRole('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setPasswordConfirm('')
    setPosition('')
    setDepartment('')
    setTeachingLevel('')
    setBankName('')
    setAccountNumber('')
    setAccountName('')
    setSalary('')
    setSelectedComboId('')
    setSelectedSubjectIds([])
    setError(null)
  }

  // ============================================================================
  // RENDER: Progress Indicator
  // ============================================================================

  const renderProgressBar = () => (
    <div className="flex gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex-1">
          <div
            className={`h-1 rounded-full transition-all ${
              currentStep >= step ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
          <span className="text-xs text-gray-600 mt-2 block">Step {step}</span>
        </div>
      ))}
    </div>
  )

  // ============================================================================
  // RENDER: Step 1 - Role Selection
  // ============================================================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Staff Role</h3>
        <p className="text-gray-600">Choose the position for this staff member</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT', 'ADMINISTRATOR', 'SUPPORT_STAFF'] as StaffRole[]).map(
          (r) => {
            const info = ROLE_LABELS[r]
            return (
              <button
                key={r}
                onClick={() => {
                  setRole(r)
                  setError(null)
                }}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  role === r
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-400'
                }`}
              >
                <div className="text-3xl mb-2">{info.emoji}</div>
                <div className="font-semibold text-gray-900">{info.label}</div>
                <div className="text-xs text-gray-500 mt-1">{info.steps} steps</div>
              </button>
            )
          }
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!role}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        Continue <ChevronRight size={20} />
      </button>
    </div>
  )

  // ============================================================================
  // RENDER: Step 2 - Personal Information
  // ============================================================================

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h3>
        <p className="text-gray-600">Enter basic details about the staff member</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="First Name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <input
          type="text"
          placeholder="Last Name *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <input
        type="email"
        placeholder="Email Address *"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <input
        type="tel"
        placeholder="Phone Number *"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Password *</label>
        <input
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password *</label>
        <input
          type="password"
          placeholder="Re-enter password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          Continue <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )

  // ============================================================================
  // RENDER: Step 3 - Employment Information
  // ============================================================================

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Employment Information</h3>
        <p className="text-gray-600">Fill in employment details for this staff member</p>
      </div>

      <input
        type="text"
        placeholder="Position / Title *"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <input
        type="text"
        placeholder="Department *"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {isTeacher ? 'Teacher Details →' : 'Review & Submit ✓'}
        </button>
      </div>
    </div>
  )

  // ============================================================================
  // RENDER: Step 4 - Teacher Details (Teachers Only)
  // ============================================================================

  const renderStep4Teacher = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Teacher Profile</h3>
        <p className="text-gray-600">Complete teacher qualifications and bank details</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Teaching Level *</label>
        <select
          value={teachingLevel}
          onChange={(e) => setTeachingLevel(e.target.value as any)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">Select teaching level...</option>
          <option value="PRIMARY">Primary School</option>
          <option value="SECONDARY">Secondary School</option>
        </select>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Bank Details</h4>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Bank Name *"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="text"
            placeholder="Account Number *"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="text"
            placeholder="Account Holder Name *"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="number"
            placeholder="Monthly Salary (₦) *"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          Class & Subjects →
        </button>
      </div>
    </div>
  )

  // ============================================================================
  // RENDER: Step 5 - Teacher Class/Subject Assignment (Teachers Only)
  // ============================================================================

  const renderStep5Teacher = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Class & Subject Assignment</h3>
        <p className="text-gray-600">Assign the teacher to a class and select subjects to teach</p>
      </div>

      {isLoadingData && (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-600 mr-2" />
          <p className="text-gray-600">Loading classes and subjects...</p>
        </div>
      )}

      {!isLoadingData && (
        <>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Class & Arm *</label>
            {classArmCombos.length > 0 ? (
              <select
                value={selectedComboId}
                onChange={(e) => {
                  setSelectedComboId(e.target.value)
                  setSelectedSubjectIds([])
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select a class...</option>
                {classArmCombos.map((combo) => (
                  <option key={combo.id} value={combo.id}>
                    {combo.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                <AlertCircle className="text-yellow-600 flex-shrink-0" />
                <p className="text-yellow-700">No classes found for this teaching level</p>
              </div>
            )}
          </div>

          {selectedComboId && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Subjects * ({selectedSubjectIds.length} selected)
              </label>
              {subjects.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(subject.id)}
                        onChange={() => {
                          setSelectedSubjectIds((prev) =>
                            prev.includes(subject.id)
                              ? prev.filter((id) => id !== subject.id)
                              : [...prev, subject.id]
                          )
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{subject.name}</div>
                        {subject.code && <div className="text-xs text-gray-500">{subject.code}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                  <AlertCircle className="text-yellow-600 flex-shrink-0" />
                  <p className="text-yellow-700">No subjects available for this school</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingData}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin" size={20} /> Registering...
            </>
          ) : (
            <>
              Complete Registration ✓
            </>
          )}
        </button>
      </div>
    </div>
  )

  // ============================================================================
  // RENDER: Main Modal
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">📋 Register New Staff</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
              type="button"
            >
              <X size={24} />
            </button>
          </div>

          {role && totalSteps > 1 && renderProgressBar()}
        </div>

        {/* Content */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">{error}</p>
              </div>
            </div>
          )}

          {/* Render Current Step */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && isTeacher && renderStep4Teacher()}
          {currentStep === 5 && isTeacher && renderStep5Teacher()}
        </div>
      </div>
    </div>
  )
}
