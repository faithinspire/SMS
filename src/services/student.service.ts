import { supabase } from '@/lib/supabase-client'

export interface Student {
  id: string
  userId: string
  schoolId: string
  admissionNumber: string
  firstName: string
  lastName: string
  email: string
  classArmComboId: string
  photoUrl?: string
  createdAt: string
}

export class StudentService {
  static async registerStudent(data: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    const { data: student, error } = await supabase
      .from('students')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error

    // Auto-link to class teacher
    await this.linkStudentToClassTeacher(student.id, student.school_id, student.class_arm_combo_id)

    return student
  }

  static async linkStudentToClassTeacher(
    studentId: string,
    schoolId: string,
    classArmComboId: string
  ): Promise<void> {
    const { data: classTeacher, error: fetchError } = await supabase
      .from('class_teachers')
      .select('teacher_id')
      .eq('school_id', schoolId)
      .eq('class_arm_combo_id', classArmComboId)
      .single()

    if (!fetchError && classTeacher) {
      await supabase.from('student_class_teachers').insert({
        student_id: studentId,
        teacher_id: classTeacher.teacher_id,
        school_id: schoolId,
      })
    }
  }

  static async linkStudentToSubjectTeachers(
    studentId: string,
    schoolId: string,
    classArmComboId: string,
    subjectIds: string[]
  ): Promise<void> {
    for (const subjectId of subjectIds) {
      const { data: teachers, error } = await supabase
        .from('subject_teacher_assignments')
        .select('teacher_id')
        .eq('school_id', schoolId)
        .eq('subject_id', subjectId)
        .eq('class_arm_combo_id', classArmComboId)

      if (!error && teachers) {
        const links = teachers.map((t) => ({
          student_id: studentId,
          teacher_id: t.teacher_id,
          subject_id: subjectId,
          school_id: schoolId,
        }))

        await supabase.from('student_subject_teachers').insert(links)
      }
    }
  }

  static async getStudent(studentId: string): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (error) throw error
    return data
  }
}
