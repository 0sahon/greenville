import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Search, Plus, X, Edit2, Trash2, Download } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, GradeRow, ClassRow } from '../../../lib/supabase';
import { nigerianGrade } from '../../../lib/grading';
import { normalizeAssessmentType } from '../../../lib/assessmentTypes';

interface GradeWithStudent extends GradeRow {
  students?: { id: string; student_id: string; profiles?: { first_name: string; last_name: string }; classes?: { id: string; name: string }; } | null;
}
interface StudentOption { id: string; student_id: string; class_id?: string; profiles?: { first_name: string; last_name: string } | null; }

const ASSESSMENT_TYPES = ['Home Work', '1st CA', '2nd CA', 'Project', 'Exam', 'Test', 'CA', 'Assignment', 'Quiz'];
const DEFAULT_MAX: Record<string, number> = { 'Home Work': 10, '1st CA': 15, '2nd CA': 15, 'Project': 10, 'Exam': 50, 'Test': 30 };
const PRE_KG_SKILLS_LIST = ['Literacy','Understanding','Obedience','Care of Self','Individual Behaviour','Punctuality','Numeracy','Bible Studies','Creative Play','Phonics','Scribbling','Social Habit'];
const PRE_KG_RATING_LABELS: Record<number, string> = { 5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Fair', 1: 'Needs Improvement' };

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function RecordsViewTab({ profile }: { profile: ProfileRow }) {
  const [grades, setGrades] = useState<GradeWithStudent[]>([]);
  const [myClasses, setMyClasses] = useState<Pick<ClassRow, 'id' | 'name' | 'level'>[]>([]);
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
  const [recordsView, setRecordsView] = useState<'flat' | 'subject' | 'type' | 'matrix'>('flat');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    student_id: '', subject: '', assessment_type: '1st CA',
    score: '', max_score: '15', term: 'First Term', academic_year: getDefaultAcademicYear(),
  });

  useEffect(() => {
    const load = async () => {
      const { data: allClasses } = await supabase.from('classes').select('id, name, level').order('name');
      setMyClasses((allClasses || []) as Pick<ClassRow, 'id' | 'name' | 'level'>[]);
      const { data: ownClassIds } = await supabase.from('classes').select('id').eq('teacher_id', profile.id);
      const ids = (ownClassIds || []).map((c: { id: string }) => c.id);
      if (ids.length > 0) {
        const { data } = await supabase.from('students').select('id, student_id, class_id, profiles:profile_id(first_name,last_name)').in('class_id', ids).eq('is_active', true).order('student_id');
        setStudents((data || []) as unknown as StudentOption[]);
      } else {
        const { data } = await supabase.from('students').select('id, student_id, class_id, profiles:profile_id(first_name,last_name)').eq('is_active', true).order('student_id');
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
  const types = [...new Set(grades.map(g => g.assessment_type))].sort();

  const filtered = grades.filter(g => {
    const name = `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.toLowerCase();
    return (
      (!search || name.includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase()) || g.students?.student_id?.toLowerCase().includes(search.toLowerCase())) &&
      (!filterClass || g.students?.classes?.id === filterClass) &&
      (!filterTerm || g.term === filterTerm) &&
      (!filterSubject || g.subject === filterSubject) &&
      (!filterType || g.assessment_type === filterType)
    );
  });

  const exportCSV = () => {
    const PKG_WORD: Record<number, string> = { 5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Fair', 1: 'Needs Improvement' };
    const rows = [['Student', 'ID', 'Class', 'Subject', 'Type', 'Score', 'Max', 'Grade', 'Term']];
    filtered.forEach(g => {
      const label = g.assessment_type === 'pre_kg'
        ? (PKG_WORD[g.score] ?? String(g.score))
        : nigerianGrade(g.score, g.max_score).label;
      rows.push([`${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.trim(), g.students?.student_id ?? '', g.students?.classes?.name ?? '', g.subject, g.assessment_type, String(g.score), String(g.max_score), label, g.term]);
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

  const selectedClassId = students.find(s => s.id === form.student_id)?.class_id;
  const isToddlerModal = myClasses.find(c => c.id === selectedClassId)?.level === 'toddler';

  const save = async () => {
    if (!form.student_id || !form.subject.trim() || form.score === '') return setToast({ msg: 'Student, subject and score required', type: 'error' });
    const score = parseFloat(form.score);
    const max_score = isToddlerModal ? 5 : (parseFloat(form.max_score) || 100);
    if (isNaN(score) || score < 0) return setToast({ msg: 'Enter a valid score', type: 'error' });
    if (isToddlerModal && (score < 1 || score > 5)) return setToast({ msg: 'Rating must be 1–5', type: 'error' });
    if (!isToddlerModal && score > max_score) return setToast({ msg: `Score cannot exceed ${max_score}`, type: 'error' });
    setSaving(true);
    try {
      const assessment_type = isToddlerModal ? 'pre_kg' : normalizeAssessmentType(form.assessment_type);
      const payload = { student_id: form.student_id, subject: form.subject.trim(), assessment_type, score, max_score, term: form.term, academic_year: form.academic_year, graded_by: profile.id };
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
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-52" />
          </div>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All classes</option>
            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All types</option>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All terms</option>
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
            {(['flat', 'subject', 'type'] as const).map(v => (
              <button key={v} onClick={() => setRecordsView(v)}
                className={`px-3 py-1.5 ${recordsView === v ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {v === 'flat' ? 'All' : v === 'subject' ? 'By Subject' : 'By Type'}
              </button>
            ))}
            {filterClass && myClasses.find(c => c.id === filterClass)?.level === 'toddler' && (
              <button onClick={() => setRecordsView('matrix')}
                className={`px-3 py-1.5 ${recordsView === 'matrix' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Skill Matrix
              </button>
            )}
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : (() => {
          const colHeaders = (
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase text-left">
              <th className="py-3 px-4">Student</th><th className="py-3 px-4">Class</th>
              <th className="py-3 px-4">Subject</th><th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Score</th><th className="py-3 px-4">Grade</th>
              <th className="py-3 px-4">Term</th><th className="py-3 px-4">Actions</th>
            </tr>
          );
          const GradeRow = ({ g }: { g: GradeWithStudent }) => {
            const PKG_WORD: Record<number, string> = { 5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Fair', 1: 'Needs Improvement' };
            const isPreKg = g.assessment_type === 'pre_kg';
            const { label, color } = isPreKg
              ? { label: PKG_WORD[g.score] ?? String(g.score), color: 'text-indigo-700 bg-indigo-50' }
              : nigerianGrade(g.score, g.max_score);
            return (
              <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 px-4">
                  <div className="font-medium text-gray-800 text-sm">{g.students?.profiles?.first_name} {g.students?.profiles?.last_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{g.students?.student_id}</div>
                </td>
                <td className="py-2.5 px-4 text-gray-600 text-sm">{g.students?.classes?.name ?? '—'}</td>
                <td className="py-2.5 px-4 text-gray-700 text-sm">{g.subject}</td>
                <td className="py-2.5 px-4 text-gray-500 text-xs">{g.assessment_type}</td>
                <td className="py-2.5 px-4 font-semibold tabular-nums text-sm">{g.score}/{g.max_score}</td>
                <td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span></td>
                <td className="py-2.5 px-4 text-gray-400 text-xs">{g.term}</td>
                <td className="py-2.5 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteGrade(g.id)} disabled={deleting === g.id} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 disabled:opacity-40">
                      {deleting === g.id ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          };

          if (recordsView === 'matrix') {
            const pkGrades = filtered.filter(g => g.assessment_type === 'pre_kg');
            const studentMap = new Map<string, string>();
            pkGrades.forEach(g => {
              if (!studentMap.has(g.student_id))
                studentMap.set(g.student_id, `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.trim());
            });
            const matrixStudents = [...studentMap.entries()];
            const lookup: Record<string, Record<string, number>> = {};
            pkGrades.forEach(g => {
              if (!lookup[g.student_id]) lookup[g.student_id] = {};
              lookup[g.student_id][(g.subject || '').trim()] = g.score;
            });
            const RATING_COLORS: Record<number, string> = { 5: 'bg-pink-500 text-white', 4: 'bg-blue-500 text-white', 3: 'bg-teal-500 text-white', 2: 'bg-yellow-400 text-gray-800', 1: 'bg-orange-400 text-white' };
            const RATING_SHORT: Record<number, string> = { 5: 'E', 4: 'VG', 3: 'G', 2: 'F', 1: 'NI' };
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-900 text-white">
                      <th className="py-2 px-3 text-left font-semibold sticky left-0 bg-indigo-900 z-10 min-w-[130px]">Student</th>
                      {PRE_KG_SKILLS_LIST.map(skill => (
                        <th key={skill} className="py-2 px-1 text-center font-medium" style={{ minWidth: '60px', maxWidth: '80px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '90px', verticalAlign: 'bottom', paddingBottom: '6px' }}>{skill}</th>
                      ))}
                      <th className="py-2 px-2 text-center font-semibold bg-indigo-950">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixStudents.length === 0 && <tr><td colSpan={PRE_KG_SKILLS_LIST.length + 2} className="text-center py-10 text-gray-400">No Pre-KG ratings found</td></tr>}
                    {matrixStudents.map(([id, name], ri) => {
                      const skills = lookup[id] ?? {};
                      const scores = PRE_KG_SKILLS_LIST.map(s => skills[s] ?? 0);
                      const rated = scores.filter(s => s > 0);
                      const avg = rated.length > 0 ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : '—';
                      return (
                        <tr key={id} className={ri % 2 === 0 ? 'bg-white' : 'bg-indigo-50'}>
                          <td className="py-2 px-3 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200" style={{ background: ri % 2 === 0 ? '#fff' : '#eef2ff' }}>{name}</td>
                          {scores.map((score, si) => (
                            <td key={si} className="py-1.5 px-1 text-center">
                              {score > 0
                                ? <span className={`inline-block px-1.5 py-0.5 rounded-full font-bold text-xs ${RATING_COLORS[score] ?? ''}`} title={PRE_KG_RATING_LABELS[score]}>{RATING_SHORT[score]}</span>
                                : <span className="text-gray-200">—</span>}
                            </td>
                          ))}
                          <td className="py-1.5 px-2 text-center font-bold text-indigo-700 bg-indigo-50">{avg}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-2 p-3 border-t border-gray-100 text-xs">
                  {Object.entries(RATING_COLORS).reverse().map(([r, cls]) => (
                    <span key={r} className={`px-2 py-0.5 rounded-full font-bold ${cls}`}>{r} — {PRE_KG_RATING_LABELS[Number(r)]}</span>
                  ))}
                </div>
              </div>
            );
          }

          if (recordsView === 'flat') {
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>{colHeaders}</thead>
                  <tbody>
                    {filtered.map(g => <GradeRow key={g.id} g={g} />)}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                        {grades.length === 0 ? 'No grades yet — use Grade Sheet to enter scores.' : 'No records match the filters.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          }

          const groupKey = recordsView === 'subject' ? 'subject' : 'assessment_type';
          const groups: Record<string, GradeWithStudent[]> = {};
          filtered.forEach(g => { const k = g[groupKey] ?? '—'; if (!groups[k]) groups[k] = []; groups[k].push(g); });
          const sortedGroups = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>{colHeaders}</thead>
                <tbody>
                  {sortedGroups.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">No records match the filters.</td></tr>
                  )}
                  {sortedGroups.map(([group, rows]) => {
                    const avg = rows.length > 0
                      ? Math.round(rows.reduce((s, r) => s + (r.max_score > 0 ? (r.score / r.max_score) * 100 : 0), 0) / rows.length)
                      : null;
                    return (
                      <>
                        <tr key={`grp-${group}`} className="bg-indigo-50 border-t-2 border-indigo-200">
                          <td colSpan={8} className="py-2 px-4">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-indigo-800 text-sm">{group}</span>
                              <span className="text-xs text-indigo-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                              {avg !== null && <span className="text-xs text-indigo-600 font-medium">Avg {avg}%</span>}
                            </div>
                          </td>
                        </tr>
                        {rows.map(g => <GradeRow key={g.id} g={g} />)}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" /> {editing ? 'Edit Grade' : 'Add Grade'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Student *</label>
                <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.profiles?.first_name} {s.profiles?.last_name} ({s.student_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {isToddlerModal ? 'Skill Area *' : 'Subject *'}
                </label>
                {isToddlerModal ? (
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Select skill area…</option>
                    {PRE_KG_SKILLS_LIST.map(s => <option key={s}>{s}</option>)}
                  </select>
                ) : subjects.length > 0 ? (
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                )}
              </div>
              {!isToddlerModal && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assessment Type</label>
                  <select value={form.assessment_type}
                    onChange={e => { const t = e.target.value; setForm(f => ({ ...f, assessment_type: t, ...(DEFAULT_MAX[t] ? { max_score: String(DEFAULT_MAX[t]) } : {}) })); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {ASSESSMENT_TYPES.map(t => <option key={t}>{t}{DEFAULT_MAX[t] ? ` (max ${DEFAULT_MAX[t]})` : ''}</option>)}
                  </select>
                </div>
              )}
              {isToddlerModal ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observation Rating *</label>
                  <div className="flex gap-2 flex-wrap">
                    {[5,4,3,2,1].map(r => (
                      <button key={r} type="button"
                        onClick={() => setForm(f => ({ ...f, score: f.score === String(r) ? '' : String(r), max_score: '5' }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          form.score === String(r)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                        }`}>
                        {r} — {PRE_KG_RATING_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Score *</label>
                    <input type="number" inputMode="numeric" autoComplete="off" min={0} step={0.5} value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
                    <input type="number" inputMode="numeric" autoComplete="off" min={1} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                  <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
