/**
 * Admin Dashboard Service
 * Loads school overview data for school admin dashboard
 */

import { supabase } from '@/lib/supabase-client'

export interface AdminDashboardData {
  school_info: {
    name: string
    type: string
    email: string
    phone: string
  }
  statistics: {
    total_students: number
    total_teachers: number
    total_classes: number
    active_exams: number
  }
  recent_registrations: any[]
  class_overview: any[]
}

export class AdminDashboardService {
  /**
   * Get admin dashboard data
   */
  static async getDashboardData(schoolId: string): Promise<AdminDashboardData> {
    try {
      console.log(`📊 Loading admin dashboard data for school ${schoolId}...`)

      // Get school info
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('name, type, email, phone')
        .eq('id', schoolId)
        .single()

      if (schoolError || !school) {
        throw new Error('School not found')
      }

      // Get student count
      const { count: studentCount, error: studentError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)

      if (studentError) console.warn('⚠️ Error counting students:', studentError)

      // Get teacher count
      const { count: teacherCount, error: teacherError } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)

      if (teacherError) console.warn('⚠️ Error counting teachers:', teacherError)

      // Get class count
      const { count: classCount, error: classError } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)

      if (classError) console.warn('⚠️ Error counting classes:', classError)

      // Get active exams count
      const { count: examCount, error: examError } = await supabase
        .from('cbt_exams')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'PUBLISHED')

      if (examError) console.warn('⚠️ Error counting exams:', examError)

      // Get recent registrations (last 10)
      const { data: recentUsers, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          role,
          created_at,
          status
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (usersError) console.warn('⚠️ Error loading recent registrations:', usersError)

      // Get class overview (students per class)
      const { data: classOverview, error: classOverviewError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes(id, name),
          arms(id, name),
          students(id)
        `)
        .eq('school_id', schoolId)
        .limit(20)

      if (classOverviewError) console.warn('⚠️ Error loading class overview:', classOverviewError)

      const classStats = (classOverview || []).map((ca: any) => ({
        id: ca.id,
        class_name: ca.classes?.name || 'Unknown',
        arm_name: ca.arms?.name || 'Unknown',
        student_count: ca.students?.length || 0,
      }))

      console.log('✅ Dashboard data loaded')

      return {
        school_info: school,
        statistics: {
          total_students: studentCount || 0,
          total_teachers: teacherCount || 0,
          total_classes: classCount || 0,
          active_exams: examCount || 0,
        },
        recent_registrations: recentUsers || [],
        class_overview: classStats,
      }
    } catch (err: any) {
      console.error('❌ Error loading dashboard:', err)
      throw err
    }
  }

  /**
   * Get class statistics for school
   */
  static async getClassStatistics(schoolId: string): Promise<any[]> {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          type,
          class_arm_combos(
            id,
            arms(name),
            students(id, user_id, users(full_name))
          )
        `)
        .eq('school_id', schoolId)
        .order('level', { ascending: true })

      if (error) throw error

      return (classes || []).map((cls: any) => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        type: cls.type,
        total_students: (cls.class_arm_combos || []).reduce(
          (sum: number, ca: any) => sum + (ca.students?.length || 0),
          0
        ),
        arms: cls.class_arm_combos?.length || 0,
      }))
    } catch (err: any) {
      console.error('❌ Error loading class statistics:', err)
      throw err
    }
  }

  /**
   * Get subject performance overview
   */
  static async getSubjectPerformance(schoolId: string, termId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('subjects')
        .select(`
          id,
          name,
          code,
          score_sheets(grade, total)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)

      if (termId) {
        query = query.eq('score_sheets.term_id', termId)
      }

      const { data: subjects, error } = await query.limit(50)

      if (error) throw error

      return (subjects || []).map((subject: any) => {
        const scores = (subject.score_sheets || []).filter((s: any) => s.total !== null)
        const totalCount = scores.length
        const averageScore = totalCount > 0 ? Math.round(
          scores.reduce((sum: number, s: any) => sum + (s.total || 0), 0) / totalCount
        ) : 0

        return {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          students_assessed: totalCount,
          average_score: averageScore,
          grade_a_count: scores.filter((s: any) => s.grade === 'A').length,
          grade_b_count: scores.filter((s: any) => s.grade === 'B').length,
          grade_c_count: scores.filter((s: any) => s.grade === 'C').length,
          grade_f_count: scores.filter((s: any) => s.grade === 'F').length,
        }
      })
    } catch (err: any) {
      console.error('❌ Error loading subject performance:', err)
      throw err
    }
  }
}
