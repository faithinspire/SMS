'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'

const supabase = createClient()

interface Class {
  id: string
  class_name: string
  arm_name: string
  student_count: number
  form_master: string
}

interface Term {
  id: string
  term_name: string
  term_number: number
  is_active: boolean
}

interface Session {
  id: string
  session_year: string
  is_active: boolean
}

interface PageState {
  loading: boolean
  error: string | null
  sessions: Session[]
  terms: Term[]
  classes: Class[]
  school: any
  user: any
}

export default function AcademicPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>({
    loading: true,
    error: null,
    sessions: [],
    terms: [],
    classes: [],
    school: null,
    user: null,
  })

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setState(s => ({ ...s, loading: true, error: null }))

      // Get current user
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'SCHOOL_ADMIN') {
        router.push('/landing')
        return
      }

      setState(s => ({ ...s, user: currentUser }))

      if (!currentUser.school_id) {
        setState(s => ({
          ...s,
          error: 'Your account is not linked to a school',
          loading: false,
        }))
        return
      }

      // Load school data
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .maybeSingle()

      if (!schoolData) {
        setState(s => ({
          ...s,
          error: 'School data not found',
          loading: false,
        }))
        return
      }

      setState(s => ({ ...s, school: schoolData }))

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('academic_sessions')
        .select('id, session_year, is_active, created_at')
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (sessionsError) throw sessionsError

      setState(s => ({ ...s, sessions: sessionsData || [] }))

      // Load terms
      const { data: termsData, error: termsError } = await supabase
        .from('academic_terms')
        .select('id, term_name, term_number, is_active')
        .eq('school_id', currentUser.school_id)
        .order('term_number', { ascending: true })

      if (termsError) throw termsError

      setState(s => ({ ...s, terms: termsData || [] }))

      // Load classes with student counts
      const { data: classArmsData, error: classError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class:class_id (id, name),
          arm:arm_id (id, name),
          class_teacher_id,
          school_id
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: true })

      if (classError) throw classError

      // Count students for each class
      const classesWithCounts = await Promise.all(
        (classArmsData || []).map(async (combo) => {
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('class_arm_combo_id', combo.id)
            .eq('school_id', currentUser.school_id)

          // Get form master name
          let formMasterName = 'N/A'
          if (combo.class_teacher_id) {
            const { data: teacher } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', combo.class_teacher_id)
              .maybeSingle()
            if (teacher) {
              formMasterName = teacher.full_name
            }
          }

          return {
            id: combo.id,
            class_name: combo.class?.name || 'Unknown',
            arm_name: combo.arm?.name || 'N/A',
            student_count: count || 0,
            form_master: formMasterName,
          }
        })
      )

      setState(s => ({ ...s, classes: classesWithCounts, loading: false }))
    } catch (error) {
      console.error('[Academic Page] Error:', error)
      setState(s => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false,
      }))
      toast.error('Failed to load academic data')
    }
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading academic data...</p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <p className="text-red-700">{state.error}</p>
        <button
          onClick={loadAllData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold mb-2">📚 Academic Management</h1>
      <p className="text-gray-600 mb-6">
        School: <strong>{state.school?.name || 'Loading...'}</strong>
      </p>

      {/* Sessions Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📅 Academic Sessions ({state.sessions.length})
        </h2>
        {state.sessions.length === 0 ? (
          <p className="text-gray-500">No sessions found</p>
        ) : (
          <div className="grid gap-3">
            {state.sessions.map(session => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border-2 ${
                  session.is_active
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">{session.session_year}</span>
                  {session.is_active && (
                    <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terms Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📆 Terms ({state.terms.length})
        </h2>
        {state.terms.length === 0 ? (
          <p className="text-gray-500">No terms found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.terms.map(term => (
              <div
                key={term.id}
                className={`p-4 rounded-lg border-2 ${
                  term.is_active
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <h3 className="font-bold text-lg">{term.term_name}</h3>
                <p className="text-gray-600 text-sm">Term {term.term_number}</p>
                {term.is_active && (
                  <span className="mt-2 inline-block px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classes Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🎓 Classes ({state.classes.length})
        </h2>
        {state.classes.length === 0 ? (
          <p className="text-gray-500">No classes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-600">
                  <th className="p-3 text-left font-bold">Class</th>
                  <th className="p-3 text-left font-bold">Arm</th>
                  <th className="p-3 text-center font-bold">Students</th>
                  <th className="p-3 text-left font-bold">Form Master</th>
                </tr>
              </thead>
              <tbody>
                {state.classes.map((cls, idx) => (
                  <tr
                    key={cls.id}
                    className={`border-b ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50`}
                  >
                    <td className="p-3 font-semibold">{cls.class_name}</td>
                    <td className="p-3">{cls.arm_name}</td>
                    <td className="p-3 text-center">
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full font-bold">
                        {cls.student_count}
                      </span>
                    </td>
                    <td className="p-3">{cls.form_master}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={loadAllData}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          🔄 Refresh Data
        </button>
      </div>
    </div>
  )
}
