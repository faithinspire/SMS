'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StudentRegistrationService, StudentRegistrationData, GuardianInfo } from '@/services/student-registration.service'
import { RegistrationConfigService } from '@/services/registration-config.service'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'
import { AuthService } from '@/services/auth.service'
import { toast } from 'react-hot-toast'

const STAGES = [
  { number: 1, title: 'Personal Information', icon: '👤' },
  { number: 2, title: 'Parent/Guardian & Admission', icon: '👨‍👩‍👧' },
  { number: 3, title: 'Class, Session & Subjects', icon: '🏫' },
  { number: 4, title: 'Medical & Documents', icon: '📄' },
  { number: 5, title: 'Review & Confirm', icon: '✓' },
]

interface FormState extends Partial<StudentRegistrationData> {
  confirmPassword?: string
}

export default function StudentRegisterPage() {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState(1)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [classOptions, setClassOptions] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [formData, setFormData] = useState<FormState>({
    // Stage 1: Student Personal
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    state: '',

    // Stage 2: Guardian & Admission
    primaryGuardian: {
      fullName: '',
      relationship: 'Parent',
      phone: '',
      email: '',
      address: '',
      occupation: '',
    },
    admissionNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionStatus: 'ACTIVE',

    // Stage 3: Class/Session/Term & Subjects
    sessionId: '',
    termId: '',
    classArmComboId: '',
    subjectIds: [],

    // Stage 4: Medical & Documents
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  })

  // Get current user and school on mount
  useEffect(() => {
    const loadUserContext = async () => {
      try {
        const user = await AuthService.getCurrentUser()
        if (!user || !user.school_id) {
          toast.error('You must be logged in as a school admin to register students')
          router.push('/auth/login')
          return
        }
        setCurrentUser(user)
        // Auto-populate schoolId from auth context
        setFormData(prev => ({ ...prev, schoolId: user.school_id }))
      } catch (error) {
        console.error('Error loading user context:', error)
        router.push('/auth/login')
      } finally {
        setAuthLoading(false)
      }
    }
    loadUserContext()
  }, [router])

  // Load sessions and classes when school is set
  useEffect(() => {
    if (!formData.schoolId || !currentUser) {
      setSessions([])
      setTerms([])
      setClassOptions([])
      return
    }

    const loadSessionsAndClasses = async () => {
      try {
        // Load sessions
        const { data: sessionData } = await RegistrationConfigService.getAcademicTerms(
          formData.schoolId!
        )
        const uniqueSessions = [
          ...new Map(
            sessionData.map((t) => [t.session_id, { id: t.session_id, name: t.term_name }])
          ).values(),
        ]
        setSessions(uniqueSessions)

        // Load classes
        const classCombo = await RegistrationConfigService.getClassArmCombos(formData.schoolId!)
        setClassOptions(classCombo)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load sessions/classes')
      }
    }
    loadSessionsAndClasses()
  }, [formData.schoolId, currentUser])

  // Load terms when session changes
  useEffect(() => {
    if (!formData.sessionId || !formData.schoolId) {
      setTerms([])
      return
    }

    const loadTerms = async () => {
      try {
        const { data: allTerms } = await RegistrationConfigService.getAcademicTerms(
          formData.schoolId!
        )
        const sessionTerms = allTerms.filter((t) => t.session_id === formData.sessionId)
        setTerms(sessionTerms)
      } catch (error) {
        console.error('Error loading terms:', error)
        toast.error('Failed to load terms')
      }
    }
    loadTerms()
  }, [formData.sessionId, formData.schoolId])

  // Load subjects when class changes
  useEffect(() => {
    if (!formData.classArmComboId || !formData.schoolId) {
      setSubjects([])
      return
    }

    const loadSubjects = async () => {
      try {
        const classCombo = classOptions.find((c) => c.id === formData.classArmComboId)
        
        if (!classCombo || !classCombo?.classes?.level) {
          setSubjects([])
          return
        }

        const subjectList = await CanonicalSubjectService.getSubjectsForLevel(
          formData.schoolId!,
          classCombo.classes.level
        )
        setSubjects(subjectList)
      } catch (error) {
        console.error('Error loading subjects:', error)
        setSubjects([])
      }
    }
    loadSubjects()
  }, [formData.classArmComboId, formData.schoolId, classOptions])

  const validateStage = (): boolean => {
    const required = {
      1: ['firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'email', 'address', 'state'],
      2: ['primaryGuardian.fullName', 'primaryGuardian.phone', 'admissionDate'],
      3: ['sessionId', 'termId', 'classArmComboId'],
      4: [], // Medical info optional
      5: [], // Review only
    }

    const requiredFields = required[currentStage as keyof typeof required] || []
    for (const field of requiredFields) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        const value = (formData[parent as keyof FormState] as any)?.[child]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          toast.error('Please fill in all required fields')
          return false
        }
      } else {
        const value = formData[field as keyof FormState]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          toast.error('Please fill in all required fields')
          return false
        }
      }
    }

    // Email validation
    if ((formData.email || '').length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email || '')) {
        toast.error('Please enter a valid email address')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateStage()) {
      if (currentStage < STAGES.length) {
        setCurrentStage(currentStage + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handlePrevious = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStage()) return

    setIsLoading(true)
    try {
      const result = await StudentRegistrationService.registerStudent(
        formData as StudentRegistrationData
      )

      if (result.success) {
        toast.success(`Student registered successfully!\nAdmission No: ${result.admissionNumber}\nPIN: ${result.pin}`)
        setTimeout(() => {
          router.push('/auth/student/login')
        }, 3000)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Failed to register student')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJumpToStage = (stage: number) => {
    if (stage <= currentStage) {
      setCurrentStage(stage)
    }
  }

  const renderStageContent = () => {
    switch (currentStage) {
      case 1: // Student Personal
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-6">Student Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name *"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Last Name *"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={formData.gender || 'MALE'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                type="date"
                placeholder="Date of Birth *"
                value={formData.dateOfBirth || ''}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Address *"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none md:col-span-2"
              />
              <input
                type="text"
                placeholder="State *"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )

      case 2: // Guardian & Admission
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-6">Parent/Guardian Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Guardian Full Name *"
                  value={formData.primaryGuardian?.fullName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, fullName: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={formData.primaryGuardian?.relationship || 'Parent'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, relationship: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Aunt/Uncle">Aunt/Uncle</option>
                  <option value="Grandparent">Grandparent</option>
                </select>
                <input
                  type="tel"
                  placeholder="Guardian Phone *"
                  value={formData.primaryGuardian?.phone || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, phone: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Guardian Email"
                  value={formData.primaryGuardian?.email || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, email: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Guardian Address"
                  value={formData.primaryGuardian?.address || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, address: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none md:col-span-2"
                />
              </div>
            </div>

            <hr />

            <div>
              <h3 className="text-lg font-semibold mb-4">Admission Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Admission Number</label>
                  <input
                    type="text"
                    placeholder="Auto-generated"
                    value={formData.admissionNumber || '(Auto-generated)'}
                    disabled
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <input
                  type="date"
                  placeholder="Admission Date *"
                  value={formData.admissionDate || ''}
                  onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )

      case 3: // Class/Session/Term & Subjects
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-6">Class, Session & Subjects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <select
                  value={formData.sessionId || ''}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Session *</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.id}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.termId || ''}
                  onChange={(e) => setFormData({ ...formData, termId: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Term *</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.term_name}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.classArmComboId || ''}
                  onChange={(e) => setFormData({ ...formData, classArmComboId: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none md:col-span-2"
                >
                  <option value="">Select Class *</option>
                  {classOptions.map((combo) => (
                    <option key={combo.id} value={combo.id}>
                      {combo.classes?.name} {combo.arms?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {subjects.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Subject Selection</h3>
                <p className="text-sm text-gray-600 mb-3">Select all applicable subjects:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded-lg bg-gray-50">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(formData.subjectIds || []).includes(subject.id)}
                        onChange={(e) => {
                          const newIds = formData.subjectIds || []
                          if (e.target.checked) {
                            setFormData({ ...formData, subjectIds: [...newIds, subject.id] })
                          } else {
                            setFormData({
                              ...formData,
                              subjectIds: newIds.filter((id) => id !== subject.id),
                            })
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{subject.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Selected: <span className="font-semibold">{(formData.subjectIds || []).length} subject(s)</span>
                </p>
              </div>
            )}
          </div>
        )

      case 4: // Medical & Documents
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-6">Medical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={formData.bloodType || ''}
                  onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Blood Type</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
                <input
                  type="text"
                  placeholder="Allergies"
                  value={formData.allergies || ''}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <textarea
                  placeholder="Medical Conditions"
                  value={formData.medicalConditions || ''}
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                  rows={3}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none md:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Emergency Contact Name"
                  value={formData.emergencyContactName || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Emergency Contact Phone"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )

      case 5: // Review
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-6">Review & Confirmation</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-96 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">School</p>
                <p className="text-sm font-bold text-blue-700">{currentUser?.school_name || 'Your School'}</p>
              </div>
              <hr />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Student Information</p>
                <p className="text-sm">
                  {formData.firstName} {formData.lastName}
                </p>
                <p className="text-xs text-gray-600">{formData.gender} • DOB: {formData.dateOfBirth}</p>
                <p className="text-xs text-gray-600">{formData.email} • {formData.phone}</p>
              </div>
              <hr />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Guardian</p>
                <p className="text-sm">{formData.primaryGuardian?.fullName}</p>
                <p className="text-xs text-gray-600">{formData.primaryGuardian?.relationship} • {formData.primaryGuardian?.phone}</p>
              </div>
              <hr />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Class Assignment</p>
                <p className="text-sm">
                  {classOptions.find(c => c.id === formData.classArmComboId)?.classes?.name}{' '}
                  {classOptions.find(c => c.id === formData.classArmComboId)?.arms?.name}
                </p>
                <p className="text-xs text-gray-600">Session • Term • {(formData.subjectIds || []).length} subject(s)</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ All information has been verified. Click "Complete Registration" to finalize.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">You must be logged in as a school admin to register students.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registration</h1>
          <p className="text-gray-600">Registering for: <span className="font-semibold text-blue-700">{currentUser?.school_name || 'Your School'}</span></p>
          <p className="text-sm text-gray-500 mt-2">Complete all {STAGES.length} stages to enroll</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STAGES.map((stage) => (
              <button
                key={stage.number}
                onClick={() => handleJumpToStage(stage.number)}
                className={`flex flex-col items-center ${
                  currentStage === stage.number
                    ? 'text-blue-600'
                    : currentStage > stage.number
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 font-semibold ${
                    currentStage === stage.number
                      ? 'bg-blue-600 text-white'
                      : currentStage > stage.number
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-white'
                  }`}
                >
                  {stage.number}
                </div>
                <span className="text-xs text-center hidden md:inline">{stage.title}</span>
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(currentStage / STAGES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          {renderStageContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentStage === 1}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          {currentStage === STAGES.length ? (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isLoading ? 'Registering...' : '✓ Complete Registration'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isLoading}
              type="button"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isLoading ? 'Loading...' : 'Next →'}
            </button>
          )}
        </div>

        {/* Stage Info */}
        <div className="text-center mt-8 text-sm text-gray-600">
          Stage {currentStage} of {STAGES.length}: {STAGES[currentStage - 1].title}
        </div>
      </div>
    </div>
  )
}
