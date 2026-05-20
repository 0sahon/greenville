import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// DB enums (match PostgreSQL enums)
export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';
export type ClassLevel = 'creche' | 'toddler' | 'basic1' | 'basic2' | 'basic3' | 'basic4' | 'basic5' | 'basic6';
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EventType = 'holiday' | 'exam' | 'meeting' | 'sports' | 'cultural' | 'general';
export type AssignmentType = 'homework' | 'quiz' | 'exam' | 'project' | 'classwork';
export type StudentGender = 'male' | 'female';

/** `lesson_plans.status` — CHECK in `20260418140000_lesson_plans.sql` */
export type LessonPlanStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
/** `submissions.status` — CHECK in `20260415120000_school_management_system.sql` */
export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'late';
/** `course_materials.type` — DEFAULT / CHECK on `course_materials` */
export type CourseMaterialType = 'document' | 'video' | 'link' | 'image';

export type {
  AdmissionApplicationStatus,
  CbtMcqOption,
  Json,
  MessageTargetRole,
} from './database.types';

// Convenience row types
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type StudentRow = Database['public']['Tables']['students']['Row'];
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type StudentUpdate = Database['public']['Tables']['students']['Update'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type ClassInsert = Database['public']['Tables']['classes']['Insert'];
export type ClassUpdate = Database['public']['Tables']['classes']['Update'];
export type TeacherRow = Database['public']['Tables']['teachers']['Row'];
export type TeacherInsert = Database['public']['Tables']['teachers']['Insert'];
export type TeacherUpdate = Database['public']['Tables']['teachers']['Update'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];
export type GradeRow = Database['public']['Tables']['grades']['Row'];
export type GradeInsert = Database['public']['Tables']['grades']['Insert'];
export type FeeRow = Database['public']['Tables']['fees']['Row'];
export type FeeInsert = Database['public']['Tables']['fees']['Insert'];
export type FeeUpdate = Database['public']['Tables']['fees']['Update'];
export type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];
export type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert'];
export type CourseRow = Database['public']['Tables']['courses']['Row'];
export type CourseInsert = Database['public']['Tables']['courses']['Insert'];
export type AssignmentRow = Database['public']['Tables']['assignments']['Row'];
export type AssignmentInsert = Database['public']['Tables']['assignments']['Insert'];
export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];
export type SubmissionRow = Database['public']['Tables']['submissions']['Row'];
export type SubmissionInsert = Database['public']['Tables']['submissions']['Insert'];
export type SubmissionUpdate = Database['public']['Tables']['submissions']['Update'];
export type CourseMaterialRow = Database['public']['Tables']['course_materials']['Row'];
export type CourseMaterialInsert = Database['public']['Tables']['course_materials']['Insert'];
export type CourseMaterialUpdate = Database['public']['Tables']['course_materials']['Update'];
export type LessonPlanRow = Database['public']['Tables']['lesson_plans']['Row'];
export type LessonPlanInsert = Database['public']['Tables']['lesson_plans']['Insert'];
export type LessonPlanUpdate = Database['public']['Tables']['lesson_plans']['Update'];
export type ParentRow = Database['public']['Tables']['parents']['Row'];
export type ParentInsert = Database['public']['Tables']['parents']['Insert'];
export type StudentParentRow = Database['public']['Tables']['student_parents']['Row'];
export type HealthRecordRow = Database['public']['Tables']['health_records']['Row'];
export type HealthRecordInsert = Database['public']['Tables']['health_records']['Insert'];
export type HealthRecordUpdate = Database['public']['Tables']['health_records']['Update'];
export type TransportRow = Database['public']['Tables']['transport']['Row'];
export type TransportInsert = Database['public']['Tables']['transport']['Insert'];
export type TransportUpdate = Database['public']['Tables']['transport']['Update'];
export type ResultSheetRow = Database['public']['Tables']['result_sheets']['Row'];
export type ResultSheetInsert = Database['public']['Tables']['result_sheets']['Insert'];
export type ResultSheetUpdate = Database['public']['Tables']['result_sheets']['Update'];
export type SubjectRow = Database['public']['Tables']['subjects']['Row'];
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];
export type SubjectUpdate = Database['public']['Tables']['subjects']['Update'];
export type FeeTemplateRow = Database['public']['Tables']['fee_templates']['Row'];
export type FeeTemplateInsert = Database['public']['Tables']['fee_templates']['Insert'];
export type FeeTemplateUpdate = Database['public']['Tables']['fee_templates']['Update'];
export type SchoolSettingsRow = Database['public']['Tables']['school_settings']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type TimetableRow = Database['public']['Tables']['timetable']['Row'];
export type TimetableInsert = Database['public']['Tables']['timetable']['Insert'];
export type CbtExamRow = Database['public']['Tables']['cbt_exams']['Row'];
export type CbtExamInsert = Database['public']['Tables']['cbt_exams']['Insert'];
export type CbtExamUpdate = Database['public']['Tables']['cbt_exams']['Update'];
export type CbtQuestionRow = Database['public']['Tables']['cbt_questions']['Row'];
export type CbtQuestionInsert = Database['public']['Tables']['cbt_questions']['Insert'];
export type CbtQuestionUpdate = Database['public']['Tables']['cbt_questions']['Update'];
export type CbtSessionRow = Database['public']['Tables']['cbt_sessions']['Row'];
export type CbtSessionInsert = Database['public']['Tables']['cbt_sessions']['Insert'];
export type CbtAnswerRow = Database['public']['Tables']['cbt_answers']['Row'];
export type CbtAnswerInsert = Database['public']['Tables']['cbt_answers']['Insert'];
export type AdmissionApplicationRow = Database['public']['Tables']['admission_applications']['Row'];
export type AdmissionApplicationInsert = Database['public']['Tables']['admission_applications']['Insert'];
export type AdmissionApplicationUpdate = Database['public']['Tables']['admission_applications']['Update'];
export type AuditEventRow = Database['public']['Tables']['audit_events']['Row'];
export type AuditEventInsert = Database['public']['Tables']['audit_events']['Insert'];
export type InAppNotificationRow = Database['public']['Tables']['in_app_notifications']['Row'];
export type InAppNotificationInsert = Database['public']['Tables']['in_app_notifications']['Insert'];
export type InAppNotificationUpdate = Database['public']['Tables']['in_app_notifications']['Update'];

// Common relation shapes (for selects with embedded relations)
export interface ProfileBasic {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string | null;
}
export interface ClassBasic {
  name: string;
  level: ClassLevel;
}
export interface StudentWithProfileAndClass extends StudentRow {
  profiles: ProfileBasic | null;
  classes: ClassBasic | null;
}