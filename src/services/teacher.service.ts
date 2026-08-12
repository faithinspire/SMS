import { supabase } from '@/lib/supabase-client'

export interface Teacher {
  id: string
  userId: string
  schoolId: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
}

export class TeacherService {
  static async registerTeacher(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return teacher
  }

  static async assignSubjects(
    teacherId: string,
    schoolId: string,
    assignments: Array<{ subjectId: string; classArmComboId: string }>
  ): Promise<void> {
    const records = assignments.map((a) => ({
      teacher_id: teacherId,
      subject_id: a.subjectId,
      class_arm_combo_id: a.classArmComboId,
      school_id: schoolId,
    }))

    const { error } = await supabase.from('subject_teacher_assignments').insert(records)
    if (error) throw error
  }

  static async getTeacherDashboard(teacherId: string, schoolId: string): Promise<any> {
    try {
      // Get classes managed by this teacher
      const { data: managedClasses, error: classError } = await supabase
        .from('student_class_teachers')
        .select(
          `
          class_arm_combo_id,
          class_arm_combos (
            id,
            classes (id, name, code),
            arms (id, name)
          )
        `
        )
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (classError) throw classError

      // Get unique class-arm combos
      const uniqueClasses = Array.from(
        new Map(
          (managedClasses || []).map((item: any) => [
            item.class_arm_combo_id,
            item.class_arm_combos,
          ])
        ).values()
      )

      // Get subjects taught by this teacher with complete data
      const { data: taughtSubjects, error: subjectError } = await supabase
        .from('subject_teacher_assignments')
        .select(
          `
          id,
          subject_id,
          class_arm_combo_id,
          subjects (id, name, code),
          class_arm_combos (
            id,
            classes (id, name, code),
            arms (id, name)
          )
        `
        )
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (subjectError) throw subjectError

      // Calculate stats
      const classStudentCount = managedClasses?.length || 0
      const subjectStudentCount = (taughtSubjects || []).length
      const totalStudents = classStudentCount + subjectStudentCount
      const classesManaged = uniqueClasses.length
      const subjectsTaught = new Set((taughtSubjects || []).map((s: any) => s.subject_id)).size

      return {
        managedClasses: uniqueClasses || [],
        taughtSubjects: taughtSubjects || [],
        classStudents: managedClasses || [],
        stats: {
          classStudentCount,
          subjectStudentCount,
          totalStudents,
          classesManaged,
          subjectsTaught,
        },
      }
    } catch (error) {
      console.error('Error loading teacher dashboard:', error)
      throw error
    }
  }

  static async getClassStudents(classArmComboId: string, schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('student_class_teachers')
        .select(
          `
          id,
          student_id,
          class_arm_combo_id,
          users:student_id (
            id,
            full_name,
            email,
            photo_url
          ),
          admission_number,
          student_subjects (
            id,
            subject_id
          )
        `
        )
        .eq('class_arm_combo_id', classArmComboId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading class students:', error)
      throw error
    }
  }

  static async getSubjectStudents(
    subjectId: string,
    teacherId: string,
    schoolId: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('student_subjects')
        .select(
          `
          id,
          student_id,
          subject_id,
          users:student_id (
            id,
            full_name,
            email,
            photo_url
          ),
          admission_number,
          class_arm_combo_id,
          class_arm_combos (
            id,
            classes (id, name, code),
            arms (id, name)
          )
        `
        )
        .eq('subject_id', subjectId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading subject students:', error)
      throw error
    }
  }
}
