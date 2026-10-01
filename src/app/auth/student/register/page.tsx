'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StudentRegistrationService, StudentRegistrationData, GuardianInfo } from '@/services/student-registration.service'
import { RegistrationConfigService } from '@/services/registration-config.service'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'
import { AuthService } from '@/services/auth.service'
import { toast } from 'react-hot-toast'

const STAGES = [
  { number: 1, title: 'Student Personal Info', icon: '👤' },
  { number: 2, title: 'Parent/Guardian', icon: '👨‍👩‍👧' },
  { number: 3, title: 'Admission Info', icon: '📋' },
  { number: 4, title: 'Class & Session', icon: '🏫' },
  { number: 5, title: 'Subjects', icon: '📚' },
  { number: 6, title: 'Previous School', icon: '🎓' },
  { number: 7, title: 'Medical Info', icon: '⚕️' },
  { number: 8, title: 'Documents', icon: '📄' },
  { number: 9, title: 'Review', icon: '✓' },
  { number: 10, title: 'Complete', icon: '🎉' },
]

interface FormState extends Partial<StudentRegistrationData> {
  confirmPassword?: string
  primaryGuardianEmail?: string
  secondaryGuardianEmail?: string
}

export default function StudentRegisterPage() {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState(1)
  const [schools, setSchools] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [classOptions, setClassOptions] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<FormState>({
    // Stage 1: Student Personal
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    photoUrl: '',
    nationality: 'Nigeria',
    state: '',
    lga: '',
    address: '',
    phone: '',
    email: '',

    // Stage 2: Guardians
    primaryGuardian: {
      fullName: '',
      relationship: 'Parent',
      phone: '',
      email: '',
      address: '',
      occupation: '',
    },
    secondaryGuardian: undefined,

    // Stage 3: Admission
    admissionNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionStatus: 'Active',

    // Stage 4: Class/Session/Term
    sessionId: '',
    session: '',
    termId: '',
    term: '',
    classArmComboId: '',
    className: '',

    // Stage 5: Subjects
    subjectIds: [],

    // Stage 6: Previous School
    previousSchoolName: '',
    previousClass: '',
    previousPerformance: '',
    transferCertificate: false,

    // Stage 7: Medical
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Stage 8: Documents
    passportUrl: '',
    birthCertificateUrl: '',
    previousRecordsUrl: '',

    // Common
    schoolId: '',
  })

  // Load schools
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

  // Load sessions and classes when school changes
  useEffect(() => {
    if (!formData.schoolId) {
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
  }, [formData.schoolId])

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
        console.log('[StudentRegister] Loading subjects for classArmComboId:', formData.classArmComboId)
        console.log('[StudentRegister] Available classOptions:', classOptions)
        
        const classCombo = classOptions.find((c) => c.id === formData.classArmComboId)
        
        if (!classCombo) {
          console.warn('[StudentRegister] Class combo not found in classOptions')
          setSubjects([])
          toast.error('Selected class not found. Please reselect.')
          return
        }
        
        if (!classCombo?.classes?.level) {
          console.warn('[StudentRegister] Class level is undefined for combo:', classCombo)
          setSubjects([])
          toast.error('Class level information not available. Please reselect class.')
          return
        }

        console.log('[StudentRegister] Fetching subjects for level:', classCombo.classes.level)
        const subjectList = await CanonicalSubjectService.getSubjectsForLevel(
          formData.schoolId!,
          classCombo.classes.level
        )
        console.log('[StudentRegister] Subjects loaded:', subjectList)
        setSubjects(subjectList)
      } catch (error) {
        console.error('[StudentRegister] Error loading subjects:', error)
        toast.error('Failed to load subjects')
        setSubjects([])
      }
    }
    loadSubjects()
  }, [formData.classArmComboId, formData.schoolId, classOptions])

  const validateStage = (): boolean => {
    if (!StudentRegistrationService.validateStage(currentStage, formData)) {
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

    if (currentStage === 2 && formData.primaryGuardian?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.primaryGuardian.email)) {
        toast.error('Please enter a valid guardian email address')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateStage()) {
      if (currentStage < 10) {
        setCurrentStage(currentStage + 1)
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
            <h3 className="text-lg font-semibold mb-4">Student Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.schoolId || ''}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select School *</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="First Name *"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Middle Name"
                value={formData.middleName || ''}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Last Name *"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.gender || 'MALE'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Nationality"
                value={formData.nationality || ''}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="State"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="LGA"
                value={formData.lga || ''}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )

      case 2: // Guardian Info
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Parent/Guardian Information</h3>
            <div>
              <h4 className="font-semibold mb-3">Primary Guardian</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formData.primaryGuardian?.fullName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, fullName: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.primaryGuardian?.relationship || 'Parent'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, relationship: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Aunt/Uncle">Aunt/Uncle</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={formData.primaryGuardian?.phone || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, phone: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.primaryGuardian?.email || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, email: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Address"
                  value={formData.primaryGuardian?.address || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, address: e.target.value },
                    })
                  }
                  rows={2}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 col-span-2"
                />
                <input
                  type="text"
                  placeholder="Occupation"
                  value={formData.primaryGuardian?.occupation || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGuardian: { ...formData.primaryGuardian, occupation: e.target.value },
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.secondaryGuardian && (
              <div>
                <h4 className="font-semibold mb-3">Secondary Guardian (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Secondary guardian fields similar to primary */}
                  <p className="text-sm text-gray-600">Secondary guardian fields available on request</p>
                </div>
              </div>
            )}
          </div>
        )

      case 3: // Admission Info
        return (
          <div className="space-y-4">
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.admissionStatus || 'Active'}
                onChange={(e) => setFormData({ ...formData, admissionStatus: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Provisional">Provisional</option>
                <option value="OnLeave">On Leave</option>
              </select>
            </div>
          </div>
        )

      case 4: // Class/Session/Term
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Class & Session & Term</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.sessionId || ''}
                onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 col-span-2"
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
        )

      case 5: // Subjects
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Subject Selection</h3>
            <p className="text-sm text-gray-600 mb-3">Select all applicable subjects for this student:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded">
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
            <p className="text-sm text-gray-600">Selected: {(formData.subjectIds || []).length} subjects</p>
          </div>
        )

      case 6: // Previous School
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Previous School & Academic</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Previous School Name"
                value={formData.previousSchoolName || ''}
                onChange={(e) => setFormData({ ...formData, previousSchoolName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Previous Class/Grade"
                value={formData.previousClass || ''}
                onChange={(e) => setFormData({ ...formData, previousClass: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Previous Academic Performance"
                value={formData.previousPerformance || ''}
                onChange={(e) => setFormData({ ...formData, previousPerformance: e.target.value })}
                rows={3}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.transferCertificate || false}
                  onChange={(e) => setFormData({ ...formData, transferCertificate: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>Transfer Certificate Available</span>
              </label>
            </div>
          </div>
        )

      case 7: // Medical
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Medical & Emergency Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.bloodType || ''}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Medical Conditions"
                value={formData.medicalConditions || ''}
                onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                rows={3}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                type="text"
                placeholder="Emergency Contact Name"
                value={formData.emergencyContactName || ''}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Emergency Contact Phone"
                value={formData.emergencyContactPhone || ''}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )

      case 8: // Documents
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Documents & Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Passport/Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    // File handling would require actual upload service
                    toast.info('File upload configured for production')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Birth Certificate</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    toast.info('File upload configured for production')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-700">Previous School Records</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    toast.info('File upload configured for production')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )

      case 9: // Review
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Review & Confirmation</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-96 overflow-y-auto">
              <div>
                <p className="text-sm font-semibold text-gray-600">Student Name</p>
                <p className="text-sm">
                  {formData.firstName} {formData.middleName} {formData.lastName}
                </p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Guardian</p>
                <p className="text-sm">{formData.primaryGuardian?.fullName}</p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Admission Number</p>
                <p className="text-sm">{formData.admissionNumber || '(Auto-generated)'}</p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Class</p>
                <p className="text-sm">{formData.className || 'Selected'}</p>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold text-gray-600">Subjects</p>
                <p className="text-sm">{(formData.subjectIds || []).length} subjects selected</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✓ Please review all information. Click Register to complete the registration.
              </p>
            </div>
          </div>
        )

      case 10: // Success
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h3 className="text-2xl font-semibold text-green-600">Registration Successful!</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Admission Number:</p>
                <p className="text-lg font-bold text-green-600">{formData.admissionNumber}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Student Name:</p>
                <p className="text-lg">
                  {formData.firstName} {formData.lastName}
                </p>
              </div>
              <hr className="my-4" />
              <p className="text-sm text-gray-600">
                You will be redirected to login shortly. Use your email and admission number to login.
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registration</h1>
          <p className="text-gray-600">Complete all stages to enroll in our school</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 flex-wrap gap-1">
            {STAGES.map((stage) => (
              <button
                key={stage.number}
                onClick={() => handleJumpToStage(stage.number)}
                className={`flex flex-col items-center text-xs ${
                  currentStage === stage.number
                    ? 'text-blue-600'
                    : currentStage > stage.number
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 font-bold text-sm ${
                    currentStage === stage.number
                      ? 'bg-blue-600 text-white'
                      : currentStage > stage.number
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-white'
                  }`}
                >
                  {stage.number}
                </div>
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

        {/* Navigation */}
        {currentStage !== 10 && (
          <div className="flex justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStage === 1}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              ← Previous
            </button>

            {currentStage === 9 ? (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {isLoading ? 'Registering...' : '✓ Complete Registration'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        )}

        <div className="text-center mt-8 text-sm text-gray-600">
          Stage {currentStage} of {STAGES.length}: {STAGES[currentStage - 1].title}
        </div>
      </div>
    </div>
  )
}
