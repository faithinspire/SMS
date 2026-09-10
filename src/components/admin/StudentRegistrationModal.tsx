'use client'

import { useState, useEffect } from 'react'
import { UserRegistrationService, StudentRegistrationData } from '@/services/user-registration.service'
import { RegistrationConfigService, ClassArmCombo } from '@/services/registration-config.service'
import DisplayNameResolver from '@/lib/display-name-resolver'

// Simple admission number generator (replaces deleted nigerian-subjects.ts)
const generateAdmissionNumber = (classId?: string, sequence?: number): string => {
  const seq = sequence || Math.floor(Math.random() * 10000)
  const timestamp = Date.now().toString().slice(-4)
  return `ADM-${timestamp}-${seq.toString().padStart(5, '0')}`
}

interface StudentRegistrationModalProps {
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DEPARTMENTS = [
  { id: 'SCIENCE', name: 'Science' },
  { id: 'COMMERCIAL', name: 'Commercial' },
  { id: 'HUMANITIES', name: 'Humanities' },
  { id: 'TECHNICAL', name: 'Technical' },
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
  const [dataLoading, setDataLoading] = useState(true)

  // Form Data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    date_of_birth: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  })

  // Academic Placement
  const [section, setSection] = useState<'PRIMARY' | 'SECONDARY' | null>(null)
  const [selectedClassCombo, setSelectedClassCombo] = useState('')
  const [selectedStream, setSelectedStream] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [admissionNumber, setAdmissionNumber] = useState('')

  // Loaded Data
  const [classCombos, setClassCombos] = useState<ClassArmCombo[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && schoolId) {
      loadData()
    }
  }, [isOpen, schoolId])

  // AUTO-GENERATE ADMISSION NUMBER when class is selected
  useEffect(() => {
    if (selectedClassCombo && classCombos.length > 0) {
      const selectedCombo = classCombos.find(c => c.id === selectedClassCombo)
      if (selectedCombo) {
        const sequence = Math.floor(Math.random() * 10000)
        const admNum = generateAdmissionNumber(selectedCombo.id, sequence)
        console.log('✅ Auto-generated admission number on class select:', admNum)
        setAdmissionNumber(admNum)
      }
    }
  }, [selectedClassCombo, classCombos])

  const loadData = async () => {
    setDataLoading(true)
    setError('')
    console.log('📡 [STUDENT REGISTRATION] Loading data for schoolId:', schoolId)

    // ✅ VALIDATE SCHOOL ID FIRST - ROOT CAUSE FIX #1
    if (!schoolId || schoolId.trim() === '' || schoolId === 'undefined') {
      setError('❌ School ID is required. Please contact your school administrator.')
      console.error('❌ Empty or invalid school ID:', schoolId)
      setDataLoading(false)
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(schoolId)) {
      setError(`❌ Invalid school ID format: ${schoolId}`)
      console.error('❌ Invalid school ID format:', schoolId)
      setDataLoading(false)
      return
    }

    try {
      const comboData = await RegistrationConfigService.getAllComboData(schoolId)

      console.log('✅ [STUDENT REGISTRATION] Data loaded:', comboData.stats)
      console.log('📊 Data details:', {
        classCount: comboData.classes.length,
        subjectCount: comboData.subjects.length,
        streamCount: comboData.streams.length,
        classes: comboData.classes.slice(0, 3),
        subjects: comboData.subjects.slice(0, 3),
      })

      setClassCombos(comboData.combos)
      setStreams(comboData.streams)
      setSubjects(comboData.subjects)

      // Generate admission number only when class is selected
      if (selectedClassCombo) {
        const selectedCombo = classCombos.find(c => c.id === selectedClassCombo)
        if (selectedCombo) {
          const sequence = Math.floor(Math.random() * 10000)
          const admNum = generateAdmissionNumber(selectedCombo.id, sequence)
          console.log('✅ Generated admission number:', admNum)
          setAdmissionNumber(admNum)
        }
      } else {
        // Placeholder when no class is selected yet - no "undefined"
        const year = new Date().getFullYear()
        setAdmissionNumber(`${year}-PENDING`)
      }

      if (comboData.stats.comboCount === 0) {
        console.warn('⚠️ No classes available for school:', schoolId)
        setError('⚠️ No classes available. Please ensure school data has been populated.')
      }
      if (comboData.stats.subjectCount === 0) {
        console.warn('⚠️ No subjects available for school:', schoolId)
        setError('⚠️ No subjects available. Please ensure school data has been populated.')
      }
    } catch (err: any) {
      console.error('❌ [STUDENT REGISTRATION] Error loading data:', err)
      setError('❌ Failed to load class and subject data. Check browser console for details.')
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

  // Filter subjects by the selected class level
  const getRelevantSubjects = (): any[] => {
    if (!selectedClassCombo) return subjects

    // Find the selected class to get its level
    const selectedCombo = classCombos.find(c => c.id === selectedClassCombo)
    if (!selectedCombo) return subjects

    const classLevel = (selectedCombo.classes as any)?.level
    if (classLevel === undefined) return subjects

    // Convert classLevel to string for comparison
    const classLevelStr = String(classLevel)

    console.log('🔍 [SUBJECT FILTER] Filtering subjects for class level:', classLevel)
    console.log('📚 Total subjects available:', subjects.length)
    
    // Filter subjects where this level is in applicable_to_levels
    const relevant = subjects.filter((subject) => {
      if (!subject.applicable_to_levels) {
        console.warn('⚠️  Subject has no applicable_to_levels:', subject.name)
        return false
      }

      // Handle both string and number arrays
      const levelsArray = Array.isArray(subject.applicable_to_levels) 
        ? subject.applicable_to_levels 
        : []

      const isRelevant = levelsArray.some(level => String(level) === classLevelStr)
      
      if (isRelevant) {
        console.log('✅ Subject matches:', subject.name, 'levels:', levelsArray)
      }
      
      return isRelevant
    })

    console.log('📊 Relevant subjects found:', relevant.length)
    
    if (relevant.length === 0 && subjects.length > 0) {
      console.warn('⚠️  No subjects match class level', classLevel)
      console.warn('📋 All subjects:', subjects.map(s => ({ name: s.name, levels: s.applicable_to_levels })))
    }

    return relevant
  }

  // Get display name for a class combo
  const getClassComboDisplay = (combo: ClassArmCombo): string => {
    const className = (combo.classes as any)?.name || 'Unknown Class'
    const armName = (combo.arm as any)?.name || 'Unknown'
    return `${className} - Arm ${armName}`
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
    if (!formData.parent_name.trim()) {
      setError('Parent name is required')
      return false
    }
    if (!formData.parent_phone.trim()) {
      setError('Parent phone is required')
      return false
    }
    if (!formData.parent_email.trim()) {
      setError('Parent email is required')
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (!section) {
      setError('Please select Primary or Secondary')
      return false
    }
    if (!selectedClassCombo) {
      setError('Please select a class')
      return false
    }
    if (section === 'SECONDARY' && ['SS1', 'SS2', 'SS3'].includes(getSelectedClassName()) && !selectedStream) {
      setError('Please select a stream for this class')
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

  const getSelectedClassName = (): string => {
    const combo = classCombos.find((c) => c.id === selectedClassCombo)
    return (combo?.classes as any)?.name || ''
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep1()) setCurrentStep(2)
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep2()) setCurrentStep(3)
  }

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep3()) setCurrentStep(4)
  }

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep4()) return

    setLoading(true)

    try {
      const registrationData: StudentRegistrationData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: 'STUDENT',
        school_id: schoolId,
        class_arm_combo_id: selectedClassCombo,
        stream_id: selectedStream || undefined,
        subject_ids: Array.from(selectedSubjects),
        admission_number: admissionNumber,
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        parent_email: formData.parent_email,
      }

      await UserRegistrationService.registerStudent(registrationData)

      setSuccess('✅ Student registered successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
        setCurrentStep(1)
        setFormData({
          full_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          date_of_birth: '',
          parent_name: '',
          parent_phone: '',
          parent_email: '',
        })
        setSection(null)
        setSelectedClassCombo('')
        setSelectedStream('')
        setSelectedDepartment('')
        setSelectedSubjects(new Set())
        setAdmissionNumber(generateAdmissionNumber())
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to register student')
    } finally {
      setLoading(false)
    }
  }

  // Filter combos by section
  const filteredCombos = classCombos.filter(
    (combo) => !section || (combo.classes as any)?.type === section
  )

  // Check if selected class requires stream selection
  const requiresStream = section === 'SECONDARY' && ['SS1', 'SS2', 'SS3'].includes(getSelectedClassName())

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 via-cyan-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">👨‍🎓 Register New Student</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition hover:scale-110"
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

          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Student Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="First and Last Name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@school.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
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
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition"
                >
                  Continue →
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Parent Info */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Parent/Guardian Information</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Parent/Guardian Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    placeholder="+234..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                    placeholder="parent@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  ← Back
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
                  className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition"
                >
                  Continue →
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Academic Placement */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Academic Placement</h3>

              {/* Section Selection */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-xl border border-cyan-200">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  📚 Education Section <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'PRIMARY', label: 'Primary' },
                    { value: 'SECONDARY', label: 'Secondary' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSection(opt.value as any)
                        setSelectedClassCombo('')
                        setSelectedStream('')
                      }}
                      className={`px-4 py-3 rounded-lg font-semibold transition ${
                        section === opt.value
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-cyan-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Selection */}
              {section && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    🏫 Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClassCombo}
                    onChange={(e) => {
                      setSelectedClassCombo(e.target.value)
                      setSelectedStream('')
                    }}
                    disabled={dataLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
                  >
                    <option value="">-- Select Class --</option>
                    {filteredCombos.length > 0 ? (
                      filteredCombos.map((combo) => (
                        <option key={combo.id} value={combo.id}>
                          {getClassComboDisplay(combo)}
                        </option>
                      ))
                    ) : (
                      <option disabled>No classes available</option>
                    )}
                  </select>
                </div>
              )}

              {/* Stream Selection (for SS1-SS3) */}
              {requiresStream && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    🎯 Stream <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(e.target.value)}
                    disabled={dataLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
                  >
                    <option value="">-- Select Stream --</option>
                    {streams.length > 0 ? (
                      streams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No streams available</option>
                    )}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  ← Back
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
                  disabled={!selectedClassCombo || (requiresStream && !selectedStream)}
                  className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-400 transition"
                >
                  Continue →
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Subject Selection */}
          {currentStep === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Subject Selection</h3>

              {/* Admission Number Display */}
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <p className="text-sm text-green-700 font-semibold">Admission Number</p>
                <p className="text-2xl font-bold text-green-900">{admissionNumber}</p>
              </div>

              {/* Subjects Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  📚 Select Subjects <span className="text-red-500">*</span>
                </label>

                <div className="border border-gray-300 rounded-lg p-4 bg-white max-h-64 overflow-y-auto">
                  {dataLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">⏳ Loading subjects...</p>
                    </div>
                  ) : getRelevantSubjects().length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {getRelevantSubjects().map((subject) => (
                        <label
                          key={subject.id}
                          className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-lg cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubjects.has(subject.id)}
                            onChange={() => handleSubjectToggle(subject.id)}
                            className="w-5 h-5 rounded cursor-pointer accent-green-600"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{subject.name}</span>
                            {subject.code && (
                              <span className="text-gray-500 text-sm ml-2">({subject.code})</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">❌ No subjects available</p>
                      <p className="text-xs text-gray-400 mt-2">Add subjects to your school first</p>
                    </div>
                  )}
                </div>

                {getRelevantSubjects().length > 0 && (
                  <p className="text-sm text-gray-600 mt-3 font-semibold">
                    ✓ {selectedSubjects.size} subject{selectedSubjects.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  ← Back
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
                  disabled={loading || dataLoading || selectedSubjects.size === 0}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {loading ? '⏳ Registering...' : '✓ Complete Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
