'use client'

import React, { useState, useEffect } from 'react'
import { StudentService } from '@/services/student.service'
import { ClassService } from '@/services/class.service'
import CanonicalSubjectService from '@/services/canonical-subject.service'
import type { CanonicalSubject } from '@/services/canonical-subject.service'

interface StudentRegistrationFormProps {
  schoolId: string
  onSuccess?: (studentId: string, pin: string) => void
  onError?: (error: string) => void
}

interface FormErrors {
  [key: string]: string
}

export default function StudentRegistrationForm({
  schoolId,
  onSuccess,
  onError,
}: StudentRegistrationFormProps) {
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<CanonicalSubject[]>([])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedClassLevel, setSelectedClassLevel] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    class_arm_combo_id: '',
    subject_ids: [] as string[],
    guardian_full_name: '',
    guardian_phone: '',
    guardian_email: '',
    photo: null as File | null,
  })

  // Load classes on mount
  useEffect(() => {
    loadClasses()
  }, [schoolId])

  // Load subjects when class is selected
  useEffect(() => {
    if (selectedClassLevel !== null) {
      loadSubjects()
    }
  }, [selectedClassLevel])

  const loadClasses = async () => {
    try {
      const classesData = await ClassService.getSchoolClasses(schoolId)
      // Flatten class_arm_combos for dropdown
      const flatClasses = classesData.flatMap((cls) =>
        cls.arms.map((arm: any) => ({
          id: cls.class_arm_combos.find(
            (combo: any) => combo.arm_id === arm.id // Find matching combo
          )?.id,
          name: `${cls.name}${arm.name}`,
          level: cls.level,
          classId: cls.id,
          armName: arm.name,
        }))
      )
      setClasses(flatClasses.filter((c) => c.id)) // Filter out nulls
    } catch (error) {
      console.error('Failed to load classes:', error)
      onError?.('Failed to load classes')
    }
  }

  const loadSubjects = async () => {
    if (selectedClassLevel === null) return

    try {
      // ✅ NEW: Use canonical subject service instead of ClassService
      const subjectsData = await CanonicalSubjectService.getSubjectsForLevel(schoolId, selectedClassLevel)
      setSubjects(subjectsData)
    } catch (error) {
      console.error('Failed to load subjects:', error)
      onError?.('Failed to load subjects')
    }
  }

  const handleClassChange = (classArmComboId: string) => {
    const selectedClass = classes.find((c) => c.id === classArmComboId)
    setFormData({ ...formData, class_arm_combo_id: classArmComboId })
    if (selectedClass) {
      setSelectedClassLevel(selectedClass.level)
    }
  }

  const handleSubjectToggle = (subjectId: string) => {
    const updated = formData.subject_ids.includes(subjectId)
      ? formData.subject_ids.filter((id) => id !== subjectId)
      : [...formData.subject_ids, subjectId]

    setFormData({ ...formData, subject_ids: updated })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, photo: file })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    setSuccessMessage('')

    try {
      // Validate form
      const validated = {
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        class_arm_combo_id: formData.class_arm_combo_id,
        subject_ids: formData.subject_ids,
        guardian_full_name: formData.guardian_full_name,
        guardian_phone: formData.guardian_phone,
        guardian_email: formData.guardian_email,
      }

      // Validate required fields
      if (!validated.full_name?.trim()) throw new Error('Student name is required')
      if (!validated.date_of_birth) throw new Error('Date of birth is required')
      if (!validated.class_arm_combo_id) throw new Error('Class selection is required')
      if (validated.subject_ids.length === 0) throw new Error('Please select at least one subject')
      if (!validated.guardian_full_name?.trim()) throw new Error('Guardian name is required')
      if (!validated.guardian_phone?.trim()) throw new Error('Guardian phone is required')

      // Register student (admission number is AUTO-GENERATED)
      const result = await StudentService.registerStudent(
        schoolId,
        validated.full_name,
        validated.date_of_birth,
        validated.class_arm_combo_id,
        validated.subject_ids,
        validated.guardian_full_name,
        validated.guardian_phone,
        validated.guardian_email,
        formData.photo || undefined
      )

      // Show PIN and admission number to admin
      setSuccessMessage(
        `✅ Student registered successfully!\n\nAdmission Number: ${result.admission_number}\nStudent PIN: ${result.pin}\n(Share this with the student for login)`
      )

      onSuccess?.(result.student.id, result.pin)

      // Reset form
      setFormData({
        full_name: '',
        date_of_birth: '',
        class_arm_combo_id: '',
        subject_ids: [],
        guardian_full_name: '',
        guardian_phone: '',
        guardian_email: '',
        photo: null,
      })
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage = error.message || 'Registration failed'
      onError?.(errorMessage)
      setErrors({ submit: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 whitespace-pre-line font-mono text-sm">{successMessage}</p>
        </div>
      )}

      {/* Student Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="form-label">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="input-field"
              placeholder="John Doe"
              disabled={loading}
            />
            {errors.full_name && <p className="form-error">{errors.full_name}</p>}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="form-label">
              Date of Birth *
            </label>
            <input
              id="date_of_birth"
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleInputChange}
              className="input-field"
              disabled={loading}
            />
            {errors.date_of_birth && <p className="form-error">{errors.date_of_birth}</p>}
          </div>

          {/* Photo Upload */}
          <div>
            <label htmlFor="photo" className="form-label">
              Student Photo (Optional)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="input-field flex-1"
                disabled={loading}
              />
              {formData.photo && (
                <span className="text-sm text-green-600">✓ {formData.photo.name}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: Photo upload is optional. If it fails, student registration will still complete.
            </p>
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>

        <div className="space-y-4">
          {/* Class Selection */}
          <div>
            <label htmlFor="class_arm_combo_id" className="form-label">
              Class/Arm *
            </label>
            <select
              id="class_arm_combo_id"
              value={formData.class_arm_combo_id}
              onChange={(e) => handleClassChange(e.target.value)}
              className="input-field"
              disabled={loading}
            >
              <option value="">-- Select Class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            {errors.class_arm_combo_id && (
              <p className="form-error">{errors.class_arm_combo_id}</p>
            )}
          </div>

          {/* Subject Selection */}
          {subjects.length > 0 && (
            <div>
              <label className="form-label">Select Subjects *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 border border-gray-300 rounded-lg bg-gray-50">
                {subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.subject_ids.includes(subject.id)}
                      onChange={() => handleSubjectToggle(subject.id)}
                      disabled={loading}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {subject.name} ({subject.code})
                    </span>
                  </label>
                ))}
              </div>
              {errors.subject_ids && <p className="form-error">{errors.subject_ids}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Guardian Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h3>

        <div className="space-y-4">
          {/* Guardian Full Name */}
          <div>
            <label htmlFor="guardian_full_name" className="form-label">
              Guardian Full Name *
            </label>
            <input
              id="guardian_full_name"
              type="text"
              name="guardian_full_name"
              value={formData.guardian_full_name}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Jane Doe"
              disabled={loading}
            />
            {errors.guardian_full_name && (
              <p className="form-error">{errors.guardian_full_name}</p>
            )}
          </div>

          {/* Guardian Phone */}
          <div>
            <label htmlFor="guardian_phone" className="form-label">
              Guardian Phone *
            </label>
            <input
              id="guardian_phone"
              type="tel"
              name="guardian_phone"
              value={formData.guardian_phone}
              onChange={handleInputChange}
              className="input-field"
              placeholder="+234901234567"
              disabled={loading}
            />
            {errors.guardian_phone && <p className="form-error">{errors.guardian_phone}</p>}
          </div>

          {/* Guardian Email */}
          <div>
            <label htmlFor="guardian_email" className="form-label">
              Guardian Email (Optional)
            </label>
            <input
              id="guardian_email"
              type="email"
              name="guardian_email"
              value={formData.guardian_email}
              onChange={handleInputChange}
              className="input-field"
              placeholder="guardian@email.com"
              disabled={loading}
            />
            {errors.guardian_email && <p className="form-error">{errors.guardian_email}</p>}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          {loading ? 'Registering Student...' : 'Register Student'}
        </button>
        <button type="reset" className="btn-secondary flex-1">
          Clear Form
        </button>
      </div>

      {/* Auto-Linking Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <p className="font-semibold mb-2">✓ Auto-Linking in Progress:</p>
        <ul className="space-y-1 text-xs">
          <li>✓ Class teacher will be automatically assigned</li>
          <li>✓ Subject teachers will be automatically linked</li>
          <li>✓ PIN will be auto-generated and displayed</li>
          <li>✓ Teacher dashboards update in real-time</li>
        </ul>
      </div>
    </form>
  )
}
