'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { X } from 'lucide-react'

interface StaffRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  schoolId: string
  onSuccess?: () => void
}

type StaffCategory = 'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT' | 'ADMINISTRATOR' | 'SUPPORT_STAFF' | ''

export default function StaffRegistrationModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: StaffRegistrationModalProps) {
  // UI State
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingTeachingData, setLoadingTeachingData] = useState(false)

  // Form Data - Step 1: Category & Personal
  const [staffCategory, setStaffCategory] = useState<StaffCategory>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Form Data - Step 2: Contact
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  // Form Data - Step 3: Employment
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [staffNumber, setStaffNumber] = useState('')

  // Form Data - Step 4: Role-Specific (Teachers only)
  const [teachingLevel, setTeachingLevel] = useState<'PRIMARY' | 'SECONDARY' | ''>('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [salary, setSalary] = useState('')

  // Form Data - Step 5: Class/Subject Assignment (Teachers only)
  const [selectedComboId, setSelectedComboId] = useState<string>('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [combos, setCombos] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  if (!isOpen) return null

  const loadTeachingData = async () => {
    if (!teachingLevel || !schoolId) {
      setError('Teaching level not selected')
      return
    }

    setLoadingTeachingData(true)
    setError(null)

    try {
      // Load class-arm combos
      const response = await fetch(
        `/api/teaching/class-combos?schoolId=${encodeURIComponent(schoolId)}&section=${encodeURIComponent(teachingLevel)}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const loadedCombos = await response.json()
      setCombos(loadedCombos)

      // Load subjects
      const subjectsResponse = await fetch(
        `/api/canonical-subjects?schoolId=${encodeURIComponent(schoolId)}`,
        { method: 'GET' }
      )

      if (subjectsResponse.ok) {
        const loadedSubjects = await subjectsResponse.json()
        setSubjects(loadedSubjects)
      }
    } catch (err: any) {
      console.error('Error loading teaching data:', err)
      setError(`Failed to load teaching data: ${err.message}`)
    } finally {
      setLoadingTeachingData(false)
    }
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffCategory.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Please fill in all required fields')
      return
    }
    setError(null)
    setCurrentStep(2)
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !phone.trim() || !password.trim()) {
      setError('Please fill in all contact fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setEmail(trimmedEmail)
    setError(null)
    setCurrentStep(3)
  }

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!position.trim() || !department.trim()) {
      setError('Please fill in employment information')
      return
    }
    setError(null)
    if (staffCategory === 'TEACHER') {
      setCurrentStep(4)
    } else {
      handleFinalSubmit()
    }
  }

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teachingLevel || !bankName.trim() || !accountNumber.trim() || !accountName.trim() || !salary.trim()) {
      setError('Please fill in all teacher information')
      return
    }
    setError(null)
    // Load teaching data then move to step 5
    setLoadingTeachingData(true)
    await loadTeachingData()
    setLoadingTeachingData(false)
    setCurrentStep(5)
  }

  const handleStep5Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComboId || selectedSubjects.length === 0) {
      setError('Please select a class and at least one subject')
      return
    }
    setError(null)
    handleFinalSubmit()
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const handleFinalSubmit = async () => {
    if (loading) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const trimmedEmail = email.trim().toLowerCase()

      console.log('[Staff Reg Modal] Submitting registration...')

      // Use the staff registration API
      const response = await fetch('/api/school-admin/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          staffCategory,
          firstName,
          lastName,
          email: trimmedEmail,
          phone,
          password,
          position,
          department,
          staffNumber: staffNumber || null,
          teachingLevel: staffCategory === 'TEACHER' ? teachingLevel : null,
          bankName: staffCategory === 'TEACHER' ? bankName : null,
          accountNumber: staffCategory === 'TEACHER' ? accountNumber : null,
          accountName: staffCategory === 'TEACHER' ? accountName : null,
          salary: staffCategory === 'TEACHER' ? salary : null,
          classArmComboId: staffCategory === 'TEACHER' ? selectedComboId : null,
          subjectIds: staffCategory === 'TEACHER' ? selectedSubjects : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to register staff')
      }

      const result = await response.json()
      console.log('[Staff Reg Modal] ✅ Registration successful:', result)

      setSuccess(`✅ ${staffCategory} ${firstName} ${lastName} registered successfully!`)

      // Reset form
      setCurrentStep(1)
      setStaffCategory('')
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setPosition('')
      setDepartment('')
      setStaffNumber('')
      setTeachingLevel('')
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      setSalary('')
      setSelectedComboId('')
      setSelectedSubjects([])

      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }

      setTimeout(onClose, 2000)
    } catch (err: any) {
      console.error('[Staff Reg Modal] ❌ Registration error:', err)
      setError(`Registration failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = staffCategory === 'TEACHER' ? 5 : 3

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">📋 Register New Staff</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition hover:scale-110"
              type="button"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
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

          {/* Step 1: Category & Personal Info */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Category & Personal Information</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Staff Category *
                </label>
                <select
                  value={staffCategory}
                  onChange={(e) => setStaffCategory(e.target.value as StaffCategory)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select category...</option>
                  <option value="TEACHER">👨‍🏫 Teacher</option>
                  <option value="PRINCIPAL">🎓 Principal</option>
                  <option value="HEAD_TEACHER">📚 Head Teacher</option>
                  <option value="ACCOUNTANT">💰 Accountant</option>
                  <option value="ADMINISTRATOR">⚙️ Administrator</option>
                  <option value="SUPPORT_STAFF">🤝 Support Staff</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={!staffCategory || !firstName || !lastName}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
              >
                Continue to Contact Info →
              </button>
            </form>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Contact Information</h3>

              <input
                type="email"
                placeholder="Email Address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="tel"
                placeholder="Phone Number *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="password"
                placeholder="Password (min. 6 characters) *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Continue to Employment Info →
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Employment */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Employment Information</h3>

              <input
                type="text"
                placeholder="Position/Title *"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Department *"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Staff Number (Optional)"
                value={staffNumber}
                onChange={(e) => setStaffNumber(e.target.value)}
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
                  {staffCategory === 'TEACHER' ? 'Continue to Teacher Details →' : 'Complete Registration ✓'}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Teacher-Specific Info (only for teachers) */}
          {currentStep === 4 && staffCategory === 'TEACHER' && (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Teacher Details & Bank Information</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Teaching Level *
                </label>
                <select
                  value={teachingLevel}
                  onChange={(e) => setTeachingLevel(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select level...</option>
                  <option value="PRIMARY">Primary School</option>
                  <option value="SECONDARY">Secondary School</option>
                </select>
              </div>

              <h4 className="text-lg font-semibold text-gray-900">Bank Details</h4>

              <input
                type="text"
                placeholder="Bank Name *"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Account Number *"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Account Name *"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

              <input
                type="number"
                placeholder="Monthly Salary *"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />

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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Continue to Class/Subject Assignment →
                </button>
              </div>
            </form>
          )}

          {/* Step 5: Class/Subject Assignment (only for teachers) */}
          {currentStep === 5 && staffCategory === 'TEACHER' && (
            <form onSubmit={handleStep5Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Class & Subject Assignment</h3>

              {loadingTeachingData && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-r-lg">
                  <p className="font-semibold">Loading classes and subjects...</p>
                </div>
              )}

              {!loadingTeachingData && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Select Class *
                    </label>
                    <select
                      value={selectedComboId}
                      onChange={(e) => {
                        setSelectedComboId(e.target.value)
                        setSelectedSubjects([])
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="">Choose a class...</option>
                      {combos.map((combo: any) => (
                        <option key={combo.id} value={combo.id}>
                          {combo.label || `${combo.class_name} - ${combo.arm_name}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedComboId && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Select Subjects * ({selectedSubjects.length} selected)
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4">
                        {subjects.length > 0 ? (
                          subjects.map((subject: any) => (
                            <label
                              key={subject.id}
                              className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSubjects.includes(subject.id)}
                                onChange={() => toggleSubject(subject.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-gray-900">{subject.name}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-gray-500">No subjects available</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingTeachingData}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
                >
                  {loading ? 'Registering...' : 'Complete Registration ✓'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
