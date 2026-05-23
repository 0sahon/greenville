import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Search, ChevronDown, X, Eye, CheckCircle, Clock,
  BarChart3, GraduationCap, Printer, Download, Settings,
  KeyRound, Copy, RefreshCw, EyeOff, Globe,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import { useSchoolSettings } from '../../../hooks/useSchoolSettings';
import { getNigerianGrade } from '../../../lib/grading';
import { printResultCard, CardPrintContent,
  PRE_KG_SKILLS, preKgTotalToRating,
  NURSERY_SUBJECTS, buildNurserySubjects, NURSERY_CA_MAX, NURSERY_EXAM_MAX,
  BASIC_SUBJECTS, buildBasicSubjects, BASIC_CA_MAX, BASIC_EXAM_MAX,
} from './ResultCard';
import type { ResultCardData, SubjectResult, NurseryScores, BasicScores } from './ResultCard';
import type { ProfileRow, ClassRow, GradeRow } from '../../../lib/supabase';
import PerformanceChart from '../shared/PerformanceChart';
import { computeSubjects } from '../../../lib/gradeCompute';
import ResultCardModal, { defaultMeta, type MetaForm, type StudentInfo } from './ResultCardModal';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }


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
  const [preKgCommentChoices, setPreKgCommentChoices] = useState<Record<string, number>>({});
  const [nurseryScores, setNurseryScores] = useState<NurseryScores>({});
  const [basicScores, setBasicScores] = useState<BasicScores>({});
  const [activeCardError, setActiveCardError] = useState<string | null>(null);
  const [pinVisibility, setPinVisibility] = useState<Record<string, boolean>>({});
  const [generatingPin, setGeneratingPin] = useState<string | null>(null);

  const generatePin = async (studentId: string) => {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratingPin(studentId);
    try {
      const { error } = await supabase.from('students').update({ report_pin: pin }).eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, report_pin: pin } : s));
    } catch (e: unknown) {
      console.error('PIN generation failed', e);
    } finally {
      setGeneratingPin(null);
    }
  };

  const isToddlerStudent = activeStudent?.classes?.level === 'toddler';
  const isNurseryStudent = activeStudent?.classes?.level === 'creche';
  const isBasicStudent   = ['basic1','basic2','basic3','basic4','basic5'].includes(activeStudent?.classes?.level ?? '');

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
    setActiveSubjects(buildPreKgSubjects(updated));
  };
  const updateNurseryScore = (subject: string, field: 'ca1' | 'ca2' | 'exam' | 'project' | 'homework', value: number) => {
    const updated: NurseryScores = {
      ...nurseryScores,
      [subject]: { ...(nurseryScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 }), [field]: value },
    };
    setNurseryScores(updated);
    setActiveSubjects(buildNurserySubjects(updated));
  };

  const updateBasicScore = (subject: string, field: 'ca1' | 'ca2' | 'exam' | 'project' | 'homework', value: number) => {
    const updated: BasicScores = {
      ...basicScores,
      [subject]: { ...(basicScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 }), [field]: value },
    };
    setBasicScores(updated);
    setActiveSubjects(buildBasicSubjects(updated));
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

  // Subject visibility settings
  const [subjectVisibility, setSubjectVisibility] = useState<Record<string, boolean>>({});
  const [subjectSettingsOpen, setSubjectSettingsOpen] = useState(false);

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
    try {
      const { data: studs } = await supabase
        .from('students')
        .select('id, student_id, report_pin, profiles:profile_id(first_name, last_name, email), classes:class_id(name, level), gender, date_of_birth')
        .eq('class_id', selectedClass).eq('is_active', true).order('student_id');

      const studList = (studs || []) as StudentInfo[];
      setStudents(studList);

      if (studList.length > 0) {
        const [{ data: sheets }, { data: allGradesRaw }] = await Promise.all([
          supabase.from('result_sheets').select('*').in('student_id', studList.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
          supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year').in('student_id', studList.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
        ]);

        const map: Record<string, MetaForm & { id?: string }> = {};
        (sheets || []).forEach((sh: MetaForm & { id: string; student_id: string }) => {
          map[sh.student_id] = { ...defaultMeta, ...sh };
        });
        setResultSheets(map);

        // Build class chart bars — toddler classes use word-based ratings, skip numerical chart
        const allGrades = (allGradesRaw || []) as GradeRow[];
        const isToddlerClass = studList[0]?.classes?.level === 'toddler';
        const bars: SubjectResult[] = isToddlerClass ? [] : studList
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
    } catch (err: any) {
      console.error("Error loading class data:", err);
      setToast({ msg: err.message || 'Failed to load class data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedTerm, academicYear]);

  useEffect(() => { loadClassData(); }, [loadClassData]);

  const loadSubjectSettings = useCallback(async () => {
    const { data } = await supabase.from('subject_settings').select('level_group, subject, is_visible');
    if (!data) return;
    const vis: Record<string, boolean> = {};
    (data as { level_group: string; subject: string; is_visible: boolean }[]).forEach(r => {
      vis[`${r.level_group}:${r.subject}`] = r.is_visible;
    });
    setSubjectVisibility(vis);
  }, []);

  useEffect(() => { loadSubjectSettings(); }, [loadSubjectSettings]);

  const toggleSubjectVisibility = async (levelGroup: string, subject: string, visible: boolean) => {
    const key = `${levelGroup}:${subject}`;
    setSubjectVisibility(prev => ({ ...prev, [key]: visible }));
    await supabase.from('subject_settings').upsert(
      { level_group: levelGroup, subject, is_visible: visible },
      { onConflict: 'level_group,subject' }
    );
  };

  const getVisibleSubjects = (levelGroup: 'basic' | 'nursery', allSubjects: readonly string[]): string[] | undefined => {
    const hasSettings = Object.keys(subjectVisibility).some(k => k.startsWith(`${levelGroup}:`));
    if (!hasSettings) return undefined;
    return (allSubjects as string[]).filter(s => subjectVisibility[`${levelGroup}:${s}`] !== false);
  };

  // Load school overview
  const loadOverall = useCallback(async () => {
    if (classes.length === 0) return;
    setLoadingOverall(true);
    try {
      // Fetch all active students with class_id
      const { data: allStuds } = await supabase.from('students').select('id, class_id').eq('is_active', true);
      const studs = (allStuds || []) as { id: string; class_id: string }[];
      if (studs.length === 0) return;

      // Fetch all grades for the term/year in one query
      const { data: allGradesRaw } = await supabase
        .from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year')
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
        let published = 0;
        studIds.forEach(sid => { if (publishedById[sid]) published++; });

        // Toddler/Pre-KG uses word-based ratings — no numerical percentage average
        if (cls.level === 'toddler') {
          return { name: cls.name, studentCount: studIds.length, average: 0, grade: '—', remark: 'Skill-based', published };
        }

        let totalAvg = 0; let count = 0;
        studIds.forEach(sid => {
          const sGrades = allGrades.filter(g => g.student_id === sid);
          const subs = computeSubjects(sGrades);
          if (subs.length > 0) {
            totalAvg += Math.round(subs.reduce((a, sub) => a + sub.total, 0) / subs.length);
            count++;
          }
        });
        const avg = count > 0 ? Math.round(totalAvg / count) : 0;
        return { name: cls.name, studentCount: studIds.length, average: avg, ...getNigerianGrade(avg), published };
      }).filter(s => s.studentCount > 0);

      setOverallStats(stats);
    } catch (err: any) {
      console.error("Error loading overall stats:", err);
    } finally {
      setLoadingOverall(false);
    }
  }, [classes, selectedTerm, academicYear]);

  useEffect(() => { if (mainView === 'overview') loadOverall(); }, [mainView, loadOverall]);

  // Open result for a student
  const openResult = async (student: StudentInfo) => {
    setActiveStudent(student);
    setActiveCardError(null);
    setModalTab('preview');
    setDeleteConfirm(false);

    try {
      const isToddler = student.classes?.level === 'toddler';
      const isNursery = student.classes?.level === 'creche';
      console.log('[openResult] student:', student.profiles?.first_name, '| level:', student.classes?.level, '| isToddler:', isToddler);
      const dateRange = getTermDateRange(selectedTerm, academicYear);

      const classStudentIds = students.map(s => s.id);
      console.log('[openResult] fetching grades. class student count:', classStudentIds.length);

      const [myGradesRes, classGradesRes, attDataRes] = await Promise.all([
        supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear),
        classStudentIds.length > 0
          ? supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year').in('student_id', classStudentIds).eq('term', selectedTerm).eq('academic_year', academicYear)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('attendance').select('status').eq('student_id', student.id).gte('date', dateRange.start).lte('date', dateRange.end),
      ]);

      if (myGradesRes.error) throw new Error(`Grades fetch failed: ${myGradesRes.error.message}`);
      if (classGradesRes.error) throw new Error(`Class grades fetch failed: ${classGradesRes.error.message}`);
      if (attDataRes.error) throw new Error(`Attendance fetch failed: ${attDataRes.error.message}`);

      console.log('[openResult] my grades:', myGradesRes.data?.length, '| class grades:', classGradesRes.data?.length);

      const myGrades = myGradesRes.data;
      const classGrades = classGradesRes.data;
      const attData = attDataRes.data;

      const myGradeRows = (myGrades || []) as GradeRow[];

      let mySubjects: SubjectResult[];
      let ratings: Record<string, number> = {};
      if (isToddler) {
        const pkGrades = myGradeRows.filter(g => g.assessment_type === 'pre_kg');
        pkGrades.forEach(g => { ratings[(g.subject || '').trim()] = g.score; });
        setPreKgRatings(ratings);
        mySubjects = buildPreKgSubjects(ratings);
      } else if (isNursery) {
        const scores: NurseryScores = {};
        for (const g of myGradeRows) {
          const subName = (g.subject || '').trim();
          if (!scores[subName]) scores[subName] = { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
          const t = (g.assessment_type || '').toLowerCase().trim();
          // Raw direct system: use score as-is, no proportional scaling
          if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment')
            scores[subName]!.ca1 = g.score;
          else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment')
            scores[subName]!.ca2 = g.score;
          else if (t === 'exam' || t === 'examination' || t === 'final exam')
            scores[subName]!.exam = g.score;
          else if (t === 'project')
            scores[subName]!.project = g.score;
          else if (t === 'homework' || t === 'home work')
            scores[subName]!.homework = g.score;
        }
        setNurseryScores(scores);
        mySubjects = buildNurserySubjects(scores);
      } else {
        const scores: BasicScores = {};
        for (const g of myGradeRows) {
          const subName = (g.subject || '').trim();
          if (!scores[subName]) scores[subName] = { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
          const t = (g.assessment_type || '').toLowerCase().trim();
          // Raw direct system: use score as-is, no proportional scaling
          if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment')
            scores[subName]!.ca1 = g.score;
          else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment')
            scores[subName]!.ca2 = g.score;
          else if (t === 'exam' || t === 'examination' || t === 'final exam')
            scores[subName]!.exam = g.score;
          else if (t === 'project')
            scores[subName]!.project = g.score;
          else if (t === 'homework' || t === 'home work')
            scores[subName]!.homework = g.score;
        }
        setBasicScores(scores);
        mySubjects = buildBasicSubjects(scores);
      }
      setActiveSubjects(mySubjects);

      const allGrades = (classGrades || []) as GradeRow[];
      const grandTotalByStudent: Record<string, number> = {};
      students.forEach(s => {
        const sg = allGrades.filter(g => g.student_id === s.id);
        const subs = s.classes?.level === 'toddler'
          ? buildPreKgSubjects(Object.fromEntries(sg.filter(g => g.assessment_type === 'pre_kg').map(g => [(g.subject || '').trim(), g.score])))
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
    } catch (err: any) {
      console.error('[openResult] ERROR:', err);
      setActiveCardError(err.message || String(err) || 'Unknown error loading report card');
    }
  };

  const shareViaWhatsApp = () => {
    const data = buildCardData();
    if (!data) return;
    const { student, term: t, academicYear: yr, subjects: subs, classStats } = data;
    const school = schoolName || 'Greenville Montessori Schools';

    if (isToddlerStudent) {
      const PKG_WORD: Record<number, string> = { 5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Fair', 1: 'Needs Improvement' };
      const rated = subs.filter(s => s.total > 0);
      const lines = [
        `🏫 *${school}*`,
        `📋 *${student.name} — Pre-KG Report*`,
        `📚 ${student.className} | ${t} ${yr}`,
        ``,
        `🎈 *Skill Evaluations:*`,
        ...rated.map(s => `• ${s.subject}: *${PKG_WORD[preKgTotalToRating(s.total)] ?? '—'}*`),
        ``,
        `— ${school}`,
      ].join('\n');
      window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const scored = subs.filter(s => s.total > 0);
    const avg = scored.length > 0 ? Math.round(scored.reduce((a, s) => a + s.total, 0) / scored.length) : 0;
    const { grade, remark } = getNigerianGrade(avg);
    const lines = [
      `🏫 *${school}*`,
      `📋 *${student.name} — Report Card*`,
      `📚 ${student.className} | ${t} ${yr}`,
      ``,
      `📊 Average: *${avg}%* (${grade} — ${remark})`,
      `🏆 Position: *${classStats.position}/${classStats.totalStudents}*`,
      ``,
      `*Subject Results:*`,
      ...scored.map(s => `• ${s.subject}: ${s.total}% (${s.grade})`),
      ``,
      `— ${school}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank', 'noopener,noreferrer');
  };

  const closeModal = () => {
    setActiveStudent(null); setActiveSubjects([]); setActiveClassStats(null);
    setDeleteConfirm(false); setPreKgRatings({}); setNurseryScores({}); setBasicScores({});
    setActiveCardError(null);
  };

  const buildCardData = (): ResultCardData | null => {
    if (!activeStudent || !activeClassStats) return null;
    const level = activeStudent.classes?.level ?? '';
    const visibleSubjects = isBasicStudent
      ? getVisibleSubjects('basic', BASIC_SUBJECTS)
      : isNurseryStudent
      ? getVisibleSubjects('nursery', NURSERY_SUBJECTS)
      : undefined;
    return {
      student: {
        name: `${activeStudent.profiles?.first_name} ${activeStudent.profiles?.last_name}`,
        studentId: activeStudent.student_id,
        className: activeStudent.classes?.name || '—',
        classLevel: level,
        gender: activeStudent.gender || '',
        dob: activeStudent.date_of_birth || '',
      },
      term: selectedTerm, academicYear,
      subjects: activeSubjects, classStats: activeClassStats,
      behavior: {
        punctuality:   metaForm.punctuality   ?? 3,
        neatness:      metaForm.neatness      ?? 3,
        honesty:       metaForm.honesty       ?? 3,
        cooperation:   metaForm.cooperation   ?? 3,
        attentiveness: metaForm.attentiveness ?? 3,
        politeness:    metaForm.politeness    ?? 3,
      },
      attendance: { daysPresent: metaForm.days_present, daysAbsent: metaForm.days_absent, totalDays: metaForm.total_school_days },
      comments: { teacher: metaForm.teacher_comment || '', principal: metaForm.principal_comment || '' },
      nextTerm: { begins: metaForm.next_term_begins || '', fees: metaForm.next_term_fees || '' },
      schoolName, schoolAddress: (settings.school_address as string) || '',
      visibleSubjects,
      preKgCommentChoices: isToddlerStudent ? preKgCommentChoices : undefined,
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

      // Save pre-KG skill ratings (toddler only — delete then insert)
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

      // Save basic subject grades (basic1-6 — delete then insert)
      if (isBasicStudent) {
        await supabase.from('grades')
          .delete()
          .eq('student_id', activeStudent.id)
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear);
        const bRows: { student_id: string; subject: string; assessment_type: string; score: number; max_score: number; term: string; academic_year: string; graded_by: string; }[] = [];
        for (const subject of BASIC_SUBJECTS) {
          const s = basicScores[subject];
          if (!s) continue;
          if (s.ca1  > 0) bRows.push({ student_id: activeStudent.id, subject, assessment_type: '1st ca',  score: s.ca1,  max_score: BASIC_CA_MAX,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.ca2  > 0) bRows.push({ student_id: activeStudent.id, subject, assessment_type: '2nd ca',  score: s.ca2,  max_score: BASIC_CA_MAX,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.exam > 0) bRows.push({ student_id: activeStudent.id, subject, assessment_type: 'exam',    score: s.exam, max_score: BASIC_EXAM_MAX, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.project && s.project > 0) bRows.push({ student_id: activeStudent.id, subject, assessment_type: 'project',  score: s.project,  max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.homework && s.homework > 0) bRows.push({ student_id: activeStudent.id, subject, assessment_type: 'homework', score: s.homework, max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        }
        if (bRows.length > 0) {
          const { error: gErr } = await supabase.from('grades').insert(bRows);
          if (gErr) throw gErr;
        }
      }

      // Save nursery subject grades (creche only — delete then insert)
      if (isNurseryStudent) {
        await supabase.from('grades')
          .delete()
          .eq('student_id', activeStudent.id)
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear);
        const gradeRows: {
          student_id: string; subject: string; assessment_type: string;
          score: number; max_score: number; term: string; academic_year: string; graded_by: string;
        }[] = [];
        for (const subject of NURSERY_SUBJECTS) {
          const s = nurseryScores[subject];
          if (!s) continue;
          if (s.ca1  > 0) gradeRows.push({ student_id: activeStudent.id, subject, assessment_type: '1st ca',  score: s.ca1,  max_score: NURSERY_CA_MAX,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.ca2  > 0) gradeRows.push({ student_id: activeStudent.id, subject, assessment_type: '2nd ca',  score: s.ca2,  max_score: NURSERY_CA_MAX,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.exam > 0) gradeRows.push({ student_id: activeStudent.id, subject, assessment_type: 'exam',    score: s.exam, max_score: NURSERY_EXAM_MAX, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.project && s.project > 0) gradeRows.push({ student_id: activeStudent.id, subject, assessment_type: 'project',  score: s.project,  max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.homework && s.homework > 0) gradeRows.push({ student_id: activeStudent.id, subject, assessment_type: 'homework', score: s.homework, max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        }
        if (gradeRows.length > 0) {
          const { error: gErr } = await supabase.from('grades').insert(gradeRows);
          if (gErr) throw gErr;
        }
      }

      setToast({ msg: 'Report card saved successfully', type: 'success' });
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
      setToast({ msg: 'Report card deleted', type: 'success' });
      setResultSheets(prev => { const n = { ...prev }; delete n[activeStudent.id]; return n; });
      closeModal();
      loadClassData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
  };

  // Clear selection when class / term / year changes
  useEffect(() => { setSelectedIds(new Set()); }, [selectedClass, selectedTerm, academicYear]);

  const selectedClassLevel = classes.find(c => c.id === selectedClass)?.level ?? '';
  const isLandscapeClass = selectedClassLevel === 'creche' || selectedClassLevel === 'toddler';

  // Trigger print window once bulk cards have rendered into the hidden container
  useEffect(() => {
    if (bulkCards.length === 0) return;
    const t = setTimeout(() => {
      const el = bulkRef.current;
      if (!el) { setBulkCards([]); return; }
      const win = window.open('', '_blank', 'width=1200,height=850');
      if (!win) { setBulkCards([]); setToast({ msg: 'Pop-up blocked — allow pop-ups and try again', type: 'error' }); return; }
      const pageSize = isLandscapeClass ? 'A4 landscape' : 'A4 portrait';
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Report Cards — ${selectedTerm} ${academicYear}</title>
<style>
  @page { size: ${pageSize}; margin: 6mm 8mm; }
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
  }, [bulkCards, selectedTerm, academicYear, isLandscapeClass]);

  const printSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsBulkLoading(true);
    try {
      const selected = students.filter(s => ids.includes(s.id));
      const dateRange = getTermDateRange(selectedTerm, academicYear);

      const [classGradesResult, attResultsAll] = await Promise.all([
        supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year')
          .in('student_id', students.map(s => s.id))
          .eq('term', selectedTerm).eq('academic_year', academicYear),
        Promise.all(selected.map(s =>
          supabase.from('attendance').select('status')
            .eq('student_id', s.id).gte('date', dateRange.start).lte('date', dateRange.end)
        )),
      ]);

      const allGrades = (classGradesResult.data || []) as GradeRow[];
      const isToddlerBulk = students[0]?.classes?.level === 'toddler';

      // Class-wide stats (shared) — route toddler through skill-rating path
      const grandTotalByStudent: Record<string, number> = {};
      students.forEach(s => {
        const sg = allGrades.filter(g => g.student_id === s.id);
        grandTotalByStudent[s.id] = isToddlerBulk
          ? buildPreKgSubjects(Object.fromEntries(sg.filter(g => g.assessment_type === 'pre_kg').map(g => [(g.subject || '').trim(), g.score]))).reduce((acc, sub) => acc + sub.total, 0)
          : computeSubjects(sg).reduce((acc, sub) => acc + sub.total, 0);
      });
      const allTotals = Object.values(grandTotalByStudent).filter(t => t > 0);
      const sorted = [...allTotals].sort((a, b) => b - a);
      const classAvg = allTotals.length > 0 ? Math.round(allTotals.reduce((a, b) => a + b, 0) / allTotals.length) : 0;

      const cards: ResultCardData[] = selected.map((student, idx) => {
        const myGrades = allGrades.filter(g => g.student_id === student.id);
        const mySubjects = isToddlerBulk
          ? buildPreKgSubjects(Object.fromEntries(myGrades.filter(g => g.assessment_type === 'pre_kg').map(g => [(g.subject || '').trim(), g.score])))
          : computeSubjects(myGrades);
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
          behavior: {
            punctuality:   meta.punctuality   ?? 3,
            neatness:      meta.neatness      ?? 3,
            honesty:       meta.honesty       ?? 3,
            cooperation:   meta.cooperation   ?? 3,
            attentiveness: meta.attentiveness ?? 3,
            politeness:    meta.politeness    ?? 3,
          },
          attendance: att,
          comments: { teacher: meta.teacher_comment || '', principal: meta.principal_comment || '' },
          nextTerm: { begins: meta.next_term_begins || '', fees: meta.next_term_fees || '' },
          schoolName, schoolAddress: (settings.school_address as string) || '',
        };
      });

      setBulkCards(cards);
    } catch {
      setToast({ msg: 'Failed to load results for printing', type: 'error' });
    }
    setIsBulkLoading(false);
  }, [selectedIds, students, selectedTerm, academicYear, resultSheets, schoolName, settings]);

  const printAll = useCallback(async () => {
    if (students.length === 0) return;
    setIsBulkLoading(true);
    try {
      const dateRange = getTermDateRange(selectedTerm, academicYear);
      const [classGradesResult, attResultsAll] = await Promise.all([
        supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year')
          .in('student_id', students.map(s => s.id))
          .eq('term', selectedTerm).eq('academic_year', academicYear),
        Promise.all(students.map(s =>
          supabase.from('attendance').select('status')
            .eq('student_id', s.id).gte('date', dateRange.start).lte('date', dateRange.end)
        )),
      ]);
      const allGrades = (classGradesResult.data || []) as GradeRow[];
      const isToddlerPrintAll = students[0]?.classes?.level === 'toddler';

      const grandTotalByStudent: Record<string, number> = {};
      students.forEach(s => {
        const sg = allGrades.filter(g => g.student_id === s.id);
        grandTotalByStudent[s.id] = isToddlerPrintAll
          ? buildPreKgSubjects(Object.fromEntries(sg.filter(g => g.assessment_type === 'pre_kg').map(g => [(g.subject || '').trim(), g.score]))).reduce((acc, sub) => acc + sub.total, 0)
          : computeSubjects(sg).reduce((acc, sub) => acc + sub.total, 0);
      });
      const allTotals = Object.values(grandTotalByStudent).filter(t => t > 0);
      const sorted = [...allTotals].sort((a, b) => b - a);
      const classAvg = allTotals.length > 0 ? Math.round(allTotals.reduce((a, b) => a + b, 0) / allTotals.length) : 0;
      const cards: ResultCardData[] = students.map((student, idx) => {
        const myGrades = allGrades.filter(g => g.student_id === student.id);
        const mySubjects = isToddlerPrintAll
          ? buildPreKgSubjects(Object.fromEntries(myGrades.filter(g => g.assessment_type === 'pre_kg').map(g => [(g.subject || '').trim(), g.score])))
          : computeSubjects(myGrades);
        const myGrandTotal = mySubjects.reduce((acc, s) => acc + s.total, 0);
        const position = sorted.indexOf(myGrandTotal) + 1 || sorted.length + 1;
        const attRecords = (attResultsAll[idx].data || []) as { status: string }[];
        const attTotal = attRecords.length;
        const attPresent = attRecords.filter(a => a.status === 'present' || a.status === 'late').length;
        const meta = resultSheets[student.id] || defaultMeta;
        const att = attTotal > 0
          ? { daysPresent: attPresent, daysAbsent: attTotal - attPresent, totalDays: attTotal }
          : { daysPresent: meta.days_present, daysAbsent: meta.days_absent, totalDays: meta.total_school_days };
        const level = student.classes?.level ?? '';
        const isBasic = ['basic1','basic2','basic3','basic4','basic5'].includes(level);
        const isNursery = level === 'creche';
        const visibleSubjects = isBasic
          ? getVisibleSubjects('basic', BASIC_SUBJECTS)
          : isNursery
          ? getVisibleSubjects('nursery', NURSERY_SUBJECTS)
          : undefined;
        return {
          student: {
            name: `${student.profiles?.first_name} ${student.profiles?.last_name}`,
            studentId: student.student_id,
            className: student.classes?.name || '—',
            classLevel: level,
            gender: student.gender || '',
            dob: student.date_of_birth || '',
          },
          term: selectedTerm, academicYear,
          subjects: mySubjects,
          classStats: { position, totalStudents: students.length, grandTotal: myGrandTotal, highestInClass: sorted[0] ?? 0, lowestInClass: sorted[sorted.length - 1] ?? 0, classAverage: classAvg },
          behavior: {
            punctuality:   meta.punctuality   ?? 3,
            neatness:      meta.neatness      ?? 3,
            honesty:       meta.honesty       ?? 3,
            cooperation:   meta.cooperation   ?? 3,
            attentiveness: meta.attentiveness ?? 3,
            politeness:    meta.politeness    ?? 3,
          },
          attendance: att,
          comments: { teacher: meta.teacher_comment || '', principal: meta.principal_comment || '' },
          nextTerm: { begins: meta.next_term_begins || '', fees: meta.next_term_fees || '' },
          schoolName, schoolAddress: (settings.school_address as string) || '',
          visibleSubjects,
        };
      });
      setBulkCards(cards);
    } catch {
      setToast({ msg: 'Failed to load results for printing', type: 'error' });
    }
    setIsBulkLoading(false);
  }, [students, selectedTerm, academicYear, resultSheets, schoolName, settings, subjectVisibility]);

  const printPinSlips = () => {
    const withPins = students.filter(s => s.report_pin);
    if (withPins.length === 0) { setToast({ msg: 'No students have PINs yet — generate PINs first', type: 'error' }); return; }
    const portalUrl = `${window.location.origin}${window.location.pathname}?portal=1`;
    const sName = schoolName || 'Greenville Montessori Schools';

    const cardHtml = withPins.map(s => {
      const name = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
      const pin = s.report_pin!;
      // Format PIN as groups of 3: 482916 → 482 916
      const pinFmt = `${pin.slice(0, 3)} ${pin.slice(3)}`;
      return `
        <div class="slip">
          <div class="slip-header">
            <img src="/gms-logo.jpg" class="slip-logo" alt="" />
            <div class="slip-school">${sName.toUpperCase()}</div>
          </div>
          <div class="slip-body">
            <div class="slip-label">STUDENT</div>
            <div class="slip-name">${name}</div>
            <div class="slip-row">
              <div>
                <div class="slip-label">STUDENT ID</div>
                <div class="slip-id">${s.student_id}</div>
              </div>
              <div>
                <div class="slip-label">TERM</div>
                <div class="slip-id">${selectedTerm} · ${academicYear}</div>
              </div>
            </div>
            <div class="slip-pin-wrap">
              <div class="slip-label">PARENT PORTAL PIN</div>
              <div class="slip-pin">${pinFmt}</div>
            </div>
          </div>
          <div class="slip-footer">
            <span>🌐 ${portalUrl}</span>
            <span>Enter Student ID + PIN to view results</span>
          </div>
        </div>`;
    }).join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { setToast({ msg: 'Pop-up blocked — allow pop-ups and try again', type: 'error' }); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Portal PINs — ${selectedTerm} ${academicYear}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .slip {
    border: 1.5px solid #1a4731;
    border-radius: 5mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 62mm;
    page-break-inside: avoid;
  }
  .slip-header {
    background: #1a4731;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3mm 4mm;
    flex-shrink: 0;
  }
  .slip-logo { width: 18px; height: 18px; object-fit: contain; border-radius: 3px; flex-shrink: 0; }
  .slip-school { font-size: 7.5pt; font-weight: bold; letter-spacing: 0.5px; line-height: 1.2; }
  .slip-body { flex: 1; padding: 2.5mm 4mm 2mm; display: flex; flex-direction: column; gap: 1.5mm; }
  .slip-label { font-size: 5.5pt; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .slip-name { font-size: 10pt; font-weight: bold; color: #111; line-height: 1.2; }
  .slip-row { display: flex; gap: 8mm; }
  .slip-id { font-size: 7.5pt; font-weight: bold; color: #222; font-family: monospace; letter-spacing: 1px; }
  .slip-pin-wrap { background: #f0faf4; border: 1px solid #a3d4b5; border-radius: 3mm; padding: 1.5mm 3mm; margin-top: auto; }
  .slip-pin { font-size: 17pt; font-weight: 900; color: #1a4731; letter-spacing: 6px; font-family: 'Courier New', monospace; text-align: center; margin-top: 0.5mm; }
  .slip-footer {
    background: #f8faf9;
    border-top: 1px solid #d1e7da;
    padding: 1.5mm 4mm;
    font-size: 5.5pt;
    color: #555;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>
<div class="grid">${cardHtml}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleSelectAll = () => setSelectedIds(
    selectedIds.size === filteredStudents.length && filteredStudents.length > 0
      ? new Set()
      : new Set(filteredStudents.map(s => s.id))
  );

  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);

  const togglePublished = async (studentId: string, current: boolean) => {
    setTogglingPublish(studentId);
    try {
      const { error } = await supabase.from('result_sheets')
        .update({ is_published: !current })
        .eq('student_id', studentId)
        .eq('term', selectedTerm)
        .eq('academic_year', academicYear);
      if (error) throw error;
      setResultSheets(prev => ({ ...prev, [studentId]: { ...prev[studentId], is_published: !current } }));
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Update failed', type: 'error' });
    } finally {
      setTogglingPublish(null);
    }
  };

  const bulkSetPublished = async (publish: boolean) => {
    const ids = [...selectedIds].filter(id => resultSheets[id]);
    if (ids.length === 0) { setToast({ msg: 'No result sheets found for selected students', type: 'error' }); return; }
    setIsBulkLoading(true);
    try {
      const { error } = await supabase.from('result_sheets')
        .update({ is_published: publish })
        .in('student_id', ids)
        .eq('term', selectedTerm)
        .eq('academic_year', academicYear);
      if (error) throw error;
      setResultSheets(prev => {
        const next = { ...prev };
        ids.forEach(id => { if (next[id]) next[id] = { ...next[id], is_published: publish }; });
        return next;
      });
      setToast({ msg: `${ids.length} result${ids.length !== 1 ? 's' : ''} ${publish ? 'published' : 'unpublished'}`, type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Bulk update failed', type: 'error' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const classSetPublished = async (publish: boolean) => {
    const ids = students.filter(s => resultSheets[s.id]).map(s => s.id);
    if (ids.length === 0) { setToast({ msg: 'No result sheets found for this class', type: 'error' }); return; }
    setIsBulkLoading(true);
    try {
      const { error } = await supabase.from('result_sheets')
        .update({ is_published: publish })
        .in('student_id', ids)
        .eq('term', selectedTerm)
        .eq('academic_year', academicYear);
      if (error) throw error;
      setResultSheets(prev => {
        const next = { ...prev };
        ids.forEach(id => { if (next[id]) next[id] = { ...next[id], is_published: publish }; });
        return next;
      });
      setToast({ msg: `All ${ids.length} results ${publish ? 'published to parent portal' : 'hidden from parent portal'}`, type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Bulk update failed', type: 'error' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const name = `${s.profiles?.first_name} ${s.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase());
  });

  // Grade color helper for overview table
  const gradeColor = (g: string) => g.startsWith('A') ? 'text-green-700' : g.startsWith('B') ? 'text-blue-700' : g.startsWith('C') ? 'text-yellow-700' : (g === '—' || g === '') ? 'text-gray-400' : 'text-red-700';

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Report Cards</h2>
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
            {/* Subject visibility settings button */}
            {(selectedClassLevel === 'basic1' || selectedClassLevel === 'basic2' || selectedClassLevel === 'basic3' || selectedClassLevel === 'basic4' || selectedClassLevel === 'basic5' || selectedClassLevel === 'creche') && (
              <button onClick={() => setSubjectSettingsOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border shadow-sm ${subjectSettingsOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <Settings className="w-3.5 h-3.5" /> Subject Visibility
              </button>
            )}
            {/* Print All */}
            {students.length > 0 && (
              <button onClick={printAll} disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 disabled:opacity-60 shadow-sm">
                <Printer className="w-3.5 h-3.5" />
                {isBulkLoading ? 'Loading…' : 'Print All'}
              </button>
            )}
            {/* Print PIN Slips */}
            {students.some(s => s.report_pin) && (
              <button onClick={printPinSlips}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 shadow-sm"
                title="Print parent portal PIN cards for this class">
                <KeyRound className="w-3.5 h-3.5" /> Print PINs
              </button>
            )}
            {/* Class-wide portal visibility */}
            {students.length > 0 && (
              <div className="flex gap-1.5">
                <button onClick={() => classSetPublished(true)} disabled={isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
                  title="Publish all results for this class to parent portal">
                  <Globe className="w-3.5 h-3.5" /> Publish All
                </button>
                <button onClick={() => classSetPublished(false)} disabled={isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-60 shadow-sm"
                  title="Hide all results from parent portal">
                  <EyeOff className="w-3.5 h-3.5" /> Hide All
                </button>
              </div>
            )}
            {/* Print / Export + Publish Selected */}
            {selectedIds.size > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={printSelected} disabled={isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 disabled:opacity-60 shadow-sm">
                  <Printer className="w-3.5 h-3.5" />
                  {isBulkLoading ? 'Loading…' : `Print (${selectedIds.size})`}
                </button>
                <button onClick={() => { setToast({ msg: 'In the print dialog, choose "Save as PDF" as the destination', type: 'success' }); printSelected(); }} disabled={isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 shadow-sm">
                  <Download className="w-3.5 h-3.5" />
                  Export PDF ({selectedIds.size})
                </button>
                <button onClick={() => bulkSetPublished(true)} disabled={isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 shadow-sm">
                  <Globe className="w-3.5 h-3.5" /> Publish ({selectedIds.size})
                </button>
                <button onClick={() => bulkSetPublished(false)} disabled={isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-60 shadow-sm">
                  <EyeOff className="w-3.5 h-3.5" /> Unpublish ({selectedIds.size})
                </button>
              </div>
            )}
          </div>

          {/* Subject Visibility Settings Panel */}
          {subjectSettingsOpen && (selectedClassLevel === 'creche' || ['basic1','basic2','basic3','basic4','basic5'].includes(selectedClassLevel)) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Subject Visibility on Report Card
                </h4>
                <span className="text-xs text-indigo-600">Toggles apply to all printed cards for this level</span>
              </div>
              {(['basic1','basic2','basic3','basic4','basic5'].includes(selectedClassLevel)) && (
                <div>
                  <p className="text-xs font-medium text-indigo-800 mb-2">Basic Subjects:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(BASIC_SUBJECTS as readonly string[]).map(subject => {
                      const key = `basic:${subject}`;
                      const visible = subjectVisibility[key] !== false;
                      return (
                        <label key={subject} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${visible ? 'bg-white border-indigo-300 text-gray-800' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'}`}>
                          <input type="checkbox" checked={visible} onChange={e => toggleSubjectVisibility('basic', subject, e.target.checked)}
                            className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0" />
                          {subject}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedClassLevel === 'creche' && (
                <div>
                  <p className="text-xs font-medium text-indigo-800 mb-2">Nursery Subjects:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(NURSERY_SUBJECTS as readonly string[]).map(subject => {
                      const key = `nursery:${subject}`;
                      const visible = subjectVisibility[key] !== false;
                      return (
                        <label key={subject} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${visible ? 'bg-white border-indigo-300 text-gray-800' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'}`}>
                          <input type="checkbox" checked={visible} onChange={e => toggleSubjectVisibility('nursery', subject, e.target.checked)}
                            className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0" />
                          {subject}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin" /></div>
          ) : classView === 'chart' ? (
            /* ── Performance Chart view ── */
            <div className="space-y-5">
              {selectedClassLevel === 'toddler' ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Skill-based assessment</p>
                  <p className="text-xs mt-1">Pre-KG/Toddler results use word ratings — no percentage chart available.</p>
                </div>
              ) : classChartBars.length === 0 ? (
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
                    <th className="py-3 px-4">Portal PIN</th>
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
                          ) : (
                            <button
                              onClick={() => togglePublished(s.id, !!isPublished)}
                              disabled={togglingPublish === s.id}
                              className={`flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-1 border transition-colors ${
                                isPublished
                                  ? 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                  : 'text-yellow-700 border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                              }`}
                              title={isPublished ? 'Click to hide from parent portal' : 'Click to publish to parent portal'}
                            >
                              {togglingPublish === s.id
                                ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                : isPublished ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />
                              }
                              {isPublished ? 'Published' : 'Draft'}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {s.report_pin ? (
                              <>
                                <span className="font-mono text-xs text-gray-700 tracking-widest w-14 text-center">
                                  {pinVisibility[s.id] ? s.report_pin : '••••••'}
                                </span>
                                <button
                                  onClick={() => setPinVisibility(v => ({ ...v, [s.id]: !v[s.id] }))}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                  title={pinVisibility[s.id] ? 'Hide PIN' : 'Show PIN'}
                                >
                                  {pinVisibility[s.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}${window.location.pathname}?portal=1`;
                                    navigator.clipboard.writeText(`Student ID: ${s.student_id}\nPIN: ${s.report_pin}\nPortal: ${url}`);
                                  }}
                                  className="p-1 text-gray-400 hover:text-indigo-600"
                                  title="Copy portal link + PIN"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">No PIN</span>
                            )}
                            <button
                              onClick={() => generatePin(s.id)}
                              disabled={generatingPin === s.id}
                              className="p-1 text-gray-400 hover:text-green-700 disabled:opacity-40"
                              title={s.report_pin ? 'Regenerate PIN' : 'Generate PIN'}
                            >
                              {generatingPin === s.id
                                ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin inline-block" />
                                : s.report_pin ? <RefreshCw className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                            </button>
                          </div>
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
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No students found</td></tr>
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

      {/* ── RESULT CARD MODAL ── */}
      {activeStudent && (
        <ResultCardModal
          student={activeStudent}
          term={selectedTerm}
          academicYear={academicYear}
          modalTab={modalTab}
          onTabChange={setModalTab}
          onClose={closeModal}
          cardData={cardData}
          activeSubjects={activeSubjects}
          isNurseryStudent={isNurseryStudent}
          isToddlerStudent={isToddlerStudent}
          isBasicStudent={isBasicStudent}
          nurseryScores={nurseryScores}
          basicScores={basicScores}
          preKgRatings={preKgRatings}
          preKgCommentChoices={preKgCommentChoices}
          onPreKgCommentChoice={(skill, idx) => setPreKgCommentChoices(prev => ({ ...prev, [skill]: idx }))}
          onNurseryScore={updateNurseryScore}
          onBasicScore={updateBasicScore}
          onPreKgRating={updatePreKgRating}
          metaForm={metaForm}
          setMetaForm={setMetaForm}
          saving={saving}
          onSave={saveMeta}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={setDeleteConfirm}
          onDelete={deleteMeta}
          hasResultSheet={!!resultSheets[activeStudent.id]}
          onShareWhatsApp={shareViaWhatsApp}
          onToast={(msg, type) => setToast({ msg, type })}
          activeCardError={activeCardError}
        />
      )}

      {/* ── Hidden off-screen container for bulk printing ── */}
      {bulkCards.length > 0 && (
        <div ref={bulkRef} style={{ position: 'fixed', left: '-99999px', top: 0, width: isLandscapeClass ? '297mm' : '210mm', pointerEvents: 'none' }} aria-hidden="true">
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
