import { useState, useEffect } from 'react';
import {
  MonitorCheck, Plus, X, Trash2, Edit2, ChevronLeft, Eye, EyeOff,
  CheckCircle2, Circle, BarChart3, BookOpen, Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear } from '../../../lib/academicConfig';
import type { ProfileRow, CbtExamRow, CbtQuestionRow, ClassRow } from '../../../lib/supabase';
import CBTQuestionTools from '../shared/CBTQuestionTools';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

interface ExamWithClass extends CbtExamRow {
  classes?: { name: string } | null;
  question_count?: number;
  session_count?: number;
}

interface SessionResult {
  id: string;
  total_score: number;
  is_submitted: boolean;
  submitted_at: string | null;
  started_at: string;
  students?: {
    student_id: string;
    profiles?: { first_name: string; last_name: string } | null;
  } | null;
}

const BLANK_EXAM = {
  title: '', subject: '', class_id: '', duration_minutes: '30', total_marks: '0',
  start_time: '', end_time: '', term: 'First Term' as string,
  academic_year: getDefaultAcademicYear(), instructions: '', is_published: false,
};
const BLANK_Q = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a' as string, marks: '1' };

export default function TeacherCBTSection({ profile }: Props) {
  const [exams, setExams] = useState<ExamWithClass[]>([]);
  const [myClasses, setMyClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeExam, setActiveExam] = useState<ExamWithClass | null>(null);
  const [detailTab, setDetailTab] = useState<'questions' | 'results'>('questions');
  const [questions, setQuestions] = useState<CbtQuestionRow[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [rLoading, setRLoading] = useState(false);

  const [showExamModal, setShowExamModal] = useState(false);
  const [editExam, setEditExam] = useState<ExamWithClass | null>(null);
  const [examForm, setExamForm] = useState(BLANK_EXAM);
  const [examSaving, setExamSaving] = useState(false);

  const [showQModal, setShowQModal] = useState(false);
  const [editQ, setEditQ] = useState<CbtQuestionRow | null>(null);
  const [qForm, setQForm] = useState(BLANK_Q);
  const [qSaving, setQSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'exam' | 'question'; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  useEffect(() => {
    // classes.teacher_id references profiles.id, so query directly with profile.id
    supabase.from('classes').select('id, name').eq('teacher_id', profile.id).order('name').then(({ data }) => setMyClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cbt_exams')
        .select('*, classes:class_id(name)')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });
      if (data) {
        const enriched = await Promise.all((data as ExamWithClass[]).map(async (e) => {
          const [{ count: qc }, { count: sc }] = await Promise.all([
            supabase.from('cbt_questions').select('*', { count: 'exact', head: true }).eq('exam_id', e.id),
            supabase.from('cbt_sessions').select('*', { count: 'exact', head: true }).eq('exam_id', e.id).eq('is_submitted', true),
          ]);
          return { ...e, question_count: qc ?? 0, session_count: sc ?? 0 };
        }));
        setExams(enriched);
      }
    } finally {
      setLoading(false);
    }
  };

  const openExam = async (exam: ExamWithClass) => {
    setActiveExam(exam); setDetailTab('questions'); setView('detail');
    fetchQuestions(exam.id);
  };
  const fetchQuestions = async (examId: string) => {
    setQLoading(true);
    try {
      const { data } = await supabase.from('cbt_questions').select('*').eq('exam_id', examId).order('order_index').order('created_at');
      setQuestions((data || []) as CbtQuestionRow[]);
    } finally {
      setQLoading(false);
    }
  };
  const fetchResults = async (examId: string) => {
    setRLoading(true);
    try {
      const { data } = await supabase
        .from('cbt_sessions')
        .select('*, students:student_id(student_id, profiles:profile_id(first_name, last_name))')
        .eq('exam_id', examId).order('total_score', { ascending: false });
      setResults((data || []) as SessionResult[]);
    } finally {
      setRLoading(false);
    }
  };

  const openCreateExam = () => { setEditExam(null); setExamForm(BLANK_EXAM); setShowExamModal(true); };
  const openEditExam = (e: ExamWithClass) => {
    setEditExam(e);
    setExamForm({ title: e.title, subject: e.subject, class_id: e.class_id ?? '', duration_minutes: String(e.duration_minutes), total_marks: String(e.total_marks), start_time: e.start_time ? e.start_time.slice(0, 16) : '', end_time: e.end_time ? e.end_time.slice(0, 16) : '', term: e.term, academic_year: e.academic_year, instructions: e.instructions, is_published: e.is_published });
    setShowExamModal(true);
  };

  const saveExam = async () => {
    if (!examForm.title.trim() || !examForm.subject.trim()) return showToast('Title and subject are required', 'error');
    setExamSaving(true);
    try {
      const payload = { title: examForm.title.trim(), subject: examForm.subject.trim(), class_id: examForm.class_id || null, duration_minutes: parseInt(examForm.duration_minutes) || 30, total_marks: parseInt(examForm.total_marks) || 0, start_time: examForm.start_time ? new Date(examForm.start_time).toISOString() : null, end_time: examForm.end_time ? new Date(examForm.end_time).toISOString() : null, term: examForm.term, academic_year: examForm.academic_year, instructions: examForm.instructions.trim(), is_published: examForm.is_published, updated_at: new Date().toISOString() };
      if (editExam) {
        const { error } = await supabase.from('cbt_exams').update(payload).eq('id', editExam.id);
        if (error) throw error;
        showToast('Exam updated');
      } else {
        const { error } = await supabase.from('cbt_exams').insert({ ...payload, created_by: profile.id });
        if (error) throw error;
        showToast('Exam created');
      }
      setShowExamModal(false); fetchExams();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to save exam', 'error');
    }
    setExamSaving(false);
  };

  const togglePublish = async (exam: ExamWithClass) => {
    const { error } = await supabase.from('cbt_exams').update({ is_published: !exam.is_published, updated_at: new Date().toISOString() }).eq('id', exam.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(exam.is_published ? 'Exam unpublished' : 'Exam published');
    fetchExams();
    if (activeExam?.id === exam.id) setActiveExam(p => p ? { ...p, is_published: !p.is_published } : p);
  };

  const deleteExam = async () => {
    if (!deleteTarget || deleteTarget.type !== 'exam') return;
    setDeleting(true);
    const { error } = await supabase.from('cbt_exams').delete().eq('id', deleteTarget.id);
    if (error) { showToast(error.message, 'error'); setDeleting(false); return; }
    showToast('Exam deleted'); setDeleteTarget(null);
    if (activeExam?.id === deleteTarget.id) { setView('list'); setActiveExam(null); }
    fetchExams(); setDeleting(false);
  };

  const openCreateQ = () => { setEditQ(null); setQForm(BLANK_Q); setShowQModal(true); };
  const openEditQ = (q: CbtQuestionRow) => {
    setEditQ(q);
    setQForm({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option, marks: String(q.marks) });
    setShowQModal(true);
  };

  const saveQuestion = async () => {
    if (!activeExam) return;
    const { question_text, option_a, option_b, option_c, option_d, correct_option } = qForm;
    if (!question_text.trim() || !option_a.trim() || !option_b.trim() || !option_c.trim() || !option_d.trim()) return showToast('All fields are required', 'error');
    setQSaving(true);
    try {
      const payload = { question_text: question_text.trim(), option_a: option_a.trim(), option_b: option_b.trim(), option_c: option_c.trim(), option_d: option_d.trim(), correct_option, marks: parseInt(qForm.marks) || 1 };
      if (editQ) {
        const { error } = await supabase.from('cbt_questions').update(payload).eq('id', editQ.id);
        if (error) throw error;
        showToast('Question updated');
      } else {
        const { error } = await supabase.from('cbt_questions').insert({ ...payload, exam_id: activeExam.id, order_index: questions.length });
        if (error) throw error;
        showToast('Question added');
      }
      const newMarks = questions.reduce((s, q) => s + (editQ?.id === q.id ? parseInt(qForm.marks) || 1 : q.marks), editQ ? 0 : parseInt(qForm.marks) || 1);
      await supabase.from('cbt_exams').update({ total_marks: newMarks, updated_at: new Date().toISOString() }).eq('id', activeExam.id);
      setShowQModal(false); fetchQuestions(activeExam.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to save question', 'error');
    }
    setQSaving(false);
  };

  const deleteQuestion = async () => {
    if (!deleteTarget || deleteTarget.type !== 'question' || !activeExam) return;
    setDeleting(true);
    const { error } = await supabase.from('cbt_questions').delete().eq('id', deleteTarget.id);
    if (error) { showToast(error.message, 'error'); setDeleting(false); return; }
    const remaining = questions.filter(q => q.id !== deleteTarget.id);
    await supabase.from('cbt_exams').update({ total_marks: remaining.reduce((s, q) => s + q.marks, 0), updated_at: new Date().toISOString() }).eq('id', activeExam.id);
    showToast('Question deleted'); setDeleteTarget(null); fetchQuestions(activeExam.id); setDeleting(false);
  };

  const DeleteConfirm = ({ label, onConfirm }: { label: string; onConfirm: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
        <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-gray-800 mb-1">{label}</h3>
        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (view === 'detail' && activeExam) {
    return (
      <div className="space-y-5">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setActiveExam(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{activeExam.title}</h2>
            <p className="text-sm text-gray-500">{activeExam.subject} · {activeExam.classes?.name ?? '—'} · {activeExam.duration_minutes} mins</p>
          </div>
          <button onClick={() => togglePublish(activeExam)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${activeExam.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {activeExam.is_published ? <><Eye className="w-4 h-4" /> Published</> : <><EyeOff className="w-4 h-4" /> Draft</>}
          </button>
          <button onClick={() => openEditExam(activeExam)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Edit2 className="w-4 h-4" /> Edit</button>
          <button onClick={() => setDeleteTarget({ type: 'exam', id: activeExam.id })} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
        </div>
        <div className="flex border-b border-gray-200">
          <button onClick={() => setDetailTab('questions')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${detailTab === 'questions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Questions ({questions.length})</button>
          <button onClick={() => { setDetailTab('results'); fetchResults(activeExam.id); }} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${detailTab === 'results' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Results</button>
        </div>

        {detailTab === 'questions' && (
          <div className="space-y-3">
            <div className="flex justify-end gap-2">
              <CBTQuestionTools
                examId={activeExam.id}
                existingCount={questions.length}
                accentColor="blue"
                onSuccess={() => fetchQuestions(activeExam.id)}
                showToast={showToast}
              />
              <button onClick={openCreateQ} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Add Question</button>
            </div>
            {qLoading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>
              : questions.length === 0 ? <div className="text-center py-12 text-gray-400">No questions yet.</div>
              : questions.map((q, i) => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-2">{q.question_text}</p>
                      <div className="grid grid-cols-2 gap-1.5 text-sm">
                        {(['a', 'b', 'c', 'd'] as const).map(opt => (
                          <div key={opt} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${q.correct_option === opt ? 'bg-green-100 text-green-800 font-semibold' : 'bg-gray-50 text-gray-600'}`}>
                            {q.correct_option === opt ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />}
                            <span className="uppercase text-xs font-semibold mr-1">{opt}.</span>
                            {q[`option_${opt}` as keyof CbtQuestionRow] as string}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditQ(q)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'question', id: q.id })} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {detailTab === 'results' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {rLoading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>
              : results.length === 0 ? <div className="text-center py-12 text-gray-400">No submissions yet.</div>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase text-left"><th className="py-3 px-4">#</th><th className="py-3 px-4">Student</th><th className="py-3 px-4">Score</th><th className="py-3 px-4">%</th><th className="py-3 px-4">Status</th></tr></thead>
                  <tbody>
                    {results.map((r, i) => {
                      const pct = activeExam.total_marks > 0 ? Math.round((r.total_score / activeExam.total_marks) * 100) : 0;
                      return (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                          <td className="py-3 px-4 font-medium text-gray-800">{r.students?.profiles?.first_name} {r.students?.profiles?.last_name}</td>
                          <td className="py-3 px-4 font-semibold">{r.total_score}/{activeExam.total_marks}</td>
                          <td className="py-3 px-4"><span className={`font-medium ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span></td>
                          <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.is_submitted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.is_submitted ? 'Submitted' : 'In Progress'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {showQModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowQModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">{editQ ? 'Edit Question' : 'Add Question'}</h3>
                <button onClick={() => setShowQModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Question *</label><textarea rows={3} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
                {(['a', 'b', 'c', 'd'] as const).map(opt => (<div key={opt}><label className="block text-xs font-medium text-gray-600 mb-1">Option {opt.toUpperCase()} *</label><input value={qForm[`option_${opt}` as keyof typeof qForm] as string} onChange={e => setQForm(f => ({ ...f, [`option_${opt}`]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>))}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Correct Answer</label><select value={qForm.correct_option} onChange={e => setQForm(f => ({ ...f, correct_option: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Marks</label><input type="number" min={1} value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100">
                <button onClick={() => setShowQModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={saveQuestion} disabled={qSaving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{qSaving ? 'Saving...' : editQ ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        )}
        {showExamModal && <ExamModal form={examForm} setForm={setExamForm} classes={myClasses} onClose={() => setShowExamModal(false)} onSave={saveExam} saving={examSaving} isEdit={!!editExam} />}
        {deleteTarget && <DeleteConfirm label={deleteTarget.type === 'exam' ? 'Delete Exam?' : 'Delete Question?'} onConfirm={deleteTarget.type === 'exam' ? deleteExam : deleteQuestion} />}
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><MonitorCheck className="w-6 h-6 text-blue-500" /> My CBT Exams</h2>
        <button onClick={openCreateExam} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> New Exam</button>
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>
        : exams.length === 0 ? <div className="text-center py-16 text-gray-400">No exams yet.</div>
        : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {exams.map(exam => (
              <div key={exam.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900 truncate">{exam.title}</h3><p className="text-sm text-gray-500">{exam.subject}</p></div>
                  <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${exam.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{exam.is_published ? 'Live' : 'Draft'}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{exam.question_count} Qs</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.duration_minutes}m</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" />{exam.session_count} submitted</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openExam(exam)} className="flex-1 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">Manage</button>
                  <button onClick={() => togglePublish(exam)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${exam.is_published ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{exam.is_published ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => setDeleteTarget({ type: 'exam', id: exam.id })} className="px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      {showExamModal && <ExamModal form={examForm} setForm={setExamForm} classes={myClasses} onClose={() => setShowExamModal(false)} onSave={saveExam} saving={examSaving} isEdit={!!editExam} />}
      {deleteTarget && <DeleteConfirm label="Delete Exam?" onConfirm={deleteExam} />}
    </div>
  );
}

type ExamFormState = typeof BLANK_EXAM & { is_published: boolean };
function ExamModal({ form, setForm, classes, onClose, onSave, saving, isEdit }: { form: ExamFormState; setForm: React.Dispatch<React.SetStateAction<ExamFormState>>; classes: Pick<ClassRow, 'id' | 'name'>[]; onClose: () => void; onSave: () => void; saving: boolean; isEdit: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{isEdit ? 'Edit Exam' : 'Create Exam'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Mathematics Mid-Term Test" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label><input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Mathematics" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Class</label><select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label><input type="number" min={1} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Term</label><select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{TERMS.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label><input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">End Time</label><input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Instructions</label><textarea rows={2} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="rounded" /><span className="text-sm text-gray-700">Publish immediately</span></label>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
