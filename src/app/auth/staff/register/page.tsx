'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { StaffRegistrationService, StaffRegistrationData } from '@/services/staff-registration.service'
import { RegistrationConfigService } from '@/services/registration-config.service'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'
import { toast } from 'react-hot-toast'

const STAGES = [
  { number: 1, title: 'Personal & Contact', icon: '👤' },
  { number: 2, title: 'Employment & Professional', icon: '💼' },
  { number: 3, title: 'Class & Subjects', icon: '🏫' },
  { number: 4, title: 'Salary & Security', icon: '💰' },
  { number: 5, title: 'Review & Confirm', icon: '✓' },
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
    // Stage 1: Personal & Contact
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    nationality: '',
    stateOfOrigin: '',
    lga: '',
    maritalStatus: '',
    phone: '',
    email: '',
    residentialAddress: '',
    city: '',
    state: '',
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Stage 2: Employment & Professional
    role: 'TEACHER',
    department: '',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    dateEmployed: new Date().toISOString().split('T')[0],
    dateAppointed: new Date().toISOString().split('T')[0],
    highestQualification: '',
    professionalQualification: '',
    institution: '',
    courseField: '',
    graduationYear: new Date().getFullYear(),
    teachingExperience: 0,
    certifications: '',

    // Stage 3: Class & Subjects
    classArmComboId: '',
    isClassTeacher: false,
    subjectIds: [],

    // Stage 4: Salary & Security
    salary: 0,
    salaryFrequency: 'Monthly',
    bankName: '',
    accountName: '',
    accountNumber: '',
    paymentMethod: '',
    password: '',
    confirmPassword: '',
    accountRole: 'TEACHER',

    // Common
    schoolId: '',
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
    if (!formData.classArmComboId || !formData.schoolId) {
      setSubjects([])
      return
    }

    const loadSubjects = async () => {
      try {
        console.log('[StaffRegister] Loading subjects for classArmComboId:', formData.classArmComboId)
        console.log('[StaffRegister] Available classOptions:', classOptions)
        
        const classCombo = classOptions.find((c) => c.id === formData.classArmComboId)
        
        if (!classCombo) {
          console.warn('[StaffRegister] Class combo not found in classOptions')
          setSubjects([])
          toast.error('Selected class not found. Please reselect.')
          return
        }
        
        if (!classCombo?.classes?.level) {
          console.warn('[StaffRegister] Class level is undefined for combo:', classCombo)
          setSubjects([])
          toast.error('Class level information not available. Please reselect class.')
          return
        }

        console.log('[StaffRegister] Fetching subjects for level:', classCombo.classes.level)
        const subjectList = await CanonicalSubjectService.getSubjectsForLevel(
          formData.schoolId!,
          classCombo.classes.level
        )
        console.log('[StaffRegister] Subjects loaded:', subjectList)
        setSubjects(subjectList)
      } catch (error) {
        console.error('[StaffRegister] Error loading subjects:', error)
        toast.error('Failed to load subjects')
        setSubjects([])
      }
    }
    loadSubjects()
  }, [formData.classArmComboId, formData.schoolId, classOptions])

  const validateStage = (): boolean => {
    if (!StaffRegistrationService.validateStage(currentStage, formData)) {
      toast.error('Please fill in all required fields')
      return false
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
        toast.error('Please enter a valid phone number')
        return false
      }
    }

    // Password validation
    if (currentStage === 4 && formData.password) {
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
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
      // Build submission data
      const submissionData: StaffRegistrationData = {
        ...formData,
        password: formData.password || '',
      } as StaffRegistrationData

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
      case 1: // Personal & Contact (merged slides 1 + 2)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
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
                  placeholder="Middle Name"
                  value={formData.middleName || ''}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
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
                  type="text"
                  placeholder="Nationality"
                  value={formData.nationality || ''}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="State of Origin"
                  value={formData.stateOfOrigin || ''}
                  onChange={(e) => setFormData({ ...formData, stateOfOrigin: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="LGA"
                  value={formData.lga || ''}
                  onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={formData.maritalStatus || ''}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact & Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email *"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  type="text"
                  placeholder="Residential Address *"
                  value={formData.residentialAddress || ''}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Emergency Contact Name *"
                  value={formData.emergencyContactName || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Emergency Contact Phone *"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )

      case 2: // Employment & Professional (merged slides 3 + 4)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Employment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Department"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={formData.employmentType || 'Full-time'}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
                <select
                  value={formData.employmentStatus || 'Active'}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Probation">On Probation</option>
                  <option value="Leave">On Leave</option>
                </select>
                <input
                  type="date"
                  placeholder="Date Employed *"
                  value={formData.dateEmployed || ''}
                  onChange={(e) => setFormData({ ...formData, dateEmployed: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="date"
                  placeholder="Date Appointed *"
                  value={formData.dateAppointed || ''}
                  onChange={(e) => setFormData({ ...formData, dateAppointed: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Highest Qualification"
                  value={formData.highestQualification || ''}
                  onChange={(e) => setFormData({ ...formData, highestQualification: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Professional Qualification"
                  value={formData.professionalQualification || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, professionalQualification: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Institution"
                  value={formData.institution || ''}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Course/Field"
                  value={formData.courseField || ''}
                  onChange={(e) => setFormData({ ...formData, courseField: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Graduation Year"
                  value={formData.graduationYear || new Date().getFullYear()}
                  onChange={(e) => setFormData({ ...formData, graduationYear: parseInt(e.target.value) })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Teaching Experience (years)"
                  value={formData.teachingExperience || 0}
                  onChange={(e) => setFormData({ ...formData, teachingExperience: parseInt(e.target.value) })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <textarea
                  placeholder="Professional Certifications"
                  value={formData.certifications || ''}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  rows={3}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none col-span-2"
                />
              </div>
            </div>
          </div>
        )

      case 3: // Class & Subject Assignment (merged slides 5 + 6)
        return (
          <div className="space-y-6">
            {formData.role !== 'TEACHER' && formData.role !== 'HEAD_TEACHER' ? (
              <p className="text-gray-600 bg-blue-50 p-4 rounded-lg">This section only applies to teachers</p>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Class Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={formData.classArmComboId || ''}
                      onChange={(e) => setFormData({ ...formData, classArmComboId: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Select Class</option>
                      {classOptions.map((combo) => (
                        <option key={combo.id} value={combo.id}>
                          {combo.classes?.name} {combo.arms?.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isClassTeacher || false}
                        onChange={(e) => setFormData({ ...formData, isClassTeacher: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span>Is Class Teacher</span>
                    </label>
                  </div>
                </div>

                <hr className="my-6" />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Subject Assignment</h3>
                  <p className="text-sm text-gray-600 mb-3">Select subjects this teacher will teach:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded">
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
                  <p className="text-sm text-gray-600 mt-3">
                    Selected: {(formData.subjectIds || []).length} subjects
                  </p>
                </div>
              </>
            )}
          </div>
        )

      case 4: // Salary & Account Security (merged slides 7 + 8)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Salary & Bank Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Salary"
                  value={formData.salary || 0}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={formData.salaryFrequency || 'Monthly'}
                  onChange={(e) => setFormData({ ...formData, salaryFrequency: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Weekly">Weekly</option>
                </select>
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={formData.bankName || ''}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Account Name"
                  value={formData.accountName || ''}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={formData.accountNumber || ''}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={formData.paymentMethod || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Payment Method</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-semibold mb-4">Account & Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Account Email (for login)"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-100"
                  disabled
                />
                <select
                  value={formData.accountRole || 'TEACHER'}
                  onChange={(e) => setFormData({ ...formData, accountRole: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="TEACHER">Teacher</option>
                  <option value="HEAD_TEACHER">Head Teacher</option>
                  <option value="PRINCIPAL">Principal</option>
                </select>
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
                <label className="flex items-center gap-2 col-span-2">
                  <input
                    type="checkbox"
                    disabled
                    checked={true}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700">✓ Use email and password for login (PIN not generated)</span>
                </label>
              </div>
            </div>
          </div>
        )

      case 5: // Review & Confirmation
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Review & Confirmation</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-96 overflow-y-auto">
              <div>
                <p className="text-sm font-semibold text-gray-600">Personal Information</p>
                <p className="text-sm">
                  {formData.firstName} {formData.middleName} {formData.lastName} ({formData.gender})
                </p>
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(1)}>
                  ✏️ Edit
                </p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Contact Information</p>
                <p className="text-sm">{formData.email}</p>
                <p className="text-sm">{formData.phone}</p>
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(1)}>
                  ✏️ Edit
                </p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Employment</p>
                <p className="text-sm">{formData.role} - {formData.department || 'No department'} ({formData.employmentType})</p>
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(2)}>
                  ✏️ Edit
                </p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Assigned Subjects</p>
                <p className="text-sm">{(formData.subjectIds || []).length} subjects</p>
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(3)}>
                  ✏️ Edit
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✓ All information has been entered and verified. Click Register to complete the registration process.
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
