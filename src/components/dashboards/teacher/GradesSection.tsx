import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Search, Plus, X, Edit2, Trash2, Download,
  Save, RefreshCw, TableProperties, List,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, GradeRow, ClassRow } from '../../../lib/supabase';
import { nigerianGrade } from '../../../lib/grading';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface GradeWithStudent extends GradeRow {
  students?: {
    id: string; student_id: string;
    profiles?: { first_name: string; last_name: string };
    classes?: { id: string; name: string };
  } | null;
}
interface StudentOption { id: string; student_id: string; profiles?: { first_name: string; last_name: string } | null; }

const ASSESSMENT_TYPES = ['Home Work', '1st CA', '2nd CA', 'Exam', 'Test', 'CA', 'Project', 'Assignment', 'Quiz'];
const DEFAULT_MAX: Record<string, number> = { 'Home Work': 20, '1st CA': 20, '2nd CA': 20, 'Exam': 60, 'Test': 30 };

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ── Score Input Cell — no spinners ─────────────────────────────────────── */
function ScoreCell({
  value, max, onChange, tabIndex,
}: { value: string; max: number; onChange: (v: string) => void; tabIndex: number }) {
  const num = parseFloat(value);
  const over = !isNaN(num) && num > max;
  const filled = value !== '' && !isNaN(num);

  return (
    <input
      type="text"
      inputMode="numeric"
      tabIndex={tabIndex}
      value={value}
      onChange={e => {
        const v = e.target.value;
        if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v);
      }}
      onFocus={e => e.target.select()}
      placeholder="—"
      className={[
        'w-14 text-center text-sm font-mono py-1.5 px-1 rounded focus:outline-none transition-colors',
        'border-b-2 bg-transparent',
        over
          ? 'border-red-400 text-red-600'
          : filled
          ? 'border-green-400 text-gray-800'
          : 'border-gray-200 text-gray-400 focus:border-purple-400',
      ].join(' ')}
    />
  );
}

/* ── Per-subject score state ─────────────────────────────────────────────── */
type SubjectScores = { hw: string; ca1: string; ca2: string; exam: string };
// allScores[studentId][subject] = SubjectScores
type AllScores = Record<string, Record<string, SubjectScores>>;

const emptySubjectScores = (): SubjectScores => ({ hw: '', ca1: '', ca2: '', exam: '' });

/* ══════════════════════════════════════════════════════════════════════════
   GRADE SHEET — subjects as rows, HW | CA1 | CA2 | Exam as columns
══════════════════════════════════════════════════════════════════════════ */
function GradeSheet({ profile }: { profile: ProfileRow }) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [year, setYear] = useState(getDefaultAcademicYear());

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [allScores, setAllScores] = useState<AllScores>({});
  const [studentIdx, setStudentIdx] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set()); // student IDs that have been saved

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Load only teacher's own classes
  useEffect(() => {
    supabase.from('classes').select('id,name').eq('teacher_id', profile.id).order('name')
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, [profile.id]);

  const loadSheet = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setLoaded(false);
    setSaved(new Set());

    // Students
    const { data: studs } = await supabase
      .from('students')
      .select('id, student_id, profiles:profile_id(first_name,last_name)')
      .eq('class_id', classId).eq('is_active', true).order('student_id');
    const studList = (studs || []) as unknown as StudentOption[];
    setStudents(studList);
    setStudentIdx(0);

    // Subjects
    let subjectNames: string[] = [];
    const { data: subRows } = await supabase
      .from('subjects').select('name')
      .eq('class_id', classId).eq('term', term).eq('academic_year', year).eq('is_active', true).order('name');
    if (subRows && subRows.length > 0) {
      subjectNames = subRows.map((s: { name: string }) => s.name);
    } else {
      const ids = studList.map(s => s.id);
      if (ids.length > 0) {
        const { data: gr } = await supabase.from('grades').select('subject')
          .in('student_id', ids).eq('term', term).eq('academic_year', year);
        subjectNames = [...new Set((gr || []).map((g: { subject: string }) => g.subject))].sort();
      }
      if (!subjectNames.length)
        subjectNames = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies'];
    }
    setSubjects(subjectNames);

    // Pre-fill all existing grades
    const init: AllScores = {};
    studList.forEach(s => {
      init[s.id] = {};
      subjectNames.forEach(sub => { init[s.id][sub] = emptySubjectScores(); });
    });
    const ids = studList.map(s => s.id);
    if (ids.length) {
      const { data: existing } = await supabase.from('grades')
        .select('student_id, subject, assessment_type, score')
        .in('student_id', ids).eq('term', term).eq('academic_year', year);
      (existing || []).forEach((g: { student_id: string; subject: string; assessment_type: string; score: number }) => {
        if (!init[g.student_id]) return;
        if (!init[g.student_id][g.subject]) init[g.student_id][g.subject] = emptySubjectScores();
        const t = g.assessment_type.toLowerCase();
        if (t === 'home work' || t === 'homework') init[g.student_id][g.subject].hw  = String(g.score);
        else if (t === '1st ca' || t === 'first ca')  init[g.student_id][g.subject].ca1 = String(g.score);
        else if (t === '2nd ca' || t === 'second ca') init[g.student_id][g.subject].ca2 = String(g.score);
        else if (t === 'exam' || t === 'examination') init[g.student_id][g.subject].exam = String(g.score);
      });
    }
    setAllScores(init);
    setLoaded(true);
    setLoading(false);
  }, [classId, term, year]);

  // Current student & their scores
  const currentStudent = students[studentIdx] ?? null;
  const currentScores: Record<string, SubjectScores> = currentStudent
    ? (allScores[currentStudent.id] ?? {})
    : {};

  const setScore = (subject: string, field: keyof SubjectScores, value: string) => {
    if (!currentStudent) return;
    setAllScores(prev => ({
      ...prev,
      [currentStudent.id]: {
        ...prev[currentStudent.id],
        [subject]: { ...(prev[currentStudent.id]?.[subject] ?? emptySubjectScores()), [field]: value },
      },
    }));
  };

  // Save scores for the current student only
  const saveStudent = async () => {
    if (!currentStudent) return;
    setSaving(true);

    const { error: delErr } = await supabase.from('grades').delete()
      .eq('student_id', currentStudent.id).eq('term', term).eq('academic_year', year);
    if (delErr) { setToast({ msg: delErr.message, type: 'error' }); setSaving(false); return; }

    const toInsert: object[] = [];
    subjects.forEach(subject => {
      const s = currentScores[subject] ?? emptySubjectScores();
      const hw   = s.hw   !== '' ? parseFloat(s.hw)   : null;
      const ca1  = s.ca1  !== '' ? parseFloat(s.ca1)  : null;
      const ca2  = s.ca2  !== '' ? parseFloat(s.ca2)  : null;
      const exam = s.exam !== '' ? parseFloat(s.exam) : null;
      const base = { student_id: currentStudent.id, subject, term, academic_year: year, graded_by: profile.id };
      if (hw  !== null && !isNaN(hw))  toInsert.push({ ...base, assessment_type: 'Home Work', score: hw,  max_score: 20 });
      if (ca1 !== null && !isNaN(ca1)) toInsert.push({ ...base, assessment_type: '1st CA',    score: ca1, max_score: 20 });
      if (ca2 !== null && !isNaN(ca2)) toInsert.push({ ...base, assessment_type: '2nd CA',    score: ca2, max_score: 20 });
      if (exam !== null && !isNaN(exam)) toInsert.push({ ...base, assessment_type: 'Exam',    score: exam,max_score: 60 });
    });

    if (toInsert.length) {
      const { error: insErr } = await supabase.from('grades').insert(toInsert);
      if (insErr) { setToast({ msg: insErr.message, type: 'error' }); setSaving(false); return; }
    }

    setSaved(prev => new Set([...prev, currentStudent.id]));
    setToast({ msg: `✓ ${currentStudent.profiles?.first_name}'s scores saved`, type: 'success' });
    setSaving(false);
  };

  // Move to next student and auto-save current
  const nextStudent = async () => {
    await saveStudent();
    setStudentIdx(i => Math.min(students.length - 1, i + 1));
  };

  const prevStudent = () => setStudentIdx(i => Math.max(0, i - 1));

  // Compute subject total for current student
  const getTotal = (subject: string) => {
    const s = currentScores[subject];
    if (!s) return null;
    const ca1  = parseFloat(s.ca1  || '0') || 0;
    const ca2  = parseFloat(s.ca2  || '0') || 0;
    const exam = parseFloat(s.exam || '0') || 0;
    if (!s.ca1 && !s.ca2 && !s.exam) return null;
    return ca1 + ca2 + exam;
  };

  const studentName = currentStudent
    ? `${currentStudent.profiles?.first_name ?? ''} ${currentStudent.profiles?.last_name ?? ''}`.trim()
    : '—';

  return (
    <div className="space-y-4">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Term</label>
          <select value={term} onChange={e => { setTerm(e.target.value); setLoaded(false); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Session</label>
          <select value={year} onChange={e => { setYear(e.target.value); setLoaded(false); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
            {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={loadSheet} disabled={!classId || loading}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TableProperties className="w-4 h-4" />}
          {loading ? 'Loading…' : loaded ? 'Reload' : 'Load Sheet'}
        </button>
      </div>

      {/* Empty state */}
      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <TableProperties size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Select a class and click <strong>Load Sheet</strong></p>
        </div>
      )}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Student navigator ── */}
      {loaded && students.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <button onClick={prevStudent} disabled={studentIdx === 0}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30">
            ← Prev
          </button>

          <select
            value={studentIdx}
            onChange={e => setStudentIdx(Number(e.target.value))}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          >
            {students.map((s, i) => {
              const n = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
              const tick = saved.has(s.id) ? ' ✓' : '';
              return <option key={s.id} value={i}>{n} ({s.student_id}){tick}</option>;
            })}
          </select>

          <span className="text-xs text-gray-400 whitespace-nowrap">
            {studentIdx + 1} / {students.length}
          </span>

          <button onClick={nextStudent} disabled={studentIdx === students.length - 1 || saving}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30">
            Next →
          </button>
        </div>
      )}

      {/* ── Grade entry grid — rows = subjects ── */}
      {loaded && currentStudent && subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Hint bar */}
          <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-700 flex items-center gap-3">
            <span>
              Entering scores for <strong>{studentName}</strong>
            </span>
            <span className="text-purple-400">·</span>
            <span><strong>Tab</strong> moves to next column &nbsp;·&nbsp; <strong>Enter</strong> saves &amp; moves to next row</span>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs">
                <th className="text-left px-4 py-3 font-semibold w-2/5">Subject</th>
                <th className="text-center px-3 py-3 font-semibold">
                  <span className="block">Home Work</span>
                  <span className="text-gray-400 font-normal text-[10px]">/20</span>
                </th>
                <th className="text-center px-3 py-3 font-semibold">
                  <span className="block">1st CA</span>
                  <span className="text-gray-400 font-normal text-[10px]">/20</span>
                </th>
                <th className="text-center px-3 py-3 font-semibold">
                  <span className="block">2nd CA</span>
                  <span className="text-gray-400 font-normal text-[10px]">/20</span>
                </th>
                <th className="text-center px-3 py-3 font-semibold">
                  <span className="block">Exam</span>
                  <span className="text-gray-400 font-normal text-[10px]">/60</span>
                </th>
                <th className="text-center px-3 py-3 font-semibold w-24">
                  <span className="block">Total</span>
                  <span className="text-gray-400 font-normal text-[10px]">/100</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, si) => {
                const sc = currentScores[subject] ?? emptySubjectScores();
                const total = getTotal(subject);
                const grade = total !== null ? nigerianGrade(total, 100) : null;
                return (
                  <tr key={subject} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 uppercase text-xs tracking-wide border-b border-gray-100">
                      {subject}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100">
                      <ScoreCell value={sc.hw}   max={20} onChange={v => setScore(subject, 'hw',   v)} tabIndex={si * 4 + 1} />
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100">
                      <ScoreCell value={sc.ca1}  max={20} onChange={v => setScore(subject, 'ca1',  v)} tabIndex={si * 4 + 2} />
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100">
                      <ScoreCell value={sc.ca2}  max={20} onChange={v => setScore(subject, 'ca2',  v)} tabIndex={si * 4 + 3} />
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100">
                      <ScoreCell value={sc.exam} max={60} onChange={v => setScore(subject, 'exam', v)} tabIndex={si * 4 + 4} />
                    </td>
                    <td className="px-3 py-2 text-center border-b border-gray-100">
                      {total !== null ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-gray-800">{total}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${grade?.color}`}>{grade?.label}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
              {saved.has(currentStudent.id) && <span className="ml-2 text-green-600 font-medium">✓ Saved</span>}
            </span>
            <div className="flex gap-2">
              <button onClick={saveStudent} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : `Save ${currentStudent.profiles?.first_name ?? ''}'s Scores`}
              </button>
              {studentIdx < students.length - 1 && (
                <button onClick={nextStudent} disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  Save &amp; Next →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loaded && students.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No students found in this class.</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RECORDS VIEW — existing filterable list
══════════════════════════════════════════════════════════════════════════ */
function RecordsView({ profile }: { profile: ProfileRow }) {
  const [grades, setGrades] = useState<GradeWithStudent[]>([]);
  const [myClasses, setMyClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterSubject, setFilterSubject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GradeWithStudent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: '', subject: '', assessment_type: '1st CA',
    score: '', max_score: '20', term: 'First Term', academic_year: getDefaultAcademicYear(),
  });

  useEffect(() => {
    const load = async () => {
      const { data: allClasses } = await supabase.from('classes').select('id, name').order('name');
      setMyClasses((allClasses || []) as Pick<ClassRow, 'id' | 'name'>[]);
      const { data: ownClassIds } = await supabase.from('classes').select('id').eq('teacher_id', profile.id);
      const ids = (ownClassIds || []).map((c: { id: string }) => c.id);
      if (ids.length > 0) {
        const { data } = await supabase.from('students').select('id, student_id, profiles:profile_id(first_name,last_name)').in('class_id', ids).eq('is_active', true).order('student_id');
        setStudents((data || []) as unknown as StudentOption[]);
      } else {
        const { data } = await supabase.from('students').select('id, student_id, profiles:profile_id(first_name,last_name)').eq('is_active', true).order('student_id');
        setStudents((data || []) as unknown as StudentOption[]);
      }
    };
    load();
  }, [profile.id]);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('grades')
      .select('*, students:student_id(id, student_id, profiles:profile_id(first_name,last_name), classes:class_id(id, name))')
      .order('created_at', { ascending: false })
      .limit(400);
    if (error) setToast({ msg: error.message, type: 'error' });
    setGrades((data || []) as GradeWithStudent[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const subjects = [...new Set(grades.map(g => g.subject))].sort();

  const filtered = grades.filter(g => {
    const name = `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.toLowerCase();
    return (
      (!search || name.includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase()) || g.students?.student_id?.toLowerCase().includes(search.toLowerCase())) &&
      (!filterClass || g.students?.classes?.id === filterClass) &&
      (!filterTerm || g.term === filterTerm) &&
      (!filterSubject || g.subject === filterSubject)
    );
  });

  const exportCSV = () => {
    const rows = [['Student', 'ID', 'Class', 'Subject', 'Type', 'Score', 'Max', 'Grade', 'Term']];
    filtered.forEach(g => {
      const { label } = nigerianGrade(g.score, g.max_score);
      rows.push([
        `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.trim(),
        g.students?.student_id ?? '', g.students?.classes?.name ?? '',
        g.subject, g.assessment_type, String(g.score), String(g.max_score), label, g.term,
      ]);
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = 'grades.csv'; a.click();
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ student_id: '', subject: '', assessment_type: '1st CA', score: '', max_score: '20', term: filterTerm || 'First Term', academic_year: getDefaultAcademicYear() });
    setShowModal(true);
  };
  const openEdit = (g: GradeWithStudent) => {
    setEditing(g);
    setForm({ student_id: g.student_id, subject: g.subject, assessment_type: g.assessment_type, score: String(g.score), max_score: String(g.max_score), term: g.term, academic_year: g.academic_year });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.subject.trim() || form.score === '') return setToast({ msg: 'Student, subject and score required', type: 'error' });
    const score = parseFloat(form.score);
    const max_score = parseFloat(form.max_score) || 100;
    if (isNaN(score) || score < 0) return setToast({ msg: 'Enter a valid score', type: 'error' });
    if (score > max_score) return setToast({ msg: `Score cannot exceed ${max_score}`, type: 'error' });
    setSaving(true);
    try {
      const payload = { student_id: form.student_id, subject: form.subject.trim(), assessment_type: form.assessment_type, score, max_score, term: form.term, academic_year: form.academic_year, graded_by: profile.id };
      if (editing) {
        const { error } = await supabase.from('grades').update(payload).eq('id', editing.id);
        if (error) throw error;
        setToast({ msg: 'Grade updated', type: 'success' });
      } else {
        const { error } = await supabase.from('grades').insert(payload);
        if (error) throw error;
        setToast({ msg: 'Grade added', type: 'success' });
      }
      setShowModal(false); fetchGrades();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' }); }
    setSaving(false);
  };

  const deleteGrade = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Deleted', type: 'success' }); fetchGrades(); }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-52" />
          </div>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All classes</option>
            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All terms</option>
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase text-left">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Term</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const { label, color } = nigerianGrade(g.score, g.max_score);
                  return (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-gray-800">{g.students?.profiles?.first_name} {g.students?.profiles?.last_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{g.students?.student_id}</div>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 text-sm">{g.students?.classes?.name ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-700">{g.subject}</td>
                      <td className="py-2.5 px-4 text-gray-500 text-xs">{g.assessment_type}</td>
                      <td className="py-2.5 px-4 font-semibold tabular-nums">{g.score}/{g.max_score}</td>
                      <td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span></td>
                      <td className="py-2.5 px-4 text-gray-400 text-xs">{g.term}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteGrade(g.id)} disabled={deleting === g.id} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 disabled:opacity-40">
                            {deleting === g.id ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                    {grades.length === 0 ? 'No grades yet — use Grade Sheet to enter scores.' : 'No records match the filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single-grade modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" /> {editing ? 'Edit Grade' : 'Add Grade'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Student *</label>
                <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.profiles?.first_name} {s.profiles?.last_name} ({s.student_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                {subjects.length > 0 ? (
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assessment Type</label>
                <select value={form.assessment_type}
                  onChange={e => { const t = e.target.value; setForm(f => ({ ...f, assessment_type: t, ...(DEFAULT_MAX[t] ? { max_score: String(DEFAULT_MAX[t]) } : {}) })); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  {ASSESSMENT_TYPES.map(t => <option key={t}>{t}{DEFAULT_MAX[t] ? ` (max ${DEFAULT_MAX[t]})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Score *</label>
                  <input type="number" min={0} step={0.5} value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
                  <input type="number" min={1} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                  <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT — two-tab wrapper
══════════════════════════════════════════════════════════════════════════ */
export default function GradesSection({ profile }: Props) {
  const [tab, setTab] = useState<'sheet' | 'records'>('sheet');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Grades</h2>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'sheet',   label: 'Grade Sheet', icon: TableProperties },
            { key: 'records', label: 'View Records', icon: List },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'sheet'   && <GradeSheet   profile={profile} />}
      {tab === 'records' && <RecordsView  profile={profile} />}
    </div>
  );
}
