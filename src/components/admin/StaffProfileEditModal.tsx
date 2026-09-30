'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'

interface StaffProfileEditModalProps {
  staffId: string
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const POSITIONS = [
  'Principal',
  'Vice Principal',
  'Head of Department',
  'Senior Teacher',
  'Teacher',
  'Substitute Teacher',
  'Teaching Assistant',
  'Counselor',
  'Librarian',
  'ICT Specialist',
  'Coach',
]

const STATES = ['Lagos', 'Abuja', 'Ogun', 'Kwara', 'Kano', 'Kaduna', 'Oyo', 'Rivers', 'Plateau', 'Akwa Ibom', 'Cross River', 'Enugu', 'Imo', 'Ebonyi', 'Abia', 'Anambra', 'Delta', 'Edo', 'Bayelsa', 'Taraba', 'Adamawa', 'Borno', 'Yobe', 'Jigawa', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara', 'Nasarawa', 'Ekiti', 'Osun', 'Ondo']

const SALARY_FREQUENCIES = ['Monthly', 'Termly', 'Annually']

export default function StaffProfileEditModal({
  staffId,
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: StaffProfileEditModalProps) {
  if (!isOpen) return null

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'financial' | 'assignment'>('personal')

  // Personal Information
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [state, setState] = useState('')
  const [lga, setLga] = useState('')

  // Employment Information
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [employmentDate, setEmploymentDate] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [qualification, setQualification] = useState('')
  const [experience, setExperience] = useState('')
  const [staffStatus, setStaffStatus] = useState<'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE')

  // Financial Information
  const [salary, setSalary] = useState('')
  const [salaryFrequency, setSalaryFrequency] = useState('Monthly')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  // Assignment Information
  const [selectedClassComboId, setSelectedClassComboId] = useState('')
  const [classArmCombos, setClassArmCombos] = useState<any[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [subjects, setSubjects] = useState<any[]>([])

  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<any>(null)

  useEffect(() => {
    if (isOpen && staffId) {
      loadStaffData()
    }
  }, [isOpen, staffId])

  const loadStaffData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch staff record from staff table
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff')
        .select(`
          id, user_id, school_id, position, department, employment_date, 
          status, qualification, experience, salary, salary_frequency,
          bank_name, account_number, account_name
        `)
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      setStaff(staffRecord)

      // Fetch user profile - with graceful fallback for missing columns
      let userProfile
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone, gender, address, state, lga')
          .eq('id', staffRecord.user_id)
          .single()

        if (error) throw error
        userProfile = data
      } catch (err: any) {
        // Fallback: column may not exist yet, fetch without optional fields
        console.warn('[StaffModal] Optional columns not yet available, using fallback query:', err.message)
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone')
          .eq('id', staffRecord.user_id)
          .single()

        if (error) throw error
        userProfile = {
          ...data,
          gender: null,
          address: null,
          state: null,
          lga: null,
        }
      }

      // Parse name
      const nameParts = userProfile.full_name.split(' ')
      setFirstName(nameParts[0] || '')
      setMiddleName(nameParts.slice(1, -1).join(' ') || '')
      setLastName(nameParts[nameParts.length - 1] || '')

      setEmail(userProfile.email || '')
      setPhone(userProfile.phone || '')
      setGender(userProfile.gender || '')

      // Set employment fields
      setPosition(staffRecord.position || '')
      setDepartment(staffRecord.department || '')
      setEmploymentDate(staffRecord.employment_date || '')
      setStaffStatus(staffRecord.status || 'ACTIVE')
      setQualification(staffRecord.qualification || '')
      setExperience(staffRecord.experience || '')

      // Set financial fields
      setSalary(staffRecord.salary?.toString() || '')
      setSalaryFrequency(staffRecord.salary_frequency || 'Monthly')
      setBankName(staffRecord.bank_name || '')
      setAccountNumber(staffRecord.account_number || '')
      setAccountName(staffRecord.account_name || '')

      // Fetch class/arm combos
      const { data: combos, error: combosError } = await supabase
        .from('class_arm_combos')
        .select(`
          id, 
          class:class_id (id, name),
          arm:arm_id (id, name)
        `)
        .eq('school_id', schoolId)
        .order('created_at')

      if (!combosError && combos) {
        setClassArmCombos(combos)
        // Find if staff is a class teacher
        const classTeacherAssignment = combos.find(c => c.class_teacher_id === staffId)
        if (classTeacherAssignment) {
          setSelectedClassComboId(classTeacherAssignment.id)
        }
      }

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', schoolId)
        .order('name')

      if (!subjectsError && subjectsData) {
        setSubjects(subjectsData)
      }

      // Fetch assigned subjects
      const { data: staffSubjects, error: subjectsAssignError } = await supabase
        .from('subject_teacher_assignments')
        .select('subject_id')
        .eq('teacher_id', staffRecord.user_id)

      if (!subjectsAssignError && staffSubjects) {
        setSelectedSubjects(new Set(staffSubjects.map(s => s.subject_id)))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff data')
      toast.error('Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePersonalInfo = async () => {
    try {
      setSaving(true)
      const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' ')

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email,
          phone,
          gender,
        })
        .eq('id', staff.user_id)

      if (updateError) throw updateError

      toast.success('✅ Personal information saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save personal information')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmploymentInfo = async () => {
    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from('staff')
        .update({
          position: position || null,
          department: department || null,
          employment_date: employmentDate || null,
          status: staffStatus,
          qualification: qualification || null,
          experience: experience || null,
        })
        .eq('id', staffId)

      if (updateError) throw updateError

      toast.success('✅ Employment information saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save employment information')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFinancialInfo = async () => {
    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from('staff')
        .update({
          salary: salary ? parseFloat(salary) : null,
          salary_frequency: salaryFrequency,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          account_name: accountName || null,
        })
        .eq('id', staffId)

      if (updateError) throw updateError

      toast.success('✅ Financial information saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save financial information')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAssignments = async () => {
    try {
      setSaving(true)

      // Update class teacher assignment if needed
      if (selectedClassComboId) {
        const { error: classError } = await supabase
          .from('class_arm_combos')
          .update({ class_teacher_id: staff.user_id })
          .eq('id', selectedClassComboId)

        if (classError) throw classError
      }

      // Update subject assignments
      // First, delete old assignments
      await supabase
        .from('subject_teacher_assignments')
        .delete()
        .eq('teacher_id', staff.user_id)

      // Then insert new ones
      if (selectedSubjects.size > 0) {
        const assignmentRecords = Array.from(selectedSubjects).map(subjectId => ({
          teacher_id: staff.user_id,
          subject_id: subjectId,
          school_id: schoolId,
        }))

        const { error: insertError } = await supabase
          .from('subject_teacher_assignments')
          .insert(assignmentRecords)

        if (insertError) throw insertError
      }

      toast.success('✅ Assignments saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assignments')
    } finally {
      setSaving(false)
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

  const currentClass = classArmCombos.find(c => c.id === selectedClassComboId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">📝 Edit Staff Profile</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 overflow-x-auto">
          {['personal', 'employment', 'financial', 'assignment'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'personal' && '👤 Personal'}
              {tab === 'employment' && '💼 Employment'}
              {tab === 'financial' && '💰 Financial'}
              {tab === 'assignment' && '📚 Assignment'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* PERSONAL TAB */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select State</option>
                        {STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">LGA</label>
                      <input
                        type="text"
                        value={lga}
                        onChange={(e) => setLga(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePersonalInfo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* EMPLOYMENT TAB */}
              {activeTab === 'employment' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Position</option>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g., English Department"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Date</label>
                      <input
                        type="date"
                        value={employmentDate}
                        onChange={(e) => setEmploymentDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Qualification</label>
                    <input
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g., B.Sc Education, M.Ed"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Years of Experience</label>
                      <input
                        type="number"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={staffStatus}
                        onChange={(e) => setStaffStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEmploymentInfo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* FINANCIAL TAB */}
              {activeTab === 'financial' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Salary Amount</label>
                      <input
                        type="number"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                      <select
                        value={salaryFrequency}
                        onChange={(e) => setSalaryFrequency(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        {SALARY_FREQUENCIES.map((freq) => (
                          <option key={freq} value={freq}>
                            {freq}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., First Bank of Nigeria"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Account Name</label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFinancialInfo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* ASSIGNMENT TAB */}
              {activeTab === 'assignment' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Class Teacher Assignment</label>
                    <select
                      value={selectedClassComboId}
                      onChange={(e) => setSelectedClassComboId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Not a Class Teacher --</option>
                      {classArmCombos.map((combo) => (
                        <option key={combo.id} value={combo.id}>
                          {combo.class.name} {combo.arm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentClass && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-purple-900">Currently Teaching:</p>
                      <p className="text-sm text-purple-800 mt-1">
                        {currentClass.class.name} {currentClass.arm.name}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Subject Assignments</label>
                    {subjects.length === 0 ? (
                      <p className="text-sm text-gray-500">No subjects available</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                        {subjects.map((subject) => (
                          <label
                            key={subject.id}
                            className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.has(subject.id)}
                              onChange={() => handleSubjectToggle(subject.id)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {subject.name} {subject.code && `(${subject.code})`}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      ✓ Assigned: {selectedSubjects.size} subject(s)
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAssignments}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
