import { useState, useEffect } from 'react';
import { X, RefreshCw, FileSpreadsheet, Save, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, ClassRow } from '../../../lib/supabase';
import { getNigerianGrade } from '../../../lib/grading';

interface StudentOption { id: string; student_id: string; profiles?: { first_name: string; last_name: string } | null; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

function DatasheetInputCell({ value, max, onChange, rowIndex, colIndex, handleKeyDown }: {
  value: string; max: number; onChange: (v: string) => void;
  rowIndex: number; colIndex: number;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => void;
}) {
  const num = parseFloat(value);
  const over = !isNaN(num) && num > max;
  const filled = value !== '' && !isNaN(num);
  return (
    <input type="text" inputMode="numeric" value={value} data-row={rowIndex} data-col={colIndex}
      onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v); }}
      onKeyDown={e => handleKeyDown(e, rowIndex, colIndex)} onFocus={e => e.target.select()} placeholder="—"
      className={['w-14 text-center text-sm font-mono py-1.5 px-2 rounded-lg focus:outline-none transition-all duration-200 border-2',
        over ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
          : filled ? 'border-indigo-200 bg-indigo-50/40 text-indigo-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold'
          : 'border-gray-100 bg-gray-50/50 text-gray-400 focus:border-indigo-400 focus:bg-white focus:text-gray-800',
      ].join(' ')}
    />
  );
}

export default function DatasheetEntryTab({ profile }: { profile: ProfileRow }) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [year, setYear] = useState(getDefaultAcademicYear());
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [scores, setScores] = useState<Record<string, { hw: string; ca1: string; ca2: string; project: string; exam: string }>>({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.from('classes').select('id,name').eq('teacher_id', profile.id).order('name')
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, [profile.id]);

  useEffect(() => {
    if (!classId) { setSubjects([]); setSelectedSubject(''); return; }
    const fetchSubjects = async () => {
      const { data: subRows } = await supabase.from('subjects').select('name')
        .eq('class_id', classId).eq('term', term).eq('academic_year', year).eq('is_active', true).order('name');
      let subjectNames = (subRows || []).map((s: { name: string }) => s.name);
      if (!subjectNames.length) {
        const { data: studs } = await supabase.from('students').select('id').eq('class_id', classId).eq('is_active', true);
        const ids = (studs || []).map(s => s.id);
        if (ids.length > 0) {
          const { data: gr } = await supabase.from('grades').select('subject').in('student_id', ids).eq('term', term).eq('academic_year', year);
          subjectNames = [...new Set((gr || []).map((g: { subject: string }) => g.subject))].sort();
        }
      }
      if (!subjectNames.length) subjectNames = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies'];
      setSubjects(subjectNames);
      setSelectedSubject(subjectNames[0] || '');
    };
    fetchSubjects();
  }, [classId, term, year]);

  const loadDatasheet = async () => {
    if (!classId || !selectedSubject) return;
    setLoading(true); setLoaded(false);
    try {
      const { data: studs } = await supabase.from('students')
        .select('id, student_id, profiles:profile_id(first_name,last_name)')
        .eq('class_id', classId).eq('is_active', true).order('student_id');
      const studList = (studs || []) as unknown as StudentOption[];
      setStudents(studList);
      const init: Record<string, { hw: string; ca1: string; ca2: string; project: string; exam: string }> = {};
      studList.forEach(s => { init[s.id] = { hw: '', ca1: '', ca2: '', project: '', exam: '' }; });
      const ids = studList.map(s => s.id);
      if (ids.length) {
        const { data: existing } = await supabase.from('grades')
          .select('student_id, assessment_type, score')
          .in('student_id', ids).eq('subject', selectedSubject).eq('term', term).eq('academic_year', year);
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
      setScores(init); setLoaded(true);
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Load failed', type: 'error' }); }
    setLoading(false);
  };

  const handleScoreChange = (studentId: string, field: 'hw' | 'ca1' | 'ca2' | 'project' | 'exam', value: string) => {
    setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let targetRow = rowIndex, targetCol = colIndex;
    if (e.key === 'ArrowRight') targetCol = colIndex + 1;
    else if (e.key === 'ArrowLeft') targetCol = colIndex - 1;
    else if (e.key === 'ArrowDown') targetRow = rowIndex + 1;
    else if (e.key === 'ArrowUp') targetRow = rowIndex - 1;
    else if (e.key === 'Enter') { targetRow = rowIndex + 1; e.preventDefault(); }
    else return;
    if (targetCol > 4) { if (targetRow < students.length - 1) { targetRow += 1; targetCol = 0; } else targetCol = 4; }
    else if (targetCol < 0) { if (targetRow > 0) { targetRow -= 1; targetCol = 4; } else targetCol = 0; }
    targetRow = Math.max(0, Math.min(students.length - 1, targetRow));
    const targetInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement | null;
    if (targetInput) { targetInput.focus(); targetInput.select(); e.preventDefault(); }
  };

  const computeStudentTotalAndGrade = (sScores: { hw: string; ca1: string; ca2: string; project: string; exam: string }) => {
    const hasAny = sScores.hw !== '' || sScores.ca1 !== '' || sScores.ca2 !== '' || sScores.project !== '' || sScores.exam !== '';
    if (!hasAny) return { total: null, grade: null };
    const total = (sScores.hw !== '' ? Math.round(parseFloat(sScores.hw) || 0) : 0)
      + (sScores.ca1 !== '' ? Math.round(parseFloat(sScores.ca1) || 0) : 0)
      + (sScores.ca2 !== '' ? Math.round(parseFloat(sScores.ca2) || 0) : 0)
      + (sScores.project !== '' ? Math.round(parseFloat(sScores.project) || 0) : 0)
      + (sScores.exam !== '' ? Math.round(parseFloat(sScores.exam) || 0) : 0);
    const { grade } = getNigerianGrade(total);
    return { total, grade };
  };

  const saveAllGrades = async () => {
    if (!classId || !selectedSubject) return;
    let hasError = false; let errorMsg = '';
    students.forEach(s => {
      const sScores = scores[s.id];
      if (!sScores) return;
      const hw = parseFloat(sScores.hw), ca1 = parseFloat(sScores.ca1), ca2 = parseFloat(sScores.ca2);
      const project = parseFloat(sScores.project), exam = parseFloat(sScores.exam);
      if (!isNaN(hw) && hw > 10) { hasError = true; errorMsg = 'Homework score cannot exceed 10'; }
      if (!isNaN(ca1) && ca1 > 15) { hasError = true; errorMsg = '1st CA score cannot exceed 15'; }
      if (!isNaN(ca2) && ca2 > 15) { hasError = true; errorMsg = '2nd CA score cannot exceed 15'; }
      if (!isNaN(project) && project > 10) { hasError = true; errorMsg = 'Project score cannot exceed 10'; }
      if (!isNaN(exam) && exam > 50) { hasError = true; errorMsg = 'Exam score cannot exceed 50'; }
    });
    if (hasError) { setToast({ msg: errorMsg, type: 'error' }); return; }
    setSaving(true);
    try {
      const toUpsert: { student_id: string; subject: string; assessment_type: string; score: number; max_score: number; term: string; academic_year: string; graded_by: string }[] = [];
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
        const { error: upsertErr } = await supabase.from('grades').upsert(toUpsert, { onConflict: 'student_id,subject,assessment_type,term,academic_year' });
        if (upsertErr) throw upsertErr;
      }
      setToast({ msg: `✓ Saved grades for ${students.length} students successfully`, type: 'success' });
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Batch save failed', type: 'error' }); }
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
  const completedCount = students.filter(s => { const sc = scores[s.id]; return sc && (sc.hw !== '' || sc.ca1 !== '' || sc.ca2 !== '' || sc.project !== '' || sc.exam !== ''); }).length;
  const percentComplete = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">Premium Matrix Mode</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">Datasheet Entry</h3>
            <p className="text-xs text-indigo-200/70 max-w-xl">
              Enter subject grades concurrently. Move quickly with <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Arrow Keys</kbd> &amp; <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Enter</kbd>. Saves automatically override existing records.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-300 mb-1">Class</label>
              <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }}
                className="w-full border border-indigo-800/40 bg-indigo-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white">
                <option value="" className="bg-indigo-950 text-white">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id} className="bg-indigo-950 text-white">{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-300 mb-1">Subject</label>
              <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setLoaded(false); }}
                className="w-full border border-indigo-800/40 bg-indigo-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white" disabled={!classId || subjects.length === 0}>
                <option value="" className="bg-indigo-950 text-white">Select Subject</option>
                {subjects.map(sub => <option key={sub} value={sub} className="bg-indigo-950 text-white">{sub}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-300 mb-1">Term</label>
              <select value={term} onChange={e => { setTerm(e.target.value); setLoaded(false); }}
                className="border border-indigo-800/40 bg-indigo-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white">
                {TERMS.map(t => <option key={t} value={t} className="bg-indigo-950 text-white">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-300 mb-1">Session</label>
              <select value={year} onChange={e => { setYear(e.target.value); setLoaded(false); }}
                className="border border-indigo-800/40 bg-indigo-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white">
                {getAcademicYearOptions().map(y => <option key={y} value={y} className="bg-indigo-950 text-white">{y}</option>)}
              </select>
            </div>
            <button onClick={loadDatasheet} disabled={!classId || !selectedSubject || loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95 h-[38px]">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {loading ? 'Loading…' : 'Load Grid'}
            </button>
          </div>
        </div>
      </div>

      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 mb-4">
            <FileSpreadsheet size={32} className="opacity-80" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Datasheet is ready to load</p>
          <p className="text-xs text-gray-400 mt-1">Select class and subject above, then click <strong>Load Grid</strong>.</p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <span className="text-sm text-gray-500 font-medium">Fetching students and matching records…</span>
        </div>
      )}

      {loaded && students.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Subject</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-lg">{selectedSubject}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-[10px] font-bold text-indigo-700 border border-indigo-100 uppercase">{term}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-2.5 px-4 shadow-sm">
              <div className="space-y-1 min-w-[120px]">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Entry Progress</span><span>{percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${percentComplete}%` }} />
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-lg font-black text-gray-800">{completedCount}</span>
                <span className="text-xs text-gray-400 font-semibold"> / {totalStudents} students</span>
              </div>
            </div>
          </div>

          {/* Mobile Roster Cards */}
          <div className="md:hidden divide-y divide-gray-150">
            {students.map((student, ri) => {
              const sScores = scores[student.id] ?? { hw: '', ca1: '', ca2: '', project: '', exam: '' };
              const name = `${student.profiles?.first_name ?? ''} ${student.profiles?.last_name ?? ''}`.trim();
              const { total, grade } = computeStudentTotalAndGrade(sScores);
              return (
                <div key={student.id} className="p-4 space-y-4 bg-white hover:bg-indigo-50/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm sm:text-base">{name}</h4>
                      <p className="text-[10px] text-gray-400 font-mono tracking-wider">{student.student_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-semibold uppercase leading-none">Total</span>
                        <span className="font-extrabold text-base text-indigo-700 tabular-nums">
                          {total !== null ? `${total}/100` : '—'}
                        </span>
                      </div>
                      {grade && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${getGradePillClass(grade)}`}>
                          {grade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1 leading-none">HW (10)</span>
                      <input type="text" inputMode="numeric" value={sScores.hw}
                        onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleScoreChange(student.id, 'hw', v); }}
                        placeholder="—"
                        className="w-full text-center text-sm font-semibold py-2 px-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1 leading-none">1st CA (15)</span>
                      <input type="text" inputMode="numeric" value={sScores.ca1}
                        onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleScoreChange(student.id, 'ca1', v); }}
                        placeholder="—"
                        className="w-full text-center text-sm font-semibold py-2 px-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1 leading-none">2nd CA (15)</span>
                      <input type="text" inputMode="numeric" value={sScores.ca2}
                        onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleScoreChange(student.id, 'ca2', v); }}
                        placeholder="—"
                        className="w-full text-center text-sm font-semibold py-2 px-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1 leading-none">Proj (10)</span>
                      <input type="text" inputMode="numeric" value={sScores.project}
                        onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleScoreChange(student.id, 'project', v); }}
                        placeholder="—"
                        className="w-full text-center text-sm font-semibold py-2 px-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1 leading-none">Exam (50)</span>
                      <input type="text" inputMode="numeric" value={sScores.exam}
                        onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleScoreChange(student.id, 'exam', v); }}
                        placeholder="—"
                        className="w-full text-center text-sm font-semibold py-2 px-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-xs border-b border-gray-700 uppercase tracking-wider font-semibold">
                  <th className="text-left px-6 py-3.5 w-1/4">Student Info</th>
                  <th className="text-center px-3 py-3.5"><span className="block text-gray-200">Homework</span><span className="text-indigo-300 font-bold text-[9px]">Max: 10</span></th>
                  <th className="text-center px-3 py-3.5"><span className="block text-gray-200">1st CA</span><span className="text-indigo-300 font-bold text-[9px]">Max: 15</span></th>
                  <th className="text-center px-3 py-3.5"><span className="block text-gray-200">2nd CA</span><span className="text-indigo-300 font-bold text-[9px]">Max: 15</span></th>
                  <th className="text-center px-3 py-3.5"><span className="block text-gray-200">Project</span><span className="text-indigo-300 font-bold text-[9px]">Max: 10</span></th>
                  <th className="text-center px-3 py-3.5"><span className="block text-gray-200">Exam</span><span className="text-indigo-300 font-bold text-[9px]">Max: 50</span></th>
                  <th className="text-center px-4 py-3.5 w-24"><span className="block text-gray-200">Total</span><span className="text-indigo-300 font-bold text-[9px]">/100</span></th>
                  <th className="text-center px-4 py-3.5 w-24"><span className="block text-gray-200">Grade</span><span className="text-indigo-300 font-bold text-[9px]">Letter</span></th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, ri) => {
                  const sScores = scores[student.id] ?? { hw: '', ca1: '', ca2: '', project: '', exam: '' };
                  const name = `${student.profiles?.first_name ?? ''} ${student.profiles?.last_name ?? ''}`.trim();
                  const { total, grade } = computeStudentTotalAndGrade(sScores);
                  return (
                    <tr key={student.id} className={['border-b border-gray-100 hover:bg-indigo-50/20 transition-colors', ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'].join(' ')}>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-gray-800 text-xs sm:text-sm">{name}</div>
                        <div className="text-[10px] text-gray-400 font-mono tracking-wider mt-0.5">{student.student_id}</div>
                      </td>
                      <td className="px-2 py-3 text-center"><DatasheetInputCell value={sScores.hw} max={10} rowIndex={ri} colIndex={0} onChange={v => handleScoreChange(student.id, 'hw', v)} handleKeyDown={handleKeyDown} /></td>
                      <td className="px-2 py-3 text-center"><DatasheetInputCell value={sScores.ca1} max={15} rowIndex={ri} colIndex={1} onChange={v => handleScoreChange(student.id, 'ca1', v)} handleKeyDown={handleKeyDown} /></td>
                      <td className="px-2 py-3 text-center"><DatasheetInputCell value={sScores.ca2} max={15} rowIndex={ri} colIndex={2} onChange={v => handleScoreChange(student.id, 'ca2', v)} handleKeyDown={handleKeyDown} /></td>
                      <td className="px-2 py-3 text-center"><DatasheetInputCell value={sScores.project} max={10} rowIndex={ri} colIndex={3} onChange={v => handleScoreChange(student.id, 'project', v)} handleKeyDown={handleKeyDown} /></td>
                      <td className="px-2 py-3 text-center"><DatasheetInputCell value={sScores.exam} max={50} rowIndex={ri} colIndex={4} onChange={v => handleScoreChange(student.id, 'exam', v)} handleKeyDown={handleKeyDown} /></td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800 tabular-nums">{total !== null ? total : <span className="text-gray-300 font-normal">—</span>}</td>
                      <td className="px-4 py-3 text-center">
                        {grade ? <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide border ${getGradePillClass(grade)}`}>{grade}</span>
                          : <span className="text-gray-300 font-normal text-xs">—</span>}
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
