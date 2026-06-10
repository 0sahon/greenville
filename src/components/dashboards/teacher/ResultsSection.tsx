import { useState, useEffect, useCallback } from 'react';
import { useModalHistory } from '../../../hooks/useModalHistory';
import {
  FileText, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle, Clock, X, Save,
  Trash2, AlertTriangle, MessageCircle, Download, EyeOff, Sparkles,
  KeyRound, Copy, RefreshCw, Globe,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import { getNigerianGrade } from '../../../lib/grading';
import ResultCard, {
  printResultCard, PRE_KG_SKILLS, PRE_KG_COMMENTS,
  NURSERY_SUBJECTS, buildNurserySubjects, NURSERY_CA_MAX, NURSERY_EXAM_MAX,
  BASIC_SUBJECTS, buildBasicSubjects, BASIC_CA_MAX, BASIC_EXAM_MAX,
} from '../admin/ResultCard';
import type { ResultCardData, SubjectResult, NurseryScores, BasicScores } from '../admin/ResultCard';
import type { ProfileRow, GradeRow } from '../../../lib/supabase';
import PerformanceChart from '../shared/PerformanceChart';
import { computeSubjects } from '../../../lib/gradeCompute';
import {
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_WEBSITE,
} from '../../../config/schoolBrand';

interface Props { profile: ProfileRow; }

interface StudentInfo {
  id: string;
  student_id: string;
  report_pin?: string | null;
  profiles: { first_name: string; last_name: string; email: string } | null;
  classes: { id: string; name: string; level: string } | null;
  gender: string | null;
  date_of_birth: string | null;
}

interface ResultSheetMeta {
  id?: string;
  teacher_comment: string;
  principal_comment: string;
  punctuality: number | null;
  neatness: number | null;
  honesty: number | null;
  cooperation: number | null;
  attentiveness: number | null;
  politeness: number | null;
  days_present: number;
  days_absent: number;
  total_school_days: number;
  next_term_begins: string;
  next_term_fees: string;
  outstanding_fees: string;
  is_published: boolean;
}

const defaultMeta: ResultSheetMeta = {
  teacher_comment: '', principal_comment: '',
  punctuality: 3, neatness: 3, honesty: 3, cooperation: 3, attentiveness: 3, politeness: 3,
  days_present: 0, days_absent: 0, total_school_days: 0,
  next_term_begins: '', next_term_fees: '', outstanding_fees: '', is_published: false,
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ─── Pre-KG emoji domain config ────────────────────────────────── */
const PRE_KG_DOMAINS = [
  { domain: 'Language & Literacy',  icon: '📚', skills: ['Literacy', 'Phonics', 'Scribbling'] },
  { domain: 'Numbers & Thinking',   icon: '🔢', skills: ['Numeracy', 'Understanding'] },
  { domain: 'Character & Conduct',  icon: '⭐', skills: ['Obedience', 'Individual Behaviour', 'Care of Self', 'Punctuality'] },
  { domain: 'Social & Creative',    icon: '🎨', skills: ['Social Habit', 'Creative Play'] },
  { domain: 'Faith & Values',       icon: '✝️', skills: ['Bible Studies'] },
] as const;
const PRE_KG_FACES  = ['', '😔', '😐', '🙂', '😊', '🌟'] as const;
const PRE_KG_FACE_LABELS = ['', 'Needs Work', 'Fair', 'Good', 'Very Good', 'Excellent'] as const;

export default function TeacherResultsSection({ profile }: Props) {
  const [myClasses, setMyClasses] = useState<{ id: string; name: string; level: string }[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [resultSheets, setResultSheets] = useState<Record<string, ResultSheetMeta>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [classDefaults, setClassDefaults] = useState({ total_school_days: 0, next_term_begins: '', next_term_fees: '' });
  const [showClassDefaults, setShowClassDefaults] = useState(false);

  // Bulk class-sheet entry
  const [entryMode, setEntryMode] = useState<'student' | 'bulk'>('student');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkScores, setBulkScores] = useState<Record<string, { ca1: number; ca2: number; exam: number; project: number; homework: number }>>({});
  const [savingBulk, setSavingBulk] = useState(false);

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
  const [pinVisibility, setPinVisibility] = useState<Record<string, boolean>>({});
  const [generatingPin, setGeneratingPin] = useState<string | null>(null);
  const [bulkGeneratingPins, setBulkGeneratingPins] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const closeModal = useCallback(() => {
    setActiveStudent(null);
    setCardData(null);
    setSubjects([]);
    setDeleteConfirm(false);
    setPreKgRatings({});
    setNurseryScores({});
    setBasicScores({});
    setIsDirty(false);
  }, []);
  useModalHistory(!!activeStudent, closeModal);

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
      setToast({ msg: !current ? 'Result published to parent portal' : 'Result hidden from parent portal', type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Update failed', type: 'error' });
    } finally {
      setTogglingPublish(null);
    }
  };

  const bulkGeneratePins = async () => {
    const withoutPins = students.filter(s => !s.report_pin);
    if (withoutPins.length === 0) { setToast({ msg: 'All students already have PINs', type: 'success' }); return; }
    setBulkGeneratingPins(true);
    try {
      await Promise.all(withoutPins.map(async s => {
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        await supabase.from('students').update({ report_pin: pin }).eq('id', s.id);
        setStudents(prev => prev.map(st => st.id === s.id ? { ...st, report_pin: pin } : st));
      }));
      setToast({ msg: `PINs generated for ${withoutPins.length} student${withoutPins.length !== 1 ? 's' : ''}`, type: 'success' });
    } catch {
      setToast({ msg: 'Some PINs failed to generate', type: 'error' });
    } finally {
      setBulkGeneratingPins(false);
    }
  };

  const printPinSlips = () => {
    const withPins = students.filter(s => s.report_pin);
    if (withPins.length === 0) { setToast({ msg: 'No students have PINs yet — generate PINs first', type: 'error' }); return; }
    const portalUrl = `${SCHOOL_WEBSITE}?portal=1`;
    const qrBase = `https://api.qrserver.com/v1/create-qr-code/?size=72x72&color=1a4731&bgcolor=ffffff&data=`;

    const cardHtml = withPins.map(s => {
      const name = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
      const pin = s.report_pin!;
      const pinFmt = `${pin.slice(0, 3)} ${pin.slice(3)}`;
      const className = s.classes?.name ?? '—';
      const qrUrl = `${qrBase}${encodeURIComponent(portalUrl)}`;
      return `
        <div class="slip">
          <div class="slip-header">
            <img src="/gms-logo.jpg" class="slip-logo" alt="" />
            <div>
              <div class="slip-school">${SCHOOL_NAME.toUpperCase()}</div>
              <div class="slip-tagline">Parent Result Portal Access Card</div>
            </div>
          </div>
          <div class="slip-body">
            <div class="slip-body-inner">
              <div class="slip-body-left">
                <div class="slip-name-row">
                  <div class="slip-label">STUDENT NAME</div>
                  <div class="slip-name">${name}</div>
                </div>
                <div class="slip-row">
                  <div>
                    <div class="slip-label">ADM. NUMBER</div>
                    <div class="slip-id">${s.student_id}</div>
                  </div>
                  <div>
                    <div class="slip-label">CLASS</div>
                    <div class="slip-id">${className}</div>
                  </div>
                  <div>
                    <div class="slip-label">TERM</div>
                    <div class="slip-id">${selectedTerm.replace(' Term', '')} ${academicYear}</div>
                  </div>
                </div>
                <div class="slip-pin-wrap">
                  <div class="slip-pin-label">PORTAL PIN</div>
                  <div class="slip-pin">${pinFmt}</div>
                </div>
              </div>
              <div class="slip-body-right">
                <img src="${qrUrl}" class="slip-qr" alt="QR" />
                <div class="slip-qr-label">Scan to open portal</div>
              </div>
            </div>
          </div>
          <div class="slip-footer">
            <div class="slip-footer-url">🌐 ${portalUrl}</div>
            <div class="slip-footer-cta">Scan QR or visit the link &rarr; enter Adm. No. + PIN to view your child&apos;s results</div>
          </div>
        </div>`;
    }).join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { setToast({ msg: 'Pop-up blocked — allow pop-ups and try again', type: 'error' }); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Portal PIN Cards — ${selectedTerm} ${academicYear}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .slip { border: 1.5px solid #1a4731; border-radius: 4mm; overflow: hidden; display: flex; flex-direction: column; height: 72mm; page-break-inside: avoid; }
  .slip-header { background: #1a4731; color: #fff; display: flex; align-items: center; gap: 6px; padding: 2.5mm 4mm; flex-shrink: 0; }
  .slip-logo { width: 22px; height: 22px; object-fit: contain; border-radius: 3px; flex-shrink: 0; background: #fff; padding: 1px; }
  .slip-school { font-size: 7.5pt; font-weight: bold; letter-spacing: 0.4px; line-height: 1.3; }
  .slip-tagline { font-size: 5.5pt; opacity: 0.75; letter-spacing: 0.3px; margin-top: 1px; }
  .slip-body { flex: 1; padding: 2.5mm 4mm 2mm; }
  .slip-body-inner { display: flex; gap: 3mm; height: 100%; }
  .slip-body-left { flex: 1; display: flex; flex-direction: column; gap: 2mm; }
  .slip-body-right { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; flex-shrink: 0; }
  .slip-qr { width: 22mm; height: 22mm; border: 1.5px solid #2d7a4f; border-radius: 2mm; display: block; }
  .slip-qr-label { font-size: 4pt; color: #777; text-align: center; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
  .slip-label { font-size: 5pt; font-weight: bold; color: #777; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 0.5mm; }
  .slip-name { font-size: 11pt; font-weight: bold; color: #111; line-height: 1.2; }
  .slip-row { display: flex; gap: 5mm; }
  .slip-row > div { flex: 1; }
  .slip-id { font-size: 7pt; font-weight: bold; color: #1a4731; font-family: 'Courier New', monospace; letter-spacing: 0.5px; }
  .slip-pin-wrap { background: linear-gradient(135deg, #f0faf4 0%, #e6f5ec 100%); border: 1.5px solid #2d7a4f; border-radius: 3mm; padding: 2mm 3mm 1.5mm; margin-top: auto; text-align: center; }
  .slip-pin-label { font-size: 5pt; font-weight: bold; color: #2d7a4f; text-transform: uppercase; letter-spacing: 1px; }
  .slip-pin { font-size: 20pt; font-weight: 900; color: #1a4731; letter-spacing: 8px; font-family: 'Courier New', monospace; line-height: 1.1; }
  .slip-footer { background: #1a4731; padding: 2mm 4mm; flex-shrink: 0; }
  .slip-footer-url { font-size: 6pt; color: #a3d4b5; font-weight: bold; margin-bottom: 0.5mm; word-break: break-all; }
  .slip-footer-cta { font-size: 5pt; color: rgba(255,255,255,0.7); }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body><div class="grid">${cardHtml}</div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const generatePin = async (studentId: string) => {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratingPin(studentId);
    try {
      const { error } = await supabase.from('students').update({ report_pin: pin }).eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, report_pin: pin } : s));
      setToast({ msg: 'PIN generated', type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to generate PIN', type: 'error' });
    } finally {
      setGeneratingPin(null);
    }
  };

  const isToddlerStudent = activeStudent?.classes?.level === 'toddler';
  const isNurseryStudent = activeStudent?.classes?.level === 'creche';
  const isBasicStudent   = ['basic1','basic2','basic3','basic4','basic5'].includes(activeStudent?.classes?.level ?? '');

  useEffect(() => {
    supabase.from('classes').select('id, name, level').eq('teacher_id', profile.id).order('name').then(({ data }) => {
      const cls = (data || []) as { id: string; name: string; level: string }[];
      setMyClasses(cls);
      if (cls.length > 0) setSelectedClass(cls[0].id);
    });
  }, [profile.id]);

  // Derive current class level for bulk mode subject list
  const currentClassLevel = myClasses.find(c => c.id === selectedClass)?.level ?? '';
  const bulkSubjectList: readonly string[] =
    ['basic1','basic2','basic3','basic4','basic5'].includes(currentClassLevel) ? BASIC_SUBJECTS :
    currentClassLevel === 'creche' ? NURSERY_SUBJECTS : [];
  const bulkCAMax   = currentClassLevel === 'creche' ? NURSERY_CA_MAX   : BASIC_CA_MAX;
  const bulkExamMax = currentClassLevel === 'creche' ? NURSERY_EXAM_MAX : BASIC_EXAM_MAX;

  // Load existing scores when bulk subject changes
  useEffect(() => {
    if (entryMode !== 'bulk' || !bulkSubject || students.length === 0) return;
    supabase.from('grades')
      .select('student_id, assessment_type, score')
      .in('student_id', students.map(s => s.id))
      .eq('subject', bulkSubject)
      .eq('term', selectedTerm)
      .eq('academic_year', academicYear)
      .then(({ data }) => {
        const loaded: Record<string, { ca1: number; ca2: number; exam: number; project: number; homework: number }> = {};
        (data || []).forEach((g: { student_id: string; assessment_type: string; score: number }) => {
          if (!loaded[g.student_id]) loaded[g.student_id] = { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
          const t = (g.assessment_type || '').toLowerCase();
          if (t === '1st ca')   loaded[g.student_id].ca1     = g.score;
          if (t === '2nd ca')   loaded[g.student_id].ca2     = g.score;
          if (t === 'exam')     loaded[g.student_id].exam    = g.score;
          if (t === 'project')  loaded[g.student_id].project = g.score;
          if (t === 'homework') loaded[g.student_id].homework = g.score;
        });
        setBulkScores(loaded);
      });
  }, [entryMode, bulkSubject, selectedTerm, academicYear, students]);

  const saveBulkScores = async () => {
    if (!bulkSubject) { setToast({ msg: 'Select a subject first', type: 'error' }); return; }
    setSavingBulk(true);
    try {
      // Delete existing grades for this subject+term+year for all class students
      await supabase.from('grades')
        .delete()
        .in('student_id', students.map(s => s.id))
        .eq('subject', bulkSubject)
        .eq('term', selectedTerm)
        .eq('academic_year', academicYear);

      // Build rows for students with at least one score > 0
      const rows: { student_id: string; subject: string; assessment_type: string; score: number; max_score: number; term: string; academic_year: string; graded_by: string }[] = [];
      for (const s of students) {
        const sc = bulkScores[s.id];
        if (!sc) continue;
        if (sc.homework > 0) rows.push({ student_id: s.id, subject: bulkSubject, assessment_type: 'homework', score: sc.homework, max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        if (sc.ca1 > 0)      rows.push({ student_id: s.id, subject: bulkSubject, assessment_type: '1st ca',   score: sc.ca1,     max_score: bulkCAMax,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        if (sc.ca2 > 0)      rows.push({ student_id: s.id, subject: bulkSubject, assessment_type: '2nd ca',   score: sc.ca2,     max_score: bulkCAMax,   term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        if (sc.project > 0)  rows.push({ student_id: s.id, subject: bulkSubject, assessment_type: 'project',  score: sc.project, max_score: 10, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
        if (sc.exam > 0)     rows.push({ student_id: s.id, subject: bulkSubject, assessment_type: 'exam',     score: sc.exam,    max_score: bulkExamMax, term: selectedTerm, academic_year: academicYear, graded_by: profile.id });
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('grades').insert(rows);
        if (error) throw error;
      }
      setToast({ msg: `${bulkSubject} scores saved for ${students.length} students`, type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    } finally {
      setSavingBulk(false);
    }
  };

  const loadStudents = useCallback(async () => {
    if (!selectedClass) { setStudents([]); return; }
    setLoading(true);
    try {
      const { data: studs } = await supabase
        .from('students')
        .select('id, student_id, report_pin, profiles:profile_id(first_name, last_name, email), classes:class_id(id, name, level), gender, date_of_birth')
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
    setIsDirty(true);
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
    setIsDirty(true);
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
      `📋 *${student.name} — Report Card*`,
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

    try {
      const isToddler = student.classes?.level === 'toddler';
      const isNursery = student.classes?.level === 'creche';

      const [sheetRes, gradeRowsRes, classGradesRes] = await Promise.all([
        supabase.from('result_sheets').select('*').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear).maybeSingle(),
        supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year').eq('student_id', student.id).eq('term', selectedTerm).eq('academic_year', academicYear),
        supabase.from('grades').select('id,subject,assessment_type,score,max_score,student_id,term,academic_year').in('student_id', students.map(s => s.id)).eq('term', selectedTerm).eq('academic_year', academicYear),
      ]);

      if (sheetRes.error) throw sheetRes.error;
      if (gradeRowsRes.error) throw gradeRowsRes.error;
      if (classGradesRes.error) throw classGradesRes.error;

      const sheet = sheetRes.data;
      const gradeRows = gradeRowsRes.data;
      const classGrades = classGradesRes.data;

      const rs = sheet as ResultSheetMeta | null;
      const allGradeRows = (gradeRows || []) as GradeRow[];

      let subs: SubjectResult[];
      let ratings: Record<string, number> = {};
      if (isToddler) {
        const pkGrades = allGradeRows.filter(g => g.assessment_type === 'pre_kg');
        pkGrades.forEach(g => { ratings[(g.subject || '').trim()] = g.score; });
        setPreKgRatings(ratings);
        subs = buildPreKgSubjects(ratings);
      } else if (isNursery) {
        const scores: NurseryScores = {};
        for (const g of allGradeRows) {
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
        subs = buildNurserySubjects(scores);
      } else {
        const scores: BasicScores = {};
        for (const g of allGradeRows) {
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
        subs = buildBasicSubjects(scores);
      }
      setSubjects(subs);

      // Compute class stats
      const allGrades = (classGrades || []) as GradeRow[];
      const grandTotals = students.map(s => {
        const sg = allGrades.filter(g => g.student_id === s.id);
        const ssubs = s.classes?.level === 'toddler'
          ? buildPreKgSubjects(Object.fromEntries(sg.filter(g => g.assessment_type === 'pre_kg').map(g => [(g.subject || '').trim(), g.score])))
          : computeSubjects(sg);
        return ssubs.reduce((a, sub) => a + sub.total, 0);
      }).filter(t => t > 0);
      const myTotal = subs.reduce((a, s) => a + s.total, 0);
      const sorted = [...grandTotals].sort((a, b) => b - a);
      const position = sorted.indexOf(myTotal) + 1 || sorted.length + 1;

      const meta = rs || defaultMeta;
      setMetaForm({
        ...defaultMeta,
        ...meta,
        // Pre-fill from class defaults if the field is still at zero/empty
        total_school_days: (meta as ResultSheetMeta | null)?.total_school_days || classDefaults.total_school_days || 0,
        next_term_begins: (meta as ResultSheetMeta | null)?.next_term_begins || classDefaults.next_term_begins || '',
        next_term_fees: (meta as ResultSheetMeta | null)?.next_term_fees || classDefaults.next_term_fees || '',
      });

      const level = student.classes?.level ?? '';
      const isBasicLvl = ['basic1','basic2','basic3','basic4','basic5'].includes(level);
      const visibleSubjects = isBasicLvl
        ? getVisibleSubjects('basic', BASIC_SUBJECTS)
        : level === 'creche'
        ? getVisibleSubjects('nursery', NURSERY_SUBJECTS)
        : undefined;

      setCardData({
        student: {
          name: `${student.profiles?.first_name ?? ''} ${student.profiles?.last_name ?? ''}`.trim(),
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
          punctuality:   meta.punctuality   ?? 3,
          neatness:      meta.neatness      ?? 3,
          honesty:       meta.honesty       ?? 3,
          cooperation:   meta.cooperation   ?? 3,
          attentiveness: meta.attentiveness ?? 3,
          politeness:    meta.politeness    ?? 3,
        },
        attendance: { daysPresent: meta.days_present, daysAbsent: meta.days_absent, totalDays: meta.total_school_days },
        comments: { teacher: meta.teacher_comment || '', principal: meta.principal_comment || '' },
        nextTerm: { begins: meta.next_term_begins || '', fees: meta.next_term_fees || '' },
        schoolName: SCHOOL_NAME,
        schoolAddress: `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`,
        visibleSubjects,
      });
      setLoadingCard(false);
    } catch (err: any) {
      console.error("Error loading card:", err);
      setToast({ msg: err.message || 'Failed to load report card details', type: 'error' });
      setLoadingCard(false);
      closeModal();
    }
  };

  const updatePreKgRating = (skillName: string, rating: number) => {
    const updated: Partial<Record<string, number>> = { ...preKgRatings, [skillName]: rating === 0 ? undefined : rating };
    setPreKgRatings(updated);
    const newSubs = buildPreKgSubjects(updated);
    setSubjects(newSubs);
    setCardData(prev => prev ? { ...prev, subjects: newSubs } : null);
    setIsDirty(true);
  };

  // Sync cardData behavior/comments/attendance when metaForm changes in Edit tab
  const syncCardData = (updated: ResultSheetMeta) => {
    if (!cardData) return;
    setCardData(prev => prev ? {
      ...prev,
      behavior: {
        punctuality:   updated.punctuality   ?? 3,
        neatness:      updated.neatness      ?? 3,
        honesty:       updated.honesty       ?? 3,
        cooperation:   updated.cooperation   ?? 3,
        attentiveness: updated.attentiveness ?? 3,
        politeness:    updated.politeness    ?? 3,
      },
      attendance: { daysPresent: updated.days_present, daysAbsent: updated.days_absent, totalDays: updated.total_school_days },
      comments: { teacher: updated.teacher_comment || '', principal: updated.principal_comment || '' },
      nextTerm: { begins: updated.next_term_begins || '', fees: updated.next_term_fees || '' },
    } : null);
  };

  const updateMeta = (patch: Partial<ResultSheetMeta>) => {
    setMetaForm(prev => {
      const updated = { ...prev, ...patch };
      // Auto-calc days absent when days present or total school days changes
      if ('days_present' in patch || 'total_school_days' in patch) {
        const total = updated.total_school_days || 0;
        const present = updated.days_present || 0;
        if (total > 0) updated.days_absent = Math.max(0, total - present);
      }
      syncCardData(updated);
      return updated;
    });
    setIsDirty(true);
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
        outstanding_fees: metaForm.outstanding_fees || '',
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

      setToast({ msg: 'Report card saved successfully', type: 'success' });
      setIsDirty(false);
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
      setToast({ msg: 'Report card deleted', type: 'success' });
      setResultSheets(prev => { const n = { ...prev }; delete n[activeStudent.id]; return n; });
      closeModal();
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

  // ── Smart navigation ──────────────────────────────────────────────
  const activeStudentIdx = activeStudent ? filteredStudents.findIndex(s => s.id === activeStudent.id) : -1;
  const prevStudent = activeStudentIdx > 0 ? filteredStudents[activeStudentIdx - 1] : null;
  const nextStudent = activeStudentIdx < filteredStudents.length - 1 ? filteredStudents[activeStudentIdx + 1] : null;

  const navigateStudent = (student: StudentInfo) => {
    if (isDirty && !window.confirm('You have unsaved changes. Navigate without saving?')) return;
    setIsDirty(false);
    openCard(student);
  };

  // ── Auto-generate teacher comment from scores ─────────────────────
  const autoGenerateComment = () => {
    const scored = subjects.filter(s => s.total > 0);
    if (scored.length === 0) { setToast({ msg: 'Enter scores first to generate a smart comment', type: 'error' }); return; }
    const avg = Math.round(scored.reduce((s, r) => s + r.total, 0) / scored.length);
    const name = activeStudent?.profiles?.first_name || 'This student';
    let comment = '';
    if (avg >= 85)      comment = `${name} has delivered an outstanding performance this term with a ${avg}% average — truly exceptional. Keep it up!`;
    else if (avg >= 75) comment = `${name} has performed very well this term, achieving a ${avg}% average. A dedicated and hardworking student.`;
    else if (avg >= 65) comment = `${name} showed good effort this term with a ${avg}% average. Continue to aim higher next term.`;
    else if (avg >= 50) comment = `${name} showed fair performance this term (${avg}%). More focus and effort is needed to improve.`;
    else                comment = `${name} needs to work much harder next term — a ${avg}% average shows room for significant improvement.`;
    updateMeta({ teacher_comment: comment });
  };

  // ── Completion status badge ───────────────────────────────────────
  const getCompletionStatus = (studentId: string): 'complete' | 'partial' | 'empty' => {
    const sheet = resultSheets[studentId];
    if (!sheet) return 'empty';
    const hasComment    = !!(sheet.teacher_comment?.trim());
    const hasAttendance = (sheet.total_school_days || 0) > 0;
    const hasScores     = subjects.length > 0 || true; // grades are in a separate table
    if (hasComment && hasAttendance && hasScores) return 'complete';
    return 'partial';
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    if (!activeStudent) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape' && !typing) { closeModal(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveMeta(); return; }
      if (e.altKey && e.key === 'ArrowLeft'  && prevStudent) { e.preventDefault(); navigateStudent(prevStudent); return; }
      if (e.altKey && e.key === 'ArrowRight' && nextStudent) { e.preventDefault(); navigateStudent(nextStudent); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudent, prevStudent, nextStudent]);

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-xl font-bold text-gray-900">Report Cards</h2>
        <p className="text-xs text-gray-500 mt-0.5">View, edit and publish student report cards for your class</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1">Class</label>
            <div className="relative">
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1">Term</label>
            <div className="relative">
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Students', value: students.length, color: 'text-indigo-600' },
              { label: 'Sheets Created', value: Object.keys(resultSheets).length, color: 'text-yellow-700' },
              { label: 'Published', value: Object.values(resultSheets).filter(r => r.is_published).length, color: 'text-green-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Class Defaults Panel ── */}
          {students.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowClassDefaults(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-indigo-100 transition-colors"
              >
                <span className="text-sm font-semibold text-indigo-800">
                  ⚡ Class Defaults — Set once, auto-fills all students
                </span>
                <span className="text-xs text-indigo-500">{showClassDefaults ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {showClassDefaults && (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Total School Days</label>
                    <input type="number" min={0} value={classDefaults.total_school_days || ''}
                      onChange={e => setClassDefaults(d => ({ ...d, total_school_days: Number(e.target.value) }))}
                      placeholder="e.g. 65"
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Next Term Begins</label>
                    <input type="date" value={classDefaults.next_term_begins}
                      onChange={e => setClassDefaults(d => ({ ...d, next_term_begins: e.target.value }))}
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Next Term Fees</label>
                    <input value={classDefaults.next_term_fees}
                      onChange={e => setClassDefaults(d => ({ ...d, next_term_fees: e.target.value }))}
                      placeholder="₦150,000"
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <p className="col-span-full text-xs text-indigo-400 mt-1">
                    These will auto-fill when you open any student card that doesn&apos;t have these fields filled yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Entry mode toggle (hide for toddler — no subject scores) ── */}
          {students.length > 0 && bulkSubjectList.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit">
              <button
                onClick={() => setEntryMode('student')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${entryMode === 'student' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Per Student
              </button>
              <button
                onClick={() => { setEntryMode('bulk'); if (!bulkSubject) setBulkSubject(bulkSubjectList[0] as string); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${entryMode === 'bulk' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📋 Class Sheet
              </button>
            </div>
          )}

          {/* ── Bulk class-sheet entry panel ── */}
          {entryMode === 'bulk' && bulkSubjectList.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Subject selector */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">Subject:</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {(bulkSubjectList as readonly string[]).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setBulkSubject(sub)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${bulkSubject === sub ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-700'}`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {bulkSubject && (
                <>
                  <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <p className="text-xs text-indigo-700 font-medium">
                      <span className="font-bold">{bulkSubject}</span> — HW &amp; Proj /10 · CA /{bulkCAMax} · Exam /{bulkExamMax} · Press <kbd className="bg-white border border-indigo-200 rounded px-1 font-mono">Tab</kbd> or <kbd className="bg-white border border-indigo-200 rounded px-1 font-mono">↵</kbd> to move between students
                    </p>
                    <button
                      onClick={saveBulkScores}
                      disabled={savingBulk}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingBulk ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {savingBulk ? 'Saving…' : `Save All (${students.length})`}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                          <th className="sticky left-0 z-10 bg-gray-50 py-2 px-4 text-left w-36 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">#  Student</th>
                          <th className="py-2 px-2 text-center">HW<br /><span className="font-normal normal-case text-gray-400">/10</span></th>
                          <th className="py-2 px-2 text-center">1st CA<br /><span className="font-normal normal-case text-gray-400">/{bulkCAMax}</span></th>
                          <th className="py-2 px-2 text-center">2nd CA<br /><span className="font-normal normal-case text-gray-400">/{bulkCAMax}</span></th>
                          <th className="py-2 px-2 text-center">Proj<br /><span className="font-normal normal-case text-gray-400">/10</span></th>
                          <th className="py-2 px-2 text-center">Exam<br /><span className="font-normal normal-case text-gray-400">/{bulkExamMax}</span></th>
                          <th className="py-2 px-2 text-center">Total<br /><span className="font-normal normal-case text-gray-400">/100</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s, idx) => {
                          const sc = bulkScores[s.id] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
                          const ca1  = sc.ca1  > 0 ? Math.round((sc.ca1  / bulkCAMax)   * 15) : 0;
                          const ca2  = sc.ca2  > 0 ? Math.round((sc.ca2  / bulkCAMax)   * 15) : 0;
                          const exam = sc.exam > 0 ? Math.round((sc.exam / bulkExamMax) * 50) : 0;
                          const proj = sc.project  > 0 ? Math.round((sc.project  / 10) * 10) : 0;
                          const hw   = sc.homework > 0 ? Math.round((sc.homework / 10) * 10) : 0;
                          const total = ca1 + ca2 + proj + hw + exam;
                          const { grade } = total > 0 ? getNigerianGrade(total) : { grade: '' };
                          const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-blue-700' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-600' : 'text-gray-300';
                          const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                          const totalStudents = filteredStudents.length;
                          const setScore = (field: 'homework' | 'ca1' | 'ca2' | 'project' | 'exam', val: number) => {
                            setBulkScores(prev => ({ ...prev, [s.id]: { ...(prev[s.id] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 }), [field]: val } }));
                          };
                          const onKeyNav = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // Move to same field of next student
                              const nextId = filteredStudents[idx + 1]?.id;
                              if (nextId) {
                                const next = document.querySelector<HTMLInputElement>(`input[data-bulk="${nextId}-${field}"]`);
                                next?.focus();
                                next?.select();
                              }
                            }
                          };
                          return (
                            <tr key={s.id} className={`border-b border-gray-100 ${rowBg}`}>
                              <td className={`sticky left-0 z-10 py-2 px-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${rowBg}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] flex-shrink-0">
                                    {s.profiles?.first_name?.[0]}{s.profiles?.last_name?.[0]}
                                  </div>
                                  <span className="font-medium text-gray-800 text-xs truncate max-w-[90px]">{s.profiles?.first_name} {s.profiles?.last_name}</span>
                                </div>
                              </td>
                              {([
                                { f: 'homework' as const, max: 10 },
                                { f: 'ca1' as const,      max: bulkCAMax },
                                { f: 'ca2' as const,      max: bulkCAMax },
                                { f: 'project' as const,  max: 10 },
                                { f: 'exam' as const,     max: bulkExamMax },
                              ]).map(({ f, max }) => (
                                <td key={f} className="py-1 px-1 text-center">
                                  <input
                                    type="number" inputMode="numeric" min={0} max={max}
                                    data-bulk={`${s.id}-${f}`}
                                    value={sc[f] || ''}
                                    onChange={e => setScore(f, Math.min(Number(e.target.value), max))}
                                    onKeyDown={e => onKeyNav(e, f)}
                                    onFocus={e => (e.target as HTMLInputElement).select()}
                                    className="w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    tabIndex={idx * 5 + ['homework','ca1','ca2','project','exam'].indexOf(f) + 1}
                                    placeholder={idx === 0 && f === 'homework' ? '0' : ''}
                                  />
                                </td>
                              ))}
                              <td className="py-2 px-2 text-center">
                                <span className={`font-bold text-sm ${gc}`}>
                                  {total > 0 ? total : '—'}
                                  {grade && total > 0 && <span className="text-[10px] ml-0.5">({grade})</span>}
                                </span>
                                {total > 0 && (
                                  <div className="text-[10px] text-gray-400">{Math.round(total / totalStudents * 10) / 10 > 0 ? '' : ''}</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Class average footer */}
                      {filteredStudents.length > 0 && (() => {
                        const totals = filteredStudents.map(s => {
                          const sc = bulkScores[s.id] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
                          const ca1  = sc.ca1  > 0 ? Math.round((sc.ca1  / bulkCAMax)   * 15) : 0;
                          const ca2  = sc.ca2  > 0 ? Math.round((sc.ca2  / bulkCAMax)   * 15) : 0;
                          const exam = sc.exam > 0 ? Math.round((sc.exam / bulkExamMax) * 50) : 0;
                          const proj = sc.project  > 0 ? Math.round((sc.project  / 10) * 10) : 0;
                          const hw   = sc.homework > 0 ? Math.round((sc.homework / 10) * 10) : 0;
                          return ca1 + ca2 + proj + hw + exam;
                        }).filter(t => t > 0);
                        if (totals.length === 0) return null;
                        const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
                        return (
                          <tfoot>
                            <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                              <td colSpan={6} className="py-2 px-4 text-xs font-semibold text-indigo-700 sticky left-0 bg-indigo-50">
                                Class average ({totals.length}/{filteredStudents.length} scored)
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-indigo-700">{avg}</td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                  <div className="flex justify-end p-3 border-t border-gray-100">
                    <button
                      onClick={saveBulkScores}
                      disabled={savingBulk}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                    >
                      {savingBulk ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingBulk ? 'Saving…' : `Save ${bulkSubject} Scores`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {entryMode === 'student' && students.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {students.some(s => !s.report_pin) && (
                <button onClick={bulkGeneratePins} disabled={bulkGeneratingPins}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-60 shadow-sm"
                  title="Generate PINs for all students without one">
                  {bulkGeneratingPins
                    ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <KeyRound className="w-3.5 h-3.5" />}
                  {bulkGeneratingPins ? 'Generating…' : 'Generate All PINs'}
                </button>
              )}
              {students.some(s => s.report_pin) && (
                <button onClick={printPinSlips}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 shadow-sm"
                  title="Print parent portal PIN cards for this class">
                  <KeyRound className="w-3.5 h-3.5" /> Print PINs
                </button>
              )}
            </div>
          )}

          {entryMode === 'student' && <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
                    <th className="py-3 px-4">Portal PIN</th>
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
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                              {s.profiles?.first_name?.[0]}{s.profiles?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                              <p className="text-xs text-gray-400">{s.profiles?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">
                          <div>{s.student_id}</div>
                          {(() => {
                            const status = getCompletionStatus(s.id);
                            return (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 ${
                                status === 'complete' ? 'text-green-600' :
                                status === 'partial'  ? 'text-amber-600' : 'text-gray-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  status === 'complete' ? 'bg-green-500' :
                                  status === 'partial'  ? 'bg-amber-400' : 'bg-gray-300'
                                }`} />
                                {status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Empty'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          {!sheet ? (
                            <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> Not created</span>
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
                                    setToast({ msg: 'Portal info copied!', type: 'success' });
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
                          <button onClick={() => openCard(s)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            {sheet ? 'View / Edit' : 'Create Sheet'}
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
            )}
          </div>}
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
              <div className="flex items-center gap-2 min-w-0">
                {/* Prev / Next navigation */}
                <button
                  onClick={() => prevStudent && navigateStudent(prevStudent)}
                  disabled={!prevStudent}
                  title={prevStudent ? `← ${prevStudent.profiles?.first_name} ${prevStudent.profiles?.last_name} (Alt+←)` : ''}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate">
                      {activeStudent.profiles?.first_name} {activeStudent.profiles?.last_name}
                    </h3>
                    {isDirty && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedTerm} · {academicYear} · {activeStudent.classes?.name}
                    {activeStudentIdx >= 0 && (
                      <span className="ml-2 text-indigo-500 font-medium">{activeStudentIdx + 1} / {filteredStudents.length}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => nextStudent && navigateStudent(nextStudent)}
                  disabled={!nextStudent}
                  title={nextStudent ? `→ ${nextStudent.profiles?.first_name} ${nextStudent.profiles?.last_name} (Alt+→)` : ''}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  <button onClick={() => setModalTab('preview')} className={`px-3 py-1.5 ${modalTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Preview
                  </button>
                  <button onClick={() => setModalTab('edit')} className={`px-3 py-1.5 ${modalTab === 'edit' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Edit
                  </button>
                </div>
                <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {loadingCard ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* ── Preview Tab ── */}
                  {modalTab === 'preview' && (
                    <div className="space-y-5">
                      {!cardData || subjects.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No report card data yet</p>
                          <p className="text-xs mt-1">Switch to "Edit Details" to fill in attendance, ratings and comments.</p>
                          <button onClick={() => setModalTab('edit')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                            Open Edit Details
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
                              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                              <Download className="w-3.5 h-3.5" /> Export as PDF
                            </button>
                            {metaForm.is_published ? (
                              <button onClick={shareViaWhatsApp}
                                className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600">
                                <MessageCircle className="w-3.5 h-3.5" /> Share via WhatsApp
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                                <EyeOff className="w-3.5 h-3.5" /> Publish report card to enable WhatsApp sharing
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
                            Homework &amp; Project /10 · 1st &amp; 2nd CA /{BASIC_CA_MAX} · Exam /{BASIC_EXAM_MAX}. Subject column is pinned.
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm min-w-[520px]">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="sticky left-0 z-10 bg-gray-50 text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-28 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Subject</th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">HW<br /><span className="font-normal text-gray-400">/10</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Proj<br /><span className="font-normal text-gray-400">/10</span></th>
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
                                  const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-indigo-600' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-700' : 'text-gray-300';
                                  const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                                  return (
                                    <tr key={subject} className={`border-b border-gray-50 ${rowBg}`}>
                                      <td className={`sticky left-0 z-10 py-2 px-3 font-semibold text-gray-800 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}>{subject}</td>
                                      {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                        <td key={field} className="py-1 px-1 text-center">
                                          <input
                                            type="number" inputMode="numeric" min={0}
                                            max={field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10}
                                            value={s[field] || ''}
                                            onChange={e => updateBasicScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10))}
                                            className="w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                          />
                                        </td>
                                      ))}
                                      <td className="py-2 px-1 text-center">
                                        <span className={`font-bold text-sm ${gc}`}>
                                          {total > 0 ? `${total}` : '—'}
                                          {grade && total > 0 && <span className="text-xs ml-1">({grade})</span>}
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
                            HW &amp; Project /10 · 1st &amp; 2nd CA /{NURSERY_CA_MAX} · Exam /{NURSERY_EXAM_MAX}. Subject column is pinned.
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm min-w-[520px]">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="sticky left-0 z-10 bg-gray-50 text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-28 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Subject</th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">HW<br /><span className="font-normal text-gray-400">/10</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                                  <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Proj<br /><span className="font-normal text-gray-400">/10</span></th>
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
                                  const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-indigo-600' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-700' : 'text-gray-300';
                                  const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                                  return (
                                    <tr key={subject} className={`border-b border-gray-50 ${rowBg}`}>
                                      <td className={`sticky left-0 z-10 py-2 px-3 font-semibold text-gray-800 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}>{subject}</td>
                                      {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                        <td key={field} className="py-1 px-1 text-center">
                                          <input
                                            type="number" inputMode="numeric" min={0}
                                            max={field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10}
                                            value={s[field] || ''}
                                            onChange={e => updateNurseryScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10))}
                                            className="w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                          />
                                        </td>
                                      ))}
                                      <td className="py-2 px-1 text-center">
                                        <span className={`font-bold text-sm ${gc}`}>
                                          {total > 0 ? `${total}` : '—'}
                                          {grade && total > 0 && <span className="text-xs ml-1">({grade})</span>}
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

                      {/* ── Pre-KG Skill Ratings — emoji face, domain-grouped ── */}
                      {isToddlerStudent && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-800 text-sm">Skill Ratings — Pre-KG</h4>
                              <p className="text-xs text-gray-400 mt-0.5">Tap a face to rate each skill. 😔 Needs Work · 😐 Fair · 🙂 Good · 😊 Very Good · 🌟 Excellent</p>
                            </div>
                            <button
                              onClick={() => {
                                const all: Partial<Record<string, number>> = {};
                                PRE_KG_SKILLS.forEach(s => { all[s.name] = 3; });
                                setPreKgRatings(all);
                                setSubjects(buildPreKgSubjects(all));
                              }}
                              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                            >
                              🙂 Set all Good
                            </button>
                          </div>
                          <div className="space-y-4">
                            {PRE_KG_DOMAINS.map(({ domain, icon, skills }) => (
                              <div key={domain} className="border border-gray-200 rounded-2xl overflow-hidden">
                                <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                                  <span className="text-sm font-bold text-indigo-800">{icon} {domain}</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {(skills as readonly string[]).map(skillName => {
                                    const current = preKgRatings[skillName] || 0;
                                    const comment = PRE_KG_COMMENTS[skillName]?.[current]?.[0] ?? '';
                                    return (
                                      <div key={skillName} className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white">
                                        <span className="text-sm font-medium text-gray-700 flex-1 min-w-[120px]">{skillName}</span>
                                        <div className="flex items-center gap-1">
                                          {[1,2,3,4,5].map(r => (
                                            <button
                                              key={r}
                                              onClick={() => updatePreKgRating(skillName, current === r ? 0 : r)}
                                              title={PRE_KG_FACE_LABELS[r]}
                                              className={`text-2xl leading-none rounded-full w-10 h-10 flex items-center justify-center transition-all border-2 ${
                                                current === r
                                                  ? 'border-indigo-400 bg-indigo-50 scale-110 shadow-sm'
                                                  : 'border-transparent opacity-40 hover:opacity-80 hover:scale-105'
                                              }`}
                                            >
                                              {PRE_KG_FACES[r]}
                                            </button>
                                          ))}
                                        </div>
                                        {current > 0 && (
                                          <span className="text-[11px] text-indigo-600 font-medium italic w-full mt-0.5">
                                            {PRE_KG_FACE_LABELS[current]}{comment ? ` — ${comment}` : ''}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Behavior Ratings for Nursery/Basic */}
                      {(isNurseryStudent || isBasicStudent) && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-800 text-sm mb-1">Behavior Ratings</h4>
                          <p className="text-xs text-gray-400 mb-3">Rate student behaviors on a scale of 1-5 (1: Poor, 3: Good, 5: Excellent).</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { key: 'punctuality' as const, label: 'Punctuality' },
                              { key: 'neatness' as const, label: 'Neatness' },
                              { key: 'honesty' as const, label: 'Honesty' },
                              { key: 'cooperation' as const, label: 'Cooperation' },
                              { key: 'attentiveness' as const, label: 'Attentiveness' },
                              { key: 'politeness' as const, label: 'Politeness' },
                            ].map(({ key, label }) => {
                              const val = metaForm[key] ?? 3;
                              return (
                                <div key={key} className="flex flex-col gap-1.5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                                    <span className="text-xs font-bold text-indigo-600">
                                      {val === 5 ? 'Excellent (5)' : val === 4 ? 'Very Good (4)' : val === 3 ? 'Good (3)' : val === 2 ? 'Fair (2)' : 'Poor (1)'}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(score => {
                                      const active = val === score;
                                      return (
                                        <button
                                          key={score}
                                          type="button"
                                          onClick={() => updateMeta({ [key]: score })}
                                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                            active
                                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold scale-[1.02]'
                                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                          }`}
                                        >
                                          {score}
                                        </button>
                                      );
                                    })}
                                  </div>
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
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Days Present</label>
                            <input type="number" min={0} value={metaForm.days_present}
                              onChange={e => updateMeta({ days_present: Number(e.target.value) })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Days Absent</label>
                            <input type="number" min={0} value={metaForm.days_absent}
                              onChange={e => updateMeta({ days_absent: Number(e.target.value) })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-1">Remarks</h4>
                        <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100 mb-3">
                          Tap any suggestion to fill, or type your own remark.
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-gray-600">Class Teacher's Remark</label>
                              <button
                                type="button"
                                onClick={autoGenerateComment}
                                disabled={subjects.filter(s => s.total > 0).length === 0}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Auto-generate comment from scores"
                              >
                                <Sparkles className="w-3 h-3" /> Auto
                              </button>
                            </div>
                            <textarea rows={2} value={metaForm.teacher_comment}
                              onChange={e => updateMeta({ teacher_comment: e.target.value })}
                              placeholder="Tap a suggestion or type…"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'An outstanding student — well done!',
                                'Excellent work, keep it up!',
                                'Brilliant performance this term!',
                                'Very impressive results this term!',
                                'Hard worker with great attitude!',
                                'Consistent performance, well done!',
                                'Shows strong academic potential!',
                                'Good effort, aim higher next term!',
                                'Improving steadily, keep it up!',
                                'Needs to work harder next term.',
                                'A pleasure to teach — well done!',
                                'Very focused and dedicated student!',
                                'Great effort this term!',
                                'Needs more focus in class.',
                              ].map(s => (
                                <button key={s} type="button"
                                  onClick={() => updateMeta({ teacher_comment: s })}
                                  className={`px-2.5 py-1 rounded-full border text-xs transition-all ${metaForm.teacher_comment === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-700'}`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-600">Principal's / Proprietress' Remark</label>
                            <textarea rows={2} value={metaForm.principal_comment}
                              onChange={e => updateMeta({ principal_comment: e.target.value })}
                              placeholder="Tap a suggestion or type…"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'Excellent performance, we are proud!',
                                'Keep up the outstanding work!',
                                'Great achievement this term!',
                                'Wonderful results — keep shining!',
                                'A credit to the school, well done!',
                                'We are proud of your dedication!',
                                'Very impressive improvement shown!',
                                'Good work — aim for the top!',
                                'Needs more effort next term.',
                                'Encourage more reading at home.',
                                'Great potential, keep working hard!',
                                'Steady progress, well done!',
                              ].map(s => (
                                <button key={s} type="button"
                                  onClick={() => updateMeta({ principal_comment: s })}
                                  className={`px-2.5 py-1 rounded-full border text-xs transition-all ${metaForm.principal_comment === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-700'}`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Next Term */}
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-3">Next Term Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Next Term Begins</label>
                            <input type="date" value={metaForm.next_term_begins}
                              onChange={e => updateMeta({ next_term_begins: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fees for Next Term</label>
                            <input value={metaForm.next_term_fees}
                              onChange={e => updateMeta({ next_term_fees: e.target.value })}
                              placeholder="₦150,000"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Outstanding Balance (optional)</label>
                            <input value={metaForm.outstanding_fees}
                              onChange={e => updateMeta({ outstanding_fees: e.target.value })}
                              placeholder="e.g. ₦25,000"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          </div>
                        </div>
                      </div>

                      {/* Publish toggle */}
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                        <input type="checkbox" id="pub-teacher" checked={metaForm.is_published}
                          onChange={e => updateMeta({ is_published: e.target.checked })}
                          className="w-4 h-4 rounded accent-green-700 cursor-pointer" />
                        <label htmlFor="pub-teacher" className="text-sm font-medium text-gray-700 cursor-pointer">
                          Publish report card — makes it visible to parents
                        </label>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 flex-wrap">
                        <button onClick={() => setModalTab('preview')}
                          className="flex-1 min-w-[120px] py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          Preview Card
                        </button>
                        <button onClick={saveMeta} disabled={saving}
                          className="flex-1 min-w-[140px] py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                          <Save className="w-4 h-4" />
                          {saving ? 'Saving…' : 'Save Report Card'}
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
