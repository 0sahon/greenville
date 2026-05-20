import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, TableProperties, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, ClassRow } from '../../../lib/supabase';
import { getNigerianGrade } from '../../../lib/grading';

interface StudentOption { id: string; student_id: string; profiles?: { first_name: string; last_name: string } | null; }
type SubjectScores = { ca1: string; ca2: string; project: string; hw: string; exam: string };
type AllScores = Record<string, Record<string, SubjectScores>>;
const emptySubjectScores = (): SubjectScores => ({ ca1: '', ca2: '', project: '', hw: '', exam: '' });

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

function ScoreCell({ value, max, onChange, tabIndex }: { value: string; max: number; onChange: (v: string) => void; tabIndex: number }) {
  const num = parseFloat(value);
  const over = !isNaN(num) && num > max;
  const filled = value !== '' && !isNaN(num);
  return (
    <input type="text" inputMode="numeric" tabIndex={tabIndex} value={value}
      onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v); }}
      onFocus={e => e.target.select()} placeholder="—"
      className={['w-14 text-center text-sm font-mono py-1.5 px-1 rounded focus:outline-none transition-colors border-b-2 bg-transparent',
        over ? 'border-red-400 text-red-600' : filled ? 'border-green-400 text-gray-800' : 'border-gray-200 text-gray-400 focus:border-purple-400',
      ].join(' ')}
    />
  );
}

export default function GradeSheetTab({ profile }: { profile: ProfileRow }) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [year, setYear] = useState(getDefaultAcademicYear());
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [allScores, setAllScores] = useState<AllScores>({});
  const [studentIdx, setStudentIdx] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.from('classes').select('id,name').eq('teacher_id', profile.id).order('name')
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, [profile.id]);

  const loadSheet = useCallback(async () => {
    if (!classId) return;
    setLoading(true); setLoaded(false); setSaved(new Set());
    const { data: studs } = await supabase.from('students')
      .select('id, student_id, profiles:profile_id(first_name,last_name)')
      .eq('class_id', classId).eq('is_active', true).order('student_id');
    const studList = (studs || []) as unknown as StudentOption[];
    setStudents(studList); setStudentIdx(0);

    let subjectNames: string[] = [];
    const { data: subRows } = await supabase.from('subjects').select('name')
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
      if (!subjectNames.length) subjectNames = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies'];
    }
    setSubjects(subjectNames);

    const init: AllScores = {};
    studList.forEach(s => { init[s.id] = {}; subjectNames.forEach(sub => { init[s.id][sub] = emptySubjectScores(); }); });
    const ids = studList.map(s => s.id);
    if (ids.length) {
      const { data: existing } = await supabase.from('grades')
        .select('student_id, subject, assessment_type, score, max_score')
        .in('student_id', ids).eq('term', term).eq('academic_year', year);
      (existing || []).forEach((g: { student_id: string; subject: string; assessment_type: string; score: number; max_score: number }) => {
        if (!init[g.student_id]) return;
        if (!init[g.student_id][g.subject]) init[g.student_id][g.subject] = emptySubjectScores();
        const t = g.assessment_type.toLowerCase();
        if (t === 'home work' || t === 'homework' || t === 'hw' || t === 'assignment') init[g.student_id][g.subject].hw = String(g.score);
        else if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment') init[g.student_id][g.subject].ca1 = String(g.score);
        else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment') init[g.student_id][g.subject].ca2 = String(g.score);
        else if (t === 'project') init[g.student_id][g.subject].project = String(g.score);
        else if (t === 'exam' || t === 'examination') init[g.student_id][g.subject].exam = String(g.score);
      });
    }
    setAllScores(init); setLoaded(true); setLoading(false);
  }, [classId, term, year]);

  const currentStudent = students[studentIdx] ?? null;
  const currentScores: Record<string, SubjectScores> = currentStudent ? (allScores[currentStudent.id] ?? {}) : {};

  const setScore = (subject: string, field: keyof SubjectScores, value: string) => {
    if (!currentStudent) return;
    setAllScores(prev => ({ ...prev, [currentStudent.id]: { ...prev[currentStudent.id], [subject]: { ...(prev[currentStudent.id]?.[subject] ?? emptySubjectScores()), [field]: value } } }));
  };

  const saveStudent = async () => {
    if (!currentStudent) return;
    setSaving(true);
    const validationErrors: string[] = [];
    subjects.forEach(subject => {
      const s = currentScores[subject] ?? emptySubjectScores();
      const ca1 = s.ca1 !== '' ? parseFloat(s.ca1) : null;
      const ca2 = s.ca2 !== '' ? parseFloat(s.ca2) : null;
      const project = s.project !== '' ? parseFloat(s.project) : null;
      const hw = s.hw !== '' ? parseFloat(s.hw) : null;
      const exam = s.exam !== '' ? parseFloat(s.exam) : null;
      if (ca1 !== null && !isNaN(ca1) && ca1 > 15) validationErrors.push(`${subject}: 1st CA cannot exceed 15`);
      if (ca2 !== null && !isNaN(ca2) && ca2 > 15) validationErrors.push(`${subject}: 2nd CA cannot exceed 15`);
      if (project !== null && !isNaN(project) && project > 10) validationErrors.push(`${subject}: Project cannot exceed 10`);
      if (hw !== null && !isNaN(hw) && hw > 10) validationErrors.push(`${subject}: Homework cannot exceed 10`);
      if (exam !== null && !isNaN(exam) && exam > 50) validationErrors.push(`${subject}: Exam cannot exceed 50`);
      if (ca1 !== null && !isNaN(ca1) && ca1 < 0) validationErrors.push(`${subject}: 1st CA cannot be negative`);
      if (ca2 !== null && !isNaN(ca2) && ca2 < 0) validationErrors.push(`${subject}: 2nd CA cannot be negative`);
      if (project !== null && !isNaN(project) && project < 0) validationErrors.push(`${subject}: Project cannot be negative`);
      if (hw !== null && !isNaN(hw) && hw < 0) validationErrors.push(`${subject}: Homework cannot be negative`);
      if (exam !== null && !isNaN(exam) && exam < 0) validationErrors.push(`${subject}: Exam cannot be negative`);
    });
    if (validationErrors.length > 0) { setToast({ msg: validationErrors[0], type: 'error' }); setSaving(false); return; }

    const toUpsert: object[] = [];
    subjects.forEach(subject => {
      const s = currentScores[subject] ?? emptySubjectScores();
      const ca1 = s.ca1 !== '' ? parseFloat(s.ca1) : null;
      const ca2 = s.ca2 !== '' ? parseFloat(s.ca2) : null;
      const project = s.project !== '' ? parseFloat(s.project) : null;
      const hw = s.hw !== '' ? parseFloat(s.hw) : null;
      const exam = s.exam !== '' ? parseFloat(s.exam) : null;
      const base = { student_id: currentStudent.id, subject, term, academic_year: year, graded_by: profile.id };
      if (ca1 !== null && !isNaN(ca1)) toUpsert.push({ ...base, assessment_type: '1st CA', score: ca1, max_score: 15 });
      if (ca2 !== null && !isNaN(ca2)) toUpsert.push({ ...base, assessment_type: '2nd CA', score: ca2, max_score: 15 });
      if (project !== null && !isNaN(project)) toUpsert.push({ ...base, assessment_type: 'Project', score: project, max_score: 10 });
      if (hw !== null && !isNaN(hw)) toUpsert.push({ ...base, assessment_type: 'Home Work', score: hw, max_score: 10 });
      if (exam !== null && !isNaN(exam)) toUpsert.push({ ...base, assessment_type: 'Exam', score: exam, max_score: 50 });
    });
    if (toUpsert.length) {
      const { error: upsertErr } = await supabase.from('grades').upsert(toUpsert, { onConflict: 'student_id,subject,assessment_type,term,academic_year' });
      if (upsertErr) { setToast({ msg: upsertErr.message, type: 'error' }); setSaving(false); return; }
    }
    setSaved(prev => new Set([...prev, currentStudent.id]));
    setToast({ msg: `✓ ${currentStudent.profiles?.first_name}'s scores saved`, type: 'success' });
    setSaving(false);
  };

  const nextStudent = async () => { await saveStudent(); setStudentIdx(i => Math.min(students.length - 1, i + 1)); };
  const prevStudent = () => setStudentIdx(i => Math.max(0, i - 1));

  const getTotal = (subject: string) => {
    const s = currentScores[subject];
    if (!s) return null;
    const ca1 = parseFloat(s.ca1 || '0') || 0;
    const ca2 = parseFloat(s.ca2 || '0') || 0;
    const project = parseFloat(s.project || '0') || 0;
    const hw = parseFloat(s.hw || '0') || 0;
    const exam = parseFloat(s.exam || '0') || 0;
    if (!s.ca1 && !s.ca2 && !s.project && !s.hw && !s.exam) return null;
    return ca1 + ca2 + project + hw + exam;
  };

  const studentName = currentStudent
    ? `${currentStudent.profiles?.first_name ?? ''} ${currentStudent.profiles?.last_name ?? ''}`.trim() : '—';

  return (
    <div className="space-y-4">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

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

      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <TableProperties size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Select a class and click <strong>Load Sheet</strong></p>
        </div>
      )}
      {loading && <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>}

      {loaded && students.length > 0 && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <button onClick={prevStudent} disabled={studentIdx === 0}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 active:scale-95 transition-transform">←</button>
          <select value={studentIdx} onChange={e => setStudentIdx(Number(e.target.value))}
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
            {students.map((s, i) => {
              const n = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
              return <option key={s.id} value={i}>{n} ({s.student_id}){saved.has(s.id) ? ' ✓' : ''}</option>;
            })}
          </select>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{studentIdx + 1}/{students.length}</span>
          <button onClick={nextStudent} disabled={studentIdx === students.length - 1 || saving}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 active:scale-95 transition-transform">→</button>
        </div>
      )}

      {loaded && currentStudent && subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-700 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Scores for <strong>{studentName}</strong></span>
            <span className="hidden sm:inline text-purple-400">·</span>
            <span className="hidden sm:inline"><strong>Tab</strong> = next cell · <strong>Enter</strong> = next row</span>
          </div>
          <div className="px-3 py-1.5 bg-gray-700 border-b border-gray-600 text-[10px] text-gray-300 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>1st CA <span className="text-green-400 font-semibold">/15</span></span>
            <span>2nd CA <span className="text-green-400 font-semibold">/15</span></span>
            <span>Project <span className="text-green-400 font-semibold">/10</span></span>
            <span>HW <span className="text-green-400 font-semibold">/10</span></span>
            <span>Exam <span className="text-green-400 font-semibold">/50</span></span>
            <span className="ml-auto font-bold text-white">Total <span className="text-yellow-400">/100</span></span>
          </div>

          {/* Mobile: one card per subject */}
          <div className="sm:hidden divide-y divide-gray-100">
            {subjects.map((subject, si) => {
              const sc = currentScores[subject] ?? emptySubjectScores();
              const total = getTotal(subject);
              const grade = total !== null ? getNigerianGrade(total) : null;
              type FD = { key: keyof SubjectScores; label: string; max: number };
              const fields: FD[] = [{ key: 'ca1', label: '1st CA', max: 15 }, { key: 'ca2', label: '2nd CA', max: 15 }, { key: 'project', label: 'Project', max: 10 }, { key: 'hw', label: 'HW', max: 10 }, { key: 'exam', label: 'Exam', max: 50 }];
              return (
                <div key={subject} className={`px-4 py-3 ${si % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wide flex-1 mr-2">{subject}</span>
                    {total !== null ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-black text-gray-800 text-base leading-none">{total}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${grade?.color}`}>{grade?.grade}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs flex-shrink-0">not entered</span>}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {fields.map(({ key, label, max }, fi) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-gray-500 font-semibold text-center leading-tight">{label}<br /><span className="text-gray-400">/{max}</span></span>
                        <input type="number" inputMode="numeric" min={0} max={max}
                          value={sc[key] || ''} onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setScore(subject, key, v); }}
                          onFocus={e => e.target.select()} placeholder="—" tabIndex={si * 5 + fi + 1}
                          className={['w-full text-center text-sm font-mono py-2 rounded-lg border-2 bg-white focus:outline-none transition-colors',
                            parseFloat(sc[key] || '0') > max ? 'border-red-400 text-red-600 bg-red-50' : sc[key] !== '' ? 'border-green-400 text-gray-800' : 'border-gray-200 text-gray-400 focus:border-purple-400',
                          ].join(' ')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: sticky-column table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: '520px' }}>
              <thead>
                <tr className="bg-gray-800 text-white text-xs">
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-800 z-10">Subject</th>
                  <th className="text-center px-3 py-3 font-semibold"><span className="block">1st CAT</span><span className="text-green-400 font-normal text-[10px]">/15</span></th>
                  <th className="text-center px-3 py-3 font-semibold"><span className="block">2nd CAT</span><span className="text-green-400 font-normal text-[10px]">/15</span></th>
                  <th className="text-center px-3 py-3 font-semibold"><span className="block">Project</span><span className="text-green-400 font-normal text-[10px]">/10</span></th>
                  <th className="text-center px-3 py-3 font-semibold"><span className="block">HW/Assign</span><span className="text-green-400 font-normal text-[10px]">/10</span></th>
                  <th className="text-center px-3 py-3 font-semibold"><span className="block">Exam</span><span className="text-green-400 font-normal text-[10px]">/50</span></th>
                  <th className="text-center px-3 py-3 font-semibold w-24"><span className="block">Total</span><span className="text-yellow-400 font-normal text-[10px]">/100</span></th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, si) => {
                  const sc = currentScores[subject] ?? emptySubjectScores();
                  const total = getTotal(subject);
                  const grade = total !== null ? getNigerianGrade(total) : null;
                  return (
                    <tr key={subject} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 uppercase text-xs tracking-wide border-b border-gray-100 sticky left-0 z-10" style={{ background: 'inherit' }}>{subject}</td>
                      <td className="px-2 py-2 text-center border-b border-gray-100"><ScoreCell value={sc.ca1} max={15} onChange={v => setScore(subject, 'ca1', v)} tabIndex={si * 5 + 1} /></td>
                      <td className="px-2 py-2 text-center border-b border-gray-100"><ScoreCell value={sc.ca2} max={15} onChange={v => setScore(subject, 'ca2', v)} tabIndex={si * 5 + 2} /></td>
                      <td className="px-2 py-2 text-center border-b border-gray-100"><ScoreCell value={sc.project} max={10} onChange={v => setScore(subject, 'project', v)} tabIndex={si * 5 + 3} /></td>
                      <td className="px-2 py-2 text-center border-b border-gray-100"><ScoreCell value={sc.hw} max={10} onChange={v => setScore(subject, 'hw', v)} tabIndex={si * 5 + 4} /></td>
                      <td className="px-2 py-2 text-center border-b border-gray-100"><ScoreCell value={sc.exam} max={50} onChange={v => setScore(subject, 'exam', v)} tabIndex={si * 5 + 5} /></td>
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
