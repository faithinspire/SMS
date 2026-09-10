'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

interface ClassResult {
  id: string
  class_name: string
  arm_name: string
  students: StudentResult[]
}

interface StudentResult {
  id: string
  full_name: string
  admission_number: string
  overall_score: number
  performance_rating: string
}

export default function HeadteacherResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassResult[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedClassData, setSelectedClassData] = useState<ClassResult | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'HEAD_TEACHER') {
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

        // Load only PRIMARY school classes
        const { data: classesData } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            classes(id, name, school_level),
            arms(id, name)
          `)
          .eq('school_id', currentUser.school_id)

        // Filter for PRIMARY level only
        const primaryClasses = classesData?.filter(
          (c: any) => c.classes?.school_level === 'PRIMARY'
        ) || []

        // Get results for each class
        const classResults: ClassResult[] = []

        for (const classCombo of primaryClasses) {
          const className = classCombo.classes?.name || 'Class'
          const armName = classCombo.arms?.name || ''
          const fullName = armName ? `${className} ${armName}` : className

          // Get students in this class
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, full_name, admission_number, class_arm_combo_id')
            .eq('class_arm_combo_id', classCombo.id)

          // Get results for these students
          const studentResults: StudentResult[] = []

          for (const student of studentsData || []) {
            // Get average score from result_entries
            const { data: resultsData } = await supabase
              .from('result_entries')
              .select('score')
              .eq('student_id', student.id)

            const scores = resultsData?.map(r => r.score).filter(s => s !== null) || []
            const avgScore = scores.length > 0 
              ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
              : 0

            // Determine performance rating
            let rating = 'Fair'
            if (avgScore >= 85) rating = 'Excellent'
            else if (avgScore >= 75) rating = 'Very Good'
            else if (avgScore >= 65) rating = 'Good'
            else if (avgScore >= 50) rating = 'Fair'
            else rating = 'Needs Improvement'

            studentResults.push({
              id: student.id,
              full_name: student.full_name,
              admission_number: student.admission_number,
              overall_score: avgScore,
              performance_rating: rating,
            })
          }

          classResults.push({
            id: classCombo.id,
            class_name: className,
            arm_name: armName,
            students: studentResults,
          })
        }

        setClasses(classResults)
        if (classResults.length > 0) {
          setSelectedClass(classResults[0].id)
          setSelectedClassData(classResults[0])
        }
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-green-100 text-green-800'
      case 'Very Good':
        return 'bg-blue-100 text-blue-800'
      case 'Good':
        return 'bg-yellow-100 text-yellow-800'
      case 'Fair':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <StaffHeader
        staffName={user?.full_name || 'Head Teacher'}
        schoolName={school?.name || 'School'}
        section="Student Results (Primary Level)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">📊 Primary School Results</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Classes List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white px-4 sm:px-6 py-4">
                <h2 className="text-lg sm:text-xl font-bold">Classes</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">
                    <p className="text-sm">No primary classes found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setSelectedClass(cls.id)
                          setSelectedClassData(cls)
                        }}
                        className={`w-full text-left p-4 hover:bg-blue-50 transition-colors border-l-4 text-sm sm:text-base ${
                          selectedClass === cls.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <h3 className="font-bold text-gray-900">
                          {cls.class_name} {cls.arm_name}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          👥 {cls.students.length} students
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-3">
            {selectedClassData ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 py-4">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {selectedClassData.class_name} {selectedClassData.arm_name}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-1">
                    👥 {selectedClassData.students.length} Students Enrolled
                  </p>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm sm:text-base">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">#</th>
                        <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                        <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden sm:table-cell">Admission</th>
                        <th className="px-3 sm:px-6 py-3 text-center font-semibold text-gray-900">Score</th>
                        <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedClassData.students.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                            No results available
                          </td>
                        </tr>
                      ) : (
                        selectedClassData.students.map((student, idx) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-4 text-gray-900 font-medium">{idx + 1}</td>
                            <td className="px-3 sm:px-6 py-4 text-gray-900 font-medium truncate">{student.full_name}</td>
                            <td className="px-3 sm:px-6 py-4 text-gray-600 hidden sm:table-cell text-sm">{student.admission_number}</td>
                            <td className="px-3 sm:px-6 py-4 text-center font-bold text-lg text-blue-600">
                              {student.overall_score.toFixed(1)}
                            </td>
                            <td className="px-3 sm:px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${getRatingColor(student.performance_rating)}`}>
                                {student.performance_rating}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                {selectedClassData.students.length > 0 && (
                  <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Students</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedClassData.students.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Average Score</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {(selectedClassData.students.reduce((a, b) => a + b.overall_score, 0) / selectedClassData.students.length).toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Highest Score</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.max(...selectedClassData.students.map(s => s.overall_score)).toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Lowest Score</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {Math.min(...selectedClassData.students.map(s => s.overall_score)).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600">Select a class to view results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
