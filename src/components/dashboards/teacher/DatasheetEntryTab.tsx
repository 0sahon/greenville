import { useState, useEffect } from 'react';
import { X, RefreshCw, FileSpreadsheet, Save, Sparkles, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, ClassRow } from '../../../lib/supabase';
import { getNigerianGrade } from '../../../lib/grading';
import { AT, normalizeAssessmentType } from '../../../lib/assessmentTypes';
import { PRE_KG_SKILLS } from '../../../lib/gradeCompute';
import { PRE_KG_COMMENTS } from '../admin/ResultCard';

interface StudentOption { id: string; student_id: string; profiles?: { first_name: string; last_name: string } | null; }

const PRE_KG_DOMAINS = [
  { domain: 'Language & Literacy',     icon: '📚', skills: ['Literacy', 'Phonics', 'Scribbling'] as const },
  { domain: 'Numeracy & Cognition',    icon: '🔢', skills: ['Numeracy', 'Understanding'] as const },
  { domain: 'Social & Moral',          icon: '🤝', skills: ['Social Habit', 'Bible Studies', 'Obedience'] as const },
  { domain: 'Personal Development',    icon: '🌱', skills: ['Care of Self', 'Individual Behaviour', 'Punctuality'] as const },
  { domain: 'Creative & Physical',     icon: '🎨', skills: ['Creative Play'] as const },
] as const;

const PRE_KG_FACES        = ['', '😔', '😐', '🙂', '😊', '🌟'] as const;
const PRE_KG_FACE_LABELS  = ['', 'Needs Work', 'Fair', 'Good', 'Very Good', 'Excellent'] as const;

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
  const [classLevel, setClassLevel] = useState('');
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

  const [filterName, setFilterName] = useState('');

  // Pre-KG state
  const [preKgData, setPreKgData] = useState<Record<string, Partial<Record<string, number>>>>({});
  const [currentStudentIdx, setCurrentStudentIdx] = useState(0);
  const [savingPreKg, setSavingPreKg] = useState(false);

  const isToddler = classLevel === 'toddler';

  useEffect(() => {
    supabase.from('classes').select('id,name').eq('teacher_id', profile.id).order('name')
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, [profile.id]);

  // Fetch class level when classId changes
  useEffect(() => {
    if (!classId) { setClassLevel(''); return; }
    supabase.from('classes').select('level').eq('id', classId).single()
      .then(({ data }) => setClassLevel((data as { level: string } | null)?.level ?? ''));
  }, [classId]);

  useEffect(() => {
    if (!classId || isToddler) { setSubjects([]); setSelectedSubject(''); return; }
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
  }, [classId, term, year, isToddler]);

  const loadDatasheet = async () => {
    if (!classId) return;
    setLoading(true); setLoaded(false);
    try {
      const { data: studs } = await supabase.from('students')
        .select('id, student_id, profiles:profile_id(first_name,last_name)')
        .eq('class_id', classId).eq('is_active', true).order('student_id');
      const studList = (studs || []) as unknown as StudentOption[];
      setStudents(studList);

      if (isToddler) {
        const ids = studList.map(s => s.id);
        const initPkg: Record<string, Partial<Record<string, number>>> = {};
        studList.forEach(s => { initPkg[s.id] = {}; });
        if (ids.length) {
          const { data: existing } = await supabase.from('grades')
            .select('student_id, subject, score')
            .in('student_id', ids).eq('assessment_type', 'pre_kg').eq('term', term).eq('academic_year', year);
          (existing || []).forEach((g: { student_id: string; subject: string; score: number }) => {
            if (!initPkg[g.student_id]) return;
            initPkg[g.student_id][g.subject] = g.score;
          });
        }
        setPreKgData(initPkg);
        setCurrentStudentIdx(0);
      } else {
        if (!selectedSubject) { setLoading(false); return; }
        const init: Record<string, { hw: string; ca1: string; ca2: string; project: string; exam: string }> = {};
        studList.forEach(s => { init[s.id] = { hw: '', ca1: '', ca2: '', project: '', exam: '' }; });
        const ids = studList.map(s => s.id);
        if (ids.length) {
          const { data: existing } = await supabase.from('grades')
            .select('student_id, assessment_type, score')
            .in('student_id', ids).eq('subject', selectedSubject).eq('term', term).eq('academic_year', year);
          (existing || []).forEach((g: { student_id: string; assessment_type: string; score: number }) => {
            if (!init[g.student_id]) return;
            const t = normalizeAssessmentType(g.assessment_type || '');
            if (t === AT.HOMEWORK) init[g.student_id].hw         = String(g.score);
            else if (t === AT.CA1) init[g.student_id].ca1        = String(g.score);
            else if (t === AT.CA2) init[g.student_id].ca2        = String(g.score);
            else if (t === AT.PROJECT) init[g.student_id].project = String(g.score);
            else if (t === AT.EXAM)    init[g.student_id].exam    = String(g.score);
          });
        }
        setScores(init);
      }
      setLoaded(true);
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Load failed', type: 'error' }); }
    setLoading(false);
  };

  const updatePreKgRating = (studentId: string, skillName: string, rating: number) => {
    setPreKgData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [skillName]: prev[studentId]?.[skillName] === rating ? 0 : rating },
    }));
  };

  const savePreKgStudent = async () => {
    const student = students[currentStudentIdx];
    if (!student) return;
    const ratings = preKgData[student.id] ?? {};
    const toUpsert = PRE_KG_SKILLS
      .map(s => s.name)
      .filter(name => (ratings[name] ?? 0) > 0)
      .map(name => ({
        student_id: student.id,
        subject: name,
        assessment_type: 'pre_kg',
        score: ratings[name]!,
        max_score: 5,
        term,
        academic_year: year,
        graded_by: profile.id,
      }));
    if (!toUpsert.length) { setToast({ msg: 'No ratings set for this student', type: 'error' }); return; }
    setSavingPreKg(true);
    try {
      const { error } = await supabase.from('grades').upsert(toUpsert, { onConflict: 'student_id,subject,assessment_type,term,academic_year' });
      if (error) throw error;
      setToast({ msg: `✓ Saved ratings for ${[student.profiles?.first_name, student.profiles?.last_name].filter(Boolean).join(' ')}`, type: 'success' });
      if (currentStudentIdx < students.length - 1) setCurrentStudentIdx(i => i + 1);
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' }); }
    setSavingPreKg(false);
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
        if (hw !== null && !isNaN(hw)) toUpsert.push({ ...base, assessment_type: AT.HOMEWORK, score: hw, max_score: 10 });
        if (ca1 !== null && !isNaN(ca1)) toUpsert.push({ ...base, assessment_type: AT.CA1, score: ca1, max_score: 15 });
        if (ca2 !== null && !isNaN(ca2)) toUpsert.push({ ...base, assessment_type: AT.CA2, score: ca2, max_score: 15 });
        if (project !== null && !isNaN(project)) toUpsert.push({ ...base, assessment_type: AT.PROJECT, score: project, max_score: 10 });
        if (exam !== null && !isNaN(exam)) toUpsert.push({ ...base, assessment_type: AT.EXAM, score: exam, max_score: 50 });
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
  const completedCount = isToddler
    ? students.filter(s => Object.values(preKgData[s.id] ?? {}).some(r => (r ?? 0) > 0)).length
    : students.filter(s => { const sc = scores[s.id]; return sc && (sc.hw !== '' || sc.ca1 !== '' || sc.ca2 !== '' || sc.project !== '' || sc.exam !== ''); }).length;
  const percentComplete = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  const filteredStudents = filterName.trim()
    ? students.filter(s => `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.toLowerCase().includes(filterName.toLowerCase()))
    : students;

  const currentStudent = students[currentStudentIdx];
  const currentStudentName = currentStudent
    ? `${currentStudent.profiles?.first_name ?? ''} ${currentStudent.profiles?.last_name ?? ''}`.trim()
    : '';
  const currentRatings = currentStudent ? (preKgData[currentStudent.id] ?? {}) : {};
  const ratedSkillsCount = Object.values(currentRatings).filter(r => (r ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header / Controls */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">
                {isToddler ? 'Pre-KG Observational Mode' : 'Premium Matrix Mode'}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">Datasheet Entry</h3>
            <p className="text-xs text-indigo-200/70 max-w-xl">
              {isToddler
                ? 'Rate each skill for one student at a time using the face buttons. Tap Save & Next to move through the class.'
                : <>Enter subject grades concurrently. Move quickly with <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Arrow Keys</kbd> &amp; <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Enter</kbd>. Saves automatically override existing records.</>
              }
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-300 mb-1">Class</label>
              <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); setCurrentStudentIdx(0); }}
                className="w-full border border-indigo-800/40 bg-indigo-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white">
                <option value="" className="bg-indigo-950 text-white">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id} className="bg-indigo-950 text-white">{c.name}</option>)}
              </select>
            </div>
            {!isToddler && (
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-300 mb-1">Subject</label>
                <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setLoaded(false); }}
                  className="w-full border border-indigo-800/40 bg-indigo-950/65 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white" disabled={!classId || subjects.length === 0}>
                  <option value="" className="bg-indigo-950 text-white">Select Subject</option>
                  {subjects.map(sub => <option key={sub} value={sub} className="bg-indigo-950 text-white">{sub}</option>)}
                </select>
              </div>
            )}
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
            <button onClick={loadDatasheet} disabled={!classId || (!isToddler && !selectedSubject) || loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95 h-[38px]">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {loading ? 'Loading…' : 'Load'}
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
          <p className="text-xs text-gray-400 mt-1">
            {isToddler ? 'Select class, term and session above, then click Load.' : 'Select class and subject above, then click Load Grid.'}
          </p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <span className="text-sm text-gray-500 font-medium">Fetching students and matching records…</span>
        </div>
      )}

      {/* ── Pre-KG Single-Student Entry ── */}
      {loaded && isToddler && students.length > 0 && currentStudent && (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

          {/* Student Navigator */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentStudentIdx(i => Math.max(0, i - 1))} disabled={currentStudentIdx === 0}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="font-bold text-gray-800 text-base leading-tight">{currentStudentName}</div>
                <div className="text-[10px] text-gray-400 font-mono tracking-wider">{currentStudent.student_id}</div>
              </div>
              <button onClick={() => setCurrentStudentIdx(i => Math.min(students.length - 1, i + 1))} disabled={currentStudentIdx === students.length - 1}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-30 transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-2.5 px-4 shadow-sm">
              <div className="space-y-1 min-w-[140px]">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Class Progress</span><span>{percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${percentComplete}%` }} />
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-lg font-black text-gray-800">{currentStudentIdx + 1}</span>
                <span className="text-xs text-gray-400 font-semibold"> / {totalStudents}</span>
              </div>
            </div>
          </div>

          {/* Skill status bar */}
          <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-xs">
            <span className="text-indigo-700 font-semibold">{ratedSkillsCount} of {PRE_KG_SKILLS.length} skills rated</span>
            <div className="flex gap-1">
              {PRE_KG_SKILLS.map(s => (
                <div key={s.name} className={`w-2 h-2 rounded-full transition-all ${(currentRatings[s.name] ?? 0) > 0 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          {/* Skill domains */}
          <div className="divide-y divide-gray-100">
            {PRE_KG_DOMAINS.map(({ domain, icon, skills }) => (
              <div key={domain}>
                <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                  <span className="text-sm font-bold text-indigo-800">{icon} {domain}</span>
                </div>
                {(skills as readonly string[]).map(skillName => {
                  const current = currentRatings[skillName] ?? 0;
                  const commentOptions = PRE_KG_COMMENTS[skillName]?.[current] ?? [];
                  return (
                    <div key={skillName} className="flex flex-col px-4 py-3 bg-white gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 flex-1 min-w-[120px]">{skillName}</span>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(r => (
                            <button key={r} type="button"
                              onClick={() => updatePreKgRating(currentStudent.id, skillName, r)}
                              title={PRE_KG_FACE_LABELS[r]}
                              className={`text-2xl leading-none rounded-full w-11 h-11 flex items-center justify-center transition-all border-2 ${
                                current === r
                                  ? 'border-indigo-400 bg-indigo-50 scale-110 shadow-sm'
                                  : 'border-transparent opacity-40 hover:opacity-80 hover:scale-105'
                              }`}>
                              {PRE_KG_FACES[r]}
                            </button>
                          ))}
                        </div>
                      </div>
                      {current > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-indigo-500 whitespace-nowrap">{PRE_KG_FACE_LABELS[current]}</span>
                          {commentOptions.length > 0 && (
                            <span className="text-xs text-gray-500 italic truncate">{commentOptions[0]}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/70">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {completedCount} of {totalStudents} students have at least one rating.
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              {currentStudentIdx < students.length - 1 && (
                <button onClick={() => setCurrentStudentIdx(i => i + 1)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                  Skip <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button onClick={savePreKgStudent} disabled={savingPreKg || ratedSkillsCount === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 active:scale-95">
                {savingPreKg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingPreKg ? 'Saving…' : currentStudentIdx < students.length - 1 ? 'Save & Next' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Regular Class Grid ── */}
      {loaded && !isToddler && students.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Subject</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-lg">{selectedSubject}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-[10px] font-bold text-indigo-700 border border-indigo-100 uppercase">{term}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="Search student…"
                className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700 placeholder-gray-400 min-w-[160px]"
              />
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
          </div>

          {/* Mobile Roster Cards */}
          <div className="md:hidden divide-y divide-gray-150">
            {filteredStudents.map((student, ri) => {
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
                    {(['hw','ca1','ca2','project','exam'] as const).map((field, fi) => (
                      <div key={field} className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-gray-400 mb-1 leading-none">
                          {field === 'hw' ? 'HW (10)' : field === 'ca1' ? '1st CA (15)' : field === 'ca2' ? '2nd CA (15)' : field === 'project' ? 'Proj (10)' : 'Exam (50)'}
                        </span>
                        <input type="text" inputMode="numeric" value={sScores[field]}
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleScoreChange(student.id, field, v); }}
                          placeholder="—" data-row={ri} data-col={fi}
                          className="w-full text-center text-sm font-semibold py-2 px-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                        />
                      </div>
                    ))}
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
                {filteredStudents.map((student, ri) => {
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
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {filterName.trim() ? `${filteredStudents.length} of ${totalStudents} students shown` : `${totalStudents} students`}
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
