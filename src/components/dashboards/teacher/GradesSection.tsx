import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, Search, Plus, X, Edit2, Trash2, Download,
  Save, RefreshCw, TableProperties, List, FileSpreadsheet, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, GradeRow, ClassRow } from '../../../lib/supabase';
import { nigerianGrade, getNigerianGrade } from '../../../lib/grading';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface GradeWithStudent extends GradeRow {
  students?: {
    id: string; student_id: string;
    profiles?: { first_name: string; last_name: string };
    classes?: { id: string; name: string };
  } | null;
}
interface StudentOption { id: string; student_id: string; profiles?: { first_name: string; last_name: string } | null; }

const ASSESSMENT_TYPES = ['Home Work', '1st CA', '2nd CA', 'Project', 'Exam', 'Test', 'CA', 'Assignment', 'Quiz'];
// Montessori Greenville score limits: CA1/15, CA2/15, Project/10, HW/10, Exam/50
const DEFAULT_MAX: Record<string, number> = { 'Home Work': 10, '1st CA': 15, '2nd CA': 15, 'Project': 10, 'Exam': 50, 'Test': 30 };

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
// Matches Greenville Montessori report card: 1st CA/15, 2nd CA/15, Project/10, HW/10, Exam/50
type SubjectScores = { ca1: string; ca2: string; project: string; hw: string; exam: string };
// allScores[studentId][subject] = SubjectScores
type AllScores = Record<string, Record<string, SubjectScores>>;

const emptySubjectScores = (): SubjectScores => ({ ca1: '', ca2: '', project: '', hw: '', exam: '' });

/* ══════════════════════════════════════════════════════════════════════════
   GRADE SHEET — subjects as rows, 1st CA | 2nd CA | Project | HW | Exam as columns
   Matches physical report card: CA1/15, CA2/15, Project/10, HW/10, Exam/50 = 100
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
    // BUG FIX: fetch max_score too so we can normalise legacy data (old max_score=20 → display as /15)
    const init: AllScores = {};
    studList.forEach(s => {
      init[s.id] = {};
      subjectNames.forEach(sub => { init[s.id][sub] = emptySubjectScores(); });
    });
    const ids = studList.map(s => s.id);
    if (ids.length) {
      const { data: existing } = await supabase.from('grades')
        .select('student_id, subject, assessment_type, score, max_score')
        .in('student_id', ids).eq('term', term).eq('academic_year', year);
      (existing || []).forEach((g: { student_id: string; subject: string; assessment_type: string; score: number; max_score: number }) => {
        if (!init[g.student_id]) return;
        if (!init[g.student_id][g.subject]) init[g.student_id][g.subject] = emptySubjectScores();
        const t = g.assessment_type.toLowerCase();
        // Raw system: store and display the exact score as entered — no normalisation
        if (t === 'home work' || t === 'homework' || t === 'hw' || t === 'assignment')
          init[g.student_id][g.subject].hw  = String(g.score);
        else if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment')
          init[g.student_id][g.subject].ca1 = String(g.score);
        else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment')
          init[g.student_id][g.subject].ca2 = String(g.score);
        else if (t === 'project')
          init[g.student_id][g.subject].project = String(g.score);
        else if (t === 'exam' || t === 'examination')
          init[g.student_id][g.subject].exam = String(g.score);
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

    // ── Server-side validation before any DB writes ──────────────────────────
    const validationErrors: string[] = [];
    subjects.forEach(subject => {
      const s = currentScores[subject] ?? emptySubjectScores();
      const ca1     = s.ca1     !== '' ? parseFloat(s.ca1)     : null;
      const ca2     = s.ca2     !== '' ? parseFloat(s.ca2)     : null;
      const project = s.project !== '' ? parseFloat(s.project) : null;
      const hw      = s.hw      !== '' ? parseFloat(s.hw)      : null;
      const exam    = s.exam    !== '' ? parseFloat(s.exam)    : null;
      if (ca1     !== null && (!isNaN(ca1))     && ca1     > 15) validationErrors.push(`${subject}: 1st CA cannot exceed 15`);
      if (ca2     !== null && (!isNaN(ca2))     && ca2     > 15) validationErrors.push(`${subject}: 2nd CA cannot exceed 15`);
      if (project !== null && (!isNaN(project)) && project > 10) validationErrors.push(`${subject}: Project cannot exceed 10`);
      if (hw      !== null && (!isNaN(hw))      && hw      > 10) validationErrors.push(`${subject}: Homework cannot exceed 10`);
      if (exam    !== null && (!isNaN(exam))    && exam    > 50) validationErrors.push(`${subject}: Exam cannot exceed 50`);
      if (ca1     !== null && (!isNaN(ca1))     && ca1     < 0)  validationErrors.push(`${subject}: 1st CA cannot be negative`);
      if (ca2     !== null && (!isNaN(ca2))     && ca2     < 0)  validationErrors.push(`${subject}: 2nd CA cannot be negative`);
      if (project !== null && (!isNaN(project)) && project < 0)  validationErrors.push(`${subject}: Project cannot be negative`);
      if (hw      !== null && (!isNaN(hw))      && hw      < 0)  validationErrors.push(`${subject}: Homework cannot be negative`);
      if (exam    !== null && (!isNaN(exam))    && exam    < 0)  validationErrors.push(`${subject}: Exam cannot be negative`);
    });
    if (validationErrors.length > 0) {
      setToast({ msg: validationErrors[0], type: 'error' });
      setSaving(false);
      return;
    }

    const toUpsert: object[] = [];
    subjects.forEach(subject => {
      const s = currentScores[subject] ?? emptySubjectScores();
      const ca1     = s.ca1     !== '' ? parseFloat(s.ca1)     : null;
      const ca2     = s.ca2     !== '' ? parseFloat(s.ca2)     : null;
      const project = s.project !== '' ? parseFloat(s.project) : null;
      const hw      = s.hw      !== '' ? parseFloat(s.hw)      : null;
      const exam    = s.exam    !== '' ? parseFloat(s.exam)    : null;
      const base = { student_id: currentStudent.id, subject, term, academic_year: year, graded_by: profile.id };
      if (ca1     !== null && !isNaN(ca1))     toUpsert.push({ ...base, assessment_type: '1st CA',    score: ca1,     max_score: 15 });
      if (ca2     !== null && !isNaN(ca2))     toUpsert.push({ ...base, assessment_type: '2nd CA',    score: ca2,     max_score: 15 });
      if (project !== null && !isNaN(project)) toUpsert.push({ ...base, assessment_type: 'Project',   score: project, max_score: 10 });
      if (hw      !== null && !isNaN(hw))      toUpsert.push({ ...base, assessment_type: 'Home Work', score: hw,      max_score: 10 });
      if (exam    !== null && !isNaN(exam))    toUpsert.push({ ...base, assessment_type: 'Exam',      score: exam,    max_score: 50 });
    });

    if (toUpsert.length) {
      const { error: upsertErr } = await supabase.from('grades').upsert(toUpsert, {
        onConflict: 'student_id,subject,assessment_type,term,academic_year',
      });
      if (upsertErr) { setToast({ msg: upsertErr.message, type: 'error' }); setSaving(false); return; }
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

  // Compute subject total for current student — all 5 components
  const getTotal = (subject: string) => {
    const s = currentScores[subject];
    if (!s) return null;
    const ca1     = parseFloat(s.ca1     || '0') || 0;
    const ca2     = parseFloat(s.ca2     || '0') || 0;
    const project = parseFloat(s.project || '0') || 0;
    const hw      = parseFloat(s.hw      || '0') || 0;
    const exam    = parseFloat(s.exam    || '0') || 0;
    if (!s.ca1 && !s.ca2 && !s.project && !s.hw && !s.exam) return null;
    return ca1 + ca2 + project + hw + exam;
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
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <button onClick={prevStudent} disabled={studentIdx === 0}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 active:scale-95 transition-transform">
            ←
          </button>

          <select
            value={studentIdx}
            onChange={e => setStudentIdx(Number(e.target.value))}
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          >
            {students.map((s, i) => {
              const n = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
              const tick = saved.has(s.id) ? ' ✓' : '';
              return <option key={s.id} value={i}>{n} ({s.student_id}){tick}</option>;
            })}
          </select>

          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {studentIdx + 1}/{students.length}
          </span>

          <button onClick={nextStudent} disabled={studentIdx === students.length - 1 || saving}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 active:scale-95 transition-transform">
            →
          </button>
        </div>
      )}

      {/* ── Grade entry grid ── */}
      {loaded && currentStudent && subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Hint bar */}
          <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-700 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Scores for <strong>{studentName}</strong></span>
            <span className="hidden sm:inline text-purple-400">·</span>
            <span className="hidden sm:inline"><strong>Tab</strong> = next cell  ·  <strong>Enter</strong> = next row</span>
          </div>

          {/* Score legend strip */}
          <div className="px-3 py-1.5 bg-gray-700 border-b border-gray-600 text-[10px] text-gray-300 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>1st CA <span className="text-green-400 font-semibold">/15</span></span>
            <span>2nd CA <span className="text-green-400 font-semibold">/15</span></span>
            <span>Project <span className="text-green-400 font-semibold">/10</span></span>
            <span>HW <span className="text-green-400 font-semibold">/10</span></span>
            <span>Exam <span className="text-green-400 font-semibold">/50</span></span>
            <span className="ml-auto font-bold text-white">Total <span className="text-yellow-400">/100</span></span>
          </div>

          {/* ══ MOBILE: one card per subject (≤ sm) ══ */}
          <div className="sm:hidden divide-y divide-gray-100">
            {subjects.map((subject, si) => {
              const sc = currentScores[subject] ?? emptySubjectScores();
              const total = getTotal(subject);
              const grade = total !== null ? getNigerianGrade(total) : null;
              type FD = { key: keyof SubjectScores; label: string; max: number };
              const fields: FD[] = [
                { key: 'ca1',     label: '1st CA',  max: 15 },
                { key: 'ca2',     label: '2nd CA',  max: 15 },
                { key: 'project', label: 'Project', max: 10 },
                { key: 'hw',      label: 'HW',      max: 10 },
                { key: 'exam',    label: 'Exam',    max: 50 },
              ];
              return (
                <div key={subject} className={`px-4 py-3 ${si % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  {/* Subject header row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wide flex-1 mr-2">{subject}</span>
                    {total !== null ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-black text-gray-800 text-base leading-none">{total}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${grade?.color}`}>{grade?.grade}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs flex-shrink-0">not entered</span>}
                  </div>
                  {/* 5-column input grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {fields.map(({ key, label, max }, fi) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-gray-500 font-semibold text-center leading-tight">
                          {label}<br /><span className="text-gray-400">/{max}</span>
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0} max={max}
                          value={sc[key] || ''}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === '' || /^\d*\.?\d*$/.test(v)) setScore(subject, key, v);
                          }}
                          onFocus={e => e.target.select()}
                          placeholder="—"
                          tabIndex={si * 5 + fi + 1}
                          className={[
                            'w-full text-center text-sm font-mono py-2 rounded-lg border-2 bg-white focus:outline-none transition-colors',
                            parseFloat(sc[key] || '0') > max
                              ? 'border-red-400 text-red-600 bg-red-50'
                              : sc[key] !== ''
                              ? 'border-green-400 text-gray-800'
                              : 'border-gray-200 text-gray-400 focus:border-purple-400',
                          ].join(' ')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ══ DESKTOP: sticky-column table (≥ sm) ══ */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: '520px' }}>
              <thead>
                <tr className="bg-gray-800 text-white text-xs">
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-800 z-10">Subject</th>
                  <th className="text-center px-3 py-3 font-semibold">
                    <span className="block">1st CAT</span>
                    <span className="text-green-400 font-normal text-[10px]">/15</span>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold">
                    <span className="block">2nd CAT</span>
                    <span className="text-green-400 font-normal text-[10px]">/15</span>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold">
                    <span className="block">Project</span>
                    <span className="text-green-400 font-normal text-[10px]">/10</span>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold">
                    <span className="block">HW/Assign</span>
                    <span className="text-green-400 font-normal text-[10px]">/10</span>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold">
                    <span className="block">Exam</span>
                    <span className="text-green-400 font-normal text-[10px]">/50</span>
                  </th>
                  <th className="text-center px-3 py-3 font-semibold w-24">
                    <span className="block">Total</span>
                    <span className="text-yellow-400 font-normal text-[10px]">/100</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, si) => {
                  const sc = currentScores[subject] ?? emptySubjectScores();
                  const total = getTotal(subject);
                  const grade = total !== null ? getNigerianGrade(total) : null;
                  return (
                    <tr key={subject} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 uppercase text-xs tracking-wide border-b border-gray-100 sticky left-0 z-10" style={{ background: 'inherit' }}>
                        {subject}
                      </td>
                      <td className="px-2 py-2 text-center border-b border-gray-100">
                        <ScoreCell value={sc.ca1}     max={15} onChange={v => setScore(subject, 'ca1',     v)} tabIndex={si * 5 + 1} />
                      </td>
                      <td className="px-2 py-2 text-center border-b border-gray-100">
                        <ScoreCell value={sc.ca2}     max={15} onChange={v => setScore(subject, 'ca2',     v)} tabIndex={si * 5 + 2} />
                      </td>
                      <td className="px-2 py-2 text-center border-b border-gray-100">
                        <ScoreCell value={sc.project} max={10} onChange={v => setScore(subject, 'project', v)} tabIndex={si * 5 + 3} />
                      </td>
                      <td className="px-2 py-2 text-center border-b border-gray-100">
                        <ScoreCell value={sc.hw}      max={10} onChange={v => setScore(subject, 'hw',      v)} tabIndex={si * 5 + 4} />
                      </td>
                      <td className="px-2 py-2 text-center border-b border-gray-100">
                        <ScoreCell value={sc.exam}    max={50} onChange={v => setScore(subject, 'exam',    v)} tabIndex={si * 5 + 5} />
                      </td>
                      <td className="px-3 py-2 text-center border-b border-gray-100">
                        {total !== null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold text-gray-800">{total}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${grade?.color}`}>{grade?.grade}</span>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
              {saved.has(currentStudent.id) && <span className="ml-2 text-green-600 font-medium">✓ Saved</span>}
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={saveStudent} disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-transform">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : `Save ${currentStudent.profiles?.first_name ?? ''}'s Scores`}
              </button>
              {studentIdx < students.length - 1 && (
                <button onClick={nextStudent} disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 active:scale-95 transition-transform">
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
    score: '', max_score: '15', term: 'First Term', academic_year: getDefaultAcademicYear(),
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
      .select('id, subject, assessment_type, score, max_score, term, academic_year, created_at, student_id, students:student_id(id, student_id, profiles:profile_id(first_name,last_name), classes:class_id(id, name))')
      .eq('term', filterTerm)
      .eq('academic_year', getDefaultAcademicYear())
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) setToast({ msg: error.message, type: 'error' });
    setGrades((data || []) as GradeWithStudent[]);
    setLoading(false);
  }, [filterTerm]);

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
    setForm({ student_id: '', subject: '', assessment_type: '1st CA', score: '', max_score: '15', term: filterTerm || 'First Term', academic_year: getDefaultAcademicYear() });
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
                  <input type="number" inputMode="numeric" autoComplete="off" min={0} step={0.5} value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
                  <input type="number" inputMode="numeric" autoComplete="off" min={1} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))}
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
   DATASHEET ENTRY — matrix grid of students (rows) x grade components (cols)
   for a single selected subject
   ══════════════════════════════════════════════════════════════════════════ */
function DatasheetInputCell({
  value,
  max,
  onChange,
  rowIndex,
  colIndex,
  handleKeyDown
}: {
  value: string;
  max: number;
  onChange: (v: string) => void;
  rowIndex: number;
  colIndex: number;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => void;
}) {
  const num = parseFloat(value);
  const over = !isNaN(num) && num > max;
  const filled = value !== '' && !isNaN(num);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      data-row={rowIndex}
      data-col={colIndex}
      onChange={e => {
        const v = e.target.value;
        if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v);
      }}
      onKeyDown={e => handleKeyDown(e, rowIndex, colIndex)}
      onFocus={e => e.target.select()}
      placeholder="—"
      className={[
        'w-14 text-center text-sm font-mono py-1.5 px-2 rounded-lg focus:outline-none transition-all duration-200 border-2',
        over
          ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
          : filled
          ? 'border-purple-200 bg-purple-50/40 text-purple-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold'
          : 'border-gray-100 bg-gray-50/50 text-gray-400 focus:border-purple-400 focus:bg-white focus:text-gray-800'
      ].join(' ')}
    />
  );
}

function DatasheetEntry({ profile }: { profile: ProfileRow }) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [year, setYear] = useState(getDefaultAcademicYear());

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // scores[studentId] = { hw: string, ca1: string, ca2: string, project: string, exam: string }
  const [scores, setScores] = useState<Record<string, { hw: string; ca1: string; ca2: string; project: string; exam: string }>>({});

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Load assigned classes
  useEffect(() => {
    supabase.from('classes').select('id,name').eq('teacher_id', profile.id).order('name')
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, [profile.id]);

  // Load subjects for the selected class
  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }
    const fetchSubjects = async () => {
      const { data: subRows } = await supabase
        .from('subjects').select('name')
        .eq('class_id', classId).eq('term', term).eq('academic_year', year).eq('is_active', true).order('name');
      
      let subjectNames = (subRows || []).map((s: { name: string }) => s.name);
      
      if (!subjectNames.length) {
        const { data: studs } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId).eq('is_active', true);
        const ids = (studs || []).map(s => s.id);
        if (ids.length > 0) {
          const { data: gr } = await supabase.from('grades').select('subject')
            .in('student_id', ids).eq('term', term).eq('academic_year', year);
          subjectNames = [...new Set((gr || []).map((g: { subject: string }) => g.subject))].sort();
        }
      }
      if (!subjectNames.length) {
        subjectNames = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies'];
      }
      setSubjects(subjectNames);
      setSelectedSubject(subjectNames[0] || '');
    };
    fetchSubjects();
  }, [classId, term, year]);

  const loadDatasheet = async () => {
    if (!classId || !selectedSubject) return;
    setLoading(true);
    setLoaded(false);

    try {
      // 1. Fetch Students
      const { data: studs } = await supabase
        .from('students')
        .select('id, student_id, profiles:profile_id(first_name,last_name)')
        .eq('class_id', classId).eq('is_active', true).order('student_id');
      const studList = (studs || []) as unknown as StudentOption[];
      setStudents(studList);

      // 2. Fetch existing grades
      const init: Record<string, { hw: string; ca1: string; ca2: string; project: string; exam: string }> = {};
      studList.forEach(s => {
        init[s.id] = { hw: '', ca1: '', ca2: '', project: '', exam: '' };
      });

      const ids = studList.map(s => s.id);
      if (ids.length) {
        const { data: existing } = await supabase.from('grades')
          .select('student_id, assessment_type, score')
          .in('student_id', ids)
          .eq('subject', selectedSubject)
          .eq('term', term)
          .eq('academic_year', year);

        (existing || []).forEach((g: { student_id: string; assessment_type: string; score: number }) => {
          if (!init[g.student_id]) return;
          const t = g.assessment_type.toLowerCase().trim();
          if (t === 'home work' || t === 'homework') init[g.student_id].hw = String(g.score);
          else if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment') init[g.student_id].ca1 = String(g.score);
          else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment') init[g.student_id].ca2 = String(g.score);
          else if (t === 'project') init[g.student_id].project = String(g.score);
          else if (t === 'exam' || t === 'examination' || t === 'final exam') init[g.student_id].exam = String(g.score);
        });
      }
      setScores(init);
      setLoaded(true);
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Load failed', type: 'error' });
    }
    setLoading(false);
  };

  const handleScoreChange = (studentId: string, field: 'hw' | 'ca1' | 'ca2' | 'project' | 'exam', value: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'ArrowRight') {
      targetCol = colIndex + 1;
    } else if (e.key === 'ArrowLeft') {
      targetCol = colIndex - 1;
    } else if (e.key === 'ArrowDown') {
      targetRow = rowIndex + 1;
    } else if (e.key === 'ArrowUp') {
      targetRow = rowIndex - 1;
    } else if (e.key === 'Enter') {
      targetRow = rowIndex + 1;
      e.preventDefault();
    } else {
      return;
    }

    if (targetCol > 4) {
      if (targetRow < students.length - 1) {
        targetRow += 1;
        targetCol = 0;
      } else {
        targetCol = 4;
      }
    } else if (targetCol < 0) {
      if (targetRow > 0) {
        targetRow -= 1;
        targetCol = 4;
      } else {
        targetCol = 0;
      }
    }

    targetRow = Math.max(0, Math.min(students.length - 1, targetRow));

    const targetInput = document.querySelector(
      `[data-row="${targetRow}"][data-col="${targetCol}"]`
    ) as HTMLInputElement | null;

    if (targetInput) {
      targetInput.focus();
      targetInput.select();
      e.preventDefault();
    }
  };

  const computeStudentTotalAndGrade = (sScores: { hw: string; ca1: string; ca2: string; project: string; exam: string }) => {
    const hwVal = parseFloat(sScores.hw) || 0;
    const ca1Val = parseFloat(sScores.ca1) || 0;
    const ca2Val = parseFloat(sScores.ca2) || 0;
    const projVal = parseFloat(sScores.project) || 0;
    const examVal = parseFloat(sScores.exam) || 0;

    const hasAny = sScores.hw !== '' || sScores.ca1 !== '' || sScores.ca2 !== '' || sScores.project !== '' || sScores.exam !== '';
    if (!hasAny) return { total: null, grade: null };

    const hwScaled = sScores.hw !== '' ? Math.round((hwVal / 10) * 10) : 0;
    const ca1Scaled = sScores.ca1 !== '' ? Math.round((ca1Val / 15) * 15) : 0;
    const ca2Scaled = sScores.ca2 !== '' ? Math.round((ca2Val / 15) * 15) : 0;
    const projScaled = sScores.project !== '' ? Math.round((projVal / 10) * 10) : 0;
    const examScaled = sScores.exam !== '' ? Math.round((examVal / 50) * 50) : 0;

    const total = hwScaled + ca1Scaled + ca2Scaled + projScaled + examScaled;
    const { grade } = getNigerianGrade(total);
    return { total, grade };
  };

  const saveAllGrades = async () => {
    if (!classId || !selectedSubject) return;

    let hasError = false;
    let errorMsg = '';

    students.forEach(s => {
      const sScores = scores[s.id];
      if (!sScores) return;

      const hw = parseFloat(sScores.hw);
      const ca1 = parseFloat(sScores.ca1);
      const ca2 = parseFloat(sScores.ca2);
      const project = parseFloat(sScores.project);
      const exam = parseFloat(sScores.exam);

      if (!isNaN(hw) && hw > 10) { hasError = true; errorMsg = 'Homework score cannot exceed 10'; }
      if (!isNaN(ca1) && ca1 > 15) { hasError = true; errorMsg = '1st CA score cannot exceed 15'; }
      if (!isNaN(ca2) && ca2 > 15) { hasError = true; errorMsg = '2nd CA score cannot exceed 15'; }
      if (!isNaN(project) && project > 10) { hasError = true; errorMsg = 'Project score cannot exceed 10'; }
      if (!isNaN(exam) && exam > 50) { hasError = true; errorMsg = 'Exam score cannot exceed 50'; }
    });

    if (hasError) {
      setToast({ msg: errorMsg, type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const toUpsert: {
        student_id: string;
        subject: string;
        assessment_type: string;
        score: number;
        max_score: number;
        term: string;
        academic_year: string;
        graded_by: string;
      }[] = [];

      students.forEach(s => {
        const sScores = scores[s.id];
        if (!sScores) return;

        const hw = sScores.hw !== '' ? parseFloat(sScores.hw) : null;
        const ca1 = sScores.ca1 !== '' ? parseFloat(sScores.ca1) : null;
        const ca2 = sScores.ca2 !== '' ? parseFloat(sScores.ca2) : null;
        const project = sScores.project !== '' ? parseFloat(sScores.project) : null;
        const exam = sScores.exam !== '' ? parseFloat(sScores.exam) : null;

        const base = { student_id: s.id, subject: selectedSubject, term, academic_year: year, graded_by: profile.id };

        if (hw !== null && !isNaN(hw)) toUpsert.push({ ...base, assessment_type: 'Home Work', score: hw, max_score: 10 });
        if (ca1 !== null && !isNaN(ca1)) toUpsert.push({ ...base, assessment_type: '1st CA', score: ca1, max_score: 15 });
        if (ca2 !== null && !isNaN(ca2)) toUpsert.push({ ...base, assessment_type: '2nd CA', score: ca2, max_score: 15 });
        if (project !== null && !isNaN(project)) toUpsert.push({ ...base, assessment_type: 'Project', score: project, max_score: 10 });
        if (exam !== null && !isNaN(exam)) toUpsert.push({ ...base, assessment_type: 'Exam', score: exam, max_score: 50 });
      });

      if (toUpsert.length > 0) {
        const { error: upsertErr } = await supabase.from('grades').upsert(toUpsert, {
          onConflict: 'student_id,subject,assessment_type,term,academic_year',
        });
        if (upsertErr) throw upsertErr;
      }

      setToast({ msg: `✓ Saved grades for ${students.length} students successfully`, type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Batch save failed', type: 'error' });
    }
    setSaving(false);
  };

  const getGradePillClass = (grade: string) => {
    if (grade === 'A+') return 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.1)]';
    if (grade === 'A') return 'bg-teal-50 text-teal-700 border border-teal-200';
    if (grade === 'B') return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    if (grade === 'C') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (grade === 'D') return 'bg-orange-50 text-orange-700 border border-orange-200';
    if (grade === 'E') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  const totalStudents = students.length;
  const completedCount = students.filter(s => {
    const sc = scores[s.id];
    return sc && (sc.hw !== '' || sc.ca1 !== '' || sc.ca2 !== '' || sc.project !== '' || sc.exam !== '');
  }).length;
  const percentComplete = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Control Center Panel ── */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-purple-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-purple-300 uppercase">Premium Matrix Mode</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">Datasheet Entry</h3>
            <p className="text-xs text-purple-200/70 max-w-xl">
              Enter subject grades concurrently. Move quickly with <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Arrow Keys</kbd> &amp; <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Enter</kbd>. Saves automatically override existing records.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-purple-300 mb-1">Class</label>
              <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }}
                className="w-full border border-purple-800/40 bg-purple-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-white">
                <option value="" className="bg-purple-950 text-white">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id} className="bg-purple-950 text-white">{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-purple-300 mb-1">Subject</label>
              <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setLoaded(false); }}
                className="w-full border border-purple-800/40 bg-purple-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-white" disabled={!classId || subjects.length === 0}>
                <option value="" className="bg-purple-950 text-white">Select Subject</option>
                {subjects.map(sub => <option key={sub} value={sub} className="bg-purple-950 text-white">{sub}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-purple-300 mb-1">Term</label>
              <select value={term} onChange={e => { setTerm(e.target.value); setLoaded(false); }}
                className="border border-purple-800/40 bg-purple-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-white">
                {TERMS.map(t => <option key={t} value={t} className="bg-purple-950 text-white">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-purple-300 mb-1">Session</label>
              <select value={year} onChange={e => { setYear(e.target.value); setLoaded(false); }}
                className="border border-purple-800/40 bg-purple-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-white">
                {getAcademicYearOptions().map(y => <option key={y} value={y} className="bg-purple-950 text-white">{y}</option>)}
              </select>
            </div>
            <button onClick={loadDatasheet} disabled={!classId || !selectedSubject || loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 active:scale-95 h-[38px]">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {loading ? 'Loading…' : 'Load Grid'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Empty State ── */}
      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400 mb-4">
            <FileSpreadsheet size={32} className="opacity-80" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Datasheet is ready to load</p>
          <p className="text-xs text-gray-400 mt-1">Select class and subject above, then click <strong>Load Grid</strong>.</p>
        </div>
      )}

      {/* ── Loading Spinner ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
          <span className="text-sm text-gray-500 font-medium">Fetching students and matching records…</span>
        </div>
      )}

      {/* ── Main Spreadsheet Grid ── */}
      {loaded && students.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Subject</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-lg">{selectedSubject}</span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-[10px] font-bold text-purple-700 border border-purple-100 uppercase">{term}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-2.5 px-4 shadow-sm">
              <div className="space-y-1 min-w-[120px]">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Entry Progress</span>
                  <span>{percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${percentComplete}%` }} />
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-lg font-black text-gray-800">{completedCount}</span>
                <span className="text-xs text-gray-400 font-semibold"> / {totalStudents} students</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-xs border-b border-gray-700 uppercase tracking-wider font-semibold">
                  <th className="text-left px-6 py-3.5 w-1/4">Student Info</th>
                  <th className="text-center px-3 py-3.5">
                    <span className="block text-gray-200">Homework</span>
                    <span className="text-purple-300 font-bold text-[9px]">Max: 10</span>
                  </th>
                  <th className="text-center px-3 py-3.5">
                    <span className="block text-gray-200">1st CA</span>
                    <span className="text-purple-300 font-bold text-[9px]">Max: 15</span>
                  </th>
                  <th className="text-center px-3 py-3.5">
                    <span className="block text-gray-200">2nd CA</span>
                    <span className="text-purple-300 font-bold text-[9px]">Max: 15</span>
                  </th>
                  <th className="text-center px-3 py-3.5">
                    <span className="block text-gray-200">Project</span>
                    <span className="text-purple-300 font-bold text-[9px]">Max: 10</span>
                  </th>
                  <th className="text-center px-3 py-3.5">
                    <span className="block text-gray-200">Exam</span>
                    <span className="text-purple-300 font-bold text-[9px]">Max: 50</span>
                  </th>
                  <th className="text-center px-4 py-3.5 w-24">
                    <span className="block text-gray-200">Total</span>
                    <span className="text-purple-300 font-bold text-[9px]">/100</span>
                  </th>
                  <th className="text-center px-4 py-3.5 w-24">
                    <span className="block text-gray-200">Grade</span>
                    <span className="text-purple-300 font-bold text-[9px]">Letter</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, ri) => {
                  const sScores = scores[student.id] ?? { hw: '', ca1: '', ca2: '', project: '', exam: '' };
                  const name = `${student.profiles?.first_name ?? ''} ${student.profiles?.last_name ?? ''}`.trim();
                  const { total, grade } = computeStudentTotalAndGrade(sScores);
                  
                  return (
                    <tr key={student.id} className={[
                      'border-b border-gray-100 hover:bg-purple-50/20 transition-colors',
                      ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    ].join(' ')}>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-gray-800 text-xs sm:text-sm">{name}</div>
                        <div className="text-[10px] text-gray-400 font-mono tracking-wider mt-0.5">{student.student_id}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <DatasheetInputCell value={sScores.hw} max={10} rowIndex={ri} colIndex={0} onChange={v => handleScoreChange(student.id, 'hw', v)} handleKeyDown={handleKeyDown} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <DatasheetInputCell value={sScores.ca1} max={15} rowIndex={ri} colIndex={1} onChange={v => handleScoreChange(student.id, 'ca1', v)} handleKeyDown={handleKeyDown} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <DatasheetInputCell value={sScores.ca2} max={15} rowIndex={ri} colIndex={2} onChange={v => handleScoreChange(student.id, 'ca2', v)} handleKeyDown={handleKeyDown} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <DatasheetInputCell value={sScores.project} max={10} rowIndex={ri} colIndex={3} onChange={v => handleScoreChange(student.id, 'project', v)} handleKeyDown={handleKeyDown} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <DatasheetInputCell value={sScores.exam} max={50} rowIndex={ri} colIndex={4} onChange={v => handleScoreChange(student.id, 'exam', v)} handleKeyDown={handleKeyDown} />
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800 tabular-nums">
                        {total !== null ? total : <span className="text-gray-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {grade ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide border ${getGradePillClass(grade)}`}>
                            {grade}
                          </span>
                        ) : <span className="text-gray-300 font-normal text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-150 bg-gray-50/70">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Currently editing {totalStudents} student rows.
            </span>
            <button onClick={saveAllGrades} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 active:scale-95 w-full sm:w-auto justify-center">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving grades…' : `Save All ${selectedSubject} Grades`}
            </button>
          </div>
        </div>
      )}

      {loaded && students.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-700">No active students found</p>
          <p className="text-xs text-gray-400 mt-1">There are no active students in the selected class.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT — three-tab wrapper
   ══════════════════════════════════════════════════════════════════════════ */
export default function GradesSection({ profile }: Props) {
  const [tab, setTab] = useState<'sheet' | 'datasheet' | 'records'>('sheet');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Grades</h2>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'sheet',     label: 'Grade Sheet',     icon: TableProperties },
            { key: 'datasheet', label: 'Datasheet Entry', icon: FileSpreadsheet },
            { key: 'records',   label: 'View Records',    icon: List },
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

      {tab === 'sheet'     && <GradeSheet     profile={profile} />}
      {tab === 'datasheet' && <DatasheetEntry profile={profile} />}
      {tab === 'records'   && <RecordsView    profile={profile} />}
    </div>
  );
}
