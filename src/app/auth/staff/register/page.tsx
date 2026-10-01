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
  { number: 2, title: 'Contact & Address', icon: '📍' },
  { number: 3, title: 'Employment Information', icon: '💼' },
  { number: 4, title: 'Professional Information', icon: '🎓' },
  { number: 5, title: 'Class Assignment', icon: '🏫' },
  { number: 6, title: 'Subject Assignment', icon: '📚' },
  { number: 7, title: 'Salary & Bank', icon: '💰' },
  { number: 8, title: 'Account & Security', icon: '🔐' },
  { number: 9, title: 'Review & Confirm', icon: '✓' },
]

interface Schools {
  id: string
  name: string
}

interface FormState extends Partial<StaffRegistrationData> {
  confirmPassword?: string
}

export default function StaffRegisterPage() {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState(1)
  const [schools, setSchools] = useState<Schools[]>([])
  const [classOptions, setClassOptions] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormState>({
    // Stage 1
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    photoUrl: '',
    nationality: '',
    stateOfOrigin: '',
    lga: '',
    maritalStatus: '',

    // Stage 2
    phone: '',
    email: '',
    residentialAddress: '',
    city: '',
    state: '',
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Stage 3
    staffId: '',
    position: '',
    role: 'TEACHER',
    department: '',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    dateEmployed: new Date().toISOString().split('T')[0],
    dateAppointed: new Date().toISOString().split('T')[0],
    reportingAuthority: '',

    // Stage 4
    highestQualification: '',
    professionalQualification: '',
    institution: '',
    courseField: '',
    graduationYear: new Date().getFullYear(),
    teachingExperience: 0,
    certifications: '',

    // Stage 5
    primaryRole: '',
    secondaryResponsibilities: [],
    adminResponsibility: '',

    // Stage 6
    classArmComboId: '',
    isClassTeacher: false,

    // Stage 7
    subjectIds: [],

    // Stage 8
    salary: 0,
    salaryFrequency: 'Monthly',
    bankName: '',
    accountName: '',
    accountNumber: '',
    paymentMethod: '',

    // Stage 9
    accountUsername: '',
    accountRole: 'TEACHER',
    pinGenerationRequired: true,
    password: '',
    confirmPassword: '',

    // Common
    schoolId: '',
  })

  // Load schools on mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const list = await AuthService.getAllSchools()
        setSchools(list)
      } catch (error) {
        console.error('Error loading schools:', error)
        toast.error('Failed to load schools')
      }
    }
    loadSchools()
  }, [])

  // Load classes when school changes
  useEffect(() => {
    if (!formData.schoolId) {
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
  }, [formData.schoolId])

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
    if (currentStage === 2 && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address')
        return false
      }
    }

    // Phone validation
    if (currentStage === 2 && formData.phone) {
      const phoneRegex = /^\d{10,}$/
      if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
        toast.error('Please enter a valid phone number')
        return false
      }
    }

    // Password validation
    if (currentStage === 9 && formData.password) {
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
      const result = await StaffRegistrationService.registerStaff(formData as StaffRegistrationData)

      if (result.success) {
        toast.success(`Staff registered successfully! PIN: ${result.pin}`)
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
        )

      case 2: // Contact & Address
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Contact & Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.schoolId || ''}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select School *</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
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
        )

      case 3: // Employment Information
        return (
          <div className="space-y-4">
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
        )

      case 4: // Professional Information
        return (
          <div className="space-y-4">
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
        )

      case 5: // Class Assignment
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Class Assignment</h3>
            {formData.role !== 'TEACHER' && formData.role !== 'HEAD_TEACHER' ? (
              <p className="text-gray-600">This section only applies to teachers</p>
            ) : (
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
            )}
          </div>
        )

      case 6: // Subject Assignment
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Subject Assignment</h3>
            {formData.role !== 'TEACHER' && formData.role !== 'HEAD_TEACHER' ? (
              <p className="text-gray-600">This section only applies to teachers</p>
            ) : (
              <div>
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
            )}
          </div>
        )

      case 7: // Salary & Bank
        return (
          <div className="space-y-4">
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
        )

      case 8: // Account & Security
        return (
          <div className="space-y-4">
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.pinGenerationRequired || true}
                  onChange={(e) =>
                    setFormData({ ...formData, pinGenerationRequired: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>Generate PIN for alternative login</span>
              </label>
            </div>
          </div>
        )

      case 9: // Review & Confirmation
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
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(2)}>
                  ✏️ Edit
                </p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Employment</p>
                <p className="text-sm">{formData.role} - {formData.department || 'No department'} ({formData.employmentType})</p>
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(3)}>
                  ✏️ Edit
                </p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Assigned Subjects</p>
                <p className="text-sm">{(formData.subjectIds || []).length} subjects</p>
                <p className="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => handleJumpToStage(5)}>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Registration</h1>
          <p className="text-gray-600">Complete all stages to register new staff member</p>
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
