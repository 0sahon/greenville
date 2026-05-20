import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, ChevronDown, Eye, CheckCircle, Clock, X, Save,
  Trash2, AlertTriangle, MessageCircle, Download, EyeOff,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import ResultCard, {
  getNigerianGrade, printResultCard, PRE_KG_SKILLS, PRE_KG_COMMENTS,
  NURSERY_SUBJECTS, buildNurserySubjects, NURSERY_CA_MAX, NURSERY_EXAM_MAX,
  BASIC_SUBJECTS, buildBasicSubjects, BASIC_CA_MAX, BASIC_EXAM_MAX,
} from '../admin/ResultCard';
import type { ResultCardData, SubjectResult, NurseryScores, BasicScores } from '../admin/ResultCard';
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
  const map = new Map<string, {
    ca1:     { score: number; max: number } | null;
    ca2:     { score: number; max: number } | null;
    exam:    { score: number; max: number } | null;
    hw:      { score: number; max: number } | null;
    project: { score: number; max: number } | null;
  }>();
  for (const g of grades) {
    const key = g.subject.trim();
    if (!map.has(key)) map.set(key, { ca1: null, ca2: null, exam: null, hw: null, project: null });
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
    } else if (type === 'project') {
      entry.project = { score: g.score, max: g.max_score };
    } else if (!entry.ca1) {
      entry.ca1 = { score: g.score, max: g.max_score };
    } else if (!entry.ca2) {
      entry.ca2 = { score: g.score, max: g.max_score };
    }
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([subject, s]) => {
    const ca1      = s.ca1      ? Math.round((s.ca1.score      / s.ca1.max)      * 15) : 0;
    const ca2      = s.ca2      ? Math.round((s.ca2.score      / s.ca2.max)      * 15) : 0;
    const exam     = s.exam     ? Math.round((s.exam.score     / s.exam.max)     * 50) : 0;
    const homework = s.hw       ? Math.round((s.hw.score       / s.hw.max)       * 10) : 0;
    const project  = s.project  ? Math.round((s.project.score  / s.project.max)  * 10) : 0;
    const total = ca1 + ca2 + exam + homework + project;
    return { subject, ca1, ca2, exam, homework, project, total, ...getNigerianGrade(total) };
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
  const [preKgRatings, setPreKgRatings] = useState<Partial<Record<string, number>>>({});
  const [nurseryScores, setNurseryScores] = useState<NurseryScores>({});
  const [basicScores, setBasicScores] = useState<BasicScores>({});

  const isToddlerStudent = activeStudent?.classes?.level === 'toddler';
  const isNurseryStudent = activeStudent?.classes?.level === 'creche';
  const isBasicStudent   = ['basic1','basic2','basic3','basic4','basic5','basic6'].includes(activeStudent?.classes?.level ?? '');

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

  const [subjectVisibility, setSubjectVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.from('subject_settings').select('level_group, subject, is_visible').then(({ data }) => {
      if (!data) return;
      const vis: Record<string, boolean> = {};
      (data as { level_group: string; subject: string; is_visible: boolean }[]).forEach(r => {
        vis[`${r.level_group}:${r.subject}`] = r.is_visible;
      });
      setSubjectVisibility(vis);
    });
  }, []);

  const buildPreKgSubjects = (ratings: Partial<Record<string, number>>): SubjectResult[] =>
    PRE_KG_SKILLS
      .filter(s => (ratings[s.name] ?? 0) > 0)
      .map(s => {
        const r = ratings[s.name] ?? 0;
        const ca1 = Math.round((r / 5) * 20);
        return { subject: s.name, ca1, ca2: 0, exam: 0, total: ca1, grade: '', remark: '' };
      });
  const updateNurseryScore = (subject: string, field: 'ca1' | 'ca2' | 'exam' | 'project' | 'homework', value: number) => {
    const updated: NurseryScores = {
      ...nurseryScores,
      [subject]: { ...(nurseryScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 }), [field]: value },
    };
    setNurseryScores(updated);
    const newSubs = buildNurserySubjects(updated);
    setSubjects(newSubs);
    setCardData(prev => prev ? { ...prev, subjects: newSubs } : null);
  };

  const updateBasicScore = (subject: string, field: 'ca1' | 'ca2' | 'exam' | 'project' | 'homework', value: number) => {
    const updated: BasicScores = {
      ...basicScores,
      [subject]: { ...(basicScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 }), [field]: value },
    };
    setBasicScores(updated);
    const newSubs = buildBasicSubjects(updated);
    setSubjects(newSubs);
    setCardData(prev => prev ? { ...prev, subjects: newSubs } : null);
  };
  const getVisibleSubjects = (levelGroup: 'basic' | 'nursery', allSubjects: readonly string[]): string[] | undefined => {
    const hasSettings = Object.keys(subjectVisibility).some(k => k.startsWith(`${levelGroup}:`));
    if (!hasSettings) return undefined;
    return (allSubjects as string[]).filter(s => subjectVisibility[`${levelGroup}:${s}`] !== false);
  };

  const shareViaWhatsApp = () => {
    if (!cardData) return;
    const { student, term: t, academicYear: yr, subjects: subs, classStats } = cardData;
    const scored = subs.filter(s => s.total > 0);
    const avg = scored.length > 0 ? Math.round(scored.reduce((a, s) => a + s.total, 0) / scored.length) : 0;
    const { grade, remark } = getNigerianGrade(avg);
    const lines = [
      `🏫 *${SCHOOL_NAME}*`,
      `📋 *${student.name} — Result Card*`,
      `📚 ${student.className} | ${t} ${yr}`,
      ``,
      `📊 Average: *${avg}%* (${grade} — ${remark})`,
      `🏆 Position: *${classStats.position}/${classStats.totalStudents}*`,
      ``,
      `*Subject Results:*`,
      ...scored.map(s => `• ${s.subject}: ${s.total}% (${s.grade})`),
      ``,
      `— ${SCHOOL_NAME}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank', 'noopener,noreferrer');
  };

  const openCard = async (student: StudentInfo) => {
    setActiveStudent(student);
    setModalTab('preview');
    setDeleteConfirm(false);
    setLoadingCard(true);

    const isToddler = student.classes?.level === 'toddler';
    const isNursery = student.classes?.level === 'creche';

    const [{ data: sheet }, { data: gradeRows }, { data: classGrades }] = await Promise.all([
      supabase.from('result_sheets').select('*').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear).maybeSingle(),
      supabase.from('grades').select('*').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear),
      supabase.from('grades').select('*').in('student_id', students.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
    ]);

    const rs = sheet as ResultSheetMeta | null;
    const allGradeRows = (gradeRows || []) as GradeRow[];

    let subs: SubjectResult[];
    let ratings: Record<string, number> = {};
    if (isToddler) {
      const pkGrades = allGradeRows.filter(g => g.assessment_type === 'pre_kg');
      pkGrades.forEach(g => { ratings[g.subject] = g.score; });
      setPreKgRatings(ratings);
      subs = buildPreKgSubjects(ratings);
    } else if (isNursery) {
      const scores: NurseryScores = {};
      for (const g of allGradeRows) {
        if (!scores[g.subject]) scores[g.subject] = { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
        const t = g.assessment_type.toLowerCase().trim();
        // Raw direct system: use score as-is, no proportional scaling
        if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment')
          scores[g.subject]!.ca1 = g.score;
        else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment')
          scores[g.subject]!.ca2 = g.score;
        else if (t === 'exam' || t === 'examination' || t === 'final exam')
          scores[g.subject]!.exam = g.score;
        else if (t === 'project')
          scores[g.subject]!.project = g.score;
        else if (t === 'homework' || t === 'home work')
          scores[g.subject]!.homework = g.score;
      }
      setNurseryScores(scores);
      subs = buildNurserySubjects(scores);
    } else {
      const scores: BasicScores = {};
      for (const g of allGradeRows) {
        if (!scores[g.subject]) scores[g.subject] = { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
        const t = g.assessment_type.toLowerCase().trim();
        // Raw direct system: use score as-is, no proportional scaling
        if (t === '1st ca' || t === 'first ca' || t === '1st continuous assessment')
          scores[g.subject]!.ca1 = g.score;
        else if (t === '2nd ca' || t === 'second ca' || t === '2nd continuous assessment')
          scores[g.subject]!.ca2 = g.score;
        else if (t === 'exam' || t === 'examination' || t === 'final exam')
          scores[g.subject]!.exam = g.score;
        else if (t === 'project')
          scores[g.subject]!.project = g.score;
        else if (t === 'homework' || t === 'home work')
          scores[g.subject]!.homework = g.score;
      }
      setBasicScores(scores);
      subs = buildBasicSubjects(scores);
    }
    setSubjects(subs);

    // Compute class stats
    const allGrades = (classGrades || []) as GradeRow[];
    const grandTotals = students.map(s => {
      const sg = allGrades.filter(g => g.student_id === s.id);
      const ssubs = s.classes?.level === 'toddler'
        ? buildPreKgSubjects(Object.fromEntries(sg.filter(g => g.assessment_type === 'pre_kg').map(g => [g.subject, g.score])))
        : computeSubjects(sg);
      return ssubs.reduce((a, sub) => a + sub.total, 0);
    }).filter(t => t > 0);
    const myTotal = subs.reduce((a, s) => a + s.total, 0);
    const sorted = [...grandTotals].sort((a, b) => b - a);
    const position = sorted.indexOf(myTotal) + 1 || sorted.length + 1;

    const meta = rs || defaultMeta;
    setMetaForm({ ...defaultMeta, ...meta });

    const level = student.classes?.level ?? '';
    const isBasicLvl = ['basic1','basic2','basic3','basic4','basic5','basic6'].includes(level);
    const visibleSubjects = isBasicLvl
      ? getVisibleSubjects('basic', BASIC_SUBJECTS)
      : level === 'creche'
      ? getVisibleSubjects('nursery', NURSERY_SUBJECTS)
      : undefined;

    setCardData({
      student: {
        name: `${student.profiles?.first_name} ${student.profiles?.last_name}`,
        studentId: student.student_id,
        className: student.classes?.name || '—',
        classLevel: level,
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
      visibleSubjects,
    });
    setLoadingCard(false);
  };

  const updatePreKgRating = (skillName: string, rating: number) => {
    const updated: Partial<Record<string, number>> = { ...preKgRatings, [skillName]: rating === 0 ? undefined : rating };
    setPreKgRatings(updated);
    const newSubs = buildPreKgSubjects(updated);
    setSubjects(newSubs);
    setCardData(prev => prev ? { ...prev, subjects: newSubs } : null);
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

      // Save basic subject grades
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

      // Save nursery subject grades (creche only)
      if (isNurseryStudent) {
        await supabase.from('grades')
          .delete()
          .eq('student_id', activeStudent.id)
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear);
        const nRows: { student_id: string; subject: string; assessment_type: string; score: number; max_score: number; term: string; academic_year: string; graded_by: string; }[] = [];
        for (const subject of NURSERY_SUBJECTS) {
          const s = nurseryScores[subject];
          if (!s) continue;
          if (s.ca1  > 0) nRows.push({ student_id: activeStudent.id, subject, assessment_type: '1st ca',  score: s.ca1,  max_score: NURSERY_CA_MAX,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.ca2  > 0) nRows.push({ student_id: activeStudent.id, subject, assessment_type: '2nd ca',  score: s.ca2,  max_score: NURSERY_CA_MAX,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.exam > 0) nRows.push({ student_id: activeStudent.id, subject, assessment_type: 'exam',    score: s.exam, max_score: NURSERY_EXAM_MAX, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.project && s.project > 0) nRows.push({ student_id: activeStudent.id, subject, assessment_type: 'project',  score: s.project,  max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
          if (s.homework && s.homework > 0) nRows.push({ student_id: activeStudent.id, subject, assessment_type: 'homework', score: s.homework, max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        }
        if (nRows.length > 0) {
          const { error: gErr } = await supabase.from('grades').insert(nRows);
          if (gErr) throw gErr;
        }
      }

      // Save pre-KG skill ratings as grades (delete then insert)
      if (activeStudent.classes?.level === 'toddler') {
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
                <button onClick={() => { setActiveStudent(null); setCardData(null); setDeleteConfirm(false); setPreKgRatings({}); setNurseryScores({}); setBasicScores({}); }} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
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
                            onPrint={() => {
                              const lvl = activeStudent?.classes?.level;
                              const landscape = lvl === 'creche' || lvl === 'toddler';
                              printResultCard(`${activeStudent.profiles?.first_name} ${activeStudent.profiles?.last_name}`, landscape);
                            }}
                          />
                          {/* Share / Export actions */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                const lvl = activeStudent?.classes?.level;
                                const landscape = lvl === 'creche' || lvl === 'toddler';
                                printResultCard(`${activeStudent.profiles?.first_name} ${activeStudent.profiles?.last_name}`, landscape);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700">
                              <Download className="w-3.5 h-3.5" /> Export as PDF
                            </button>
                            {metaForm.is_published ? (
                              <button onClick={shareViaWhatsApp}
                                className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600">
                                <MessageCircle className="w-3.5 h-3.5" /> Share via WhatsApp
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                                <EyeOff className="w-3.5 h-3.5" /> Publish to enable WhatsApp sharing
                              </span>
                            )}
                          </div>
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

                      {/* ── Basic Subject Scores (basic1-6 only) ── */}
                      {isBasicStudent && (
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm mb-1">
                            Subject Scores — {activeStudent?.classes?.name}
                          </h4>
                          <p className="text-xs text-gray-400 mb-3">
                            Enter raw scores: Homework &amp; Project out of 10, CAs out of {BASIC_CA_MAX}, Exam out of {BASIC_EXAM_MAX}.
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm min-w-[580px]">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-1/4">Subject</th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Homework<br /><span className="font-normal text-gray-400">/10</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Project<br /><span className="font-normal text-gray-400">/10</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Exam<br /><span className="font-normal text-gray-400">/{BASIC_EXAM_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Total<br /><span className="font-normal text-gray-400">/100</span></th>
                                </tr>
                              </thead>
                              <tbody>
                                {BASIC_SUBJECTS.map((subject, i) => {
                                  const s = basicScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
                                  const ca1  = s.ca1  > 0 ? Math.round((s.ca1  / BASIC_CA_MAX)   * 15) : 0;
                                  const ca2  = s.ca2  > 0 ? Math.round((s.ca2  / BASIC_CA_MAX)   * 15) : 0;
                                  const exam = s.exam > 0 ? Math.round((s.exam / BASIC_EXAM_MAX) * 50) : 0;
                                  const project = s.project && s.project > 0 ? Math.round((s.project / 10) * 10) : 0;
                                  const homework = s.homework && s.homework > 0 ? Math.round((s.homework / 10) * 10) : 0;
                                  const total = ca1 + ca2 + project + homework + exam;
                                  const { grade } = total > 0 ? getNigerianGrade(total) : { grade: '' };
                                  const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-blue-700' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-700' : 'text-gray-300';
                                  return (
                                    <tr key={subject} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                      <td className="py-2 px-3 font-medium text-gray-700 text-xs">{subject}</td>
                                      {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                        <td key={field} className="py-1 px-1 text-center">
                                          <input
                                            type="number" min={0}
                                            max={field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10}
                                            value={s[field] || ''}
                                            onChange={e => updateBasicScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10))}
                                            className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        </td>
                                      ))}
                                      <td className="py-2 px-1 text-center">
                                        <span className={`font-bold text-xs ${gc}`}>
                                          {total > 0 ? `${total} (${grade})` : '—'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* ── Nursery Subject Scores (creche level only) ── */}
                      {isNurseryStudent && (
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm mb-1">
                            Subject Scores — {activeStudent?.classes?.name}
                          </h4>
                          <p className="text-xs text-gray-400 mb-3">
                            Enter raw scores: Homework &amp; Project out of 10, CAs out of {NURSERY_CA_MAX}, Exam out of {NURSERY_EXAM_MAX}.
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm min-w-[580px]">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-1/4">Subject</th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Homework<br /><span className="font-normal text-gray-400">/10</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Project<br /><span className="font-normal text-gray-400">/10</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Exam<br /><span className="font-normal text-gray-400">/{NURSERY_EXAM_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Total<br /><span className="font-normal text-gray-400">/100</span></th>
                                </tr>
                              </thead>
                              <tbody>
                                {NURSERY_SUBJECTS.map((subject, i) => {
                                  const s = nurseryScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
                                  const ca1  = s.ca1  > 0 ? Math.round((s.ca1  / NURSERY_CA_MAX)   * 15) : 0;
                                  const ca2  = s.ca2  > 0 ? Math.round((s.ca2  / NURSERY_CA_MAX)   * 15) : 0;
                                  const exam = s.exam > 0 ? Math.round((s.exam / NURSERY_EXAM_MAX) * 50) : 0;
                                  const project = s.project && s.project > 0 ? Math.round((s.project / 10) * 10) : 0;
                                  const homework = s.homework && s.homework > 0 ? Math.round((s.homework / 10) * 10) : 0;
                                  const total = ca1 + ca2 + project + homework + exam;
                                  const { grade } = total > 0 ? getNigerianGrade(total) : { grade: '' };
                                  const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-blue-700' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-700' : 'text-gray-300';
                                  return (
                                    <tr key={subject} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                      <td className="py-2 px-3 font-medium text-gray-700 text-xs">{subject}</td>
                                      {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                        <td key={field} className="py-1 px-1 text-center">
                                          <input
                                            type="number" min={0}
                                            max={field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10}
                                            value={s[field] || ''}
                                            onChange={e => updateNurseryScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10))}
                                            className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        </td>
                                      ))}
                                      <td className="py-2 px-1 text-center">
                                        <span className={`font-bold text-xs ${gc}`}>
                                          {total > 0 ? `${total} (${grade})` : '—'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* ── Pre-KG Skill Ratings (toddler class only) ── */}
                      {isToddlerStudent && (
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm mb-1">Skill Ratings — Toddler Pre-KG</h4>
                          <p className="text-xs text-gray-400 mb-3">Select a rating for each skill area. Click a button for quick entry or choose from the dropdown.</p>
                          <div className="grid grid-cols-1 gap-3">
                            {PRE_KG_SKILLS.map(skill => {
                              const current = preKgRatings[skill.name] || 0;
                              return (
                                <div key={skill.name} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-sm font-semibold text-gray-700">{skill.name}</span>
                                    {current > 0 && (
                                      <span className="text-xs text-indigo-600 font-medium italic truncate max-w-[200px]">
                                        {PRE_KG_COMMENTS[skill.name]?.[current]}
                                      </span>
                                    )}
                                  </div>
                                  {/* Quick-select buttons */}
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
                                            ? cls + ' ring-2 ring-offset-1 ring-indigo-400'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                  {/* Manual select dropdown */}
                                  <select
                                    value={current}
                                    onChange={e => updatePreKgRating(skill.name, Number(e.target.value))}
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
