'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface ExamHeaderProps {
  studentId: string
  examId: string
  timeRemaining?: number | null
}

interface ExamHeaderData {
  schoolName: string
  schoolLogo: string | null
  studentName: string
  studentPhoto: string | null
  admissionNumber: string
  className: string
  classArmName: string
  subjectName: string
  assessmentType: string
  termName: string
  academicSession: string
  loading: boolean
  error: string | null
}

/**
 * EXAM HEADER COMPONENT
 * 
 * CRITICAL REQUIREMENT: This component must appear at the TOP of every CBT exam page.
 * It displays student identity and exam information.
 * Must be sticky on desktop, responsive on mobile.
 * Information must be fetched from actual student records (NOT hardcoded).
 * Student must NOT be able to modify these values.
 * 
 * Display Format:
 * ┌─────────────────────────────────────────────────┐
 * │ SCHOOL NAME                                     │
 * │ Student: NAME  Admission No: XXXX              │
 * │ Class: X Arm: A  Subject: SUBJECT              │
 * │ Assessment: CA1  Term: FIRST TERM              │
 * │ Session: 2026/2027                              │
 * │                            Time Remaining: HH:MM│
 * └─────────────────────────────────────────────────┘
 */
export default function ExamHeader({
  studentId,
  examId,
  timeRemaining = null,
}: ExamHeaderProps) {
  const [data, setData] = useState<ExamHeaderData>({
    schoolName: '',
    schoolLogo: null,
    studentName: '',
    studentPhoto: null,
    admissionNumber: '',
    className: '',
    classArmName: '',
    subjectName: '',
    assessmentType: '',
    termName: '',
    academicSession: '',
    loading: true,
    error: null,
  })

  useEffect(() => {
    loadExamHeaderData()
  }, [studentId, examId])

  const loadExamHeaderData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      if (!studentId || !examId) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Missing student or exam ID',
        }))
        return
      }

      // STEP 1: Get student basic info, class, school_id, and photo_url
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          school_id,
          user_id,
          photo_url,
          class_arm_combos (
            classes (name, level),
            arms (name)
          )
        `)
        .eq('id', studentId)
        .single()

      if (studentError || !studentData) {
        console.error('Student query error:', studentError)
        throw new Error('Student record not found')
      }

      // STEP 2: Fetch user data separately by ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', studentData.user_id)
        .single()

      if (userError || !userData) {
        console.error('User query error:', userError)
        throw new Error('User record not found')
      }

      const schoolId = studentData.school_id

      // Get school name, logo and exam details in PARALLEL (not sequential)
      const [schoolResponse, examResponse] = await Promise.all([
        supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', schoolId)
          .single(),
        supabase
          .from('cbt_exams')
          .select('id, subject_id, term_id, assessment_type')
          .eq('id', examId)
          .single(),
      ])

      const { data: schoolData, error: schoolError } = schoolResponse
      const { data: examData, error: examError } = examResponse

      if (schoolError) {
        console.error('School query error:', schoolError)
        throw new Error('School not found')
      }

      if (examError || !examData) {
        console.error('Exam query error:', examError)
        throw new Error('Exam not found')
      }

      // STEP 3: Fetch subject data separately
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', examData.subject_id)
        .single()

      // STEP 4: Fetch term data separately (term_id might be from academic_terms OR terms table)
      let sessionYear = new Date().getFullYear()
      let termName = 'Term'

      // Only query if term_id is provided
      if (examData.term_id) {
        const { data: termData, error: termError } = await supabase
          .from('academic_terms')
          .select('name, session_id')
          .eq('id', examData.term_id)
          .single()

        // STEP 5: If no academic_terms record, try old terms table (for backwards compatibility)
        if (termError && examData.term_id) {
          // Try old terms table
          const { data: oldTermData } = await supabase
            .from('terms')
            .select('name, session_year')
            .eq('id', examData.term_id)
            .single()

          if (oldTermData) {
            termName = oldTermData.name
            sessionYear = oldTermData.session_year
          }
        } else if (termData) {
          termName = termData.name || 'Term'
          // Get session year from academic_sessions
          if (termData.session_id) {
            const { data: sessionData } = await supabase
              .from('academic_sessions')
              .select('session_year')
              .eq('id', termData.session_id)
              .single()

            sessionYear = sessionData?.session_year || sessionYear
          }
        }
      }

      // Construct academic session string
      const nextYear = sessionYear + 1
      const academicSession = `${sessionYear}/${nextYear}`

      // Build header data - safe navigation with fallbacks
      const classArmCombo = studentData.class_arm_combos as any
      setData(prev => ({
        ...prev,
        schoolName: schoolData?.name || 'School',
        schoolLogo: schoolData?.logo_url || null,
        studentName: userData?.full_name || 'Student',
        studentPhoto: studentData.photo_url || null,
        admissionNumber: studentData.admission_number || 'N/A',
        className: classArmCombo?.classes?.name || 'N/A',
        classArmName: classArmCombo?.arms?.name || 'N/A',
        subjectName: subjectData?.name || 'Subject',
        assessmentType: examData.assessment_type?.toUpperCase() || 'EXAM',
        termName: termName,
        academicSession,
        loading: false,
      }))
    } catch (error) {
      console.error('Error loading exam header:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load exam information',
      }))
    }
  }

  // Format time for display
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (data.error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <p className="text-red-700 font-semibold">⚠️ Error Loading Exam Information</p>
        <p className="text-red-600 text-sm">{data.error}</p>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border-b-4 border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Content */}
        <div className="py-4 space-y-2">
          {/* School Logo and Name with Student Photo */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3 flex-1">
              {/* School Logo */}
              {data.schoolLogo && (
                <div className="flex-shrink-0">
                  <img
                    src={data.schoolLogo}
                    alt="School Logo"
                    className="h-14 w-14 rounded-full object-contain bg-white p-1 border-2 border-white"
                  />
                </div>
              )}
              {/* Student Photo */}
              {data.studentPhoto && (
                <div className="flex-shrink-0">
                  <img
                    src={data.studentPhoto}
                    alt="Student Photo"
                    className="h-14 w-14 rounded-full object-cover border-2 border-white"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{data.schoolName}</h1>
                <p className="text-sm opacity-90">{data.studentName}</p>
              </div>
            </div>
            {/* Timer */}
            {timeRemaining !== null && (
              <div className="text-right">
                <p className="text-xs font-semibold opacity-90">Time Remaining</p>
                <p className="text-xl font-bold font-mono">{formatTime(timeRemaining)}</p>
              </div>
            )}
          </div>

          {/* Student Information Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="opacity-90">Student:</span>{' '}
              <span className="font-semibold">{data.studentName}</span>
            </div>
            <div>
              <span className="opacity-90">Admission No:</span>{' '}
              <span className="font-semibold">{data.admissionNumber}</span>
            </div>
          </div>

          {/* Class and Subject Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="opacity-90">Class:</span>{' '}
              <span className="font-semibold">
                {data.className}
                {data.classArmName && ` ${data.classArmName}`}
              </span>
            </div>
            <div>
              <span className="opacity-90">Subject:</span>{' '}
              <span className="font-semibold">{data.subjectName}</span>
            </div>
          </div>

          {/* Assessment and Term Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="opacity-90">Assessment:</span>{' '}
              <span className="font-semibold">{data.assessmentType}</span>
            </div>
            <div>
              <span className="opacity-90">Term:</span>{' '}
              <span className="font-semibold">{data.termName}</span>
            </div>
            <div>
              <span className="opacity-90">Session:</span>{' '}
              <span className="font-semibold">{data.academicSession}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {data.loading && (
        <div className="absolute inset-0 bg-blue-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  )
}
