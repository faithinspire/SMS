/**
 * Teacher Dashboard Service
 * Loads teacher-specific data (classes, subjects, students)
 */

import { supabase } from '@/lib/supabase-client'

export interface TeacherDashboardData {
  teacher_info: {
    name: string
    email: string
    phone: string
    teaching_level: string
  }
  my_classes: any[]
  my_subjects: any[]
  my_students: any[]
  recent_cbt_exams: any[]
}

export class TeacherDashboardService {
  /**
   * Get teacher dashboard data
   */
  static async getDashboardData(userId: string, schoolId: string): Promise<TeacherDashboardData> {
    try {
      console.log(`👨‍🏫 Loading teacher dashboard for ${userId}...`)

      // Get teacher info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          full_name,
          email,
          teachers(phone, teaching_level)
        `)
        .eq('id', userId)
        .single()

      if (userError || !user) {
        throw new Error('Teacher not found')
      }

      const teacherInfo = {
        name: user.full_name,
        email: user.email,
        phone: (user.teachers as any)?.[0]?.phone || 'N/A',
        teaching_level: (user.teachers as any)?.[0]?.teaching_level || 'N/A',
      }

      // Get classes where teacher is class teacher
      const { data: myClasses, error: classesError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes(id, name, level),
          arms(name),
          students(id, user_id, users(full_name))
        `)
        .eq('class_teacher_id', userId)
        .eq('school_id', schoolId)

      if (classesError) console.warn('⚠️ Error loading classes:', classesError)

      const formattedClasses = (myClasses || []).map((ca: any) => ({
        id: ca.id,
        class_name: ca.classes?.name,
        level: ca.classes?.level,
        arm_name: ca.arms?.name,
        student_count: ca.students?.length || 0,
        students: ca.students || [],
      }))

      // Get subjects where teacher teaches
      const { data: mySubjects, error: subjectsError } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          subject_id,
          subjects(id, name, code),
          student_subjects(student_id)
        `)
        .eq('teacher_id', userId)
        .eq('school_id', schoolId)

      if (subjectsError) console.warn('⚠️ Error loading subjects:', subjectsError)

      const formattedSubjects = (mySubjects || []).map((sta: any) => ({
        id: sta.subject_id,
        name: sta.subjects?.name,
        code: sta.subjects?.code,
        student_count: (sta.student_subjects || []).length,
      }))

      // Get all students in my classes
      const myClassIds = formattedClasses.map((c) => c.id)
      let myStudents: any[] = []
      if (myClassIds.length > 0) {
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            user_id,
            users(full_name, email),
            class_arm_combos(
              classes(name),
              arms(name)
            )
          `)
          .in('class_arm_combo_id', myClassIds)
          .limit(50)

        if (studentsError) console.warn('⚠️ Error loading students:', studentsError)
        myStudents = students || []
      }

      // Get recent CBT exams created by teacher
      const { data: recentExams, error: examsError } = await supabase
        .from('cbt_exams')
        .select(`
          id,
          title,
          exam_type,
          status,
          created_at,
          subjects(name),
          class_arm_combos(
            classes(name),
            arms(name)
          )
        `)
        .eq('created_by', userId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (examsError) console.warn('⚠️ Error loading exams:', examsError)

      console.log('✅ Teacher dashboard loaded')

      return {
        teacher_info: teacherInfo,
        my_classes: formattedClasses,
        my_subjects: formattedSubjects,
        my_students: myStudents,
        recent_cbt_exams: recentExams || [],
      }
    } catch (err: any) {
      console.error('❌ Error loading teacher dashboard:', err)
      throw err
    }
  }

  /**
   * Get class details with all students
   */
  static async getClassDetails(classArmComboId: string): Promise<any> {
    try {
      const { data: combo, error } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes(id, name, level, type),
          arms(id, name, capacity),
          students(
            id,
            user_id,
            users(full_name, email),
            student_subjects(
              subject_id,
              subjects(name, code)
            ),
            score_sheets(
              subject_id,
              term_id,
              total,
              grade
            )
          )
        `)
        .eq('id', classArmComboId)
        .single()

      if (error) throw error

      return combo
    } catch (err: any) {
      console.error('❌ Error loading class details:', err)
      throw err
    }
  }

  /**
   * Get subject students (students enrolled in this subject)
   */
  static async getSubjectStudents(subjectId: string, schoolId: string): Promise<any[]> {
    try {
      const { data: students, error } = await supabase
        .from('student_subjects')
        .select(`
          student_id,
          students(
            user_id,
            users(full_name, email),
            class_arm_combos(
              classes(name),
              arms(name)
            ),
            score_sheets(
              subject_id,
              total,
              grade,
              academic_terms(term_name)
            )
          )
        `)
        .eq('subject_id', subjectId)
        .eq('school_id', schoolId)
        .limit(100)

      if (error) throw error

      return students || []
    } catch (err: any) {
      console.error('❌ Error loading subject students:', err)
      throw err
    }
  }

  /**
   * Get teacher's exam submissions (student exams)
   */
  static async getExamSubmissions(examId: string): Promise<any[]> {
    try {
      const { data: submissions, error } = await supabase
        .from('cbt_submissions')
        .select(`
          id,
          student_id,
          students(
            user_id,
            users(full_name)
          ),
          score,
          percentage,
          passed,
          status,
          submitted_at
        `)
        .eq('cbt_exam_id', examId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      return submissions || []
    } catch (err: any) {
      console.error('❌ Error loading exam submissions:', err)
      throw err
    }
  }
}
