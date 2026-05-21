import { useState, useEffect } from 'react';
import {
  MonitorCheck, Plus, X, Trash2, Edit2, ChevronLeft, Eye, EyeOff,
  CheckCircle2, Circle, BarChart3, BookOpen, Clock, Sparkles
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear } from '../../../lib/academicConfig';
import type { ProfileRow, CbtExamRow, CbtQuestionRow, ClassRow } from '../../../lib/supabase';
import CBTQuestionTools from '../shared/CBTQuestionTools';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-indigo-600' : 'bg-red-600'}`}>
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
    supabase.from('classes').select('id, name').eq('teacher_id', profile.id).order('name').then(({ data }) => setMyClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
    fetchExams();
  }, [profile.id]);

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
        showToast('Exam configuration updated successfully');
      } else {
        const { error } = await supabase.from('cbt_exams').insert({ ...payload, created_by: profile.id });
        if (error) throw error;
        showToast('CBT exam created successfully');
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
    showToast(exam.is_published ? 'Exam reverted to draft status' : 'Exam published live for students');
    fetchExams();
    if (activeExam?.id === exam.id) setActiveExam(p => p ? { ...p, is_published: !p.is_published } : p);
  };

  const deleteExam = async () => {
    if (!deleteTarget || deleteTarget.type !== 'exam') return;
    setDeleting(true);
    const { error } = await supabase.from('cbt_exams').delete().eq('id', deleteTarget.id);
    if (error) { showToast(error.message, 'error'); setDeleting(false); return; }
    showToast('Exam deleted successfully'); setDeleteTarget(null);
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
        showToast('Question updated successfully');
      } else {
        const { error } = await supabase.from('cbt_questions').insert({ ...payload, exam_id: activeExam.id, order_index: questions.length });
        if (error) throw error;
        showToast('Question added successfully');
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
    showToast('Question deleted successfully'); setDeleteTarget(null); fetchQuestions(activeExam.id); setDeleting(false);
  };

  const DeleteConfirm = ({ label, onConfirm }: { label: string; onConfirm: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setDeleteTarget(null)}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-100" onClick={e => e.stopPropagation()}>
        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3.5 bg-red-50 p-2.5 rounded-2xl" />
        <h3 className="font-bold text-gray-900 text-lg mb-1">{label}</h3>
        <p className="text-sm text-gray-500 mb-6">This operation is permanent and cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
        </div>
      </div>
    </div>
  );

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (view === 'detail' && activeExam) {
    return (
      <div className="space-y-6">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        
        {/* Back and Title Header */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <button onClick={() => { setView('list'); setActiveExam(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex-1 min-w-48">
            <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{activeExam.title}</h2>
            <p className="text-xs text-gray-500 font-semibold mt-1">Subject: <span className="text-indigo-600">{activeExam.subject}</span> · Class Room: <span className="text-indigo-600">{activeExam.classes?.name ?? 'All Classes'}</span> · Duration: <span className="text-indigo-600">{activeExam.duration_minutes} mins</span></p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => togglePublish(activeExam)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${activeExam.is_published ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}>
              {activeExam.is_published ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Revert Draft</>}
            </button>
            <button onClick={() => openEditExam(activeExam)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"><Edit2 className="w-3.5 h-3.5" /> Config</button>
            <button onClick={() => setDeleteTarget({ type: 'exam', id: activeExam.id })} className="p-1.5 bg-red-50 border border-red-100 rounded-xl text-red-600 hover:bg-red-100 transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-200">
          <button onClick={() => setDetailTab('questions')} className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${detailTab === 'questions' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Question Bank ({questions.length})</button>
          <button onClick={() => { setDetailTab('results'); fetchResults(activeExam.id); }} className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${detailTab === 'results' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Submissions & Marks</button>
        </div>

        {detailTab === 'questions' && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2 bg-indigo-50/10 p-3 rounded-2xl border border-indigo-100/20">
              <CBTQuestionTools
                examId={activeExam.id}
                existingCount={questions.length}
                accentColor="indigo"
                onSuccess={() => fetchQuestions(activeExam.id)}
                showToast={showToast}
              />
              <button onClick={openCreateQ} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"><Plus className="w-4 h-4" /> Add Question</button>
            </div>

            {qLoading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 font-medium">Question bank is empty. Build questions manually or generate instantly using AI above.</div>
            ) : (
              questions.map((q, i) => (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs transition-all hover:border-indigo-100 hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-extrabold flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm mb-3.5 leading-relaxed">{q.question_text}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold">
                        {(['a', 'b', 'c', 'd'] as const).map(opt => (
                          <div key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${q.correct_option === opt ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                            {q.correct_option === opt ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /> : <Circle className="w-4 h-4 flex-shrink-0 text-gray-300" />}
                            <span className="uppercase text-xs font-extrabold mr-1 bg-white border px-1.5 py-0.5 rounded text-gray-500">{opt}</span>
                            {q[`option_${opt}` as keyof CbtQuestionRow] as string}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-50 text-[10px] uppercase font-bold text-gray-400">
                        <span>Allocation: {q.marks} Mark{q.marks !== 1 ? 's' : ''}</span>
                        <div className="flex gap-1">
                          <button onClick={() => openEditQ(q)} className="p-1 hover:bg-gray-100 text-gray-500 rounded-lg flex items-center gap-1 text-[10px] font-bold border border-transparent hover:border-gray-200 transition-all"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                          <button onClick={() => setDeleteTarget({ type: 'question', id: q.id })} className="p-1 hover:bg-red-50 text-red-500 rounded-lg flex items-center gap-1 text-[10px] font-bold border border-transparent hover:border-red-100 transition-all"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {detailTab === 'results' && (
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
            {rLoading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-medium">No students have submitted this CBT exam yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-150 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-5">No.</th>
                      <th className="py-3 px-5">Student Learner</th>
                      <th className="py-3 px-5">Raw Score</th>
                      <th className="py-3 px-5">Success Rate</th>
                      <th className="py-3 px-5">Portal Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {results.map((r, i) => {
                      const pct = activeExam.total_marks > 0 ? Math.round((r.total_score / activeExam.total_marks) * 100) : 0;
                      return (
                        <tr key={r.id} className="hover:bg-indigo-50/10">
                          <td className="py-3.5 px-5 text-gray-400 text-xs font-semibold">{i + 1}</td>
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-gray-900">{r.students?.profiles?.first_name} {r.students?.profiles?.last_name}</div>
                            <div className="text-xs text-gray-400 font-mono">{r.students?.student_id}</div>
                          </td>
                          <td className="py-3.5 px-5 font-mono font-bold text-gray-800">{r.total_score} / {activeExam.total_marks}</td>
                          <td className="py-3.5 px-5">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
                              pct >= 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-700'
                            }`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${r.is_submitted ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-150 text-amber-700 animate-pulse'}`}>
                              {r.is_submitted ? 'Completed' : 'Test Running'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Question Modal (Edit/Create Question) */}
        {showQModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setShowQModal(false)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-150 bg-gray-50/50">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">{editQ ? 'Edit Exam Question' : 'Add Exam Question'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Build premium multiple choice options with marks weights.</p>
                </div>
                <button onClick={() => setShowQModal(false)} className="p-2 hover:bg-gray-200 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Question Description *</label>
                  <textarea rows={3} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium text-gray-800" placeholder="e.g. Solve: 12 + 15?" />
                </div>
                {(['a', 'b', 'c', 'd'] as const).map(opt => (
                  <div key={opt}>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Option {opt.toUpperCase()} *</label>
                    <input value={qForm[`option_${opt}` as keyof typeof qForm] as string} onChange={e => setQForm(f => ({ ...f, [`option_${opt}`]: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Correct Choice Key</label>
                    <select value={qForm.correct_option} onChange={e => setQForm(f => ({ ...f, correct_option: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-800">
                      <option value="a">A</option>
                      <option value="b">B</option>
                      <option value="c">C</option>
                      <option value="d">D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Question Mark Weight</label>
                    <input type="number" min={1} value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
                <button onClick={() => setShowQModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
                <button onClick={saveQuestion} disabled={qSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/10">{qSaving ? 'Saving...' : editQ ? 'Update Question' : 'Add to Bank'}</button>
              </div>
            </div>
          </div>
        )}
        {showExamModal && <ExamModal form={examForm} setForm={setExamForm} classes={myClasses} onClose={() => setShowExamModal(false)} onSave={saveExam} saving={examSaving} isEdit={!!editExam} />}
        {deleteTarget && <DeleteConfirm label={deleteTarget.type === 'exam' ? 'Delete CBT Exam Room?' : 'Delete Question?'} onConfirm={deleteTarget.type === 'exam' ? deleteExam : deleteQuestion} />}
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MonitorCheck className="w-6 h-6 text-indigo-600" /> CBT Online Exams
          </h2>
          <p className="text-sm text-gray-500">Formulate multiple choice questions, set exam times, and let AI build custom quizzes.</p>
        </div>
        <button onClick={openCreateExam} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"><Plus className="w-4 h-4" /> Create Exam</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 font-medium">No CBT exams created yet. Click Create Exam to build your first quiz room!</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">{exam.subject}</span>
                    <h3 className="font-bold text-gray-900 truncate mt-1.5 text-base">{exam.title}</h3>
                  </div>
                  <span className={`ml-2 flex-shrink-0 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                    exam.is_published 
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                      : 'bg-gray-100 border-gray-200 text-gray-500'
                  }`}>
                    {exam.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 font-semibold mb-4 bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-indigo-500" />{exam.question_count} Qs</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-500" />{exam.duration_minutes}m</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-indigo-500" />{exam.session_count} Completed</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-3.5 border-t border-gray-50">
                <button onClick={() => openExam(exam)} className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all">Manage</button>
                <button onClick={() => togglePublish(exam)} className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  exam.is_published 
                    ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}>
                  {exam.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => setDeleteTarget({ type: 'exam', id: exam.id })} className="px-2.5 py-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 border border-red-100/50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showExamModal && <ExamModal form={examForm} setForm={setExamForm} classes={myClasses} onClose={() => setShowExamModal(false)} onSave={saveExam} saving={examSaving} isEdit={!!editExam} />}
      {deleteTarget && <DeleteConfirm label="Delete CBT Exam Room?" onConfirm={deleteExam} />}
    </div>
  );
}

type ExamFormState = typeof BLANK_EXAM & { is_published: boolean };
function ExamModal({ form, setForm, classes, onClose, onSave, saving, isEdit }: { form: ExamFormState; setForm: React.Dispatch<React.SetStateAction<ExamFormState>>; classes: Pick<ClassRow, 'id' | 'name'>[]; onClose: () => void; onSave: () => void; saving: boolean; isEdit: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="font-extrabold text-gray-950 text-lg">{isEdit ? 'Configure CBT Exam Room' : 'Create CBT Exam Room'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Configure quiz parameters and access durations.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Exam Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Mathematics Mid-Term Test" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Academic Subject *</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Mathematics" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Class Room Access</label>
              <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold">
                <option value="">All Classes (School Wide)</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Minutes)</label>
              <input type="number" min={1} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Academic Term</label>
              <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Start Time limit</label>
              <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">End Time limit</label>
              <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Learner Instructions</label>
            <textarea rows={2} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium text-gray-800" placeholder="Paste guidelines or requirements..." />
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/50">
            <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
            <div className="text-xs font-bold text-indigo-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Publish Immediately
            </div>
          </label>
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/10">
            {saving ? 'Configuring Exam...' : isEdit ? 'Save Changes' : 'Launch Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}
