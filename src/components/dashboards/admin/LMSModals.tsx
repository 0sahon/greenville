import React from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { TERMS, getAcademicYearOptions } from '../../../lib/academicConfig';
import { openLessonPlanPrint } from '../../../lib/lessonPlanPrint';
import type { CourseRow, AssignmentRow, AssignmentType, ClassRow, CourseMaterialRow, SubmissionRow } from '../../../lib/supabase';

// ── Shared types ─────────────────────────────────────────────────────────────

export interface CourseWithClass extends CourseRow {
  classes?: Pick<ClassRow, 'name' | 'level'> | null;
}
export interface TeacherOption {
  id: string; profile_id: string;
  profiles?: { first_name: string; last_name: string } | null;
}
export interface AssignmentWithCourse extends AssignmentRow {
  courses?: { title: string; subject: string } | null;
}
export interface MaterialWithCourse extends CourseMaterialRow {
  courses?: { title: string; subject: string } | null;
}
export interface SubmissionWithDetails extends SubmissionRow {
  assignments?: { title: string; courses?: { subject: string; title: string } | null } | null;
  students?: { student_id: string; profiles?: { first_name: string; last_name: string } | null } | null;
}
export interface LessonPlanAdminRow {
  id: string; course_id: string; teacher_profile_id: string; title: string;
  lesson_date: string | null; objectives: string | null; activities: string | null;
  materials_needed: string | null; differentiation: string | null; assessment: string | null;
  reflection_notes: string | null; status: string; review_note: string | null;
  courses?: { title: string; subject: string } | null;
}

// ── Shared constants ─────────────────────────────────────────────────────────

export const ASSIGNMENT_TYPES: AssignmentType[] = ['homework', 'quiz', 'exam', 'project', 'classwork'];
export const MATERIAL_TYPES = ['document', 'video', 'link', 'image'] as const;
type MaterialType = typeof MATERIAL_TYPES[number];
export const MATERIAL_TYPE_ICONS: Record<MaterialType, string> = { document: '📄', video: '🎬', link: '🔗', image: '🖼️' };
export const DEFAULT_SUBJECTS = [
  'Mathematics', 'English Language', 'Basic Science', 'Social Studies',
  'Cultural & Creative Arts', 'Civic Education', 'Computer Studies',
  'Christian Religious Studies', 'Physical & Health Education',
  'Agricultural Science', 'Home Economics', 'Verbal Reasoning',
  'Quantitative Reasoning', 'French', 'Yoruba', 'Igbo',
];
export const emptyCourseForm   = { subject: '', title: '', description: '', class_id: '', teacher_id: '', term: 'First Term' as string, academic_year: '' };
export const emptyAssignForm   = { course_id: '', title: '', description: '', due_date: '', max_score: '20', type: 'homework' as AssignmentType };
export const emptyMaterialForm = { course_id: '', title: '', type: 'link' as MaterialType, url: '', description: '' };
export const emptyGradeForm    = { score: '', feedback: '', status: 'graded' as string };
export const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  graded: 'bg-green-100 text-green-700',
  returned: 'bg-purple-100 text-purple-700',
  late: 'bg-orange-100 text-orange-700',
};

// ── CourseModal ───────────────────────────────────────────────────────────────

interface CourseModalProps {
  open: boolean;
  editCourse: CourseWithClass | null;
  courseForm: typeof emptyCourseForm;
  setCourseForm: React.Dispatch<React.SetStateAction<typeof emptyCourseForm>>;
  subjectOptions: string[];
  classes: Pick<ClassRow, 'id' | 'name'>[];
  teachers: TeacherOption[];
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function CourseModal({ open, editCourse, courseForm, setCourseForm, subjectOptions, classes, teachers, saving, onSave, onClose }: CourseModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">{editCourse ? 'Edit Topic' : 'Add Topic'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <select value={courseForm.subject} onChange={e => setCourseForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">Select subject…</option>
              {subjectOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Topic / Lesson Title *</label>
            <input value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 3: Basic Algebra" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lesson Notes</label>
            <textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-y" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={courseForm.class_id} onChange={e => setCourseForm(f => ({ ...f, class_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">No class assigned</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
            <select value={courseForm.teacher_id} onChange={e => setCourseForm(f => ({ ...f, teacher_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">No teacher assigned</option>
              {teachers.map(t => <option key={t.id} value={t.profile_id}>{t.profiles?.first_name} {t.profiles?.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
              <select value={courseForm.term} onChange={e => setCourseForm(f => ({ ...f, term: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <select value={courseForm.academic_year} onChange={e => setCourseForm(f => ({ ...f, academic_year: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">{saving ? 'Saving...' : editCourse ? 'Update Topic' : 'Create Topic'}</button>
        </div>
      </div>
    </div>
  );
}

// ── AssignmentModal ───────────────────────────────────────────────────────────

interface AssignmentModalProps {
  open: boolean;
  editAssignment: AssignmentWithCourse | null;
  assignForm: typeof emptyAssignForm;
  setAssignForm: React.Dispatch<React.SetStateAction<typeof emptyAssignForm>>;
  courses: CourseWithClass[];
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function AssignmentModal({ open, editAssignment, assignForm, setAssignForm, courses, saving, onSave, onClose }: AssignmentModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">{editAssignment ? 'Edit Assignment' : 'Add Assignment'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject / Topic *</label>
            <select value={assignForm.course_id} onChange={e => setAssignForm(f => ({ ...f, course_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" disabled={!!editAssignment}>
              <option value="">Select topic…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.subject} – {c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={assignForm.description} onChange={e => setAssignForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={assignForm.type} onChange={e => setAssignForm(f => ({ ...f, type: e.target.value as AssignmentType }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                {ASSIGNMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
              <input type="number" min={1} value={assignForm.max_score} onChange={e => setAssignForm(f => ({ ...f, max_score: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="datetime-local" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">{saving ? 'Saving...' : editAssignment ? 'Update' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

// ── MaterialModal ─────────────────────────────────────────────────────────────

interface MaterialModalProps {
  open: boolean;
  editMaterial: MaterialWithCourse | null;
  materialForm: typeof emptyMaterialForm;
  setMaterialForm: React.Dispatch<React.SetStateAction<typeof emptyMaterialForm>>;
  materialPendingFile: File | null;
  setMaterialPendingFile: (f: File | null) => void;
  materialRemoveStoredFile: boolean;
  setMaterialRemoveStoredFile: (v: boolean) => void;
  materialFileInputRef: React.RefObject<HTMLInputElement>;
  courses: CourseWithClass[];
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function MaterialModal({
  open, editMaterial, materialForm, setMaterialForm,
  materialPendingFile, setMaterialPendingFile,
  materialRemoveStoredFile, setMaterialRemoveStoredFile,
  materialFileInputRef, courses, saving, onSave, onClose,
}: MaterialModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">{editMaterial ? 'Edit Material' : 'Add Material'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Course / Topic *</label>
            <select value={materialForm.course_id} onChange={e => setMaterialForm(f => ({ ...f, course_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" disabled={!!editMaterial}>
              <option value="">Select topic…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.subject} – {c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input value={materialForm.title} onChange={e => setMaterialForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 3 Notes PDF" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={materialForm.type} onChange={e => setMaterialForm(f => ({ ...f, type: e.target.value as typeof materialForm.type }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              {MATERIAL_TYPES.map(t => <option key={t} value={t}>{MATERIAL_TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Upload file (optional)</label>
            <input
              ref={materialFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,image/*"
              className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-pink-50 file:text-pink-700"
              onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setMaterialPendingFile(f);
                if (f) setMaterialRemoveStoredFile(false);
              }}
            />
            {materialPendingFile && <p className="text-[11px] text-gray-500 mt-1">Selected: {materialPendingFile.name}</p>}
            {editMaterial?.file_storage_path && !materialPendingFile && (
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={materialRemoveStoredFile} onChange={e => setMaterialRemoveStoredFile(e.target.checked)} />
                Remove uploaded file from storage
              </label>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL / Link (optional)</label>
            <input value={materialForm.url} onChange={e => setMaterialForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            <p className="text-[11px] text-gray-400 mt-1">Provide a URL, a file, or both.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={materialForm.description} onChange={e => setMaterialForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">{saving ? 'Saving...' : editMaterial ? 'Update' : 'Add Material'}</button>
        </div>
      </div>
    </div>
  );
}

// ── LessonPlanReviewModal ─────────────────────────────────────────────────────

interface LessonPlanReviewModalProps {
  plan: LessonPlanAdminRow | null;
  reviewNote: string;
  setReviewNote: (v: string) => void;
  reviewSaving: boolean;
  teacherName: (profileId: string) => string;
  onSave: (status: 'approved' | 'rejected') => void;
  onClose: () => void;
}

export function LessonPlanReviewModal({ plan, reviewNote, setReviewNote, reviewSaving, teacherName, onSave, onClose }: LessonPlanReviewModalProps) {
  if (!plan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">Lesson plan review</h3>
            <p className="text-xs text-gray-500 mt-0.5">{plan.courses?.subject} · {plan.courses?.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{teacherName(plan.teacher_profile_id)} · Status: {plan.status}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-semibold text-gray-900">{plan.title}</p>
          {plan.lesson_date && <p className="text-xs text-gray-500">Lesson date: {new Date(plan.lesson_date).toLocaleDateString('en-NG')}</p>}
          {([
            ['Objectives', plan.objectives], ['Activities', plan.activities],
            ['Materials', plan.materials_needed], ['Differentiation', plan.differentiation],
            ['Assessment', plan.assessment], ['Reflection', plan.reflection_notes],
          ] as [string, string | null][]).map(([label, val]) => val && (
            <div key={label}>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</p>
              <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100 max-h-40 overflow-y-auto">{val}</div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Feedback to teacher (optional for approval; recommended if rejecting)</label>
            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 p-5 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Close</button>
          {['approved', 'submitted', 'rejected'].includes(plan.status) && (
            <button
              type="button"
              onClick={() => openLessonPlanPrint({
                title: plan.title,
                topicLine: `${plan.courses?.subject ?? ''} · ${plan.courses?.title ?? ''}`,
                lessonDate: plan.lesson_date,
                status: plan.status,
                sections: [
                  { label: 'Objectives', value: plan.objectives },
                  { label: 'Activities', value: plan.activities },
                  { label: 'Materials needed', value: plan.materials_needed },
                  { label: 'Differentiation', value: plan.differentiation },
                  { label: 'Assessment', value: plan.assessment },
                  { label: 'Reflection', value: plan.reflection_notes },
                  { label: 'Admin feedback', value: reviewNote || plan.review_note },
                ],
              })}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 hover:bg-gray-50 inline-flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          )}
          {plan.status === 'submitted' && (
            <>
              <button type="button" onClick={() => onSave('rejected')} disabled={reviewSaving} className="flex-1 py-2.5 border border-red-300 text-red-700 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50">Reject</button>
              <button type="button" onClick={() => onSave('approved')} disabled={reviewSaving} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">{reviewSaving ? 'Saving…' : 'Approve'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── GradeSubmissionModal ──────────────────────────────────────────────────────

interface GradeSubmissionModalProps {
  target: SubmissionWithDetails | null;
  gradeForm: typeof emptyGradeForm;
  setGradeForm: React.Dispatch<React.SetStateAction<typeof emptyGradeForm>>;
  gradeWorkImageUrl: string | null;
  gradeWorkDocUrl: string | null;
  gradingSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function GradeSubmissionModal({ target, gradeForm, setGradeForm, gradeWorkImageUrl, gradeWorkDocUrl, gradingSaving, onSave, onClose }: GradeSubmissionModalProps) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">Grade Submission</h3>
            <p className="text-xs text-gray-500 mt-0.5">{target.students?.profiles?.first_name} {target.students?.profiles?.last_name} · {target.assignments?.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {target.content && (
          <div className="mx-5 mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">Student's submission:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{target.content}</p>
          </div>
        )}
        {target.file_url && (
          <div className="mx-5 mt-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Submitted link</p>
            <a href={target.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{target.file_url}</a>
          </div>
        )}
        {gradeWorkImageUrl && (
          <div className="mx-5 mt-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Photo of student work</p>
            <img src={gradeWorkImageUrl} alt="" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
            <p className="text-[11px] text-gray-400 mt-1">Photo and document files are removed when status is Graded and you save.</p>
          </div>
        )}
        {gradeWorkDocUrl && (
          <div className="mx-5 mt-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Submitted document</p>
            <a href={gradeWorkDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
              <FileText className="w-4 h-4" /> Open or download document
            </a>
          </div>
        )}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Score</label>
              <input type="number" min={0} value={gradeForm.score} onChange={e => setGradeForm(f => ({ ...f, score: e.target.value }))} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={gradeForm.status} onChange={e => setGradeForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option value="graded">Graded</option>
                <option value="returned">Returned</option>
                <option value="submitted">Submitted</option>
                <option value="late">Late</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Feedback to student</label>
            <textarea rows={3} value={gradeForm.feedback} onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))} placeholder="Write feedback…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={gradingSaving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">{gradingSaving ? 'Saving...' : 'Save Grade'}</button>
        </div>
      </div>
    </div>
  );
}
