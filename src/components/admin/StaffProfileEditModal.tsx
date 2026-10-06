'use client'

import { useState, useEffect } from 'react'
import { StaffService, StaffProfile } from '@/services/staff.service'
import { AcademicService } from '@/services/academic.service'
import { toast } from 'react-hot-toast'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface StaffProfileEditModalProps {
  staffId: string
  schoolId: string
  onClose: () => void
  onSave: (staff: StaffProfile) => Promise<void> | void
}

const STATES = ['Lagos', 'Abuja', 'Ogun', 'Kwara', 'Kano', 'Kaduna', 'Oyo', 'Rivers', 'Plateau', 'Akwa Ibom', 'Cross River', 'Enugu', 'Imo', 'Ebonyi', 'Abia', 'Anambra', 'Delta', 'Edo', 'Bayelsa', 'Taraba', 'Adamawa', 'Borno', 'Yobe', 'Jigawa', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara', 'Nasarawa', 'Ekiti', 'Osun', 'Ondo']
const GENDERS = ['MALE', 'FEMALE']
const EMPLOYMENT_TYPES = ['PERMANENT', 'TEMPORARY', 'CONTRACT', 'PART-TIME']
const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']
const QUALIFICATIONS = ['DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE', 'PROFESSIONAL CERTIFICATE']

export default function StaffProfileEditModal({
  staffId,
  schoolId,
  onClose,
  onSave,
}: StaffProfileEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'personal' | 'contact' | 'employment' | 'qualifications' | 'class' | 'salary'
  >('personal')

  // Personal Information
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [nationality, setNationality] = useState('Nigerian')
  const [stateOfOrigin, setStateOfOrigin] = useState('')
  const [lga, setLga] = useState('')

  // Contact Information
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [alternatePhone, setAlternatePhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')

  // Employment Information
  const [staffId_, setStaffId_] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [dateEmployed, setDateEmployed] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [resumptionDate, setResumptionDate] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE')

  // Qualifications
  const [highestQualification, setHighestQualification] = useState('')
  const [institution, setInstitution] = useState('')
  const [course, setCourse] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [professionalCertifications, setProfessionalCertifications] = useState('')

  // Class Assignment
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [classArms, setClassArms] = useState<any[]>([])
  const [selectedArm, setSelectedArm] = useState('')
  const [isClassTeacher, setIsClassTeacher] = useState(false)

  // Subject Assignment
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())

  // Salary & Bank
  const [salary, setSalary] = useState('')
  const [salaryFrequency, setSalaryFrequency] = useState('MONTHLY')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [pensionNumber, setPensionNumber] = useState('')

  const [staff, setStaff] = useState<StaffProfile | null>(null)

  useEffect(() => {
    loadStaffData()
  }, [staffId])

  const loadStaffData = async () => {
    try {
      setLoading(true)

      // Fetch staff data
      const staffData = await StaffService.getStaffById(staffId, schoolId)
      if (!staffData) throw new Error('Staff not found')
      setStaff(staffData)

      // Parse full name
      const nameParts = (staffData.full_name || '').split(' ')
      setFirstName(nameParts[0] || '')
      setMiddleName(nameParts.slice(1, -1).join(' ') || '')
      setLastName(nameParts[nameParts.length - 1] || '')

      // Contact
      setEmail(staffData.email || '')
      setPhone(staffData.phone || '')
      setGender(staffData.gender || '')
      setAddress(staffData.address || '')
      setState(staffData.state || '')
      setLga(staffData.lga || '')

      // Employment
      setStaffId_(staffData.id || '')
      setDateEmployed(staffData.employment_date || '')
      setDepartment(staffData.department || '')
      setPosition(staffData.position || '')
      setRole(staffData.role || '')
      setStatus(staffData.status as any)

      // Salary
      setSalary(staffData.salary?.toString() || '')
      setBankName(staffData.bank_name || '')
      setAccountName(staffData.account_holder_name || '')
      setAccountNumber(staffData.account_number || '')

      // Load dropdown data
      const sessionsList = await StaffService.getSchoolSessions(schoolId)
      setSessions(sessionsList)

      const classesList = await StaffService.getSchoolClasses(schoolId)
      setClasses(classesList)

      const subjectsList = await StaffService.getSchoolSubjects(schoolId)
      setAllSubjects(subjectsList)

      // Populate class assignment
      if (staffData.class_assignment) {
        setSelectedClass(staffData.class_assignment.class_id)
        setSelectedArm(staffData.class_assignment.arm_name)
        setIsClassTeacher(staffData.class_assignment.is_class_teacher)
      }

      // Populate subject assignments
      if (staffData.subject_assignments && staffData.subject_assignments.length > 0) {
        const subjectSet = new Set(staffData.subject_assignments.map(s => s.subject_id))
        setSelectedSubjects(subjectSet)
      }
    } catch (error: any) {
      console.error('Load staff data error:', error)
      toast.error(error.message || 'Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }

  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId)
    setSelectedArm('')
    if (classId) {
      const arms = await StaffService.getClassArms(classId)
      setClassArms(arms)
    } else {
      setClassArms([])
    }
  }

  const handleSubjectToggle = (subjectId: string) => {
    const newSelected = new Set(selectedSubjects)
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId)
    } else {
      newSelected.add(subjectId)
    }
    setSelectedSubjects(newSelected)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Build full name
      const fullName = `${firstName} ${middleName} ${lastName}`.trim()

      // Prepare update object
      const updates: Partial<StaffProfile> = {
        full_name: fullName,
        email,
        phone,
        gender,
        address,
        state,
        lga,
        position,
        department,
        employment_date: dateEmployed,
        salary: salary ? parseFloat(salary) : undefined,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder_name: accountName,
        status,
      }

      // Update staff
      const updatedStaff = await StaffService.updateStaff(staffId, updates, schoolId)

      // Update class assignment if changed
      if (selectedClass && selectedArm) {
        const combo = await StaffService.getClassArmCombo(selectedClass, selectedArm, schoolId)
        if (combo) {
          await StaffService.assignTeacherToClass(
            staff?.user_id!,
            combo.id,
            schoolId,
            isClassTeacher
          )
        }
      }

      // Update subject assignments if changed
      if (selectedClass && selectedArm) {
        const combo = await StaffService.getClassArmCombo(selectedClass, selectedArm, schoolId)
        if (combo) {
          await StaffService.assignSubjectsToTeacher(
            staff?.user_id!,
            combo.id,
            Array.from(selectedSubjects),
            schoolId
          )
        }
      }

      toast.success('Staff member updated successfully')
      await onSave(updatedStaff)
      onClose()
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save staff member')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading staff data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Edit Staff Profile</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-6 border-b overflow-x-auto">
          {['personal', 'contact', 'employment', 'qualifications', 'class', 'salary'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={e => setMiddleName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    {GENDERS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                  <select
                    value={maritalStatus}
                    onChange={e => setMaritalStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select status</option>
                    {MARITAL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={e => setNationality(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State of Origin</label>
                  <select
                    value={stateOfOrigin}
                    onChange={e => setStateOfOrigin(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select state</option>
                    {STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                  <input
                    type="text"
                    value={lga}
                    onChange={e => setLga(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={e => setAlternatePhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select state</option>
                    {STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={staffId_}
                    onChange={e => setStaffId_(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={e => setEmployeeNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Employed</label>
                  <input
                    type="date"
                    value={dateEmployed}
                    onChange={e => setDateEmployed(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resumption Date</label>
                  <input
                    type="date"
                    value={resumptionDate}
                    onChange={e => setResumptionDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={e => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type</option>
                    {EMPLOYMENT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Qualifications Tab */}
          {activeTab === 'qualifications' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Highest Qualification</label>
                <select
                  value={highestQualification}
                  onChange={e => setHighestQualification(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select qualification</option>
                  {QUALIFICATIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <input
                    type="text"
                    value={course}
                    onChange={e => setCourse(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={e => setGraduationYear(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Certifications</label>
                <textarea
                  value={professionalCertifications}
                  onChange={e => setProfessionalCertifications(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter professional certifications (one per line)"
                />
              </div>
            </div>
          )}

          {/* Class Assignment Tab */}
          {activeTab === 'class' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                  <select
                    value={selectedSession}
                    onChange={e => setSelectedSession(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select session</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.session_year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={selectedClass}
                    onChange={e => handleClassChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arm</label>
                  <select
                    value={selectedArm}
                    onChange={e => setSelectedArm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={classArms.length === 0}
                  >
                    <option value="">Select arm</option>
                    {classArms.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isClassTeacher"
                  checked={isClassTeacher}
                  onChange={e => setIsClassTeacher(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isClassTeacher" className="text-sm font-medium text-gray-700">
                  Is Class Teacher
                </label>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Subjects</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allSubjects.map(subject => (
                    <div key={subject.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`subject-${subject.id}`}
                        checked={selectedSubjects.has(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor={`subject-${subject.id}`} className="text-sm text-gray-700">
                        {subject.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Salary & Bank Tab */}
          {activeTab === 'salary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Frequency</label>
                  <select
                    value={salaryFrequency}
                    onChange={e => setSalaryFrequency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pension Number</label>
                <input
                  type="text"
                  value={pensionNumber}
                  onChange={e => setPensionNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
