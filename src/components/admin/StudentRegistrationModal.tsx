'use client'

import { useState, useEffect } from 'react'
import { UserRegistrationService, StudentRegistrationData } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
import { generateAdmissionNumber } from '@/constants/nigerian-subjects'

interface StudentRegistrationModalProps {
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DEPARTMENTS = [
  { id: 'science', name: 'Science' },
  { id: 'commercial', name: 'Commercial' },
  { id: 'humanities', name: 'Humanities' },
  { id: 'technical', name: 'Technical' },
]

export default function StudentRegistrationModal({
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: StudentRegistrationModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    date_of_birth: '',
  })

  // Selection Data
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [admissionNumber, setAdmissionNumber] = useState('')

  // Loaded Data
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classType, setClassType] = useState<'PRIMARY' | 'SECONDARY' | null>(null)
  const [classLevel, setClassLevel] = useState<number | null>(null)

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && schoolId) {
      loadData()
    }
  }, [isOpen, schoolId])

  // Auto-generate admission number when class is selected
  useEffect(() => {
    if (selectedClass && classType) {
      generateAdmissionNumberAsync()
    }
  }, [selectedClass, classType])

  const loadData = async () => {
    setError('')
    try {
      // Load classes and arms
      const { data: combosData } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id')
        .eq('school_id', schoolId)
        .order('id')

      if (combosData && combosData.length > 0) {
        const classIds = [...new Set(combosData.map((c: any) => c.class_id))]
        const armIds = [...new Set(combosData.map((c: any) => c.arm_id))]

        const [{ data: classesData }, { data: armsData }] = await Promise.all([
          supabase.from('classes').select('id, name, level, type').in('id', classIds),
          supabase.from('arms').select('id, name').in('id', armIds),
        ])

        const merged = combosData.map((combo: any) => ({
          id: combo.id,
          class: classesData?.find((c: any) => c.id === combo.class_id),
          arm: armsData?.find((a: any) => a.id === combo.arm_id),
        }))

        setClasses(merged)
      }

      // Load subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels')
        .eq('school_id', schoolId)
        .order('name')

      setSubjects(subjectsData || [])
    } catch (err: any) {
      setError(`Error loading data: ${err.message}`)
    }
  }

  const generateAdmissionNumberAsync = async () => {
    try {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('class_arm_combo_id', selectedClass)
        .eq('school_id', schoolId)

      const sequence = (count || 0) + 1
      const admNum = generateAdmissionNumber(selectedClass, sequence)
      setAdmissionNumber(admNum)
    } catch (err: any) {
      console.error('Failed to generate admission number:', err.message)
    }
  }

  const handleClassChange = (classComboId: string) => {
    setSelectedClass(classComboId)
    const selectedClassData = classes.find((c) => c.id === classComboId)
    if (selectedClassData) {
      setClassType(selectedClassData.class?.type as 'PRIMARY' | 'SECONDARY')
      setClassLevel(selectedClassData.class?.level)
      setSelectedSubjects(new Set())
      setSelectedDepartment('')
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

  const validateStep2 = (): boolean => {
    if (!selectedClass) {
      setError('Class selection is required')
      return false
    }
    if (classType === 'SECONDARY' && !selectedDepartment) {
      setError('Department selection is required for secondary students')
      return false
    }
    if (classType === 'SECONDARY' && selectedSubjects.size === 0) {
      setError('Please select at least one subject')
      return false
    }
    if (classType === 'PRIMARY' && selectedSubjects.size === 0) {
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

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep2()) return

    setLoading(true)

    try {
      const registrationData: StudentRegistrationData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        school_id: schoolId,
        admission_number: admissionNumber,
        class_arm_combo_id: selectedClass,
        subject_ids: Array.from(selectedSubjects),
      }

      await UserRegistrationService.registerStudent(registrationData)

      setSuccess('✅ Student registered successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
        setCurrentStep(1)
        setFormData({ full_name: '', email: '', password: '', confirmPassword: '', date_of_birth: '' })
        setSelectedClass('')
        setSelectedDepartment('')
        setSelectedSubjects(new Set())
        setAdmissionNumber('')
        setClassType(null)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to register student')
    } finally {
      setLoading(false)
    }
  }

  const applicableSubjects = selectedClass && classLevel !== null
    ? subjects.filter((s) => !s.applicable_to_levels?.length || s.applicable_to_levels.includes(classLevel))
    : []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 border-b shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Student Registration</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <div
              className={`flex-1 h-1 rounded ${
                currentStep >= 1 ? 'bg-white' : 'bg-white/30'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded ${
                currentStep >= 2 ? 'bg-white' : 'bg-white/30'
              }`}
            />
          </div>
          <p className="text-sm text-green-100 mt-2">Step {currentStep} of 2</p>
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

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
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
                    placeholder="Enter student's full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    required
                  />
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
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Class & Subjects */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              {/* Admission Number Display */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-600">Admission Number (Auto-Generated)</p>
                <p className="text-lg font-bold text-blue-700 mt-1">{admissionNumber || 'Generating...'}</p>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  required
                >
                  <option value="">-- Select a Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class?.name} - {c.arm?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selection (Secondary Only) */}
              {classType === 'SECONDARY' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {DEPARTMENTS.map((dept) => (
                      <label
                        key={dept.id}
                        className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition"
                      >
                        <input
                          type="radio"
                          name="department"
                          value={dept.id}
                          checked={selectedDepartment === dept.id}
                          onChange={(e) =>
                            setSelectedDepartment(e.target.value)
                          }
                          className="w-4 h-4"
                        />
                        <span className="font-medium text-gray-700">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Subjects <span className="text-red-500">*</span>
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Select at least one)
                  </span>
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50">
                  {applicableSubjects.length > 0 ? (
                    <div className="space-y-2">
                      {applicableSubjects.map((subject) => (
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
                      No subjects available for this class
                    </p>
                  )}
                </div>
                {applicableSubjects.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedSubjects.size} subject{selectedSubjects.size !== 1 ? 's' : ''} selected
                  </p>
                )}
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
                  disabled={loading || !selectedClass}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
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
