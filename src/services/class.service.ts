import { supabase } from '@/lib/supabase-client'

export interface Class {
  id: string
  schoolId: string
  name: string
  createdAt: string
}

export interface Arm {
  id: string
  schoolId: string
  name: string
  createdAt: string
}

export class ClassService {
  static async getClasses(schoolId: string): Promise<Class[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)

    if (error) throw error
    return data || []
  }

  static async getArms(schoolId: string): Promise<Arm[]> {
    const { data, error } = await supabase
      .from('arms')
      .select('*')
      .eq('school_id', schoolId)

    if (error) throw error
    return data || []
  }

  static async getClassArmCombos(schoolId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('class_arm_combos')
      .select('id, class_id, arm_id, classes(name), arms(name)')
      .eq('school_id', schoolId)

    if (error) throw error
    return data || []
  }
}
