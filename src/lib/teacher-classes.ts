import { supabase } from './supabase';

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const { data } = await supabase
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', teacherId);
  return data?.map(tc => tc.class_id) || [];
}

export async function getTeacherClassIdsWithFallback(teacherId: string): Promise<string[]> {
  // Get classes from teacher_classes junction table
  const { data: tcData } = await supabase
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', teacherId);

  const teacherClassIds = tcData?.map(tc => tc.class_id) || [];

  // Also include classes from subjects (backward compatibility)
  const { data: subjData } = await supabase
    .from('subjects')
    .select('class_id')
    .eq('teacher_id', teacherId);

  const subjectClassIds = subjData?.map(s => s.class_id).filter(Boolean) || [];

  // Merge both
  return Array.from(new Set([...teacherClassIds, ...subjectClassIds]));
}
