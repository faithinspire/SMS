'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

interface EditStaffModalProps {
  staffId: string
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditStaffModal({
  staffId,
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: EditStaffModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [staffData, setStaffData] = useState({
    full_name: '',
    email: '',
    phone: '',
    employment_date: '',
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    salary_amount: '',
  })

  const [originalEmail, setOriginalEmail] = useState('')
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')

  useEffect(() => {
    if (isOpen && staffId) {
      loadStaffData()
    }
  }, [isOpen, staffId])

  const loadStaffData = async () => {
    try {
      setLoading(true)
      setError('')

      // Get staff details
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, employment_date, bank_name, account_number, account_holder_name, salary_amount')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError

      setStaffData({
        full_name: staff.full_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        employment_date: staff.employment_date || '',
        bank_name: staff.bank_name || '',
        account_number: staff.account_number || '',
        account_holder_name: staff.account_holder_name || '',
        salary_amount: staff.salary_amount || '',
      })
      setOriginalEmail(staff.email)

      // Get staff subjects
      const { data: staffSubjects } = await supabase
        .from('teacher_subjects')
        .select('subject_id')
        .eq('teacher_id', staffId)

      if (staffSubjects) {
        setSelectedSubjects(new Set(staffSubjects.map(s => s.subject_id)))
      }

      // Get staff class
      const { data: classTeacher } = await supabase
        .from('class_arm_combos')
        .select('id')
        .eq('class_teacher_id', staffId)
        .single()

      if (classTeacher) {
        setSelectedClass(classTeacher.id)
      }

      // Load available subjects and classes
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', schoolId)
        .order('name')

      setSubjects(subjectsData || [])

      const { data: combosData } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id')
        .eq('school_id', schoolId)

      if (combosData && combosData.length > 0) {
        const classIds = [...new Set(combosData.map(c => c.class_id))]
        const armIds = [...new Set(combosData.map(c => c.arm_id))]

        const { data: classes } = await supabase
          .from('classes')
          .select('id, name, level, type')
          .in('id', classIds)

        const { data: arms } = await supabase
          .from('arms')
          .select('id, name')
          .in('id', armIds)

        const merged = combosData.map(combo => ({
          id: combo.id,
          classes: classes?.find(c => c.id === combo.class_id),
          arms: arms?.find(a => a.id === combo.arm_id),
        }))

        setClasses(merged)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff data')
    } finally {
      setLoading(false)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Update basic staff information
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: staffData.full_name,
          email: staffData.email,
          phone: staffData.phone,
          employment_date: staffData.employment_date,
          bank_name: staffData.bank_name,
          account_number: staffData.account_number,
          account_holder_name: staffData.account_holder_name,
          salary_amount: staffData.salary_amount ? parseFloat(staffData.salary_amount) : null,
        })
        .eq('id', staffId)

      if (updateError) throw updateError

      // Update subjects
      // First delete existing
      await supabase.from('teacher_subjects').delete().eq('teacher_id', staffId)

      // Then insert new
      if (selectedSubjects.size > 0) {
        const subjectsToInsert = Array.from(selectedSubjects).map(subjectId => ({
          teacher_id: staffId,
          subject_id: subjectId,
        }))

        const { error: subjectError } = await supabase
          .from('teacher_subjects')
          .insert(subjectsToInsert)

        if (subjectError) throw subjectError
      }

      // Update class teacher assignment
      // First remove from any existing class
      await supabase
        .from('class_arm_combos')
        .update({ class_teacher_id: null })
        .eq('class_teacher_id', staffId)

      // Then assign to new class if selected
      if (selectedClass) {
        const { error: classError } = await supabase
          .from('class_arm_combos')
          .update({ class_teacher_id: staffId })
          .eq('id', selectedClass)

        if (classError) throw classError
      }

      setSuccess('✅ Staff profile updated successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update staff profile')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const bgOverlay = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
  const modalClass = 'bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'

  return (
    <div className={bgOverlay}>
      <div className={modalClass}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 border-b shadow-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">✏️ Edit Staff Profile</h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-blue-200"></div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">👤 Personal Information</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={staffData.full_name}
                    onChange={(e) => setStaffData({ ...staffData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={staffData.email}
                    onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={staffData.phone}
                    onChange={(e) => setStaffData({ ...staffData, phone: e.target.value })}
                    placeholder="e.g., +234 801 234 5678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Employment Details */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">💼 Employment Details</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Date</label>
                  <input
                    type="date"
                    value={staffData.employment_date}
                    onChange={(e) => setStaffData({ ...staffData, employment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">💰 Payment Details</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={staffData.bank_name}
                    onChange={(e) => setStaffData({ ...staffData, bank_name: e.target.value })}
                    placeholder="e.g., First Bank Nigeria"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={staffData.account_number}
                    onChange={(e) => setStaffData({ ...staffData, account_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    value={staffData.account_holder_name}
                    onChange={(e) => setStaffData({ ...staffData, account_holder_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Monthly Salary (₦)</label>
                  <input
                    type="number"
                    value={staffData.salary_amount}
                    onChange={(e) => setStaffData({ ...staffData, salary_amount: e.target.value })}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Class Assignment */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">🏫 Class Assignment</h3>

                <label className="block text-sm font-semibold text-gray-700 mb-2">Class Teacher For (Optional)</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Class Assignment --</option>
                  {classes.map((classCombo) => (
                    <option key={classCombo.id} value={classCombo.id}>
                      {classCombo.classes?.name} {classCombo.arms?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subjects */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">📚 Subjects</h3>

                {subjects.length === 0 ? (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    No subjects available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {subjects.map((subject) => (
                      <label
                        key={subject.id}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjects.has(subject.id)}
                          onChange={() => handleSubjectToggle(subject.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {subject.name}
                          {subject.code && ` (${subject.code})`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  ✓ Selected: {selectedSubjects.size} subject(s)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 mt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
