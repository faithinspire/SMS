'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { StaffRegistrationService, StaffRegistrationData } from '@/services/staff-registration.service'
import { RegistrationConfigService } from '@/services/registration-config.service'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'
import { toast } from 'react-hot-toast'

const STAGES = [
  { number: 1, title: 'Personal Information', icon: '👤' },
  { number: 2, title: 'Employment Details', icon: '💼' },
  { number: 3, title: 'Classes & Subjects', icon: '📚' },
  { number: 4, title: 'Account & Confirm', icon: '🔐' },
]

interface FormState extends Partial<StaffRegistrationData> {
  confirmPassword?: string
}

export default function StaffRegisterPage() {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState(1)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [classOptions, setClassOptions] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  
  const [formData, setFormData] = useState<FormState>({
    // Stage 1: Personal Information
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    state: '',

    // Stage 2: Employment Information
    staffId: '',
    position: '',
    role: 'TEACHER',
    department: '',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    dateEmployed: new Date().toISOString().split('T')[0],
    teachingExperience: 0,
    highestQualification: '',

    // Stage 3: Classes & Subjects
    classArmComboId: '',
    isClassTeacher: false,
    subjectIds: [],

    // Stage 4: Account & Confirm
    accountUsername: '',
    password: '',
    confirmPassword: '',
  })

  // Get current user and school on mount
  useEffect(() => {
    const loadUserContext = async () => {
      try {
        const user = await AuthService.getCurrentUser()
        if (!user || !user.school_id) {
          toast.error('You must be logged in as a school admin to register staff')
          router.push('/auth/login')
          return
        }
        setCurrentUser(user)
        // Auto-populate schoolId and email from auth context
        setFormData(prev => ({
          ...prev,
          schoolId: user.school_id,
          email: user.email || ''
        }))
      } catch (error) {
        console.error('Error loading user context:', error)
        router.push('/auth/login')
      } finally {
        setAuthLoading(false)
      }
    }
    loadUserContext()
  }, [router])

  // Load classes when school changes or stage 3 is needed
  useEffect(() => {
    if (!formData.schoolId || currentStage < 3) {
      setClassOptions([])
      return
    }

    const loadClasses = async () => {
      try {
        const combos = await RegistrationConfigService.getClassArmCombos(formData.schoolId!)
        setClassOptions(combos)
      } catch (error) {
        console.error('Error loading classes:', error)
        toast.error('Failed to load classes')
      }
    }
    loadClasses()
  }, [formData.schoolId, currentStage])

  // Load subjects when class changes
  useEffect(() => {
    if (!formData.classArmComboId || !formData.schoolId || formData.role !== 'TEACHER') {
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
  }, [formData.classArmComboId, formData.schoolId, formData.role, classOptions])

  const validateStage = (): boolean => {
    const required = {
      1: ['firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'email', 'address', 'state'],
      2: ['position', 'employmentType', 'employmentStatus', 'dateEmployed'],
      3: [], // Classes & subjects optional for non-teachers
      4: ['password', 'confirmPassword'],
    }

    const requiredFields = required[currentStage as keyof typeof required] || []
    for (const field of requiredFields) {
      const value = formData[field as keyof FormState]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast.error(`Please fill in all required fields for this stage`)
        return false
      }
    }

    // Email validation
    if (currentStage === 1 && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address')
        return false
      }
    }

    // Phone validation
    if (currentStage === 1 && formData.phone) {
      const phoneRegex = /^\d{10,}$/
      if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
        toast.error('Please enter a valid phone number (at least 10 digits)')
        return false
      }
    }

    // Password validation
    if (currentStage === 4) {
      if (!formData.password || formData.password.length < 8) {
        toast.error('Password must be at least 8 characters')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        return false
      }
      // Check password strength
      const hasUpper = /[A-Z]/.test(formData.password)
      const hasLower = /[a-z]/.test(formData.password)
      const hasNumber = /\d/.test(formData.password)
      const hasSpecial = /[!@#$%^&*]/.test(formData.password)
      
      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        toast.error('Password must include uppercase, lowercase, number, and special character')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateStage()) return
    if (currentStage < STAGES.length) {
      setCurrentStage(currentStage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
      // Build submission data - MAP role TO primaryRole
      const submissionData: StaffRegistrationData = {
        ...formData,
        password: formData.password || '',
        primaryRole: formData.role || 'TEACHER', // MAP role field to primaryRole 
      } as StaffRegistrationData

      console.log('[StaffRegistration] Submitting with primaryRole:', submissionData.primaryRole)

      const result = await StaffRegistrationService.registerStaff(submissionData)

      if (result.success) {
        toast.success(`Staff member ${result.fullName} registered successfully!`)
        setTimeout(() => {
          router.push('/auth/staff/login')
        }, 2000)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Failed to register staff member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJumpToStage = (stage: number) => {
    setCurrentStage(stage)
  }

  // Render stage content
  const renderStageContent = () => {
    switch (currentStage) {
      case 1: // Personal Information
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
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
                placeholder="Date of Birth"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      case 2: // Employment Information
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-6">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Staff ID (Optional)"
                value={formData.staffId || ''}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select Position *</option>
                <option value="Teacher">Teacher</option>
                <option value="Head of Department">Head of Department</option>
                <option value="Principal">Principal</option>
                <option value="Vice Principal">Vice Principal</option>
                <option value="Accountant">Accountant</option>
                <option value="Admin Staff">Admin Staff</option>
              </select>
              <select
                value={formData.role || 'TEACHER'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="TEACHER">Teacher</option>
                <option value="HEAD_TEACHER">Head Teacher</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="STAFF">Support Staff</option>
              </select>
              <input
                type="text"
                placeholder="Department (Optional)"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={formData.employmentType || 'Full-time'}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Full-time">Full-time *</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
              <select
                value={formData.employmentStatus || 'Active'}
                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Active">Active *</option>
                <option value="Probation">On Probation</option>
                <option value="Leave">On Leave</option>
              </select>
              <input
                type="date"
                placeholder="Date Employed"
                value={formData.dateEmployed || ''}
                onChange={(e) => setFormData({ ...formData, dateEmployed: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Teaching Experience (years)"
                value={formData.teachingExperience || 0}
                onChange={(e) => setFormData({ ...formData, teachingExperience: parseInt(e.target.value) || 0 })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Highest Qualification (Optional)"
                value={formData.highestQualification || ''}
                onChange={(e) => setFormData({ ...formData, highestQualification: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )

      case 3: // Classes & Subjects
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-6">Classes & Subjects</h3>
            {formData.role !== 'TEACHER' && formData.role !== 'HEAD_TEACHER' ? (
              <p className="text-gray-600 bg-blue-50 p-4 rounded-lg">This section only applies to teachers. You can skip this stage.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Select Class (Optional)</label>
                    <select
                      value={formData.classArmComboId || ''}
                      onChange={(e) => setFormData({ ...formData, classArmComboId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Select Class</option>
                      {classOptions.map((combo) => (
                        <option key={combo.id} value={combo.id}>
                          {combo.classes?.name} {combo.arms?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-3 pt-8">
                    <input
                      type="checkbox"
                      checked={formData.isClassTeacher || false}
                      onChange={(e) => setFormData({ ...formData, isClassTeacher: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 font-semibold">Is Class Teacher</span>
                  </label>
                </div>

                {formData.classArmComboId && subjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold mb-3">Select Subjects (Optional)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded-lg bg-gray-50">
                      {subjects.map((subject) => (
                        <label key={subject.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(formData.subjectIds || []).includes(subject.id)}
                            onChange={(e) => {
                              const newSubjectIds = formData.subjectIds || []
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  subjectIds: [...newSubjectIds, subject.id],
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  subjectIds: newSubjectIds.filter((id) => id !== subject.id),
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
            )}
          </div>
        )

      case 4: // Account & Confirm
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-6">Account Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  placeholder="Password (8+ chars) *"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Confirm Password *"
                  value={formData.confirmPassword || ''}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Password must include: uppercase, lowercase, number, and special character
              </p>
            </div>

            <hr />

            {/* Review Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Registration Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-96 overflow-y-auto">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">School</p>
                  <p className="text-sm font-bold text-blue-700">{currentUser?.school_name || 'Your School'}</p>
                </div>
                <hr />
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Personal Information</p>
                  <p className="text-sm">
                    {formData.firstName} {formData.lastName}
                  </p>
                  <p className="text-xs text-gray-600">{formData.gender} • DOB: {formData.dateOfBirth}</p>
                  <p className="text-xs text-gray-600">{formData.email} • {formData.phone}</p>
                </div>
                <hr />
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Employment</p>
                  <p className="text-sm">
                    {formData.position || 'Position'} • {formData.role}
                  </p>
                  <p className="text-xs text-gray-600">{formData.employmentType} • {formData.employmentStatus}</p>
                  {formData.department && <p className="text-xs text-gray-600">Dept: {formData.department}</p>}
                </div>
                {formData.classArmComboId && (
                  <>
                    <hr />
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Class Assignment</p>
                      <p className="text-sm">
                        {classOptions.find(c => c.id === formData.classArmComboId)?.classes?.name}{' '}
                        {classOptions.find(c => c.id === formData.classArmComboId)?.arms?.name}
                        {formData.isClassTeacher && ' (Class Teacher)'}
                      </p>
                      {(formData.subjectIds || []).length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">{(formData.subjectIds || []).length} subject(s) assigned</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ All information has been verified. Click "Register Staff" to complete.
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
          <p className="text-red-600 font-semibold mb-4">You must be logged in as a school admin to register staff.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Registration</h1>
          <p className="text-gray-600">Registering for: <span className="font-semibold text-blue-700">{currentUser?.school_name || 'Your School'}</span></p>
          <p className="text-sm text-gray-500 mt-2">Complete all {STAGES.length} stages to register new staff member</p>
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
              {isLoading ? 'Registering...' : '✓ Register Staff'}
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
