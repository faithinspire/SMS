'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StaffRegistrationService, StaffRegistrationData } from '@/services/staff-registration.service'
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
}

type Stage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

const STAGES = [
  'Personal Info',
  'Contact & Address',
  'Employment',
  'Professional',
  'Role',
  'Classes',
  'Subjects',
  'Salary & Bank',
  'Account & Security',
  'Review & Confirm',
]

export default function StaffMultiStageRegister() {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState<Stage>(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const [schools, setSchools] = useState<any[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])

  const [formData, setFormData] = useState<Partial<StaffRegistrationData>>({
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    accountStatus: 'ACTIVE',
    salaryFrequency: 'MONTHLY',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
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

  // Load classes when school changes
  useEffect(() => {
    if (!formData.schoolId) {
      setClasses([])
      setSubjects([])
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        return true

      case 2: // Contact & Address
        if (!formData.phone?.trim()) {
          setError('Phone number is required')
          return false
        }
        if (!formData.email?.trim()) {
          setError('Email is required')
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Invalid email format')
          return false
        }
        if (!formData.emergencyContact?.trim()) {
          setError('Emergency contact name is required')
          return false
        }
        if (!formData.emergencyContactPhone?.trim()) {
          setError('Emergency contact phone is required')
          return false
        }
        return true

      case 3: // Employment
        if (!formData.staffId?.trim()) {
          setError('Staff ID is required')
          return false
        }
        if (!formData.position?.trim()) {
          setError('Position is required')
          return false
        }
        if (!formData.department?.trim()) {
          setError('Department is required')
          return false
        }
        if (!formData.dateEmployed) {
          setError('Date employed is required')
          return false
        }
        return true

      case 4: // Professional
        return true

      case 5: // Role
        if (!formData.primaryRole?.trim()) {
          setError('Primary role is required')
          return false
        }
        return true

      case 6: // Class Assignment
        if ((formData.primaryRole === 'TEACHER' || formData.primaryRole === 'HEAD_TEACHER') && !formData.classArmComboId) {
          setError('Class assignment is required for teachers')
          return false
        }
        return true

      case 7: // Subject Assignment
        if ((formData.primaryRole === 'TEACHER' || formData.primaryRole === 'HEAD_TEACHER') && (!formData.subjectIds || formData.subjectIds.length === 0)) {
          setError('At least one subject is required for teachers')
          return false
        }
        return true

      case 8: // Salary & Bank
        return true

      case 9: // Account & Security
        if (!formData.password?.trim()) {
          setError('Password is required')
          return false
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters')
          return false
        }
        return true

      case 10: // Review
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
    if (stage < currentStage || (stage === 10 && currentStage >= 9)) {
      setCurrentStage(stage)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    if (!validateStage(10)) return

    setSubmitting(true)
    try {
      const result = await StaffRegistrationService.registerStaff(
        formData as StaffRegistrationData
      )

      toast.success('✅ Staff registered successfully!')
      console.log('Staff registration completed:', result)

      // Show PIN display
      const message = `Staff Registered!\n\nName: ${result.fullName}\nEmail: ${result.email}\nTemporary PIN: ${result.pin}\n\nRedirecting to login...`
      alert(message)

      // Redirect to staff login
      setTimeout(() => {
        router.push('/auth/staff/login')
      }, 2000)
    } catch (err: any) {
      console.error('Registration failed:', err)
      setError(err.message || 'Registration failed. Please try again.')
      setSubmitting(false)
    }
  }

  const isTeacher = formData.primaryRole === 'TEACHER' || formData.primaryRole === 'HEAD_TEACHER'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">👨‍🏫 Staff Registration</h1>
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
                        ? 'bg-blue-600 text-white scale-110'
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
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
                    className="col-span-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="middleName"
                    placeholder="Middle Name"
                    value={formData.middleName || ''}
                    onChange={handleInputChange}
                    className="col-span-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name *"
                  value={formData.lastName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="gender"
                  value={formData.gender || 'MALE'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus || 'SINGLE'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
                <input
                  type="text"
                  name="nationality"
                  placeholder="Nationality"
                  value={formData.nationality || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="stateOfOrigin"
                    placeholder="State of Origin"
                    value={formData.stateOfOrigin || ''}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="lga"
                    placeholder="LGA"
                    value={formData.lga || ''}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Stage 2: Contact & Address */}
            {currentStage === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Contact & Address</h2>
                <select
                  name="schoolId"
                  value={formData.schoolId || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select School * --</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number *"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email *"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="residentialAddress"
                  placeholder="Residential Address"
                  value={formData.residentialAddress || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="lga"
                    placeholder="LGA"
                    value={formData.lga || ''}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  name="emergencyContact"
                  placeholder="Emergency Contact Name *"
                  value={formData.emergencyContact || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  placeholder="Emergency Contact Phone *"
                  value={formData.emergencyContactPhone || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Stage 3: Employment Information */}
            {currentStage === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Employment Information</h2>
                <input
                  type="text"
                  name="staffId"
                  placeholder="Staff ID *"
                  value={formData.staffId || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="position"
                  placeholder="Position (e.g., Senior Teacher) *"
                  value={formData.position || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="department"
                  placeholder="Department *"
                  value={formData.department || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="employmentType"
                  value={formData.employmentType || 'FULL_TIME'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
                <select
                  name="employmentStatus"
                  value={formData.employmentStatus || 'ACTIVE'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PROBATION">Probation</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <input
                  type="date"
                  name="dateEmployed"
                  placeholder="Date Employed *"
                  value={formData.dateEmployed || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  name="dateOfAppointment"
                  placeholder="Date of Appointment"
                  value={formData.dateOfAppointment || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="reportingAuthority"
                  placeholder="Reporting Authority"
                  value={formData.reportingAuthority || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Stage 4: Professional Information */}
            {currentStage === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Professional Information</h2>
                <input
                  type="text"
                  name="highestQualification"
                  placeholder="Highest Qualification (e.g., Bachelor's)"
                  value={formData.highestQualification || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="professionalQualification"
                  placeholder="Professional Qualification"
                  value={formData.professionalQualification || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="institution"
                  placeholder="Institution"
                  value={formData.institution || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="courseField"
                  placeholder="Course/Field"
                  value={formData.courseField || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  name="graduationYear"
                  placeholder="Graduation Year"
                  value={formData.graduationYear || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  name="teachingExperience"
                  placeholder="Teaching Experience (years)"
                  value={formData.teachingExperience || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  name="professionalCertifications"
                  placeholder="Professional Certifications"
                  value={formData.professionalCertifications || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Stage 5: Role & Responsibilities */}
            {currentStage === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Role & Responsibilities</h2>
                <select
                  name="primaryRole"
                  value={formData.primaryRole || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Primary Role * --</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="HEAD_TEACHER">Head Teacher</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="LIBRARIAN">Librarian</option>
                  <option value="ICT_STAFF">ICT Staff</option>
                  <option value="ADMIN_STAFF">Administrative Staff</option>
                  <option value="SUPPORT_STAFF">Support Staff</option>
                </select>
                <textarea
                  name="secondaryResponsibilities"
                  placeholder="Secondary Responsibilities"
                  value={formData.secondaryResponsibilities || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  name="administrativeResponsibility"
                  placeholder="Administrative Responsibility"
                  value={formData.administrativeResponsibility || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Stage 6: Class Assignment */}
            {currentStage === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Class Assignment</h2>
                {isTeacher ? (
                  <>
                    <select
                      name="classArmComboId"
                      value={formData.classArmComboId || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Class * --</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.classes?.name} - Arm {cls.arms?.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-blue-50 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isClassTeacher"
                        checked={formData.isClassTeacher || false}
                        onChange={handleCheckboxChange}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ml-3">Is Class Teacher</span>
                    </label>
                  </>
                ) : (
                  <p className="p-4 bg-blue-50 border border-blue-200 rounded text-blue-800">
                    Class assignment is only applicable for teachers. Your role is {formData.primaryRole}.
                  </p>
                )}
              </div>
            )}

            {/* Stage 7: Subject Assignment */}
            {currentStage === 7 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Subject Assignment</h2>
                {isTeacher ? (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      Select subjects to teach ({formData.subjectIds?.length || 0} selected)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-300 rounded bg-gray-50">
                      {subjects.length > 0 ? (
                        subjects.map(subject => (
                          <label key={subject.id} className="flex items-center cursor-pointer p-2 hover:bg-blue-50 rounded">
                            <input
                              type="checkbox"
                              checked={formData.subjectIds?.includes(subject.id) || false}
                              onChange={() => handleSubjectToggle(subject.id)}
                              className="w-4 h-4 text-blue-600"
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
                  </>
                ) : (
                  <p className="p-4 bg-blue-50 border border-blue-200 rounded text-blue-800">
                    Subject assignment is only for teachers.
                  </p>
                )}
              </div>
            )}

            {/* Stage 8: Salary & Bank Information */}
            {currentStage === 8 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Salary & Bank Information</h2>
                <input
                  type="number"
                  name="salaryAmount"
                  placeholder="Salary Amount"
                  value={formData.salaryAmount || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="salaryFrequency"
                  value={formData.salaryFrequency || 'MONTHLY'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="TERMLY">Termly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
                <input
                  type="text"
                  name="bankName"
                  placeholder="Bank Name"
                  value={formData.bankName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="accountName"
                  placeholder="Account Name"
                  value={formData.accountName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="accountNumber"
                  placeholder="Account Number"
                  value={formData.accountNumber || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Payment Method --</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>
            )}

            {/* Stage 9: Account & Security */}
            {currentStage === 9 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Account & Security</h2>
                <p className="text-sm text-gray-600">Account role: {formData.primaryRole}</p>
                <input
                  type="password"
                  name="password"
                  placeholder="Password (at least 6 characters) *"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="accountStatus"
                  value={formData.accountStatus || 'ACTIVE'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}

            {/* Stage 10: Review & Confirmation */}
            {currentStage === 10 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Review & Confirmation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-4 bg-gray-50 rounded border border-gray-300">
                  <div>
                    <h3 className="font-bold text-blue-600 mb-2">Personal Info</h3>
                    <p className="text-sm"><strong>Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</p>
                    <p className="text-sm"><strong>Gender:</strong> {formData.gender}</p>
                    <p className="text-sm"><strong>DOB:</strong> {formData.dateOfBirth}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-600 mb-2">Contact</h3>
                    <p className="text-sm"><strong>Email:</strong> {formData.email}</p>
                    <p className="text-sm"><strong>Phone:</strong> {formData.phone}</p>
                    <p className="text-sm"><strong>Emergency:</strong> {formData.emergencyContact}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-600 mb-2">Employment</h3>
                    <p className="text-sm"><strong>Staff ID:</strong> {formData.staffId}</p>
                    <p className="text-sm"><strong>Position:</strong> {formData.position}</p>
                    <p className="text-sm"><strong>Department:</strong> {formData.department}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-600 mb-2">Role</h3>
                    <p className="text-sm"><strong>Primary Role:</strong> {formData.primaryRole}</p>
                    {isTeacher && formData.classArmComboId && (
                      <p className="text-sm"><strong>Class:</strong> {classes.find(c => c.id === formData.classArmComboId)?.classes?.name}</p>
                    )}
                  </div>
                  {isTeacher && (
                    <div>
                      <h3 className="font-bold text-blue-600 mb-2">Subjects</h3>
                      <p className="text-sm"><strong>Count:</strong> {formData.subjectIds?.length || 0} selected</p>
                    </div>
                  )}
                  {formData.salaryAmount && (
                    <div>
                      <h3 className="font-bold text-blue-600 mb-2">Salary</h3>
                      <p className="text-sm"><strong>Amount:</strong> {formData.salaryAmount}</p>
                      <p className="text-sm"><strong>Frequency:</strong> {formData.salaryFrequency}</p>
                    </div>
                  )}
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
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition ml-auto"
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
            <Link href="/auth/staff/login" className="text-blue-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
