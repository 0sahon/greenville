import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Search, Download, Plus, X, Edit2, Trash2, Layers, BookOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, GradeRow, GradeInsert, ClassRow } from '../../../lib/supabase';
import { nigerianGrade } from '../../../lib/grading';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface GradeWithStudent extends GradeRow {
  students?: {
    student_id: string;
    profiles?: { first_name: string; last_name: string };
    classes?: { id: string; name: string };
  } | null;
}

interface StudentOption {
  id: string;
  student_id: string;
  profiles?: { first_name: string; last_name: string } | null;
}

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

// ─── Tab 1: Grade Records ───────────────────────────────────────────────────

function RecordsTab({
  profile, grades, loading, search, setSearch,
  filterClass, setFilterClass, filterTerm, setFilterTerm,
  classes, onRefresh, onToast,
}: {
  profile: ProfileRow;
  grades: GradeWithStudent[];
  loading: boolean;
  search: string; setSearch: (s: string) => void;
  filterClass: string; setFilterClass: (s: string) => void;
  filterTerm: string; setFilterTerm: (s: string) => void;
  classes: Pick<ClassRow, 'id' | 'name'>[];
  onRefresh: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GradeWithStudent | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: '', subject: '', assessment_type: '1st CA', score: '', max_score: '20',
    term: 'First Term', academic_year: getDefaultAcademicYear(),
  });

  useEffect(() => {
    supabase.from('students').select('id, student_id, profiles:profile_id(first_name, last_name)')
      .eq('is_active', true).order('student_id')
      .then(({ data }) => setStudents((data || []) as unknown as StudentOption[]));
  }, []);

  const filtered = grades.filter(g => {
    const name = `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.toLowerCase();
    return (
      (!search || name.includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase())) &&
      (!filterClass || g.students?.classes?.id === filterClass) &&
      (!filterTerm || g.term === filterTerm)
    );
  });

  const exportCSV = () => {
    const rows: string[][] = [['Student', 'Class', 'Subject', 'Type', 'Score', 'Max', 'Grade', 'Term', 'Year']];
    filtered.forEach(g => {
      const { label } = nigerianGrade(g.score, g.max_score);
      rows.push([
        `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.trim(),
        g.students?.classes?.name ?? '', g.subject, g.assessment_type,
        String(g.score), String(g.max_score), label, g.term, g.academic_year,
      ]);
    });
    const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.map(q).join(',')).join('\n'));
    a.download = 'grades.csv'; a.click();
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ student_id: '', subject: '', assessment_type: '1st CA', score: '', max_score: '20', term: 'First Term', academic_year: getDefaultAcademicYear() });
    setShowModal(true);
  };

  const openEdit = (g: GradeWithStudent) => {
    setEditing(g);
    setForm({
      student_id: g.student_id, subject: g.subject, assessment_type: g.assessment_type,
      score: String(g.score), max_score: String(g.max_score), term: g.term, academic_year: g.academic_year,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.subject.trim() || form.score === '') return onToast('Student, subject and score are required', 'error');
    const score = parseFloat(form.score);
    const max_score = parseFloat(form.max_score) || 100;
    if (isNaN(score) || score < 0) return onToast('Enter a valid score', 'error');
    if (score > max_score) return onToast('Score cannot exceed max score', 'error');
    setSaving(true);
    try {
      const payload: GradeInsert = {
        student_id: form.student_id, subject: form.subject.trim(),
        assessment_type: form.assessment_type, score, max_score,
        term: form.term, academic_year: form.academic_year, graded_by: profile.id,
      };
      if (editing) {
        const { error } = await supabase.from('grades').update(payload).eq('id', editing.id);
        if (error) throw error;
        onToast('Grade updated', 'success');
      } else {
        const { error } = await supabase.from('grades').insert(payload);
        if (error) throw error;
        onToast('Grade added', 'success');
      }
      setShowModal(false);
      onRefresh();
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const deleteGrade = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) onToast(error.message, 'error');
    else { onToast('Grade deleted', 'success'); onRefresh(); }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-40 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Search student or subject..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">All terms</option>
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Add Grade
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Student</th><th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th><th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Score</th><th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Term</th><th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const { label, color } = nigerianGrade(g.score, g.max_score);
                  return (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{g.students?.profiles?.first_name} {g.students?.profiles?.last_name}</td>
                      <td className="py-3 px-4 text-gray-600">{g.students?.classes?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-700">{g.subject}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{g.assessment_type}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800 tabular-nums">{g.score}/{g.max_score}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span></td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{g.term}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteGrade(g.id)} disabled={deleting === g.id} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 disabled:opacity-40">
                            {deleting === g.id
                              ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No grades found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" /> {editing ? 'Edit Grade' : 'Add Grade'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Student *</label>
                <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.profiles?.first_name} {s.profiles?.last_name} ({s.student_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assessment Type</label>
                <select value={form.assessment_type}
                  onChange={e => {
                    const type = e.target.value;
                    setForm(f => ({ ...f, assessment_type: type, ...(DEFAULT_MAX[type] ? { max_score: String(DEFAULT_MAX[type]) } : {}) }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {ASSESSMENT_TYPES.map(t => <option key={t}>{t}{DEFAULT_MAX[t] ? ` (max ${DEFAULT_MAX[t]})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Score *</label>
                  <input type="number" min={0} step={0.5} value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
                  <input type="number" min={1} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                  <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Save Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Bulk Entry ──────────────────────────────────────────────────────

interface BulkRow { studentId: string; displayId: string; name: string; score: string; }

function BulkEntryTab({ profile, classes, onRefresh, onToast }: {
  profile: ProfileRow;
  classes: Pick<ClassRow, 'id' | 'name'>[];
  onRefresh: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [assessmentType, setAssessmentType] = useState('1st CA');
  const [maxScore, setMaxScore] = useState('20');
  const [term, setTerm] = useState('First Term');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!classId) { setRows([]); return; }
    setLoadingStudents(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('id, student_id, profiles:profile_id(first_name, last_name)')
        .eq('class_id', classId).eq('is_active', true).order('student_id');
      setRows((data || []).map((s: { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }) => ({
        studentId: s.id,
        displayId: s.student_id,
        name: `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim(),
        score: '',
      })));
    } finally {
      setLoadingStudents(false);
    }
  }, [classId]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const max = parseFloat(maxScore) || 100;
  const filled = rows.filter(r => r.score !== '').length;

  const submit = async () => {
    if (!subject.trim()) return onToast('Subject is required', 'error');
    const validRows = rows.filter(r => r.score !== '' && !isNaN(parseFloat(r.score)));
    if (validRows.length === 0) return onToast('Enter at least one score', 'error');
    const outOfRange = validRows.find(r => { const s = parseFloat(r.score); return s < 0 || s > max; });
    if (outOfRange) return onToast(`Score for ${outOfRange.name} is out of range (0–${max})`, 'error');
    setSaving(true);
    try {
      const payload = validRows.map(r => ({
        student_id: r.studentId, subject: subject.trim(), assessment_type: assessmentType,
        score: parseFloat(r.score), max_score: max, term, academic_year: academicYear, graded_by: profile.id,
      }));
      const { error } = await supabase.from('grades').insert(payload);
      if (error) throw error;
      onToast(`${payload.length} grade${payload.length !== 1 ? 's' : ''} saved`, 'success');
      setRows(prev => prev.map(r => ({ ...r, score: '' })));
      onRefresh();
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        Select a class and subject, then enter scores for all students at once. Leave blank to skip a student.
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Select class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assessment Type</label>
          <select value={assessmentType}
            onChange={e => {
              const t = e.target.value; setAssessmentType(t);
              if (DEFAULT_MAX[t]) setMaxScore(String(DEFAULT_MAX[t]));
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {ASSESSMENT_TYPES.map(t => <option key={t}>{t}{DEFAULT_MAX[t] ? ` (max ${DEFAULT_MAX[t]})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
          <input type="number" min={1} value={maxScore} onChange={e => setMaxScore(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loadingStudents ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>
      ) : rows.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{rows.length} students — <span className="font-medium text-purple-600">{filled} scores entered</span></p>
            <button onClick={submit} disabled={saving || filled === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40">
              {saving ? 'Saving...' : `Save ${filled} Grade${filled !== 1 ? 's' : ''}`}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Score (max {maxScore})</th>
                    <th className="py-3 px-4">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const s = parseFloat(r.score);
                    const grade = r.score !== '' && !isNaN(s) ? nigerianGrade(s, max) : null;
                    return (
                      <tr key={r.studentId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-4 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-gray-500">{r.displayId}</td>
                        <td className="py-2.5 px-4 font-medium text-gray-800">{r.name}</td>
                        <td className="py-2.5 px-4">
                          <input
                            type="number" min={0} max={max} step={0.5} value={r.score}
                            onChange={e => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, score: e.target.value } : row))}
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          {grade
                            ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${grade.color}`}>{grade.label}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : classId ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm text-sm">
          No active students in this class.
        </div>
      ) : null}
    </div>
  );
}

// ─── Tab 3: Class Summary ────────────────────────────────────────────────────

interface SubjectStat { subject: string; avg: number; count: number; high: number; low: number; }
interface StudentStat { name: string; studentId: string; avg: number; count: number; }

function ClassSummaryTab({ classes }: { classes: Pick<ClassRow, 'id' | 'name'>[] }) {
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'subjects' | 'students'>('subjects');

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_id, profiles:profile_id(first_name, last_name)')
        .eq('class_id', classId).eq('is_active', true);

      const studentIds = (studentData || []).map((s: { id: string }) => s.id);
      const nameMap: Record<string, string> = {};
      const idMap: Record<string, string> = {};
      (studentData || []).forEach((s: { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }) => {
        nameMap[s.id] = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
        idMap[s.id] = s.student_id;
      });

      if (studentIds.length === 0) {
        setSubjectStats([]); setStudentStats([]); return;
      }

      const { data: gradeData } = await supabase
        .from('grades')
        .select('student_id, subject, score, max_score')
        .in('student_id', studentIds)
        .eq('term', term).eq('academic_year', academicYear);

      const grades = (gradeData || []) as { student_id: string; subject: string; score: number; max_score: number }[];

      // Subject aggregation
      const bySub: Record<string, number[]> = {};
      grades.forEach(g => {
        const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0;
        if (!bySub[g.subject]) bySub[g.subject] = [];
        bySub[g.subject].push(pct);
      });
      const sStats = Object.entries(bySub).map(([subject, vals]) => ({
        subject,
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10,
        count: vals.length,
        high: Math.round(Math.max(...vals) * 10) / 10,
        low: Math.round(Math.min(...vals) * 10) / 10,
      })).sort((a, b) => b.avg - a.avg);
      setSubjectStats(sStats);

      // Student aggregation
      const byStud: Record<string, { total: number; count: number }> = {};
      grades.forEach(g => {
        const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0;
        if (!byStud[g.student_id]) byStud[g.student_id] = { total: 0, count: 0 };
        byStud[g.student_id].total += pct;
        byStud[g.student_id].count += 1;
      });
      const stStats = (studentData || []).map((s: { id: string }) => {
        const agg = byStud[s.id];
        return {
          name: nameMap[s.id],
          studentId: idMap[s.id],
          avg: agg ? Math.round((agg.total / agg.count) * 10) / 10 : 0,
          count: agg ? agg.count : 0,
        };
      }).sort((a: StudentStat, b: StudentStat) => b.avg - a.avg);
      setStudentStats(stStats);
    } finally {
      setLoading(false);
    }
  }, [classId, term, academicYear]);

  useEffect(() => { load(); }, [load]);

  const classAvg = subjectStats.length > 0
    ? Math.round(subjectStats.reduce((s, x) => s + x.avg, 0) / subjectStats.length * 10) / 10
    : null;

  const posEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Select class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!classId ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select a class to view the academic summary.</div>
      ) : loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {classAvg !== null && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-xs text-purple-600 mb-1">Class Average</p>
                <p className="text-2xl font-bold text-purple-700">{classAvg}%</p>
                <p className="text-xs font-semibold text-purple-500 mt-0.5">{nigerianGrade(classAvg, 100).label}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 mb-1">Subjects</p>
                <p className="text-2xl font-bold text-blue-700">{subjectStats.length}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 mb-1">Students Graded</p>
                <p className="text-2xl font-bold text-green-700">{studentStats.filter(s => s.count > 0).length}</p>
              </div>
            </div>
          )}

          <div className="flex bg-gray-100 rounded-xl p-1 max-w-xs">
            {(['subjects', 'students'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${view === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'subjects' ? 'By Subject' : 'By Student'}
              </button>
            ))}
          </div>

          {view === 'subjects' ? (
            subjectStats.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No grades recorded for this term.</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Records</th>
                      <th className="py-3 px-4">Avg Score</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Highest</th>
                      <th className="py-3 px-4">Lowest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectStats.map(s => {
                      const { label, color } = nigerianGrade(s.avg, 100);
                      return (
                        <tr key={s.subject} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{s.subject}</td>
                          <td className="py-3 px-4 text-gray-500">{s.count}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-purple-500" style={{ width: `${s.avg}%` }} />
                              </div>
                              <span className="font-semibold text-gray-800 tabular-nums">{s.avg}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span></td>
                          <td className="py-3 px-4 text-green-600 font-medium tabular-nums">{s.high}%</td>
                          <td className="py-3 px-4 text-red-500 tabular-nums">{s.low}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            studentStats.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No students in this class.</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="py-3 px-4">Pos</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Records</th>
                      <th className="py-3 px-4">Avg Score</th>
                      <th className="py-3 px-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s, i) => {
                      const { label, color } = nigerianGrade(s.avg, 100);
                      return (
                        <tr key={s.studentId} className={`border-b border-gray-50 hover:bg-gray-50 ${i < 3 ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-3 px-4 text-lg font-bold">{posEmoji(i)}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800">{s.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{s.studentId}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-500">{s.count}</td>
                          <td className="py-3 px-4">
                            {s.count > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, s.avg)}%` }} />
                                </div>
                                <span className="font-semibold text-gray-800 tabular-nums">{s.avg}%</span>
                              </div>
                            ) : <span className="text-gray-300 text-xs">No grades</span>}
                          </td>
                          <td className="py-3 px-4">
                            {s.count > 0
                              ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'records' as const, label: 'Grade Records', Icon: BarChart3 },
  { id: 'bulk' as const, label: 'Bulk Entry', Icon: Layers },
  { id: 'summary' as const, label: 'Class Summary', Icon: BookOpen },
];

export default function GradesSection({ profile }: Props) {
  const [tab, setTab] = useState<'records' | 'bulk' | 'summary'>('records');
  const [grades, setGrades] = useState<GradeWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name')
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, []);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('grades')
        .select('*, students:student_id(student_id, profiles:profile_id(first_name, last_name), classes:class_id(id, name))')
        .order('created_at', { ascending: false })
        .limit(300);
      setGrades((data || []) as GradeWithStudent[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const showToast = (msg: string, type: 'success' | 'error') => setToast({ msg, type });

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <h2 className="text-xl font-bold text-gray-900">Grades & Academic Records</h2>

      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2 text-sm font-medium rounded-lg transition-all ${tab === id ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'records' && (
        <RecordsTab
          profile={profile} grades={grades} loading={loading}
          search={search} setSearch={setSearch}
          filterClass={filterClass} setFilterClass={setFilterClass}
          filterTerm={filterTerm} setFilterTerm={setFilterTerm}
          classes={classes} onRefresh={fetchGrades} onToast={showToast}
        />
      )}
      {tab === 'bulk' && <BulkEntryTab profile={profile} classes={classes} onRefresh={fetchGrades} onToast={showToast} />}
      {tab === 'summary' && <ClassSummaryTab classes={classes} />}
    </div>
  );
}
