import { supabase } from './supabase';

/**
 * Active course IDs for a student class (same rules as Learning resources / RLS helper):
 * class-specific topics for that class, plus class-teacher-wide topics (`class_id` null + same teacher).
 */
export async function fetchCourseIdsForStudentClass(classId: string | null): Promise<string[]> {
  if (!classId) return [];
  const { data: classData } = await supabase.from('classes').select('teacher_id').eq('id', classId).maybeSingle();
  const teacherId = classData?.teacher_id ?? null;

  let coursesQuery = supabase.from('courses').select('id').eq('is_active', true);
  if (teacherId) {
    coursesQuery = coursesQuery.or(`class_id.eq.${classId},and(class_id.is.null,teacher_id.eq.${teacherId})`);
  } else {
    coursesQuery = coursesQuery.eq('class_id', classId);
  }
  const { data: courseRows } = await coursesQuery;
  return (courseRows || []).map((c: { id: string }) => c.id);
}
