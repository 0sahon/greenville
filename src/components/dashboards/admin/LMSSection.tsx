import { useState, useEffect, useRef } from 'react';
import { Monitor, BookOpen, FileText, Plus, X, Search, Edit2, Trash2, Paperclip, ClipboardCheck, ExternalLink, CheckCircle, ClipboardList } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createSubmissionWorkSignedUrl, removeSubmissionWorkObjects } from '../../../lib/submissionWorkStorage';
import { appStorageFrom, COURSE_MATERIALS_BUCKET } from '../../../lib/storageBuckets';
import {
  classMaterialObjectPath,
  createClassMaterialSignedUrl,
  removeClassMaterialObject,
} from '../../../lib/classMaterialStorage';
import { getDefaultAcademicYear } from '../../../lib/academicConfig';
import type { ProfileRow, CourseInsert, AssignmentInsert, AssignmentType, ClassRow } from '../../../lib/supabase';
import {
  CourseModal, AssignmentModal, MaterialModal, LessonPlanReviewModal, GradeSubmissionModal,
  emptyCourseForm, emptyAssignForm, emptyMaterialForm, emptyGradeForm,
  DEFAULT_SUBJECTS, SUBMISSION_STATUS_COLORS,
  type CourseWithClass, type TeacherOption, type AssignmentWithCourse,
  type MaterialWithCourse, type SubmissionWithDetails, type LessonPlanAdminRow,
} from './LMSModals';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

type TabType = 'courses' | 'assignments' | 'materials' | 'submissions' | 'lessonplans';

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function LMSSection({ profile }: Props) {
  const [courses, setCourses] = useState<CourseWithClass[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithCourse[]>([]);
  const [materials, setMaterials] = useState<MaterialWithCourse[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlanAdminRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('courses');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  // Course modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editCourse, setEditCourse] = useState<CourseWithClass | null>(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [deleteCourse, setDeleteCourse] = useState<CourseWithClass | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editAssignment, setEditAssignment] = useState<AssignmentWithCourse | null>(null);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [deleteAssignment, setDeleteAssignment] = useState<AssignmentWithCourse | null>(null);
  const [deletingAssign, setDeletingAssign] = useState(false);

  // Material modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialWithCourse | null>(null);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [deleteMaterial, setDeleteMaterial] = useState<MaterialWithCourse | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);
  const [materialPendingFile, setMaterialPendingFile] = useState<File | null>(null);
  const [materialRemoveStoredFile, setMaterialRemoveStoredFile] = useState(false);
  const [materialFileUrls, setMaterialFileUrls] = useState<Record<string, string>>({});
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  // Submission grading
  const [gradeTarget, setGradeTarget] = useState<SubmissionWithDetails | null>(null);
  const [gradeForm, setGradeForm] = useState(emptyGradeForm);
  const [gradingSaving, setGradingSaving] = useState(false);
  const [gradeWorkImageUrl, setGradeWorkImageUrl] = useState<string | null>(null);
  const [gradeWorkDocUrl, setGradeWorkDocUrl] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [reviewPlan, setReviewPlan] = useState<LessonPlanAdminRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    try {
      const t = sessionStorage.getItem('admin-lms-tab');
      if (t === 'lessonplans') {
        setTab('lessonplans');
        sessionStorage.removeItem('admin-lms-tab');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setGradeWorkImageUrl(null);
      setGradeWorkDocUrl(null);
      const pi = gradeTarget?.work_image_path;
      const pd = gradeTarget?.work_document_path;
      if (pi) {
        const url = await createSubmissionWorkSignedUrl(supabase, pi);
        if (alive) setGradeWorkImageUrl(url);
      }
      if (pd) {
        const url = await createSubmissionWorkSignedUrl(supabase, pd);
        if (alive) setGradeWorkDocUrl(url);
      }
    })();
    return () => {
      alive = false;
    };
  }, [gradeTarget?.work_image_path, gradeTarget?.work_document_path]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const withPath = materials.filter(m => m.file_storage_path);
      const entries = await Promise.all(
        withPath.map(async m => {
          const u = await createClassMaterialSignedUrl(supabase, m.file_storage_path);
          return [m.id, u] as const;
        })
      );
      if (!alive) return;
      setMaterialFileUrls(Object.fromEntries(entries.filter(([, u]) => !!u) as [string, string][]));
    })();
    return () => {
      alive = false;
    };
  }, [materials]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: courseData }, { data: assignData }, { data: teacherData }, { data: classData }, { data: subRows }, { data: matData }, { data: subData }, { data: planData }] = await Promise.all([
        supabase.from('courses').select('*, classes:class_id(name, level)').eq('is_active', true).order('subject').order('created_at', { ascending: false }),
        supabase.from('assignments').select('*, courses:course_id(title, subject)').order('created_at', { ascending: false }).limit(100),
        supabase.from('teachers').select('id, profile_id, profiles:profile_id(first_name, last_name)').eq('is_active', true),
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('name').eq('is_active', true).order('name'),
        supabase.from('course_materials').select('*, courses:course_id(title, subject)').order('created_at', { ascending: false }),
        supabase.from('submissions').select('*, assignments:assignment_id(title, courses:course_id(subject, title)), students:student_id(student_id, profiles:profile_id(first_name, last_name))').order('submitted_at', { ascending: false }).limit(200),
        supabase.from('lesson_plans').select('*, courses:course_id(title, subject)').order('created_at', { ascending: false }).limit(400),
      ]);
      setCourses((courseData || []) as CourseWithClass[]);
      setAssignments((assignData || []) as AssignmentWithCourse[]);
      setTeachers((teacherData || []) as unknown as TeacherOption[]);
      setClasses((classData || []) as Pick<ClassRow, 'id' | 'name'>[]);
      if (subRows && subRows.length > 0) setSubjectOptions([...new Set((subRows as { name: string }[]).map(s => s.name))]);
      setMaterials((matData || []) as MaterialWithCourse[]);
      setSubmissions((subData || []) as unknown as SubmissionWithDetails[]);
      setLessonPlans((planData || []) as LessonPlanAdminRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredCourses = courses.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()));
  const filteredAssignments = assignments.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));
  const filteredMaterials = materials.filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.courses?.subject || '').toLowerCase().includes(search.toLowerCase()));
  const filteredSubmissions = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.students?.profiles?.first_name || '').toLowerCase().includes(q) || (s.students?.profiles?.last_name || '').toLowerCase().includes(q) || (s.assignments?.title || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  });
  const filteredLessonPlans = lessonPlans.filter(p => {
    const q = search.toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || (p.courses?.subject || '').toLowerCase().includes(q) || (p.courses?.title || '').toLowerCase().includes(q);
  });
  const teacherName = (profileId: string) => {
    const t = teachers.find(x => x.profile_id === profileId);
    const fn = t?.profiles?.first_name || '';
    const ln = t?.profiles?.last_name || '';
    const n = `${fn} ${ln}`.trim();
    return n || 'Teacher';
  };

  const savePlanReview = async (status: 'approved' | 'rejected') => {
    if (!reviewPlan) return;
    setReviewSaving(true);
    try {
      const { error } = await supabase.from('lesson_plans').update({
        status,
        review_note: reviewNote.trim() || null,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', reviewPlan.id);
      if (error) throw error;
      setToast({ msg: status === 'approved' ? 'Lesson plan approved' : 'Returned to teacher with feedback', type: 'success' });
      setReviewPlan(null);
      setReviewNote('');
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Update failed', type: 'error' });
    }
    setReviewSaving(false);
  };

  // ── Course CRUD ──────────────────────────────────────────────────────────
  const openAddCourse = () => { setEditCourse(null); setCourseForm({ ...emptyCourseForm, academic_year: getDefaultAcademicYear() }); setShowCourseModal(true); };
  const openEditCourse = (c: CourseWithClass) => {
    setEditCourse(c);
    setCourseForm({ subject: c.subject, title: c.title, description: c.description || '', class_id: c.class_id || '', teacher_id: c.teacher_id || '', term: c.term, academic_year: c.academic_year });
    setShowCourseModal(true);
  };
  const saveCourse = async () => {
    if (!courseForm.subject.trim() || !courseForm.title.trim()) return setToast({ msg: 'Subject and title are required', type: 'error' });
    setSaving(true);
    try {
      if (editCourse) {
        await supabase.from('courses').update({ subject: courseForm.subject.trim(), title: courseForm.title.trim(), description: courseForm.description.trim() || null, class_id: courseForm.class_id || null, teacher_id: courseForm.teacher_id || null, term: courseForm.term, academic_year: courseForm.academic_year }).eq('id', editCourse.id);
        setToast({ msg: 'Course updated', type: 'success' });
      } else {
        const payload: CourseInsert = { subject: courseForm.subject.trim(), title: courseForm.title.trim(), description: courseForm.description.trim() || null, class_id: courseForm.class_id || null, teacher_id: courseForm.teacher_id || null, term: courseForm.term, academic_year: courseForm.academic_year };
        await supabase.from('courses').insert(payload);
        setToast({ msg: 'Course created', type: 'success' });
      }
      setShowCourseModal(false); fetchData();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Failed to save course', type: 'error' }); }
    setSaving(false);
  };
  const confirmDeleteCourse = async () => {
    if (!deleteCourse) return;
    setDeletingCourse(true);
    try {
      await supabase.from('courses').update({ is_active: false }).eq('id', deleteCourse.id);
      setToast({ msg: 'Course removed', type: 'success' }); setDeleteCourse(null); fetchData();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' }); }
    setDeletingCourse(false);
  };

  // ── Assignment CRUD ──────────────────────────────────────────────────────
  const openAddAssign = () => { setEditAssignment(null); setAssignForm(emptyAssignForm); setShowAssignModal(true); };
  const openEditAssign = (a: AssignmentWithCourse) => {
    setEditAssignment(a);
    setAssignForm({ course_id: a.course_id, title: a.title, description: a.description || '', due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '', max_score: String(a.max_score ?? 100), type: a.type });
    setShowAssignModal(true);
  };
  const saveAssignment = async () => {
    if (!assignForm.course_id || !assignForm.title.trim()) return setToast({ msg: 'Course and title are required', type: 'error' });
    setSaving(true);
    try {
      if (editAssignment) {
        await supabase.from('assignments').update({ title: assignForm.title.trim(), description: assignForm.description.trim() || null, due_date: assignForm.due_date ? new Date(assignForm.due_date).toISOString() : null, max_score: parseFloat(assignForm.max_score) || 100, type: assignForm.type }).eq('id', editAssignment.id);
        setToast({ msg: 'Assignment updated', type: 'success' });
      } else {
        const payload: AssignmentInsert = { course_id: assignForm.course_id, title: assignForm.title.trim(), description: assignForm.description.trim() || null, due_date: assignForm.due_date ? new Date(assignForm.due_date).toISOString() : null, max_score: parseFloat(assignForm.max_score) || 100, type: assignForm.type, created_by: profile.id };
        await supabase.from('assignments').insert(payload);
        setToast({ msg: 'Assignment created', type: 'success' });
      }
      setShowAssignModal(false); fetchData();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Failed to save assignment', type: 'error' }); }
    setSaving(false);
  };
  const confirmDeleteAssignment = async () => {
    if (!deleteAssignment) return;
    setDeletingAssign(true);
    try {
      await supabase.from('assignments').delete().eq('id', deleteAssignment.id);
      setToast({ msg: 'Assignment deleted', type: 'success' }); setDeleteAssignment(null); fetchData();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' }); }
    setDeletingAssign(false);
  };

  // ── Material CRUD ────────────────────────────────────────────────────────
  const openAddMaterial = () => {
    setEditMaterial(null);
    setMaterialForm(emptyMaterialForm);
    setMaterialPendingFile(null);
    setMaterialRemoveStoredFile(false);
    if (materialFileInputRef.current) materialFileInputRef.current.value = '';
    setShowMaterialModal(true);
  };
  const openEditMaterial = (m: MaterialWithCourse) => {
    setEditMaterial(m);
    setMaterialForm({ course_id: m.course_id || '', title: m.title, type: (m.type as MaterialType) || 'link', url: m.url || '', description: m.description || '' });
    setMaterialPendingFile(null);
    setMaterialRemoveStoredFile(false);
    if (materialFileInputRef.current) materialFileInputRef.current.value = '';
    setShowMaterialModal(true);
  };
  const saveMaterial = async () => {
    if (!materialForm.course_id || !materialForm.title.trim()) return setToast({ msg: 'Course and title are required', type: 'error' });
    const urlTrim = materialForm.url.trim() || null;
    const keptFile = !!(editMaterial?.file_storage_path && !materialRemoveStoredFile);
    if (!urlTrim && !materialPendingFile && !keptFile) {
      setToast({ msg: 'Add a URL or upload a file', type: 'error' });
      return;
    }
    setSaving(true);
    let newUploadPath: string | null = null;
    const previousStoredPath = editMaterial?.file_storage_path ?? null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUid = session?.user?.id;
      if (!authUid) throw new Error('Not signed in');

      let filePath: string | null = editMaterial?.file_storage_path ?? null;
      if (materialRemoveStoredFile && !materialPendingFile) filePath = null;

      if (materialPendingFile) {
        const objectId = crypto.randomUUID();
        const path = classMaterialObjectPath(authUid, materialForm.course_id, objectId);
        const { error: upErr } = await appStorageFrom(supabase, COURSE_MATERIALS_BUCKET).upload(
          path,
          materialPendingFile,
          {
            contentType: materialPendingFile.type || undefined,
            upsert: false,
          }
        );
        if (upErr) throw upErr;
        newUploadPath = path;
        filePath = path;
      }

      if (editMaterial) {
        const { error } = await supabase.from('course_materials').update({
          title: materialForm.title.trim(),
          type: materialForm.type,
          url: urlTrim,
          file_storage_path: filePath,
          description: materialForm.description.trim() || null,
        }).eq('id', editMaterial.id);
        if (error) throw error;
        if (materialPendingFile && previousStoredPath && previousStoredPath !== newUploadPath) {
          await removeClassMaterialObject(supabase, previousStoredPath);
        }
        if (materialRemoveStoredFile && previousStoredPath && !materialPendingFile) {
          await removeClassMaterialObject(supabase, previousStoredPath);
        }
        setToast({ msg: 'Material updated', type: 'success' });
      } else {
        const { error } = await supabase.from('course_materials').insert({
          course_id: materialForm.course_id,
          title: materialForm.title.trim(),
          type: materialForm.type,
          url: urlTrim,
          file_storage_path: filePath,
          description: materialForm.description.trim() || null,
          uploaded_by: profile.id,
        });
        if (error) throw error;
        setToast({ msg: 'Material added', type: 'success' });
      }
      setShowMaterialModal(false);
      setMaterialPendingFile(null);
      setMaterialRemoveStoredFile(false);
      if (materialFileInputRef.current) materialFileInputRef.current.value = '';
      fetchData();
    } catch (e: unknown) {
      if (newUploadPath) await removeClassMaterialObject(supabase, newUploadPath);
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save material', type: 'error' });
    }
    setSaving(false);
  };
  const confirmDeleteMaterial = async () => {
    if (!deleteMaterial) return;
    setDeletingMaterial(true);
    try {
      if (deleteMaterial.file_storage_path) {
        await removeClassMaterialObject(supabase, deleteMaterial.file_storage_path);
      }
      await supabase.from('course_materials').delete().eq('id', deleteMaterial.id);
      setToast({ msg: 'Material deleted', type: 'success' });
      setDeleteMaterial(null);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
    setDeletingMaterial(false);
  };

  // ── Submission Grading ───────────────────────────────────────────────────
  const openGrade = (s: SubmissionWithDetails) => {
    setGradeTarget(s);
    setGradeForm({ score: String(s.score ?? ''), feedback: s.feedback || '', status: s.status || 'graded' });
  };
  const saveGrade = async () => {
    if (!gradeTarget) return;
    setGradingSaving(true);
    try {
      const pathToDelete = gradeTarget.work_image_path ?? null;
      const docPathToDelete = gradeTarget.work_document_path ?? null;
      const stripFiles = gradeForm.status === 'graded' && (!!pathToDelete || !!docPathToDelete);
      const { error } = await supabase.from('submissions').update({
        score: gradeForm.score ? parseFloat(gradeForm.score) : null,
        feedback: gradeForm.feedback.trim() || null,
        status: gradeForm.status,
        graded_by: profile.id,
        graded_at: new Date().toISOString(),
      }).eq('id', gradeTarget.id);
      if (error) throw error;
      if (stripFiles) {
        const patch: { work_image_path?: null; work_document_path?: null } = {};
        if (pathToDelete) patch.work_image_path = null;
        if (docPathToDelete) patch.work_document_path = null;
        const { error: clearErr } = await supabase.from('submissions').update(patch).eq('id', gradeTarget.id);
        if (clearErr) throw clearErr;
        await removeSubmissionWorkObjects(supabase, [pathToDelete, docPathToDelete]);
      }
      setToast({ msg: 'Submission graded', type: 'success' });
      setGradeTarget(null);
      fetchData();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Grading failed', type: 'error' }); }
    setGradingSaving(false);
  };

  const TABS: { key: TabType; label: string; icon: typeof BookOpen; count?: number }[] = [
    { key: 'courses', label: 'Topics', icon: BookOpen, count: courses.length },
    { key: 'assignments', label: 'Assignments', icon: FileText, count: assignments.length },
    { key: 'materials', label: 'Materials', icon: Paperclip, count: materials.length },
    { key: 'submissions', label: 'Submissions', icon: ClipboardCheck, count: submissions.length },
    { key: 'lessonplans', label: 'Lesson plans', icon: ClipboardList, count: lessonPlans.filter(p => p.status === 'submitted').length },
  ];

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">LMS – Learning Management</h2>
        <div className="flex gap-2">
          {tab === 'courses' && <button onClick={openAddCourse} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"><Plus className="w-4 h-4" /> Add Topic</button>}
          {tab === 'assignments' && <button onClick={openAddAssign} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"><Plus className="w-4 h-4" /> Add Assignment</button>}
          {tab === 'materials' && <button onClick={openAddMaterial} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"><Plus className="w-4 h-4" /> Add Material</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterStatus(''); setReviewPlan(null); setReviewNote(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon className="w-4 h-4" /> {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ml-0.5 ${tab === t.key ? 'bg-pink-500' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
        </div>
        {tab === 'submissions' && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="returned">Returned</option>
            <option value="late">Late</option>
          </select>
        )}
      </div>

      {/* ── Courses Tab ── */}
      {tab === 'courses' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Subject / Topic</th><th className="py-3 px-4">Class</th><th className="py-3 px-4">Term</th><th className="py-3 px-4">Year</th><th className="py-3 px-4">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredCourses.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4"><p className="font-medium text-gray-800">{c.title}</p><p className="text-xs text-gray-500">{c.subject}</p></td>
                      <td className="py-3 px-4 text-gray-600">{c.classes?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{c.term}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.academic_year}</td>
                      <td className="py-3 px-4"><div className="flex items-center gap-1">
                        <button onClick={() => openEditCourse(c)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteCourse(c)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {filteredCourses.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400"><Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />No topics found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Assignments Tab ── */}
      {tab === 'assignments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Title</th><th className="py-3 px-4">Course</th><th className="py-3 px-4">Type</th><th className="py-3 px-4">Max Score</th><th className="py-3 px-4">Due Date</th><th className="py-3 px-4">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredAssignments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{a.title}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{a.courses?.subject} · {a.courses?.title}</td>
                      <td className="py-3 px-4 text-gray-600 capitalize">{a.type}</td>
                      <td className="py-3 px-4 text-gray-600">{a.max_score ?? 100}</td>
                      <td className="py-3 px-4 text-gray-500">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
                      <td className="py-3 px-4"><div className="flex items-center gap-1">
                        <button onClick={() => openEditAssign(a)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteAssignment(a)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No assignments found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Materials Tab ── */}
      {tab === 'materials' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Material</th><th className="py-3 px-4">Course</th><th className="py-3 px-4">Type</th><th className="py-3 px-4">Link / file</th><th className="py-3 px-4">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredMaterials.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{m.title}</p>
                        {m.description && <p className="text-xs text-gray-400 truncate max-w-xs">{m.description}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{m.courses?.subject} · {m.courses?.title}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                          {MATERIAL_TYPE_ICONS[m.type as MaterialType] || '📄'} {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        {m.file_storage_path && materialFileUrls[m.id] ? (
                          <a href={materialFileUrls[m.id]} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 text-xs hover:underline">
                            <FileText className="w-3 h-3" /> File
                          </a>
                        ) : null}
                        {m.url ? (
                          <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 text-xs hover:underline">
                            <ExternalLink className="w-3 h-3" /> {m.file_storage_path ? 'External' : 'Open'}
                          </a>
                        ) : null}
                        {!m.url && !(m.file_storage_path && materialFileUrls[m.id]) && (
                          <span className="text-gray-400 text-xs">{m.file_storage_path ? '…' : '—'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4"><div className="flex items-center gap-1">
                        <button onClick={() => openEditMaterial(m)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteMaterial(m)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {filteredMaterials.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400"><Paperclip className="w-8 h-8 mx-auto mb-2 opacity-40" />No materials yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Lesson plans (admin review) ── */}
      {tab === 'lessonplans' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLessonPlans.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{p.title}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{p.courses?.subject} · {p.courses?.title}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">{teacherName(p.teacher_profile_id)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${p.status === 'approved' ? 'bg-green-100 text-green-800' : p.status === 'submitted' ? 'bg-amber-100 text-amber-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => { setReviewPlan(p); setReviewNote(p.review_note || ''); }}
                          className="px-2.5 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-medium hover:bg-pink-700"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLessonPlans.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400"><ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />No lesson plans</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Submissions Tab ── */}
      {tab === 'submissions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Student</th><th className="py-3 px-4">Assignment</th><th className="py-3 px-4">Submitted</th><th className="py-3 px-4">Score</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredSubmissions.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{s.students?.profiles?.first_name} {s.students?.profiles?.last_name}</p>
                        <p className="text-xs text-gray-400">{s.students?.student_id}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-700">{s.assignments?.title}</p>
                        <p className="text-xs text-gray-400">{s.assignments?.courses?.subject}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{new Date(s.submitted_at).toLocaleDateString('en-NG')}</td>
                      <td className="py-3 px-4">
                        {s.score != null ? <span className="font-semibold text-gray-800">{s.score}</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SUBMISSION_STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => openGrade(s)} className="flex items-center gap-1 px-2.5 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-medium hover:bg-pink-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSubmissions.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400"><ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />No submissions yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <CourseModal
        open={showCourseModal}
        editCourse={editCourse}
        courseForm={courseForm}
        setCourseForm={setCourseForm}
        subjectOptions={subjectOptions}
        classes={classes}
        teachers={teachers}
        saving={saving}
        onSave={saveCourse}
        onClose={() => setShowCourseModal(false)}
      />
      <AssignmentModal
        open={showAssignModal}
        editAssignment={editAssignment}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        courses={courses}
        saving={saving}
        onSave={saveAssignment}
        onClose={() => setShowAssignModal(false)}
      />
      <MaterialModal
        open={showMaterialModal}
        editMaterial={editMaterial}
        materialForm={materialForm}
        setMaterialForm={setMaterialForm}
        materialPendingFile={materialPendingFile}
        setMaterialPendingFile={setMaterialPendingFile}
        materialRemoveStoredFile={materialRemoveStoredFile}
        setMaterialRemoveStoredFile={setMaterialRemoveStoredFile}
        materialFileInputRef={materialFileInputRef}
        courses={courses}
        saving={saving}
        onSave={saveMaterial}
        onClose={() => { setShowMaterialModal(false); setMaterialPendingFile(null); setMaterialRemoveStoredFile(false); if (materialFileInputRef.current) materialFileInputRef.current.value = ''; }}
      />
      <LessonPlanReviewModal
        plan={reviewPlan}
        reviewNote={reviewNote}
        setReviewNote={setReviewNote}
        reviewSaving={reviewSaving}
        teacherName={teacherName}
        onSave={savePlanReview}
        onClose={() => { setReviewPlan(null); setReviewNote(''); }}
      />
      <GradeSubmissionModal
        target={gradeTarget}
        gradeForm={gradeForm}
        setGradeForm={setGradeForm}
        gradeWorkImageUrl={gradeWorkImageUrl}
        gradeWorkDocUrl={gradeWorkDocUrl}
        gradingSaving={gradingSaving}
        onSave={saveGrade}
        onClose={() => setGradeTarget(null)}
      />

      {/* ── Delete Confirms ── */}
      {deleteCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteCourse(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Remove Topic</h3>
            <p className="text-sm text-gray-600 mb-5">Remove "<span className="font-semibold">{deleteCourse.title}</span>"?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCourse(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmDeleteCourse} disabled={deletingCourse} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deletingCourse ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteAssignment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Assignment</h3>
            <p className="text-sm text-gray-600 mb-5">Delete "<span className="font-semibold">{deleteAssignment.title}</span>"?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAssignment(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmDeleteAssignment} disabled={deletingAssign} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deletingAssign ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteMaterial(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Material</h3>
            <p className="text-sm text-gray-600 mb-5">Delete "<span className="font-semibold">{deleteMaterial.title}</span>"?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteMaterial(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmDeleteMaterial} disabled={deletingMaterial} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deletingMaterial ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
