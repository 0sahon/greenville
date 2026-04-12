import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, ChevronDown, Eye, CheckCircle, Clock, X, Save,
  Trash2, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import ResultCard, { getNigerianGrade, printResultCard } from '../admin/ResultCard';
import type { ResultCardData, SubjectResult } from '../admin/ResultCard';
import type { ProfileRow, GradeRow } from '../../../lib/supabase';
import PerformanceChart from '../shared/PerformanceChart';
import {
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
} from '../../../config/schoolBrand';

interface Props { profile: ProfileRow; }

interface StudentInfo {
  id: string;
  student_id: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
  classes: { id: string; name: string; level: string } | null;
  gender: string | null;
  date_of_birth: string | null;
}

interface ResultSheetMeta {
  id?: string;
  teacher_comment: string;
  principal_comment: string;
  punctuality: number;
  neatness: number;
  honesty: number;
  cooperation: number;
  attentiveness: number;
  politeness: number;
  days_present: number;
  days_absent: number;
  total_school_days: number;
  next_term_begins: string;
  next_term_fees: string;
  is_published: boolean;
}

const defaultMeta: ResultSheetMeta = {
  teacher_comment: '', principal_comment: '',
  punctuality: 3, neatness: 3, honesty: 3, cooperation: 3, attentiveness: 3, politeness: 3,
  days_present: 0, days_absent: 0, total_school_days: 0,
  next_term_begins: '', next_term_fees: '', is_published: false,
};

function computeSubjects(grades: GradeRow[]): SubjectResult[] {
  const map = new Map<string, { ca1: { score: number; max: number } | null; ca2: { score: number; max: number } | null; exam: { score: number; max: number } | null; hw: { score: number; max: number } | null }>();
  for (const g of grades) {
    const key = g.subject.trim();
    if (!map.has(key)) map.set(key, { ca1: null, ca2: null, exam: null, hw: null });
    const entry = map.get(key)!;
    const type = g.assessment_type.toLowerCase().trim();
    if (type === 'home work' || type === 'homework') entry.hw = { score: g.score, max: g.max_score };
    else if (type === '1st ca' || type === 'first ca') entry.ca1 = { score: g.score, max: g.max_score };
    else if (type === '2nd ca' || type === 'second ca') entry.ca2 = { score: g.score, max: g.max_score };
    else if (type === 'exam' || type === 'examination' || type === 'final exam') entry.exam = { score: g.score, max: g.max_score };
    else if (!entry.ca1) entry.ca1 = { score: g.score, max: g.max_score };
    else if (!entry.ca2) entry.ca2 = { score: g.score, max: g.max_score };
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([subject, s]) => {
    const ca1  = s.ca1  ? Math.round((s.ca1.score  / s.ca1.max)  * 20) : 0;
    const ca2  = s.ca2  ? Math.round((s.ca2.score  / s.ca2.max)  * 20) : 0;
    const exam = s.exam ? Math.round((s.exam.score / s.exam.max) * 60) : 0;
    const hw   = s.hw   ? Math.round((s.hw.score   / s.hw.max)   * 20) : undefined;
    const total = ca1 + ca2 + exam;
    return { subject, ca1, ca2, exam, homework: hw, total, ...getNigerianGrade(total) };
  });
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function TeacherResultsSection({ profile }: Props) {
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [resultSheets, setResultSheets] = useState<Record<string, ResultSheetMeta>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [activeStudent, setActiveStudent] = useState<StudentInfo | null>(null);
  const [modalTab, setModalTab] = useState<'preview' | 'edit'>('preview');
  const [cardData, setCardData] = useState<ResultCardData | null>(null);
  const [subjects, setSubjects] = useState<SubjectResult[]>([]);
  const [loadingCard, setLoadingCard] = useState(false);
  const [metaForm, setMetaForm] = useState<ResultSheetMeta>(defaultMeta);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    supabase.from('classes').select('id, name').eq('teacher_id', profile.id).order('name').then(({ data }) => {
      const cls = (data || []) as { id: string; name: string }[];
      setMyClasses(cls);
      if (cls.length > 0) setSelectedClass(cls[0].id);
    });
  }, [profile.id]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass) { setStudents([]); return; }
    setLoading(true);
    try {
      const { data: studs } = await supabase
        .from('students')
        .select('id, student_id, profiles:profile_id(first_name, last_name, email), classes:class_id(id, name, level), gender, date_of_birth')
        .eq('class_id', selectedClass)
        .eq('is_active', true)
        .order('student_id');

      const studList = (studs || []) as StudentInfo[];
      setStudents(studList);

      if (studList.length > 0) {
        const { data: sheets } = await supabase
          .from('result_sheets')
          .select('*')
          .in('student_id', studList.map(s => s.id))
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear);

        const map: Record<string, ResultSheetMeta> = {};
        (sheets || []).forEach((sh: ResultSheetMeta & { student_id: string }) => {
          map[sh.student_id] = { ...defaultMeta, ...sh };
        });
        setResultSheets(map);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedTerm, academicYear]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const openCard = async (student: StudentInfo) => {
    setActiveStudent(student);
    setModalTab('preview');
    setDeleteConfirm(false);
    setLoadingCard(true);

    const [{ data: sheet }, { data: gradeRows }, { data: classGrades }] = await Promise.all([
      supabase.from('result_sheets').select('*').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear).maybeSingle(),
      supabase.from('grades').select('*').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear),
      supabase.from('grades').select('*').in('student_id', students.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
    ]);

    const rs = sheet as ResultSheetMeta | null;
    const subs = computeSubjects((gradeRows || []) as GradeRow[]);
    setSubjects(subs);

    // Compute class stats
    const allGrades = (classGrades || []) as GradeRow[];
    const grandTotals = students.map(s => {
      const sg = allGrades.filter(g => g.student_id === s.id);
      const ssubs = computeSubjects(sg);
      return ssubs.reduce((a, sub) => a + sub.total, 0);
    }).filter(t => t > 0);
    const myTotal = subs.reduce((a, s) => a + s.total, 0);
    const sorted = [...grandTotals].sort((a, b) => b - a);
    const position = sorted.indexOf(myTotal) + 1 || sorted.length + 1;

    const meta = rs || defaultMeta;
    setMetaForm({ ...defaultMeta, ...meta });

    setCardData({
      student: {
        name: `${student.profiles?.first_name} ${student.profiles?.last_name}`,
        studentId: student.student_id,
        className: student.classes?.name || '—',
        classLevel: student.classes?.level,
        gender: student.gender || '',
        dob: student.date_of_birth || '',
      },
      term: selectedTerm,
      academicYear,
      subjects: subs,
      classStats: {
        position, totalStudents: students.length, grandTotal: myTotal,
        highestInClass: sorted[0] ?? 0, lowestInClass: sorted[sorted.length - 1] ?? 0,
        classAverage: grandTotals.length > 0 ? Math.round(grandTotals.reduce((a, b) => a + b, 0) / grandTotals.length) : 0,
      },
      behavior: {
        punctuality: meta.punctuality, neatness: meta.neatness, honesty: meta.honesty,
        cooperation: meta.cooperation, attentiveness: meta.attentiveness, politeness: meta.politeness,
      },
      attendance: { daysPresent: meta.days_present, daysAbsent: meta.days_absent, totalDays: meta.total_school_days },
      comments: { teacher: meta.teacher_comment, principal: meta.principal_comment },
      nextTerm: { begins: meta.next_term_begins || '', fees: meta.next_term_fees },
      schoolName: SCHOOL_NAME,
      schoolAddress: `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`,
    });
    setLoadingCard(false);
  };

  // Sync cardData behavior/comments/attendance when metaForm changes in Edit tab
  const syncCardData = (updated: ResultSheetMeta) => {
    if (!cardData) return;
    setCardData(prev => prev ? {
      ...prev,
      behavior: {
        punctuality: updated.punctuality, neatness: updated.neatness, honesty: updated.honesty,
        cooperation: updated.cooperation, attentiveness: updated.attentiveness, politeness: updated.politeness,
      },
      attendance: { daysPresent: updated.days_present, daysAbsent: updated.days_absent, totalDays: updated.total_school_days },
      comments: { teacher: updated.teacher_comment, principal: updated.principal_comment },
      nextTerm: { begins: updated.next_term_begins || '', fees: updated.next_term_fees },
    } : null);
  };

  const updateMeta = (patch: Partial<ResultSheetMeta>) => {
    setMetaForm(prev => {
      const updated = { ...prev, ...patch };
      syncCardData(updated);
      return updated;
    });
  };

  const saveMeta = async () => {
    if (!activeStudent) return;
    setSaving(true);
    try {
      const payload = {
        student_id: activeStudent.id,
        term: selectedTerm,
        academic_year: academicYear,
        teacher_comment: metaForm.teacher_comment,
        principal_comment: metaForm.principal_comment,
        punctuality: metaForm.punctuality, neatness: metaForm.neatness,
        honesty: metaForm.honesty, cooperation: metaForm.cooperation,
        attentiveness: metaForm.attentiveness, politeness: metaForm.politeness,
        days_present: metaForm.days_present, days_absent: metaForm.days_absent,
        total_school_days: metaForm.total_school_days,
        next_term_begins: metaForm.next_term_begins || null,
        next_term_fees: metaForm.next_term_fees,
        is_published: metaForm.is_published,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('result_sheets').upsert(payload, { onConflict: 'student_id,term,academic_year' });
      if (error) throw error;
      setToast({ msg: 'Result sheet saved', type: 'success' });
      setResultSheets(prev => ({ ...prev, [activeStudent.id]: metaForm }));
      loadStudents();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    }
    setSaving(false);
  };

  const deleteMeta = async () => {
    if (!activeStudent || !resultSheets[activeStudent.id]) return;
    try {
      const { error } = await supabase.from('result_sheets')
        .delete()
        .eq('student_id', activeStudent.id)
        .eq('term', selectedTerm)
        .eq('academic_year', academicYear);
      if (error) throw error;
      setToast({ msg: 'Result sheet deleted', type: 'success' });
      setResultSheets(prev => { const n = { ...prev }; delete n[activeStudent.id]; return n; });
      setActiveStudent(null);
      setCardData(null);
      loadStudents();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
    setDeleteConfirm(false);
  };

  const filteredStudents = students.filter(s => {
    const name = `${s.profiles?.first_name} ${s.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-xl font-bold text-gray-900">Result Cards</h2>
        <p className="text-xs text-gray-500 mt-0.5">View, edit and publish student result sheets for your class</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1">Class</label>
            <div className="relative">
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1">Term</label>
            <div className="relative">
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedClass && (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Students', value: students.length, color: 'text-blue-700' },
              { label: 'Sheets Created', value: Object.keys(resultSheets).length, color: 'text-yellow-700' },
              { label: 'Published', value: Object.values(resultSheets).filter(r => r.is_published).length, color: 'text-green-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Sheet Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => {
                    const sheet = resultSheets[s.id];
                    const isPublished = sheet?.is_published;
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                              {s.profiles?.first_name?.[0]}{s.profiles?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                              <p className="text-xs text-gray-400">{s.profiles?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">{s.student_id}</td>
                        <td className="py-3 px-4">
                          {!sheet ? (
                            <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> Not created</span>
                          ) : isPublished ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Published</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium"><FileText className="w-3.5 h-3.5" /> Draft</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => openCard(s)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium hover:bg-blue-800 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            {sheet ? 'View / Edit' : 'Create Sheet'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">No students found</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}

      {myClasses.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classes assigned to you yet</p>
          <p className="text-xs mt-1">Contact your administrator to be assigned a class.</p>
        </div>
      )}

      {/* ── Result Card Modal ── */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">

            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">
                  {activeStudent.profiles?.first_name} {activeStudent.profiles?.last_name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedTerm} · {academicYear} · {activeStudent.classes?.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  <button onClick={() => setModalTab('preview')} className={`px-3 py-1.5 ${modalTab === 'preview' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Preview
                  </button>
                  <button onClick={() => setModalTab('edit')} className={`px-3 py-1.5 ${modalTab === 'edit' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Edit
                  </button>
                </div>
                <button onClick={() => { setActiveStudent(null); setCardData(null); setDeleteConfirm(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {loadingCard ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* ── Preview Tab ── */}
                  {modalTab === 'preview' && (
                    <div className="space-y-5">
                      {!cardData || subjects.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No result data yet</p>
                          <p className="text-xs mt-1">Switch to "Edit Sheet" to fill in attendance and comments.</p>
                          <button onClick={() => setModalTab('edit')} className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800">
                            Open Edit Sheet
                          </button>
                        </div>
                      ) : (
                        <>
                          <ResultCard
                            data={cardData}
                            onPrint={() => printResultCard(`${activeStudent.profiles?.first_name} ${activeStudent.profiles?.last_name}`)}
                          />
                          {subjects.length > 0 && (
                            <PerformanceChart subjects={subjects} title={`${activeStudent.profiles?.first_name} — ${selectedTerm} Performance`} />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Edit Tab ── */}
                  {modalTab === 'edit' && (
                    <div className="space-y-6">

                      {/* Attendance */}
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-3">Attendance Record</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Total School Days</label>
                            <input type="number" min={0} value={metaForm.total_school_days}
                              onChange={e => updateMeta({ total_school_days: Number(e.target.value) })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Days Present</label>
                            <input type="number" min={0} value={metaForm.days_present}
                              onChange={e => updateMeta({ days_present: Number(e.target.value) })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Days Absent</label>
                            <input type="number" min={0} value={metaForm.days_absent}
                              onChange={e => updateMeta({ days_absent: Number(e.target.value) })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-3">Remarks</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Class Teacher's Remark</label>
                            <textarea rows={2} value={metaForm.teacher_comment}
                              onChange={e => updateMeta({ teacher_comment: e.target.value })}
                              placeholder="e.g. A diligent student who shows great potential…"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Principal's / Proprietress' Remark</label>
                            <textarea rows={2} value={metaForm.principal_comment}
                              onChange={e => updateMeta({ principal_comment: e.target.value })}
                              placeholder="e.g. Excellent performance. Keep it up!"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                          </div>
                        </div>
                      </div>

                      {/* Next Term */}
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-3">Next Term Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Next Term Begins</label>
                            <input type="date" value={metaForm.next_term_begins}
                              onChange={e => updateMeta({ next_term_begins: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fees for Next Term</label>
                            <input value={metaForm.next_term_fees}
                              onChange={e => updateMeta({ next_term_fees: e.target.value })}
                              placeholder="₦150,000"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* Publish toggle */}
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                        <input type="checkbox" id="pub-teacher" checked={metaForm.is_published}
                          onChange={e => updateMeta({ is_published: e.target.checked })}
                          className="w-4 h-4 rounded accent-green-700 cursor-pointer" />
                        <label htmlFor="pub-teacher" className="text-sm font-medium text-gray-700 cursor-pointer">
                          Publish result — makes it visible to parents
                        </label>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 flex-wrap">
                        <button onClick={() => setModalTab('preview')}
                          className="flex-1 min-w-[120px] py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          Preview Card
                        </button>
                        <button onClick={saveMeta} disabled={saving}
                          className="flex-1 min-w-[140px] py-2.5 bg-blue-700 text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                          <Save className="w-4 h-4" />
                          {saving ? 'Saving…' : 'Save Sheet'}
                        </button>

                        {/* Delete */}
                        {resultSheets[activeStudent?.id || ''] && !deleteConfirm && (
                          <button onClick={() => setDeleteConfirm(true)}
                            className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-2 transition-colors">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        )}
                        {deleteConfirm && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-red-700">Are you sure?</span>
                            <button onClick={deleteMeta} className="px-2 py-0.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Yes, delete</button>
                            <button onClick={() => setDeleteConfirm(false)} className="px-2 py-0.5 border border-gray-200 rounded-lg text-xs hover:bg-white">Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
