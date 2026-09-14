import { supabase } from './supabase';

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  if (!teacherId) return [];

  const classIds = new Set<string>();

  // 1. teacher_classes junction table
  const { data: tcData } = await supabase
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', teacherId);
  (tcData || []).forEach(tc => { if (tc.class_id) classIds.add(tc.class_id); });

  // 2. classes where teacher is form_teacher or class_teacher
  const { data: classData } = await supabase
    .from('classes')
    .select('id')
    .or(`form_teacher_id.eq.${teacherId},class_teacher_id.eq.${teacherId}`);
  (classData || []).forEach(c => { if (c.id) classIds.add(c.id); });

  // 3. subjects taught by this teacher
  const { data: subjData } = await supabase
    .from('subjects')
    .select('class_id')
    .eq('teacher_id', teacherId);
  (subjData || []).forEach(s => { if (s.class_id) classIds.add(s.class_id); });

  return Array.from(classIds);
}

export async function getTeacherClassIdsWithFallback(teacherId: string): Promise<string[]> {
  return getTeacherClassIds(teacherId);
}
