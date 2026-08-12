import { supabase } from '@/lib/supabase-client'

export interface Assignment {
  id: string
  schoolId: string
  subjectId: string
  classArmComboId: string
  createdBy: string
  title: string
  description: string
  dueDate: string
  totalMarks: number
  createdAt: string
}

export interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  submittedAt: string
  marks?: number
  feedback?: string
}

export class AssignmentService {
  static async createAssignment(data: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return assignment
  }

  static async getAssignmentsForTeacher(
    schoolId: string,
    subjectId: string,
    classArmComboId: string
  ): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('school_id', schoolId)
      .eq('subject_id', subjectId)
      .eq('class_arm_combo_id', classArmComboId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getAssignmentsForStudent(
    schoolId: string,
    classArmComboId: string
  ): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('school_id', schoolId)
      .eq('class_arm_combo_id', classArmComboId)
      .order('due_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async submitAssignment(
    assignmentId: string,
    studentId: string
  ): Promise<AssignmentSubmission> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({ assignment_id: assignmentId, student_id: studentId, submitted_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async gradeSubmission(
    submissionId: string,
    marks: number,
    feedback: string
  ): Promise<AssignmentSubmission> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ marks, feedback })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
