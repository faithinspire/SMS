'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { StudentService } from '@/services/student.service'

interface EditStudentModalProps {
  studentId: string
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DEPARTMENTS = [
  { id: 'SCIENCE', name: 'Science', description: 'Physics, Chemistry, Biology' },
  { id: 'COMMERCIAL', name: 'Commercial', description: 'Economics, Accounting, Business' },
  { id: 'HUMANITIES', name: 'Humanities', description: 'History, Government, Literature' },
  { id: 'TECHNICAL', name: 'Technical', description: 'Technical Drawing, Woodwork' },
]

export default function EditStudentModal({
  studentId,
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [studentData, setStudentData] = useState({
    full_name: '',
    email: '',
    admission_number: '',
    department: '',
  })

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [classType, setClassType] = useState<'PRIMARY' | 'SECONDARY' | null>(null)
  const [classLevel, setClassLevel] = useState<number | null>(null)

  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentData()
    }
  }, [isOpen, studentId])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      setError('')

      // Step 1: Get student details
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, admission_number, department, class_arm_combo_id, user_id')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      // Step 2: Get user details separately
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', studentData.user_id)
        .single()

      if (userError) throw userError

      setStudentData({
        full_name: userData?.full_name || '',
        email: userData?.email || '',
        admission_number: studentData.admission_number || '',
        department: studentData.department || '',
      })

      if (studentData.class_arm_combo_id) {
        setSelectedClass(studentData.class_arm_combo_id)
      }

      // Get student subjects
      const { data: studentSubjects } = await supabase
        .from('student_subjects')
        .select('subject_id')
        .eq('student_id', studentId)

      if (studentSubjects) {
        setSelectedSubjects(new Set(studentSubjects.map(s => s.subject_id)))
      }

      // Load available subjects and classes
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels')
        .eq('school_id', schoolId)
        .order('name')

      setSubjects(subjectsData || [])

      // Step 3: Load class_arm_combos
      const { data: combosData } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id')
        .eq('school_id', schoolId)

      if (combosData && combosData.length > 0) {
        const classIds = [...new Set(combosData.map(c => c.class_id))]
        const armIds = [...new Set(combosData.map(c => c.arm_id))]

        // Step 4: Get class details separately
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name, level, type')
          .in('id', classIds)

        // Step 5: Get arm details separately
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

        // Set current class info
        if (studentData.class_arm_combo_id) {
          const currentClass = merged.find(c => c.id === studentData.class_arm_combo_id)
          if (currentClass) {
            setClassType(currentClass.classes?.type as 'PRIMARY' | 'SECONDARY')
            setClassLevel(currentClass.classes?.level)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student data')
    } finally {
      setLoading(false)
    }
  }

  const handleClassChange = (classComboId: string) => {
    setSelectedClass(classComboId)
    const selectedClassData = classes.find(c => c.id === classComboId)
    if (selectedClassData) {
      setClassType(selectedClassData.classes?.type as 'PRIMARY' | 'SECONDARY')
      setClassLevel(selectedClassData.classes?.level)
      setSelectedSubjects(new Set())
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

  const applicableSubjects = selectedClass && classLevel !== null
    ? subjects.filter(s => {
        return !s.applicable_to_levels?.length || s.applicable_to_levels.includes(classLevel)
      })
    : []

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Validation
      if (!selectedClass) {
        setError('Please select a class')
        return
      }
      if (classType === 'SECONDARY' && !studentData.department) {
        setError('Please select a department for secondary students')
        return
      }
      if (classType === 'SECONDARY' && selectedSubjects.size === 0) {
        setError('Please select at least one subject for secondary students')
        return
      }

      // Use StudentService.updateStudentProfile() - unified update method
      // This handles: user updates, student record updates, subject enrollment (no duplicates)
      const updatedStudent = await StudentService.updateStudentProfile(
        studentId,
        schoolId,
        {
          fullName: studentData.full_name,
          email: studentData.email,
          department: studentData.department || null,
          classArmComboId: selectedClass,
          subjectIds: Array.from(selectedSubjects),
        }
      )

      setSuccess('✅ Student profile updated successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update student profile')
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
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 border-b shadow-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">✏️ Edit Student Profile</h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-green-200"></div>
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
                    value={studentData.full_name}
                    onChange={(e) => setStudentData({ ...studentData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={studentData.email}
                    onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Admission Number</label>
                  <input
                    type="text"
                    value={studentData.admission_number}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">ℹ️ Admission number cannot be changed</p>
                </div>
              </div>

              {/* Academic Information */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">📚 Academic Information</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((classCombo) => (
                      <option key={classCombo.id} value={classCombo.id}>
                        {classCombo.classes?.name} {classCombo.arms?.name}
                      </option>
                    ))}
                  </select>
                </div>

                {classType === 'SECONDARY' && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Department *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DEPARTMENTS.map((dept) => (
                        <label key={dept.id} className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          studentData.department === dept.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-300'
                        }`}>
                          <input
                            type="radio"
                            name="department"
                            value={dept.id}
                            checked={studentData.department === dept.id}
                            onChange={(e) => setStudentData({ ...studentData, department: e.target.value })}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className="ml-2 font-semibold text-gray-900">{dept.name}</span>
                          <p className="text-xs text-gray-600 mt-1">{dept.description}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {classType === 'SECONDARY' && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Subjects *</label>
                    {applicableSubjects.length === 0 ? (
                      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        No subjects available for this class.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                        {applicableSubjects.map((subject) => (
                          <label
                            key={subject.id}
                            className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.has(subject.id)}
                              onChange={() => handleSubjectToggle(subject.id)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
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
                )}
              </div>

              {/* Summary */}
              {selectedClass && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-sm font-semibold text-green-900">📋 Assignment Summary:</p>
                  <ul className="text-sm text-green-800 mt-2 space-y-1">
                    <li>✓ Class: {classes.find(c => c.id === selectedClass)?.classes?.name} {classes.find(c => c.id === selectedClass)?.arms?.name}</li>
                    <li>✓ Type: {classType === 'PRIMARY' ? '🏫 Primary' : '🎓 Secondary'}</li>
                    {classType === 'SECONDARY' && studentData.department && <li>✓ Department: {DEPARTMENTS.find(d => d.id === studentData.department)?.name}</li>}
                    {classType === 'SECONDARY' && <li>✓ Subjects: {selectedSubjects.size > 0 ? `${selectedSubjects.size} selected` : 'Not selected'}</li>}
                  </ul>
                </div>
              )}

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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all disabled:cursor-not-allowed"
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
