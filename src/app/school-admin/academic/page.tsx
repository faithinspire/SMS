'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

interface AcademicSession {
  id: string
  session_year: string
  is_active: boolean
  created_at: string
}

interface Term {
  id: string
  session_id: string
  term_name: string
  term_number: number
  is_active: boolean
}

interface Class {
  id: string
  class_name: string
  arm_name: string
  student_count: number
  form_master?: string
}

export default function SchoolAdminAcademicPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sessions' | 'terms' | 'classes'>('sessions')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'SCHOOL_ADMIN') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        // Load school
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

        // Load sessions
        const { data: sessionsData } = await supabase
          .from('academic_sessions')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('session_year', { ascending: false })

        setSessions(sessionsData || [])

        // Load terms
        const { data: termsData } = await supabase
          .from('terms')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('term_number', { ascending: true })

        setTerms(termsData || [])

        // Load classes
        const { data: classesData } = await supabase
          .from('class_arm_combos')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('class_name', { ascending: true })

        setClasses(classesData || [])
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSessionStats = () => {
    const activeSessions = sessions.filter(s => s.is_active).length
    const totalTerms = terms.length
    const totalClasses = classes.length
    return { activeSessions, totalTerms, totalClasses }
  }

  const stats = getSessionStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading academic data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <StaffHeader
        staffName={user?.full_name || 'School Admin'}
        schoolName={school?.name || 'School'}
        section="Academic Management"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">📚 Academic Management</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm font-semibold">Active Sessions</p>
            <p className="text-4xl font-bold text-purple-600 mt-2">{stats.activeSessions}</p>
            <p className="text-xs text-gray-500 mt-2">Out of {sessions.length} total</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm font-semibold">Total Terms</p>
            <p className="text-4xl font-bold text-indigo-600 mt-2">{stats.totalTerms}</p>
            <p className="text-xs text-gray-500 mt-2">Across all sessions</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm font-semibold">Total Classes</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">{stats.totalClasses}</p>
            <p className="text-xs text-gray-500 mt-2">Class arms and combinations</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          {[
            { id: 'sessions', label: '📅 Sessions' },
            { id: 'terms', label: '📆 Terms' },
            { id: 'classes', label: '🏫 Classes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Academic Sessions</h2>
              <p className="text-sm text-gray-600 mt-1">Manage academic years and sessions</p>
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <p className="text-lg">No sessions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">#</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Session Year</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sessions.map((session, idx) => (
                      <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{idx + 1}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold">{session.session_year}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            session.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.is_active ? '✅ Active' : '⏸️ Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(session.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Terms Tab */}
        {activeTab === 'terms' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Academic Terms</h2>
              <p className="text-sm text-gray-600 mt-1">Manage terms within each session</p>
            </div>

            {terms.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <p className="text-lg">No terms found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {terms.map(term => {
                  const session = sessions.find(s => s.id === term.session_id)
                  return (
                    <div key={term.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{term.term_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          term.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {term.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Term {term.term_number}</span> • {session?.session_year}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Classes & Arms</h2>
              <p className="text-sm text-gray-600 mt-1">All class combinations in the school</p>
            </div>

            {classes.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <p className="text-lg">No classes found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">#</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Class Name</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Arm</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-900">Students</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Form Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {classes.map((cls, idx) => (
                      <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{idx + 1}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold">{cls.class_name}</td>
                        <td className="px-6 py-4 text-gray-600">{cls.arm_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                            {cls.student_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{cls.form_master || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
