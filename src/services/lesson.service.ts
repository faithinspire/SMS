import { supabase } from '@/lib/supabase-client'

export interface LessonNote {
  id: string
  schoolId: string
  subjectId: string
  classArmComboId: string
  createdBy: string
  title: string
  content: string
  publishedAt?: string
  createdAt: string
}

export class LessonService {
  static async createLessonNote(data: Omit<LessonNote, 'id' | 'createdAt'>): Promise<LessonNote> {
    const { data: lesson, error } = await supabase
      .from('lesson_notes')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return lesson
  }

  static async getLessonNotesForTeacher(
    schoolId: string,
    subjectId: string,
    classArmComboId: string
  ): Promise<LessonNote[]> {
    const { data, error } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('subject_id', subjectId)
      .eq('class_arm_combo_id', classArmComboId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getLessonNotesForStudent(
    schoolId: string,
    subjectId: string
  ): Promise<LessonNote[]> {
    const { data, error } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('subject_id', subjectId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async publishLesson(lessonId: string, schoolId: string): Promise<LessonNote> {
    const { data, error } = await supabase
      .from('lesson_notes')
      .update({ published_at: new Date().toISOString() })
      .eq('id', lessonId)
      .eq('school_id', schoolId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
