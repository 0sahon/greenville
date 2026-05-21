import { useState, useEffect } from 'react';
import { FileText, ChevronDown, AlertCircle, TrendingUp, Award, BookOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import { useStudentData } from './useStudentData';
import ResultCard, { getNigerianGrade, printResultCard } from '../admin/ResultCard';
import type { ResultCardData, SubjectResult } from '../admin/ResultCard';
import type { ProfileRow, GradeRow } from '../../../lib/supabase';
import { computeSubjects } from '../../../lib/gradeCompute';
import PerformanceChart from '../shared/PerformanceChart';
import {
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
} from '../../../config/schoolBrand';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface ResultSheetRow {
  id: string;
  student_id: string;
  term: string;
  academic_year: string;
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
  next_term_begins: string | null;
  next_term_fees: string;
  is_published: boolean;
}

export default function StudentResultsSection({ profile }: Props) {
  const { student, loading: studentLoading, error: studentError } = useStudentData(profile.id);
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [resultSheet, setResultSheet] = useState<ResultSheetRow | null>(null);
  const [subjects, setSubjects] = useState<SubjectResult[]>([]);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    if (!student) return;
    setLoadingResult(true);
    setResultSheet(null);
    setSubjects([]);
    (async () => {
      const [{ data: sheet }, { data: grades }] = await Promise.all([
        supabase.from('result_sheets')
          .select('*')
          .eq('student_id', student.id)
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear)
          .eq('is_published', true)
          .maybeSingle(),
        supabase.from('grades')
          .select('id,subject,assessment_type,score,max_score,student_id,term,academic_year')
          .eq('student_id', student.id)
          .eq('term', selectedTerm)
          .eq('academic_year', academicYear),
      ]);
      setResultSheet(sheet as ResultSheetRow | null);
      setSubjects(computeSubjects((grades || []) as GradeRow[]));
      setLoadingResult(false);
    })();
  }, [student, selectedTerm, academicYear]);

  /* ── Loading & Error states ── */
  if (studentLoading) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (studentError) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-red-800">Something went wrong</h3>
        <p className="text-sm text-red-700 mt-1">{studentError}</p>
      </div>
    </div>
  );

  if (!student) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-amber-800">No student record found</h3>
        <p className="text-sm text-amber-700 mt-1">Please contact your school administrator.</p>
      </div>
    </div>
  );

  /* ── Derive class level safely ── */
  const classLevel = (student as { classes?: { level?: string } | null }).classes?.level ?? '';

  const grandTotal = subjects.reduce((acc, s) => acc + s.total, 0);
  const avgScore   = subjects.length > 0 ? Math.round(grandTotal / subjects.length) : 0;
  const { grade: overallGrade } = subjects.length > 0 ? getNigerianGrade(avgScore) : { grade: '—' };

  /* ── Build ResultCardData only when we have a published sheet ── */
  const cardData: ResultCardData | null = resultSheet ? {
    student: {
      name:       `${profile.first_name} ${profile.last_name}`,
      studentId:  student.student_id,
      className:  (student as { classes?: { name?: string } | null }).classes?.name || '—',
      classLevel,                      // ← CRITICAL: tells ResultCard which template to render
      gender:     student.gender || '',
      dob:        student.date_of_birth || '',
    },
    term: selectedTerm,
    academicYear,
    subjects,
    classStats: {
      position:       0,
      totalStudents:  0,
      grandTotal,
      highestInClass: 0,
      lowestInClass:  0,
      classAverage:   0,
    },
    behavior: {
      punctuality:    resultSheet.punctuality    ?? 0,
      neatness:       resultSheet.neatness       ?? 0,
      honesty:        resultSheet.honesty        ?? 0,
      cooperation:    resultSheet.cooperation    ?? 0,
      attentiveness:  resultSheet.attentiveness  ?? 0,
      politeness:     resultSheet.politeness     ?? 0,
    },
    attendance: {
      daysPresent: resultSheet.days_present,
      daysAbsent:  resultSheet.days_absent,
      totalDays:   resultSheet.total_school_days,
    },
    comments: {
      teacher:   resultSheet.teacher_comment   || '',
      principal: resultSheet.principal_comment || '',
    },
    nextTerm: {
      begins: resultSheet.next_term_begins || '',
      fees:   resultSheet.next_term_fees   || '',
    },
    schoolName:    SCHOOL_NAME,
    schoolAddress: `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`,
  } : null;

  const isNurseryOrToddler = classLevel === 'creche' || classLevel === 'toddler';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" /> My Results
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">View and download your official report card</p>
      </div>

      {/* Term / Year selector */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Period</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1.5">Term</label>
            <div className="relative">
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1.5">Academic Year</label>
            <div className="relative">
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium">
                {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      {loadingResult ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your result sheet…</p>
        </div>

      ) : !resultSheet ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-500 mb-1">No published result yet</p>
          <p className="text-sm text-gray-400">
            {selectedTerm} · {academicYear} — Results will appear here once your teacher publishes them.
          </p>

          {/* Show subject scores even if sheet isn't published */}
          {subjects.length > 0 && (
            <div className="mt-6 mx-auto max-w-sm">
              <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wide">
                ⚠️ Scores recorded (not yet published)
              </p>
              <div className="space-y-1.5 text-left">
                {subjects.map(s => (
                  <div key={s.subject} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-700 font-medium truncate">{s.subject}</span>
                    <span className="font-bold text-indigo-700 ml-2">{s.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      ) : (
        <>
          {/* Quick summary KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Average', value: `${avgScore}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Grade', value: overallGrade, icon: Award, color: 'text-amber-600 bg-amber-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xl font-extrabold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Attendance banner */}
          {resultSheet.total_school_days > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Attendance</p>
                <p className="text-sm text-gray-800 mt-0.5">
                  Present <strong>{resultSheet.days_present}</strong> of <strong>{resultSheet.total_school_days}</strong> school days
                  {resultSheet.days_absent > 0 && (
                    <span className="ml-2 text-xs text-red-600 font-semibold">({resultSheet.days_absent} absent)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2.5 bg-white rounded-full overflow-hidden border border-indigo-100">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((resultSheet.days_present / resultSheet.total_school_days) * 100))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-indigo-700">
                  {Math.round((resultSheet.days_present / resultSheet.total_school_days) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Official Result Card */}
          {cardData && (
            <ResultCard
              data={cardData}
              onPrint={() => printResultCard(
                `${profile.first_name} ${profile.last_name}`,
                isNurseryOrToddler
              )}
            />
          )}

          {/* Performance chart (only for primary-level, not pre-kg) */}
          {subjects.length > 0 && !isNurseryOrToddler && (
            <PerformanceChart
              subjects={subjects}
              title={`${selectedTerm} · ${academicYear} — Subject Performance`}
            />
          )}
        </>
      )}
    </div>
  );
}
