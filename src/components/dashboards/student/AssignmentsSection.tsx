import { useState, useEffect } from 'react';
import { FileText, AlertCircle, Send, X, CheckCircle, Clock, BookOpen, Filter, Camera, Trash2, Paperclip } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { appStorageFrom, SUBMISSION_WORK_BUCKET } from '../../../lib/storageBuckets';
import {
  submissionWorkObjectPath,
  submissionDocumentObjectPath,
  createSubmissionWorkSignedUrl,
  removeSubmissionWorkObject,
} from '../../../lib/submissionWorkStorage';
import { useStudentData } from './useStudentData';
import type { ProfileRow, AssignmentRow, SubmissionRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface AssignmentWithCourse extends AssignmentRow {
  courses?: { title: string; subject: string; class_id: string | null } | null;
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const typeColor: Record<string, string> = {
  homework: 'bg-blue-100 text-blue-700',
  quiz: 'bg-purple-100 text-purple-700',
  exam: 'bg-red-100 text-red-700',
  project: 'bg-orange-100 text-orange-700',
  classwork: 'bg-green-100 text-green-700',
};

type FilterTab = 'all' | 'pending' | 'submitted' | 'graded';

/** File picker + MIME hints for PDF / Office / text (matches storage bucket). */
const SUBMISSION_DOC_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/rtf',
].join(',') + ',.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf';

export default function AssignmentsSection({ profile }: Props) {
  const { student, loading: studentLoading, error: studentError } = useStudentData(profile.id);
  const [classAssignments, setClassAssignments] = useState<AssignmentWithCourse[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Submit modal state
  const [submitTarget, setSubmitTarget] = useState<AssignmentWithCourse | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [clearWorkImage, setClearWorkImage] = useState(false);
  const [existingWorkUrl, setExistingWorkUrl] = useState<string | null>(null);
  const [pickedDoc, setPickedDoc] = useState<File | null>(null);
  const [clearWorkDoc, setClearWorkDoc] = useState(false);
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pickedFile) {
      setPickedPreview(null);
      return;
    }
    const u = URL.createObjectURL(pickedFile);
    setPickedPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [pickedFile]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setExistingWorkUrl(null);
      if (!submitTarget || clearWorkImage) return;
      const sub = submissions.find(s => s.assignment_id === submitTarget.id);
      const p = sub?.work_image_path;
      if (!p) return;
      const url = await createSubmissionWorkSignedUrl(supabase, p);
      if (alive) setExistingWorkUrl(url);
    })();
    return () => {
      alive = false;
    };
  }, [submitTarget?.id, clearWorkImage, submissions]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setExistingDocUrl(null);
      if (!submitTarget || clearWorkDoc) return;
      const sub = submissions.find(s => s.assignment_id === submitTarget.id);
      const p = sub?.work_document_path;
      if (!p) return;
      const url = await createSubmissionWorkSignedUrl(supabase, p);
      if (alive) setExistingDocUrl(url);
    })();
    return () => {
      alive = false;
    };
  }, [submitTarget?.id, clearWorkDoc, submissions]);

  const fetchAssignments = async (studentId: string, classId: string) => {
    setLoading(true);
    try {
      // Get the teacher for this class so we can also include their non-class-specific topics
      const { data: classData } = await supabase
        .from('classes')
        .select('teacher_id')
        .eq('id', classId)
        .maybeSingle();
      const teacherId = classData?.teacher_id ?? null;

      // Fetch courses for this class OR teacher's generic (null class_id) courses
      let coursesQuery = supabase.from('courses').select('id').eq('is_active', true);
      if (teacherId) {
        coursesQuery = coursesQuery.or(`class_id.eq.${classId},and(class_id.is.null,teacher_id.eq.${teacherId})`);
      } else {
        coursesQuery = coursesQuery.eq('class_id', classId);
      }
      const { data: courses } = await coursesQuery;

      const courseIds = (courses || []).map((c: { id: string }) => c.id);

      if (courseIds.length > 0) {
        const [{ data: assigns }, { data: subs }] = await Promise.all([
          supabase
            .from('assignments')
            .select('*, courses:course_id(title, subject, class_id)')
            .in('course_id', courseIds)
            .order('due_date', { ascending: true }),
          supabase
            .from('submissions')
            .select('*')
            .eq('student_id', studentId),
        ]);
        setClassAssignments((assigns || []) as AssignmentWithCourse[]);
        setSubmissions((subs || []) as SubmissionRow[]);
      } else {
        setClassAssignments([]);
        setSubmissions([]);
      }
    } catch {
      // ignore errors, show empty state
    } finally {
      setLoading(false);
    }
  };

  // ── FIX: depend on both student AND studentLoading so we handle all null states ──
  useEffect(() => {
    if (studentLoading) return; // still fetching student record, wait
    if (!student) {
      setLoading(false); // no student record found — stop spinning
      return;
    }
    if (student.class_id) {
      fetchAssignments(student.id, student.class_id);
    } else {
      setLoading(false); // student exists but has no class assigned
    }
  }, [student, studentLoading]);

  const getSubmission = (assignmentId: string) =>
    submissions.find(s => s.assignment_id === assignmentId) ?? null;

  const openSubmit = (assignment: AssignmentWithCourse) => {
    const existing = getSubmission(assignment.id);
    setSubmitTarget(assignment);
    setSubmitContent(existing?.content || '');
    setSubmitUrl(existing?.file_url || '');
    setPickedFile(null);
    setClearWorkImage(false);
    setPickedDoc(null);
    setClearWorkDoc(false);
  };

  const submitAssignment = async () => {
    if (!submitTarget || !student) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to submit');

      const existing = getSubmission(submitTarget.id);
      let work_image_path: string | null = existing?.work_image_path ?? null;
      let work_document_path: string | null = existing?.work_document_path ?? null;

      if (pickedFile) {
        const path = submissionWorkObjectPath(user.id, submitTarget.id);
        const { error: upErr } = await appStorageFrom(supabase, SUBMISSION_WORK_BUCKET).upload(path, pickedFile, {
          upsert: true,
          contentType: pickedFile.type || 'image/jpeg',
        });
        if (upErr) throw upErr;
        work_image_path = path;
      } else if (clearWorkImage && existing?.work_image_path) {
        await removeSubmissionWorkObject(supabase, existing.work_image_path);
        work_image_path = null;
      } else if (clearWorkImage) {
        work_image_path = null;
      }

      if (pickedDoc) {
        const dpath = submissionDocumentObjectPath(user.id, submitTarget.id);
        const { error: docErr } = await appStorageFrom(supabase, SUBMISSION_WORK_BUCKET).upload(dpath, pickedDoc, {
          upsert: true,
          contentType: pickedDoc.type || 'application/pdf',
        });
        if (docErr) throw docErr;
        work_document_path = dpath;
      } else if (clearWorkDoc && existing?.work_document_path) {
        await removeSubmissionWorkObject(supabase, existing.work_document_path);
        work_document_path = null;
      } else if (clearWorkDoc) {
        work_document_path = null;
      }

      const hasText = !!submitContent.trim() || !!submitUrl.trim();
      if (!hasText && !work_image_path && !work_document_path) {
        setToast({ msg: 'Add your answer, a link, a photo, or a document', type: 'error' });
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('submissions').upsert(
        {
          assignment_id: submitTarget.id,
          student_id: student.id,
          content: submitContent.trim() || null,
          file_url: submitUrl.trim() || null,
          work_image_path,
          work_document_path,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'assignment_id,student_id' }
      );
      if (error) throw error;
      setToast({ msg: 'Assignment submitted successfully!', type: 'success' });
      setSubmitTarget(null);
      setSubmitContent('');
      setSubmitUrl('');
      setPickedFile(null);
      setClearWorkImage(false);
      setPickedDoc(null);
      setClearWorkDoc(false);
      if (student.class_id) fetchAssignments(student.id, student.class_id);
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Submission failed', type: 'error' });
    }
    setSubmitting(false);
  };

  // ── Loading / error states ──
  if (studentLoading || loading) return (
    <div className="flex flex-col justify-center items-center h-48 gap-3">
      <div className="w-9 h-9 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading your assignments…</p>
    </div>
  );

  if (studentError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-red-800">Something went wrong</h3><p className="text-sm text-red-700 mt-1">{studentError}</p></div>
    </div>
  );

  if (!student) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-amber-800">No student record found</h3><p className="text-sm text-amber-700 mt-1">Please contact your school administrator to link your profile.</p></div>
    </div>
  );

  if (!student.class_id) return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-3">
      <BookOpen className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-blue-800">Not assigned to a class yet</h3><p className="text-sm text-blue-700 mt-1">Your teacher will add you to your class soon. Assignments will appear here once you're enrolled.</p></div>
    </div>
  );

  // Filter logic
  const getStatus = (a: AssignmentWithCourse) => {
    const sub = getSubmission(a.id);
    if (!sub) return 'pending';
    return sub.status === 'graded' ? 'graded' : 'submitted';
  };

  const filtered = classAssignments.filter(a => {
    if (filterTab === 'all') return true;
    return getStatus(a) === filterTab;
  });

  const pendingCount = classAssignments.filter(a => getStatus(a) === 'pending').length;
  const submittedCount = classAssignments.filter(a => getStatus(a) === 'submitted').length;
  const gradedCount = classAssignments.filter(a => getStatus(a) === 'graded').length;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Assignments</h2>
          <p className="text-sm text-gray-500 mt-0.5">{classAssignments.length} assignment{classAssignments.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Summary stats */}
      {classAssignments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', value: pendingCount, color: 'text-orange-600 bg-orange-50 border-orange-100' },
            { label: 'Submitted', value: submittedCount, color: 'text-green-600 bg-green-50 border-green-100' },
            { label: 'Graded', value: gradedCount, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {classAssignments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all', label: 'All', count: classAssignments.length },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'submitted', label: 'Submitted', count: submittedCount },
            { key: 'graded', label: 'Graded', count: gradedCount },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterTab === key
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-3 h-3" /> {label}
              <span className={`text-xs rounded-full px-1.5 ${filterTab === key ? 'bg-white/30' : 'bg-gray-200'}`}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Assignments grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {classAssignments.length === 0
              ? 'No assignments yet'
              : `No ${filterTab === 'all' ? '' : filterTab} assignments`}
          </p>
          {classAssignments.length === 0 && (
            <p className="text-xs mt-1">Your teacher hasn't posted any assignments yet.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(a => {
            const submission = getSubmission(a.id);
            const now = new Date();
            const dueDate = a.due_date ? new Date(a.due_date) : null;
            const isOverdue = dueDate && dueDate < now && !submission;
            const dueSoon = dueDate && dueDate > now && (dueDate.getTime() - now.getTime()) < 48 * 3600 * 1000 && !submission;

            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md ${
                  isOverdue ? 'border-red-200' : dueSoon ? 'border-orange-200' : 'border-gray-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{a.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.courses?.subject && <span className="font-medium text-pink-600">{a.courses.subject}</span>}
                      {a.courses?.title && <span className="text-gray-400"> · {a.courses.title}</span>}
                    </p>
                  </div>
                  <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColor[a.type] || 'bg-gray-100 text-gray-600'}`}>
                    {a.type}
                  </span>
                </div>

                {/* Description */}
                {a.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{a.description}</p>
                )}

                {/* Due date + status row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs">
                    {dueDate ? (
                      <span className={
                        isOverdue ? 'text-red-600 font-semibold' :
                        dueSoon ? 'text-orange-500 font-medium' :
                        'text-gray-400'
                      }>
                        {isOverdue ? '⚠ Overdue · ' : dueSoon ? '⏰ Due soon · ' : 'Due: '}
                        {dueDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-gray-400">No deadline</span>
                    )}
                  </div>

                  {/* Score if graded */}
                  {submission?.score != null && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {submission.score}/{a.max_score}
                    </span>
                  )}
                </div>

                {/* Submission status badge */}
                <div className="mb-3">
                  {!submission ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg w-fit">
                      <Clock className="w-3 h-3" /> Not submitted
                    </span>
                  ) : submission.status === 'graded' ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg w-fit">
                      <CheckCircle className="w-3 h-3" /> Graded
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-lg w-fit">
                      <CheckCircle className="w-3 h-3" /> Submitted
                    </span>
                  )}
                </div>

                {/* Teacher feedback */}
                {submission?.feedback && (
                  <div className="mb-3 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-0.5">Teacher feedback:</p>
                    <p className="text-xs text-blue-600">{submission.feedback}</p>
                  </div>
                )}

                {/* Submit button */}
                {submission?.status !== 'graded' && (
                  <button
                    onClick={() => openSubmit(a)}
                    className="flex items-center gap-1.5 w-full justify-center px-3 py-2 bg-pink-600 text-white rounded-lg text-xs font-medium hover:bg-pink-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submission ? 'Update submission' : 'Submit Assignment'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit modal */}
      {submitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSubmitTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Submit Assignment</h3>
                <p className="text-xs text-gray-500 mt-0.5">{submitTarget.title}</p>
                {submitTarget.max_score && (
                  <p className="text-xs text-gray-400">Max score: {submitTarget.max_score}</p>
                )}
              </div>
              <button onClick={() => setSubmitTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {submitTarget.description && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Assignment instructions:</p>
                  <p className="text-sm text-gray-700">{submitTarget.description}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your answer / work</label>
                <p className="text-[11px] text-gray-400 mb-1">At least one of: typed answer, link, photo, or document.</p>
                <textarea
                  rows={6}
                  value={submitContent}
                  onChange={e => setSubmitContent(e.target.value)}
                  placeholder="Type your answer, explanation or work here…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Photo of your work (optional)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Take a clear picture or upload a screenshot. Your teacher uses it while grading; it is removed after the assignment is graded.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 cursor-pointer border border-gray-200">
                    <Camera className="w-4 h-4" />
                    Camera / gallery
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        setClearWorkImage(false);
                        setPickedFile(f ?? null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {(pickedPreview || (existingWorkUrl && !clearWorkImage)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickedFile(null);
                        setClearWorkImage(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove photo
                    </button>
                  )}
                </div>
                {(pickedPreview || (existingWorkUrl && !clearWorkImage)) && (
                  <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    <img
                      src={pickedPreview || existingWorkUrl || ''}
                      alt="Your work"
                      className="w-full max-h-56 object-contain"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Document (optional)</label>
                <p className="text-xs text-gray-500 mb-2">
                  PDF, Word, Excel, PowerPoint, or plain text (max 10 MB). Same as the photo: removed from storage after grading.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 cursor-pointer border border-gray-200">
                    <Paperclip className="w-4 h-4" />
                    Choose file
                    <input
                      type="file"
                      accept={SUBMISSION_DOC_ACCEPT}
                      className="sr-only"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        setClearWorkDoc(false);
                        setPickedDoc(f ?? null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {(pickedDoc || (existingDocUrl && !clearWorkDoc)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickedDoc(null);
                        setClearWorkDoc(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove document
                    </button>
                  )}
                </div>
                {pickedDoc && (
                  <p className="text-xs text-gray-600 mt-2">
                    Selected: <span className="font-medium break-all">{pickedDoc.name}</span>
                  </p>
                )}
                {!pickedDoc && existingDocUrl && !clearWorkDoc && (
                  <p className="text-xs text-gray-600 mt-2">
                    You already submitted a document.{' '}
                    <a href={existingDocUrl} target="_blank" rel="noopener noreferrer" className="text-pink-600 font-medium hover:underline">
                      Open preview
                    </a>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File / Link URL (optional)</label>
                <input
                  value={submitUrl}
                  onChange={e => setSubmitUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-400 mt-1">You can paste a Google Drive, Dropbox or any file link</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setSubmitTarget(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={submitAssignment}
                disabled={submitting}
                className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
