'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudentRegistrationService, StudentRegistrationData } from '@/services/student-registration.service'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface ClassOption {
  id: string
  classes: { id: string; name: string; level: number }
  arms: { id: string; name: string }
}

interface SubjectOption {
  id: string
  name: string
  code: string
  category?: string
}

interface SessionOption {
  id: string
  session_year: string
}

interface TermOption {
  id: string
  term_name: string
}

type Stage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

const STAGES = [
  'Personal Info',
  'Guardian Info',
  'Admission',
  'Class/Session',
  'Subjects',
  'Previous School',
  'Medical',
  'Documents',
  'Review',
  'Complete',
]

const DEPARTMENTS = ['SCIENCE', 'COMMERCIAL', 'HUMANITIES', 'TECHNICAL', 'VOCATIONAL']

export default function StudentMultiStageRegister() {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState<Stage>(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const [schools, setSchools] = useState<any[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [terms, setTerms] = useState<TermOption[]>([])

  const [formData, setFormData] = useState<Partial<StudentRegistrationData>>({
    gender: 'MALE',
    admissionStatus: 'ACTIVE',
    guardianRelationship: 'PARENT',
    subjectIds: [],
  })

  // Load schools on mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .order('name')

        if (error) throw error
        setSchools(data || [])
      } catch (err) {
        console.error('Error loading schools:', err)
        setError('Failed to load schools')
      }
    }
    loadSchools()
  }, [])

  // Load sessions when school changes
  useEffect(() => {
    if (!formData.schoolId) {
      setSessions([])
      setTerms([])
      return
    }

    const loadSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('academic_sessions')
          .select('id, session_year')
          .eq('school_id', formData.schoolId)
          .order('start_year', { ascending: false })

        if (error) throw error
        setSessions(data || [])
      } catch (err) {
        console.error('Error loading sessions:', err)
        setError('Failed to load sessions')
      }
    }

    loadSessions()
  }, [formData.schoolId])

  // Load terms when session changes
  useEffect(() => {
    if (!formData.sessionId) {
      setTerms([])
      return
    }

    const loadTerms = async () => {
      try {
        const { data, error } = await supabase
          .from('academic_terms')
          .select('id, term_name')
          .eq('session_id', formData.sessionId)
          .order('term_order', { ascending: true })

        if (error) throw error
        setTerms(data || [])
      } catch (err) {
        console.error('Error loading terms:', err)
        setError('Failed to load terms')
      }
    }

    loadTerms()
  }, [formData.sessionId])

  // Load classes when school changes
  useEffect(() => {
    if (!formData.schoolId) {
      setClasses([])
      return
    }

    const loadClasses = async () => {
      try {
        const { data, error } = await supabase
          .from('class_arm_combos')
          .select('id, classes(id, name, level), arms(id, name)')
          .eq('school_id', formData.schoolId)

        if (error) throw error
        setClasses(data || [])
      } catch (err) {
        console.error('Error loading classes:', err)
        setError('Failed to load classes')
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
        const applicableSubjects = await CanonicalSubjectService.getSubjectsForClass(
          formData.classArmComboId || '',
          formData.schoolId || ''
        )
        setSubjects(applicableSubjects)
      } catch (err) {
        console.error('Error loading subjects:', err)
        setError('Failed to load subjects')
      }
    }

    loadSubjects()
  }, [formData.classArmComboId, formData.schoolId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : undefined) : value,
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds?.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...(prev.subjectIds || []), subjectId],
    }))
  }

  const validateStage = (stage: Stage): boolean => {
    setError('')

    switch (stage) {
      case 1: // Personal Info
        if (!formData.firstName?.trim()) {
          setError('First name is required')
          return false
        }
        if (!formData.lastName?.trim()) {
          setError('Last name is required')
          return false
        }
        if (!formData.dateOfBirth) {
          setError('Date of birth is required')
          return false
        }
        return true

      case 2: // Guardian
        if (!formData.guardianName?.trim()) {
          setError('Guardian name is required')
          return false
        }
        if (!formData.guardianPhone?.trim()) {
          setError('Guardian phone is required')
          return false
        }
        return true

      case 3: // Admission
        if (!formData.schoolId) {
          setError('School is required')
          return false
        }
        if (!formData.admissionDate) {
          setError('Admission date is required')
          return false
        }
        return true

      case 4: // Class/Session/Term
        if (!formData.sessionId) {
          setError('Session is required')
          return false
        }
        if (!formData.termId) {
          setError('Term is required')
          return false
        }
        if (!formData.classArmComboId) {
          setError('Class is required')
          return false
        }
        return true

      case 5: // Subjects
        if (!formData.subjectIds || formData.subjectIds.length === 0) {
          setError('At least one subject is required')
          return false
        }
        return true

      case 6: // Previous School
        return true

      case 7: // Medical
        return true

      case 8: // Documents
        return true

      case 9: // Review
        return true

      case 10: // Complete
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStage(currentStage)) {
      setCurrentStage((prev) => Math.min(prev + 1, 10) as Stage)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevious = () => {
    setCurrentStage((prev) => Math.max(prev - 1, 1) as Stage)
    window.scrollTo(0, 0)
  }

  const handleGoToStage = (stage: Stage) => {
    if (stage < currentStage) {
      setCurrentStage(stage)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    if (!validateStage(10)) return

    setSubmitting(true)
    try {
      const result = await StudentRegistrationService.registerStudent(
        formData as StudentRegistrationData
      )

      toast.success('✅ Student registered successfully!')
      console.log('Student registration completed:', result)

      // Show PIN display
      const message = `Student Registered!\n\nName: ${result.fullName}\nAdmission No.: ${result.admissionNumber}\nTemporary PIN: ${result.pin}\n\nRedirecting to login...`
      alert(message)

      // Redirect to student login
      setTimeout(() => {
        router.push('/auth/student/login')
      }, 2000)
    } catch (err: any) {
      console.error('Registration failed:', err)
      setError(err.message || 'Registration failed. Please try again.')
      setSubmitting(false)
    }
  }

  const classLevel = classes.find(c => c.id === formData.classArmComboId)?.classes?.level
  const isSecondaryClass = classLevel && classLevel >= 12

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-2 text-green-600">👨‍🎓 Student Registration</h1>
            <p className="text-center text-gray-600 text-sm">Professional multi-stage registration process</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STAGES.map((stage, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => handleGoToStage((idx + 1) as Stage)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                      idx + 1 === currentStage
                        ? 'bg-green-600 text-white scale-110'
                        : idx + 1 < currentStage
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {idx + 1 < currentStage ? '✓' : idx + 1}
                  </button>
                  <span className="text-xs text-center mt-1 text-gray-600 max-w-[60px]">{stage}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStage / 10) * 100}%` }}
              ></div>
            </div>
            <p className="text-center mt-2 text-sm font-semibold text-gray-700">
              Stage {currentStage} of 10
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Stage Content */}
          <div className="min-h-[400px]">
            {/* Stage 1: Personal Information */}
            {currentStage === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name *"
                    value={formData.firstName || ''}
                    onChange={handleInputChange}
                    className="col-span-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    name="middleName"
                    placeholder="Middle Name"
                    value={formData.middleName || ''}
                    onChange={handleInputChange}
                    className="col-span-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name *"
                  value={formData.lastName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  name="gender"
                  value={formData.gender || 'MALE'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <input
                  type="text"
                  name="nationality"
                  placeholder="Nationality"
                  value={formData.nationality || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    name="lga"
                    placeholder="LGA"
                    value={formData.lga || ''}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone (optional)"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email (optional)"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {/* Stage 2: Guardian Information */}
            {currentStage === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Parent/Guardian Information</h2>
                <input
                  type="text"
                  name="guardianName"
                  placeholder="Guardian Name *"
                  value={formData.guardianName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  name="guardianRelationship"
                  value={formData.guardianRelationship || 'PARENT'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="PARENT">Parent</option>
                  <option value="GRANDPARENT">Grandparent</option>
                  <option value="UNCLE">Uncle</option>
                  <option value="AUNT">Aunt</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="GUARDIAN">Guardian</option>
                </select>
                <input
                  type="tel"
                  name="guardianPhone"
                  placeholder="Guardian Phone *"
                  value={formData.guardianPhone || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="email"
                  name="guardianEmail"
                  placeholder="Guardian Email"
                  value={formData.guardianEmail || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  name="guardianAddress"
                  placeholder="Guardian Address"
                  value={formData.guardianAddress || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  name="guardianOccupation"
                  placeholder="Guardian Occupation"
                  value={formData.guardianOccupation || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  name="additionalGuardian"
                  placeholder="Additional Guardian (Name|Phone|Email)"
                  value={formData.additionalGuardian || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {/* Stage 3: Admission Information */}
            {currentStage === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Admission Information</h2>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  ℹ️ Admission number will be auto-generated based on school and class
                </div>
                <input
                  type="text"
                  name="admissionNumber"
                  placeholder="Admission Number (auto-generated - leave blank)"
                  value={formData.admissionNumber || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled
                />
                <input
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <select
                  name="admissionStatus"
                  value={formData.admissionStatus || 'ACTIVE'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            )}

            {/* Stage 4: Class/Session/Term */}
            {currentStage === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Class / Session / Term</h2>
                <select
                  name="schoolId"
                  value={formData.schoolId || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- Select School * --</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <select
                  name="sessionId"
                  value={formData.sessionId || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- Select Session * --</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.session_year}
                    </option>
                  ))}
                </select>
                <select
                  name="termId"
                  value={formData.termId || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- Select Term * --</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.term_name}
                    </option>
                  ))}
                </select>
                <select
                  name="classArmComboId"
                  value={formData.classArmComboId || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- Select Class * --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.classes?.name} - Arm {cls.arms?.name}
                    </option>
                  ))}
                </select>
                {isSecondaryClass && (
                  <select
                    name="stream"
                    value={formData.stream || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select Stream (optional) --</option>
                    <option value="A">Stream A</option>
                    <option value="B">Stream B</option>
                    <option value="C">Stream C</option>
                    <option value="D">Stream D</option>
                  </select>
                )}
              </div>
            )}

            {/* Stage 5: Subject Selection */}
            {currentStage === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Subject Selection</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Select subjects to study ({formData.subjectIds?.length || 0} selected) *
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-300 rounded bg-gray-50">
                  {subjects.length > 0 ? (
                    subjects.map(subject => (
                      <label key={subject.id} className="flex items-center cursor-pointer p-2 hover:bg-green-50 rounded">
                        <input
                          type="checkbox"
                          checked={formData.subjectIds?.includes(subject.id) || false}
                          onChange={() => handleSubjectToggle(subject.id)}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="ml-2">
                          <strong>{subject.name}</strong>
                          <span className="text-gray-500 text-sm"> ({subject.code})</span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-500 col-span-2">Select a class first to see available subjects</p>
                  )}
                </div>
              </div>
            )}

            {/* Stage 6: Previous School */}
            {currentStage === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Previous School & Academic Info</h2>
                <input
                  type="text"
                  name="previousSchoolName"
                  placeholder="Previous School Name"
                  value={formData.previousSchoolName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  name="previousClass"
                  placeholder="Previous Class"
                  value={formData.previousClass || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  name="academicPerformance"
                  value={formData.academicPerformance || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select Performance Level --</option>
                  <option value="EXCELLENT">Excellent</option>
                  <option value="VERY_GOOD">Very Good</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="AVERAGE">Average</option>
                </select>
                <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-green-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="transferCertificateAvailable"
                    checked={formData.transferCertificateAvailable || false}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 text-green-600"
                  />
                  <span className="ml-3">Transfer Certificate Available</span>
                </label>
              </div>
            )}

            {/* Stage 7: Medical & Emergency */}
            {currentStage === 7 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Medical & Emergency Information</h2>
                <select
                  name="bloodType"
                  value={formData.bloodType || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select Blood Type --</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
                <textarea
                  name="medicalConditions"
                  placeholder="Medical Conditions"
                  value={formData.medicalConditions || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <textarea
                  name="allergies"
                  placeholder="Allergies"
                  value={formData.allergies || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  name="emergencyMedicalContact"
                  placeholder="Emergency Medical Contact"
                  value={formData.emergencyMedicalContact || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {/* Stage 8: Documents */}
            {currentStage === 8 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Documents & Passport</h2>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  ℹ️ All document uploads are optional but recommended
                </div>
                <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700">
                  Birth Certificate: {formData.birthCertificateUrl ? '✓ Ready' : 'Not provided'}
                </div>
                <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700">
                  Previous School Records: {formData.previousSchoolRecordsUrl ? '✓ Ready' : 'Not provided'}
                </div>
                <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700">
                  Medical Report: {formData.medicalReportUrl ? '✓ Ready' : 'Not provided'}
                </div>
                <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700">
                  Passport/National ID: {formData.passportIdUrl ? '✓ Ready' : 'Not provided'}
                </div>
              </div>
            )}

            {/* Stage 9: Review & Confirmation */}
            {currentStage === 9 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Review & Confirmation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-4 bg-gray-50 rounded border border-gray-300">
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">Personal Info</h3>
                    <p className="text-sm"><strong>Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</p>
                    <p className="text-sm"><strong>DOB:</strong> {formData.dateOfBirth}</p>
                    <p className="text-sm"><strong>Gender:</strong> {formData.gender}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">Guardian</h3>
                    <p className="text-sm"><strong>Name:</strong> {formData.guardianName}</p>
                    <p className="text-sm"><strong>Phone:</strong> {formData.guardianPhone}</p>
                    <p className="text-sm"><strong>Relationship:</strong> {formData.guardianRelationship}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">Admission</h3>
                    <p className="text-sm"><strong>Status:</strong> {formData.admissionStatus}</p>
                    <p className="text-sm"><strong>Date:</strong> {formData.admissionDate}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">Class</h3>
                    <p className="text-sm"><strong>Class:</strong> {classes.find(c => c.id === formData.classArmComboId)?.classes?.name}</p>
                    <p className="text-sm"><strong>Session:</strong> {sessions.find(s => s.id === formData.sessionId)?.session_year}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">Subjects</h3>
                    <p className="text-sm"><strong>Count:</strong> {formData.subjectIds?.length || 0} selected</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 10: Complete */}
            {currentStage === 10 && (
              <div className="text-center space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Registration Complete</h2>
                <div className="p-6 bg-green-50 border border-green-200 rounded">
                  <p className="text-lg font-semibold text-green-800 mb-2">✅ All Information Verified</p>
                  <p className="text-gray-700">Click "Complete Registration" to finalize the student registration.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStage === 1 || submitting}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded hover:bg-gray-400 disabled:opacity-50 transition"
            >
              ← Previous
            </button>

            {currentStage < 10 ? (
              <button
                onClick={handleNext}
                disabled={loading || submitting}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50 transition ml-auto"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50 transition ml-auto"
              >
                {submitting ? '⏳ Submitting...' : '✅ Complete Registration'}
              </button>
            )}
          </div>

          <p className="text-center mt-6 text-gray-600 text-sm">
            Already registered?{' '}
            <Link href="/auth/student/login" className="text-green-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
