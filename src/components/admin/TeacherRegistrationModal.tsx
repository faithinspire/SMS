'use client'

import { useState, useEffect } from 'react'
import { UserRegistrationService, TeacherRegistrationData } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'

interface TeacherRegistrationModalProps {
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function TeacherRegistrationModal({
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: TeacherRegistrationModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dataLoading, setDataLoading] = useState(false)

  // Teacher Level Selection
  const [teacherLevel, setTeacherLevel] = useState<'PRIMARY' | 'SECONDARY' | null>(null)

  // Form Data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    date_of_birth: '',
  })

  // Payment Data
  const [paymentData, setPaymentData] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    salary_amount: '',
    employment_date: new Date().toISOString().split('T')[0],
  })

  // Selection Data
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())

  // Loaded Data
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && schoolId) {
      loadData()
    }
  }, [isOpen, schoolId])

  const loadData = async () => {
    setDataLoading(true)
    setError('')
    try {
      console.log('Loading data for schoolId:', schoolId)

      // Load classes
      const { data: combosData, error: combosError } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id, class_teacher_id')
        .eq('school_id', schoolId)

      console.log('Combos:', combosData, 'Error:', combosError)

      if (combosData && combosData.length > 0) {
        const classIds = [...new Set(combosData.map((c: any) => c.class_id))]
        const armIds = [...new Set(combosData.map((c: any) => c.arm_id))]

        console.log('Class IDs:', classIds, 'Arm IDs:', armIds)

        const { data: classesData, error: classError } = await supabase
          .from('classes')
          .select('id, name, level, type')
          .in('id', classIds)

        const { data: armsData, error: armError } = await supabase
          .from('arms')
          .select('id, name')
          .in('id', armIds)

        console.log('Classes:', classesData, 'Arms:', armsData)

        const merged = combosData.map((combo: any) => ({
          id: combo.id,
          class_teacher_id: combo.class_teacher_id,
          class: classesData?.find((c: any) => c.id === combo.class_id),
          arm: armsData?.find((a: any) => a.id === combo.arm_id),
        }))

        console.log('Merged classes:', merged)
        setClasses(merged)
      }

      // Load subjects - ALWAYS load all subjects regardless of level
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels')
        .eq('school_id', schoolId)
        .order('name')

      console.log('Subjects:', subjectsData, 'Error:', subjectsError)
      setSubjects(subjectsData || [])
    } catch (err: any) {
      console.error('Load error:', err)
      setError(`Error loading data: ${err.message}`)
    } finally {
      setDataLoading(false)
    }
  }

  const handleSubjectToggle = (subjectId: string) => {
    const newSet = new Set(selectedSubjects)
    if (newSet.has(subjectId)) {
      newSet.delete(subjectId)
    } else {
      newSet.add(subjectId)
    }
    setSelectedSubjects(newSet)
  }

  const validateStep1 = (): boolean => {
    if (!teacherLevel) {
      setError('Please select teacher level')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!formData.password) {
      setError('Password is required')
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
    if (!formData.date_of_birth) {
      setError('Date of birth is required')
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (!paymentData.bank_name.trim()) {
      setError('Bank name is required')
      return false
    }
    if (!paymentData.account_number.trim()) {
      setError('Account number is required')
      return false
    }
    if (!paymentData.salary_amount) {
      setError('Salary amount is required')
      return false
    }
    if (parseFloat(paymentData.salary_amount) <= 0) {
      setError('Salary must be greater than 0')
      return false
    }
    if (!paymentData.employment_date) {
      setError('Employment date is required')
      return false
    }
    return true
  }

  const validateStep4 = (): boolean => {
    if (selectedSubjects.size === 0) {
      setError('Please select at least one subject')
      return false
    }
    return true
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep1()) {
      setCurrentStep(2)
    }
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep3()) {
      setCurrentStep(4)
    }
  }

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep4()) return

    setLoading(true)

    try {
      const registrationData: TeacherRegistrationData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: 'TEACHER',
        school_id: schoolId,
        class_arm_combo_id: selectedClass || undefined,
        subject_ids: Array.from(selectedSubjects),
      }

      await UserRegistrationService.registerTeacher(registrationData)

      setSuccess('✅ Teacher registered successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
        setCurrentStep(1)
        setTeacherLevel(null)
        setFormData({ full_name: '', email: '', password: '', confirmPassword: '', date_of_birth: '' })
        setPaymentData({
          bank_name: '',
          account_number: '',
          account_holder_name: '',
          salary_amount: '',
          employment_date: new Date().toISOString().split('T')[0],
        })
        setSelectedClass('')
        setSelectedSubjects(new Set())
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to register teacher')
    } finally {
      setLoading(false)
    }
  }

  // Filter classes based on teacher level
  const filteredClasses = classes.filter((c) => !teacherLevel || c.class?.type === teacherLevel)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 border-b shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Teacher Registration</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-1 rounded ${
                  currentStep >= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-blue-100">Step {currentStep} of 4</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {dataLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
              Loading classes and subjects...
            </div>
          )}

          {/* Step 1: Teacher Level */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Teaching Level</h3>
                <p className="text-sm text-gray-600 mb-4">Choose the level you will be teaching</p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'PRIMARY', label: 'Primary School', icon: '🎓' },
                    { value: 'SECONDARY', label: 'Secondary School', icon: '📚' },
                  ].map((level) => (
                    <label
                      key={level.value}
                      className={`flex flex-col items-center gap-3 p-6 border-2 rounded-lg cursor-pointer transition ${
                        teacherLevel === level.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <span className="text-4xl">{level.icon}</span>
                      <input
                        type="radio"
                        name="teacherLevel"
                        value={level.value}
                        checked={teacherLevel === level.value}
                        onChange={(e) => setTeacherLevel(e.target.value as 'PRIMARY' | 'SECONDARY')}
                        className="w-4 h-4"
                      />
                      <span className="font-semibold text-gray-900">{level.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Enter teacher's full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      setFormData({ ...formData, date_of_birth: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Payment Information */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <p className="text-sm font-semibold text-gray-600">Payment & Employment Details</p>
                <p className="text-xs text-gray-500 mt-1">Please provide banking and salary information</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentData.bank_name}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, bank_name: e.target.value })
                    }
                    placeholder="e.g., First Bank of Nigeria"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentData.account_number}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, account_number: e.target.value })
                    }
                    placeholder="10-digit account number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={paymentData.account_holder_name}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, account_holder_name: e.target.value })
                    }
                    placeholder="Name as it appears on account"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Salary (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentData.salary_amount}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, salary_amount: e.target.value })
                    }
                    placeholder="Enter salary amount"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentData.employment_date}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, employment_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Subjects & Classes */}
          {currentStep === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              {/* Class Assignment (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Class Teacher Assignment (Optional)
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                >
                  <option value="">-- Not a class teacher --</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class?.name} - {c.arm?.name}
                    </option>
                  ))}
                </select>
                {filteredClasses.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">No classes available for {teacherLevel} level</p>
                )}
              </div>

              {/* Subjects Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Subjects to Teach <span className="text-red-500">*</span>
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Select at least one)
                  </span>
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                  {subjects && subjects.length > 0 ? (
                    <div className="space-y-2">
                      {subjects.map((subject) => (
                        <label
                          key={subject.id}
                          className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubjects.has(subject.id)}
                            onChange={() => handleSubjectToggle(subject.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {subject.name}
                            {subject.code && (
                              <span className="text-gray-500 ml-1">({subject.code})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No subjects available
                    </p>
                  )}
                </div>
                {subjects && subjects.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedSubjects.size} subject{selectedSubjects.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedSubjects.size === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
