import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Search, ChevronDown, Save, X, Eye, CheckCircle, Clock,
  Trash2, AlertTriangle, BarChart3, GraduationCap, Printer,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import { useSchoolSettings } from '../../../hooks/useSchoolSettings';
import ResultCard, { getNigerianGrade, printResultCard, CardPrintContent, PRE_KG_SKILLS, PRE_KG_COMMENTS } from './ResultCard';
import type { ResultCardData, SubjectResult } from './ResultCard';
import type { ProfileRow, ClassRow, GradeRow } from '../../../lib/supabase';
import PerformanceChart from '../shared/PerformanceChart';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }


const defaultMeta = {
  teacher_comment: '', principal_comment: '',
  punctuality: 3, neatness: 3, honesty: 3, cooperation: 3, attentiveness: 3, politeness: 3,
  days_present: 0, days_absent: 0, total_school_days: 0,
  next_term_begins: '', next_term_fees: '', is_published: false,
};
type MetaForm = typeof defaultMeta;

interface StudentInfo {
  id: string;
  student_id: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
  classes: { name: string; level: string } | null;
  gender: string | null;
  date_of_birth: string | null;
}

interface OverallClassStat {
  name: string;
  studentCount: number;
  average: number;
  grade: string;
  remark: string;
  published: number;
}

function getTermDateRange(term: string, academicYear: string): { start: string; end: string } {
  const [startYearStr] = academicYear.split('/');
  const y = parseInt(startYearStr, 10);
  if (term === 'First Term')  return { start: `${y}-09-01`,   end: `${y}-12-31` };
  if (term === 'Second Term') return { start: `${y + 1}-01-01`, end: `${y + 1}-04-30` };
  if (term === 'Third Term')  return { start: `${y + 1}-05-01`, end: `${y + 1}-07-31` };
  return { start: `${y}-09-01`, end: `${y + 1}-07-31` };
}

function computeSubjects(grades: GradeRow[]): SubjectResult[] {
  const map = new Map<string, {
    ca1:  { score: number; max: number } | null;
    ca2:  { score: number; max: number } | null;
    exam: { score: number; max: number } | null;
    hw:   { score: number; max: number } | null;
  }>();
  for (const g of grades) {
    const key = g.subject.trim();
    if (!map.has(key)) map.set(key, { ca1: null, ca2: null, exam: null, hw: null });
    const entry = map.get(key)!;
    const type = g.assessment_type.toLowerCase().trim();
    if (type === 'home work' || type === 'homework') {
      entry.hw = { score: g.score, max: g.max_score };
    } else if (type === '1st ca' || type === 'first ca' || type === '1st continuous assessment') {
      entry.ca1 = { score: g.score, max: g.max_score };
    } else if (type === '2nd ca' || type === 'second ca' || type === '2nd continuous assessment') {
      entry.ca2 = { score: g.score, max: g.max_score };
    } else if (type === 'exam' || type === 'examination' || type === 'final exam') {
      entry.exam = { score: g.score, max: g.max_score };
    } else if (!entry.ca1) {
      entry.ca1 = { score: g.score, max: g.max_score };
    } else if (!entry.ca2) {
      entry.ca2 = { score: g.score, max: g.max_score };
    }
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

/* ─────────────────────────────────────────────────────────── */
export default function ResultsSection({ profile }: Props) {
  const { schoolName, settings } = useSchoolSettings();

  // Main view toggle
  const [mainView, setMainView] = useState<'class' | 'overview'>('class');

  // Filters
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name' | 'level'>[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());

  // Class view
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [resultSheets, setResultSheets] = useState<Record<string, MetaForm & { id?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [classView, setClassView] = useState<'list' | 'chart'>('list');
  const [classChartBars, setClassChartBars] = useState<SubjectResult[]>([]);

  // Modal state
  const [activeStudent, setActiveStudent] = useState<StudentInfo | null>(null);
  const [activeSubjects, setActiveSubjects] = useState<SubjectResult[]>([]);
  const [activeClassStats, setActiveClassStats] = useState<ResultCardData['classStats'] | null>(null);
  const [metaForm, setMetaForm] = useState<MetaForm>(defaultMeta);
  const [saving, setSaving] = useState(false);
  const [modalTab, setModalTab] = useState<'preview' | 'edit'>('preview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [preKgRatings, setPreKgRatings] = useState<Partial<Record<string, number>>>({});

  const isToddlerStudent = activeStudent?.classes?.level === 'toddler';

  const buildPreKgSubjects = (ratings: Partial<Record<string, number>>): SubjectResult[] =>
    PRE_KG_SKILLS
      .filter(s => (ratings[s.name] ?? 0) > 0)
      .map(s => {
        const r = ratings[s.name] ?? 0;
        const ca1 = Math.round((r / 5) * 20);
        return { subject: s.name, ca1, ca2: 0, exam: 0, total: ca1, grade: '', remark: '' };
      });

  const updatePreKgRating = (skillName: string, rating: number) => {
    const updated: Partial<Record<string, number>> = { ...preKgRatings, [skillName]: rating === 0 ? undefined : rating };
    setPreKgRatings(updated);
    const newSubs = buildPreKgSubjects(updated);
    setActiveSubjects(newSubs);
  };

  // School Overview
  const [overallStats, setOverallStats] = useState<OverallClassStat[]>([]);
  const [loadingOverall, setLoadingOverall] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Selective printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCards, setBulkCards] = useState<ResultCardData[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);

  // Load classes
  useEffect(() => {
    supabase.from('classes').select('id, name, level').order('name').then(({ data }) => {
      setClasses((data || []) as Pick<ClassRow, 'id' | 'name' | 'level'>[]);
    });
  }, []);

  // Load students + result sheets
  const loadClassData = useCallback(async () => {
    if (!selectedClass) { setStudents([]); setResultSheets({}); setClassChartBars([]); return; }
    setLoading(true);
    const { data: studs } = await supabase
      .from('students')
      .select('id, student_id, profiles:profile_id(first_name, last_name, email), classes:class_id(name, level), gender, date_of_birth')
      .eq('class_id', selectedClass).eq('is_active', true).order('student_id');

    const studList = (studs || []) as StudentInfo[];
    setStudents(studList);

    if (studList.length > 0) {
      const [{ data: sheets }, { data: allGradesRaw }] = await Promise.all([
        supabase.from('result_sheets').select('*').in('student_id', studList.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
        supabase.from('grades').select('*').in('student_id', studList.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
      ]);

      const map: Record<string, MetaForm & { id?: string }> = {};
      (sheets || []).forEach((sh: MetaForm & { id: string; student_id: string }) => {
        map[sh.student_id] = { ...defaultMeta, ...sh };
      });
      setResultSheets(map);

      // Build class chart bars
      const allGrades = (allGradesRaw || []) as GradeRow[];
      const bars: SubjectResult[] = studList
        .map(s => {
          const sGrades = allGrades.filter(g => g.student_id === s.id);
          const subs = computeSubjects(sGrades);
          const avg = subs.length > 0 ? Math.round(subs.reduce((a, sub) => a + sub.total, 0) / subs.length) : 0;
          return {
            subject: s.profiles?.first_name || 'Student',
            ca1: 0, ca2: 0, exam: 0,
            total: avg,
            ...getNigerianGrade(avg),
          };
        })
        .filter(b => b.total > 0)
        .sort((a, b) => b.total - a.total);
      setClassChartBars(bars);
    }
    setLoading(false);
  }, [selectedClass, selectedTerm, academicYear]);

  useEffect(() => { loadClassData(); }, [loadClassData]);

  // Load school overview
  const loadOverall = useCallback(async () => {
    if (classes.length === 0) return;
    setLoadingOverall(true);

    // Fetch all active students with class_id
    const { data: allStuds } = await supabase.from('students').select('id, class_id').eq('is_active', true);
    const studs = (allStuds || []) as { id: string; class_id: string }[];
    if (studs.length === 0) { setLoadingOverall(false); return; }

    // Fetch all grades for the term/year in one query
    const { data: allGradesRaw } = await supabase
      .from('grades').select('*')
      .in('student_id', studs.map(s => s.id))
      .eq('term', selectedTerm).eq('academic_year', academicYear);
    const allGrades = (allGradesRaw || []) as GradeRow[];

    // Fetch published counts per class via result_sheets
    const { data: sheetsRaw } = await supabase
      .from('result_sheets').select('student_id, is_published')
      .in('student_id', studs.map(s => s.id))
      .eq('term', selectedTerm).eq('academic_year', academicYear);
    const sheets = (sheetsRaw || []) as { student_id: string; is_published: boolean }[];

    // Group students by class
    const byClass = new Map<string, string[]>();
    studs.forEach(s => { if (!byClass.has(s.class_id)) byClass.set(s.class_id, []); byClass.get(s.class_id)!.push(s.id); });

    const publishedById: Record<string, boolean> = {};
    sheets.forEach(sh => { publishedById[sh.student_id] = sh.is_published; });

    const stats: OverallClassStat[] = classes.map(cls => {
      const studIds = byClass.get(cls.id) || [];
      let totalAvg = 0; let count = 0; let published = 0;
      studIds.forEach(sid => {
        const sGrades = allGrades.filter(g => g.student_id === sid);
        const subs = computeSubjects(sGrades);
        if (subs.length > 0) {
          totalAvg += Math.round(subs.reduce((a, sub) => a + sub.total, 0) / subs.length);
          count++;
        }
        if (publishedById[sid]) published++;
      });
      const avg = count > 0 ? Math.round(totalAvg / count) : 0;
      return { name: cls.name, studentCount: studIds.length, average: avg, ...getNigerianGrade(avg), published };
    }).filter(s => s.studentCount > 0);

    setOverallStats(stats);
    setLoadingOverall(false);
  }, [classes, selectedTerm, academicYear]);

  useEffect(() => { if (mainView === 'overview') loadOverall(); }, [mainView, loadOverall]);

  // Open result for a student
  const openResult = async (student: StudentInfo) => {
    setActiveStudent(student);
    setModalTab('preview');
    setDeleteConfirm(false);

    const isToddler = student.classes?.level === 'toddler';
    const dateRange = getTermDateRange(selectedTerm, academicYear);
    const [{ data: myGrades }, { data: classGrades }, { data: attData }] = await Promise.all([
      supabase.from('grades').select('*').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear),
      supabase.from('grades').select('*').in('student_id', students.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
      supabase.from('attendance').select('status').eq('student_id', student.id).gte('date', dateRange.start).lte('date', dateRange.end),
    ]);

    const myGradeRows = (myGrades || []) as GradeRow[];

    let mySubjects: SubjectResult[];
    let ratings: Record<string, number> = {};
    if (isToddler) {
      const pkGrades = myGradeRows.filter(g => g.assessment_type === 'pre_kg');
      pkGrades.forEach(g => { ratings[g.subject] = g.score; });
      setPreKgRatings(ratings);
      mySubjects = buildPreKgSubjects(ratings);
    } else {
      mySubjects = computeSubjects(myGradeRows);
    }
    setActiveSubjects(mySubjects);

    const allGrades = (classGrades || []) as GradeRow[];
    const grandTotalByStudent: Record<string, number> = {};
    students.forEach(s => {
      const sg = allGrades.filter(g => g.student_id === s.id);
      const subs = s.classes?.level === 'toddler'
        ? buildPreKgSubjects(Object.fromEntries(sg.filter(g => g.assessment_type === 'pre_kg').map(g => [g.subject, g.score])))
        : computeSubjects(sg);
      grandTotalByStudent[s.id] = subs.reduce((acc, sub) => acc + sub.total, 0);
    });

    const myGrandTotal = mySubjects.reduce((acc, s) => acc + s.total, 0);
    const allTotals = Object.values(grandTotalByStudent).filter(t => t > 0);
    const sorted = [...allTotals].sort((a, b) => b - a);
    const position = sorted.indexOf(myGrandTotal) + 1 || sorted.length + 1;

    setActiveClassStats({
      position, totalStudents: students.length, grandTotal: myGrandTotal,
      highestInClass: sorted[0] ?? 0,
      lowestInClass: sorted[sorted.length - 1] ?? 0,
      classAverage: allTotals.length > 0 ? Math.round(allTotals.reduce((a, b) => a + b, 0) / allTotals.length) : 0,
    });

    // Auto-calculate attendance from records
    const attRecords = (attData || []) as { status: string }[];
    const attTotal = attRecords.length;
    const attPresent = attRecords.filter(a => a.status === 'present' || a.status === 'late').length;
    const autoAtt = attTotal > 0
      ? { days_present: attPresent, days_absent: attTotal - attPresent, total_school_days: attTotal }
      : {};

    const existing = resultSheets[student.id];
    if (existing) {
      // Use saved attendance if already set, else auto-fill
      setMetaForm({
        ...defaultMeta, ...existing,
        ...(existing.total_school_days === 0 ? autoAtt : {}),
      });
    } else {
      setMetaForm({ ...defaultMeta, ...autoAtt });
    }
  };

  const closeModal = () => { setActiveStudent(null); setActiveSubjects([]); setActiveClassStats(null); setDeleteConfirm(false); };

  const buildCardData = (): ResultCardData | null => {
    if (!activeStudent || !activeClassStats) return null;
    return {
      student: {
        name: `${activeStudent.profiles?.first_name} ${activeStudent.profiles?.last_name}`,
        studentId: activeStudent.student_id,
        className: activeStudent.classes?.name || '—',
        classLevel: activeStudent.classes?.level,
        gender: activeStudent.gender || '',
        dob: activeStudent.date_of_birth || '',
      },
      term: selectedTerm, academicYear,
      subjects: activeSubjects, classStats: activeClassStats,
      behavior: {
        punctuality: metaForm.punctuality, neatness: metaForm.neatness, honesty: metaForm.honesty,
        cooperation: metaForm.cooperation, attentiveness: metaForm.attentiveness, politeness: metaForm.politeness,
      },
      attendance: { daysPresent: metaForm.days_present, daysAbsent: metaForm.days_absent, totalDays: metaForm.total_school_days },
      comments: { teacher: metaForm.teacher_comment, principal: metaForm.principal_comment },
      nextTerm: { begins: metaForm.next_term_begins, fees: metaForm.next_term_fees },
      schoolName, schoolAddress: (settings.school_address as string) || '',
    };
  };

  const cardData = buildCardData();

  const saveMeta = async () => {
    if (!activeStudent) return;
    setSaving(true);
    try {
      const payload = {
        student_id: activeStudent.id, term: selectedTerm, academic_year: academicYear,
        teacher_comment: metaForm.teacher_comment, principal_comment: metaForm.principal_comment,
        punctuality: metaForm.punctuality, neatness: metaForm.neatness, honesty: metaForm.honesty,
        cooperation: metaForm.cooperation, attentiveness: metaForm.attentiveness, politeness: metaForm.politeness,
        days_present: metaForm.days_present, days_absent: metaForm.days_absent, total_school_days: metaForm.total_school_days,
        next_term_begins: metaForm.next_term_begins || null, next_term_fees: metaForm.next_term_fees,
        is_published: metaForm.is_published, created_by: profile.id, updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('result_sheets').upsert(payload, { onConflict: 'student_id,term,academic_year' });
      if (error) throw error;

      // Save pre-KG skill ratings (delete then insert)
      if (isToddlerStudent) {
        await supabase.from('grades')
          .delete()
          .eq('student_id', activeStudent.id)
          .eq('assessment_type', 'pre_kg')
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear);
        const gradeRows = PRE_KG_SKILLS
          .filter(s => (preKgRatings[s.name] || 0) > 0)
          .map(s => ({
            student_id: activeStudent.id,
            subject: s.name,
            assessment_type: 'pre_kg',
            score: preKgRatings[s.name] ?? 0,
            max_score: 5,
            term: selectedTerm,
            academic_year: academicYear,
            graded_by: profile.id,
          }));
        if (gradeRows.length > 0) {
          const { error: gErr } = await supabase.from('grades').insert(gradeRows);
          if (gErr) throw gErr;
        }
      }

      setToast({ msg: 'Result saved successfully', type: 'success' });
      setResultSheets(prev => ({ ...prev, [activeStudent.id]: { ...metaForm } }));
      loadClassData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    }
    setSaving(false);
  };

  const deleteMeta = async () => {
    if (!activeStudent) return;
    try {
      const { error } = await supabase.from('result_sheets')
        .delete()
        .eq('student_id', activeStudent.id)
        .eq('term', selectedTerm)
        .eq('academic_year', academicYear);
      if (error) throw error;
      setToast({ msg: 'Result sheet deleted', type: 'success' });
      setResultSheets(prev => { const n = { ...prev }; delete n[activeStudent.id]; return n; });
      closeModal();
      loadClassData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
  };

  // Clear selection when class / term / year changes
  useEffect(() => { setSelectedIds(new Set()); }, [selectedClass, selectedTerm, academicYear]);

  // Trigger print window once bulk cards have rendered into the hidden container
  useEffect(() => {
    if (bulkCards.length === 0) return;
    const t = setTimeout(() => {
      const el = bulkRef.current;
      if (!el) { setBulkCards([]); return; }
      const win = window.open('', '_blank', 'width=1000,height=800');
      if (!win) { setBulkCards([]); setToast({ msg: 'Pop-up blocked — allow pop-ups and try again', type: 'error' }); return; }
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Result Sheets — ${selectedTerm} ${academicYear}</title>
<style>
  @page { size: A4 portrait; margin: 8mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; }
  img { max-width: 100%; }
  .card-page { page-break-after: always; margin-bottom: 0; }
  .card-page:last-child { page-break-after: auto; }
</style></head><body>${el.innerHTML}</body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); setBulkCards([]); }, 700);
    }, 350);
    return () => clearTimeout(t);
  }, [bulkCards, selectedTerm, academicYear]);

  const printSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsBulkLoading(true);
    try {
      const selected = students.filter(s => ids.includes(s.id));
      const dateRange = getTermDateRange(selectedTerm, academicYear);

      const [classGradesResult, attResultsAll] = await Promise.all([
        supabase.from('grades').select('*')
          .in('student_id', students.map(s => s.id))
          .eq('term', selectedTerm).eq('academic_year', academicYear),
        Promise.all(selected.map(s =>
          supabase.from('attendance').select('status')
            .eq('student_id', s.id).gte('date', dateRange.start).lte('date', dateRange.end)
        )),
      ]);

      const allGrades = (classGradesResult.data || []) as GradeRow[];

      // Class-wide stats (shared)
      const grandTotalByStudent: Record<string, number> = {};
      students.forEach(s => {
        const sg = allGrades.filter(g => g.student_id === s.id);
        grandTotalByStudent[s.id] = computeSubjects(sg).reduce((acc, sub) => acc + sub.total, 0);
      });
      const allTotals = Object.values(grandTotalByStudent).filter(t => t > 0);
      const sorted = [...allTotals].sort((a, b) => b - a);
      const classAvg = allTotals.length > 0 ? Math.round(allTotals.reduce((a, b) => a + b, 0) / allTotals.length) : 0;

      const cards: ResultCardData[] = selected.map((student, idx) => {
        const myGrades = allGrades.filter(g => g.student_id === student.id);
        const mySubjects = computeSubjects(myGrades);
        const myGrandTotal = mySubjects.reduce((acc, s) => acc + s.total, 0);
        const position = sorted.indexOf(myGrandTotal) + 1 || sorted.length + 1;

        const attRecords = (attResultsAll[idx].data || []) as { status: string }[];
        const attTotal = attRecords.length;
        const attPresent = attRecords.filter(a => a.status === 'present' || a.status === 'late').length;

        const meta = resultSheets[student.id] || defaultMeta;
        const att = attTotal > 0
          ? { daysPresent: attPresent, daysAbsent: attTotal - attPresent, totalDays: attTotal }
          : { daysPresent: meta.days_present, daysAbsent: meta.days_absent, totalDays: meta.total_school_days };

        return {
          student: {
            name: `${student.profiles?.first_name} ${student.profiles?.last_name}`,
            studentId: student.student_id,
            className: student.classes?.name || '—',
            classLevel: student.classes?.level,
            gender: student.gender || '',
            dob: student.date_of_birth || '',
          },
          term: selectedTerm, academicYear,
          subjects: mySubjects,
          classStats: { position, totalStudents: students.length, grandTotal: myGrandTotal, highestInClass: sorted[0] ?? 0, lowestInClass: sorted[sorted.length - 1] ?? 0, classAverage: classAvg },
          behavior: { punctuality: meta.punctuality, neatness: meta.neatness, honesty: meta.honesty, cooperation: meta.cooperation, attentiveness: meta.attentiveness, politeness: meta.politeness },
          attendance: att,
          comments: { teacher: meta.teacher_comment, principal: meta.principal_comment },
          nextTerm: { begins: meta.next_term_begins, fees: meta.next_term_fees },
          schoolName, schoolAddress: (settings.school_address as string) || '',
        };
      });

      setBulkCards(cards);
    } catch {
      setToast({ msg: 'Failed to load results for printing', type: 'error' });
    }
    setIsBulkLoading(false);
  }, [selectedIds, students, selectedTerm, academicYear, resultSheets, schoolName, settings]);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleSelectAll = () => setSelectedIds(
    selectedIds.size === filteredStudents.length && filteredStudents.length > 0
      ? new Set()
      : new Set(filteredStudents.map(s => s.id))
  );

  const filteredStudents = students.filter(s => {
    const name = `${s.profiles?.first_name} ${s.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase());
  });

  // Grade color helper for overview table
  const gradeColor = (g: string) => g.startsWith('A') ? 'text-green-700' : g.startsWith('B') ? 'text-blue-700' : g.startsWith('C') ? 'text-yellow-700' : 'text-red-700';

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Result Sheets</h2>
          <p className="text-xs text-gray-500 mt-0.5">Terminal report cards — manage, publish and download</p>
        </div>
        {/* Main view toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-medium shadow-sm">
          <button onClick={() => setMainView('class')} className={`px-4 py-2 flex items-center gap-1.5 ${mainView === 'class' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <FileText className="w-4 h-4" /> By Class
          </button>
          <button onClick={() => setMainView('overview')} className={`px-4 py-2 flex items-center gap-1.5 ${mainView === 'overview' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <GraduationCap className="w-4 h-4" /> School Overview
          </button>
        </div>
      </div>

      {/* ── Term / Year Filters (shared) ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          {mainView === 'class' && (
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-gray-500 mb-1">Class</label>
              <div className="relative">
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1">Term</label>
            <div className="relative">
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── SCHOOL OVERVIEW VIEW ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {mainView === 'overview' && (
        <div className="space-y-5">
          {loadingOverall ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin" /></div>
          ) : overallStats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No grade data for {selectedTerm} · {academicYear}</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Classes', value: overallStats.length, color: 'text-blue-700' },
                  { label: 'Total Students', value: overallStats.reduce((a, s) => a + s.studentCount, 0), color: 'text-gray-800' },
                  { label: 'Published Results', value: overallStats.reduce((a, s) => a + s.published, 0), color: 'text-green-700' },
                  { label: 'School Average', value: `${Math.round(overallStats.filter(s => s.average > 0).reduce((a, s) => a + s.average, 0) / Math.max(1, overallStats.filter(s => s.average > 0).length))}%`, color: 'text-purple-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Class comparison chart */}
              <PerformanceChart
                subjects={overallStats.filter(s => s.average > 0).map(s => ({
                  subject: s.name,
                  ca1: 0, ca2: 0, exam: 0,
                  total: s.average,
                  grade: s.grade,
                  remark: s.remark,
                }))}
                title={`Class Performance Comparison — ${selectedTerm} · ${academicYear}`}
              />

              {/* Class ranking table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">Class Rankings</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Students</th>
                      <th className="py-3 px-4">Avg Score</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...overallStats].sort((a, b) => b.average - a.average).map((cls, idx) => (
                      <tr key={cls.name} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">{cls.name}</td>
                        <td className="py-3 px-4 text-gray-500">{cls.studentCount}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div style={{ width: `${cls.average}%` }} className={`h-full rounded-full ${cls.average >= 70 ? 'bg-green-500' : cls.average >= 50 ? 'bg-blue-500' : 'bg-red-400'}`} />
                            </div>
                            <span className="font-semibold text-gray-800">{cls.average > 0 ? `${cls.average}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4"><span className={`font-bold text-sm ${gradeColor(cls.grade)}`}>{cls.average > 0 ? `${cls.grade} – ${cls.remark}` : '—'}</span></td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-medium ${cls.published > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {cls.published}/{cls.studentCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── CLASS VIEW ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {mainView === 'class' && selectedClass && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Students', value: students.length, color: 'text-green-700' },
              { label: 'Sheets Created', value: Object.keys(resultSheets).length, color: 'text-yellow-700' },
              { label: 'Published', value: Object.values(resultSheets).filter(r => r.is_published).length, color: 'text-emerald-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* List / Chart toggle + Print Selected */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-medium shadow-sm">
              <button onClick={() => setClassView('list')} className={`px-3 py-1.5 ${classView === 'list' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Student List
              </button>
              <button onClick={() => setClassView('chart')} className={`px-3 py-1.5 flex items-center gap-1 ${classView === 'chart' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <BarChart3 className="w-3.5 h-3.5" /> Performance Chart
              </button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {selectedIds.size > 0 && (
              <button onClick={printSelected} disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 disabled:opacity-60 shadow-sm">
                <Printer className="w-3.5 h-3.5" />
                {isBulkLoading ? 'Loading…' : `Print Selected (${selectedIds.size})`}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin" /></div>
          ) : classView === 'chart' ? (
            /* ── Performance Chart view ── */
            <div className="space-y-5">
              {classChartBars.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No grade data for this class / term yet</p>
                </div>
              ) : (
                <>
                  <PerformanceChart
                    subjects={classChartBars}
                    title={`${classes.find(c => c.id === selectedClass)?.name} — Student Performance (${selectedTerm})`}
                  />
                  {/* Ranking table */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">Class Rankings</div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Average</th>
                          <th className="py-3 px-4">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classChartBars.map((bar, idx) => (
                          <tr key={bar.subject} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>{idx + 1}</span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">{bar.subject}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div style={{ width: `${bar.total}%` }} className={`h-full rounded-full ${bar.total >= 70 ? 'bg-green-500' : bar.total >= 50 ? 'bg-blue-500' : 'bg-red-400'}`} />
                                </div>
                                <span className="font-semibold">{bar.total}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4"><span className={`font-bold ${gradeColor(bar.grade)}`}>{bar.grade}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Student List view ── */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="py-3 px-3 w-10">
                      <input type="checkbox"
                        checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                    </th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Result Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => {
                    const sheet = resultSheets[s.id];
                    const isPublished = sheet?.is_published;
                    const isSelected = selectedIds.has(s.id);
                    return (
                      <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}>
                        <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s.id)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                              {idx + 1}
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
                            <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> Not generated</span>
                          ) : isPublished ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Published</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium"><FileText className="w-3.5 h-3.5" /> Draft</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => openResult(s)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-800 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            {sheet ? 'View / Edit' : 'Generate'}
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
            </div>
          )}
        </>
      )}

      {mainView === 'class' && !selectedClass && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a class to view students</p>
          <p className="text-xs mt-1">Then generate and publish individual result cards</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── RESULT CARD MODAL ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {activeStudent.profiles?.first_name} {activeStudent.profiles?.last_name} — Result Card
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedTerm} · {academicYear} · {activeStudent.classes?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  <button onClick={() => setModalTab('preview')} className={`px-3 py-1.5 ${modalTab === 'preview' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Preview</button>
                  <button onClick={() => setModalTab('edit')} className={`px-3 py-1.5 ${modalTab === 'edit' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Edit Details</button>
                </div>
                <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
            </div>

            <div className="p-6">

              {/* Preview tab */}
              {modalTab === 'preview' && cardData && (
                <div className="space-y-5">
                  <ResultCard data={cardData} onPrint={() => printResultCard(`${activeStudent.profiles?.first_name} ${activeStudent.profiles?.last_name}`)} />
                  {activeSubjects.length > 0 && (
                    <PerformanceChart subjects={activeSubjects} title={`${activeStudent.profiles?.first_name} — ${selectedTerm} Subject Performance`} />
                  )}
                </div>
              )}

              {/* Edit tab */}
              {modalTab === 'edit' && (
                <div className="space-y-6">

                  {/* ── Pre-KG Skill Ratings (toddler class only) ── */}
                  {isToddlerStudent && (
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm mb-1">Skill Ratings — Toddler Pre-KG</h4>
                      <p className="text-xs text-gray-400 mb-3">Select a rating for each skill area. Quick buttons or use the dropdown for manual selection.</p>
                      <div className="grid grid-cols-1 gap-3">
                        {PRE_KG_SKILLS.map(skill => {
                          const current = preKgRatings[skill.name] || 0;
                          return (
                            <div key={skill.name} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-sm font-semibold text-gray-700">{skill.name}</span>
                                {current > 0 && (
                                  <span className="text-xs text-green-700 font-medium italic truncate max-w-[220px]">
                                    {PRE_KG_COMMENTS[skill.name]?.[current]}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {[
                                  { r: 5, label: 'Excellent',         cls: 'bg-green-100 text-green-800 border-green-300' },
                                  { r: 4, label: 'Very Good',         cls: 'bg-blue-100 text-blue-800 border-blue-300' },
                                  { r: 3, label: 'Good',              cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                                  { r: 2, label: 'Fair',              cls: 'bg-orange-100 text-orange-800 border-orange-300' },
                                  { r: 1, label: 'Needs Improvement', cls: 'bg-red-100 text-red-800 border-red-300' },
                                ].map(({ r, label, cls }) => (
                                  <button
                                    key={r}
                                    onClick={() => updatePreKgRating(skill.name, current === r ? 0 : r)}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                      current === r
                                        ? cls + ' ring-2 ring-offset-1 ring-green-400'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <select
                                value={current}
                                onChange={e => updatePreKgRating(skill.name, Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                              >
                                <option value={0}>— Not rated —</option>
                                {[5, 4, 3, 2, 1].map(r => (
                                  <option key={r} value={r}>
                                    {['', 'Needs Improvement', 'Fair', 'Good', 'Very Good', 'Excellent'][r]} — {PRE_KG_COMMENTS[skill.name]?.[r]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Attendance */}
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm mb-3">Attendance Record</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total School Days', key: 'total_school_days' as const },
                        { label: 'Days Present', key: 'days_present' as const },
                        { label: 'Days Absent', key: 'days_absent' as const },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                          <input type="number" min={0} value={metaForm[key]}
                            onChange={e => setMetaForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm mb-1">Remarks</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Class Teacher's Remark</label>
                      <textarea rows={3} value={metaForm.teacher_comment} onChange={e => setMetaForm(f => ({ ...f, teacher_comment: e.target.value }))}
                        placeholder="e.g. A diligent student who shows great potential…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Proprietress' Remark</label>
                      <textarea rows={3} value={metaForm.principal_comment} onChange={e => setMetaForm(f => ({ ...f, principal_comment: e.target.value }))}
                        placeholder="e.g. Excellent performance. We are proud of your achievements!"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                    </div>
                  </div>

                  {/* Next term */}
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm mb-3">Next Term</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date of Resumption</label>
                        <input type="date" value={metaForm.next_term_begins} onChange={e => setMetaForm(f => ({ ...f, next_term_begins: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fees for Next Term</label>
                        <input value={metaForm.next_term_fees} onChange={e => setMetaForm(f => ({ ...f, next_term_fees: e.target.value }))}
                          placeholder="₦150,000"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>
                  </div>

                  {/* Publish */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <input type="checkbox" id="published" checked={metaForm.is_published} onChange={e => setMetaForm(f => ({ ...f, is_published: e.target.checked }))}
                      className="w-4 h-4 rounded accent-green-700 cursor-pointer" />
                    <label htmlFor="published" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Publish result — visible to parents
                    </label>
                  </div>

                  {/* Action row */}
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={() => setModalTab('preview')} className="flex-1 min-w-[110px] py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                      Preview Card
                    </button>
                    <button onClick={saveMeta} disabled={saving} className="flex-1 min-w-[140px] py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save Result Sheet'}
                    </button>

                    {/* Delete */}
                    {resultSheets[activeStudent?.id || ''] && !deleteConfirm && (
                      <button onClick={() => setDeleteConfirm(true)}
                        className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                    {deleteConfirm && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm w-full">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-red-700 flex-1">Delete this result sheet permanently?</span>
                        <button onClick={deleteMeta} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Yes, delete</button>
                        <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1 border border-gray-200 rounded-lg text-xs hover:bg-white">Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden off-screen container for bulk printing ── */}
      {bulkCards.length > 0 && (
        <div ref={bulkRef} style={{ position: 'fixed', left: '-99999px', top: 0, width: '210mm', pointerEvents: 'none' }} aria-hidden="true">
          {bulkCards.map((card, i) => (
            <div key={i} className="card-page" style={{ pageBreakAfter: i < bulkCards.length - 1 ? 'always' : 'auto' }}>
              <CardPrintContent data={card} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
