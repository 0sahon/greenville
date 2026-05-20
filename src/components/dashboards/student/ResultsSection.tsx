import { useState, useEffect } from 'react';
import { FileText, ChevronDown, AlertCircle } from 'lucide-react';
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

  if (studentLoading) return (
    <div className="flex justify-center items-center h-40">
      <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
    </div>
  );

  if (studentError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-red-800">Something went wrong</h3><p className="text-sm text-red-700 mt-1">{studentError}</p></div>
    </div>
  );

  if (!student) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-amber-800">No student record found</h3><p className="text-sm text-amber-700 mt-1">Please contact your school administrator.</p></div>
    </div>
  );

  const grandTotal = subjects.reduce((acc, s) => acc + s.total, 0);

  const cardData: ResultCardData | null = resultSheet ? {
    student: {
      name: `${profile.first_name} ${profile.last_name}`,
      studentId: student.student_id,
      className: student.classes?.name || '—',
      gender: student.gender || '',
      dob: student.date_of_birth || '',
    },
    term: selectedTerm,
    academicYear,
    subjects,
    classStats: {
      position: 0,
      totalStudents: 0,
      grandTotal,
      highestInClass: 0,
      lowestInClass: 0,
      classAverage: 0,
    },
    behavior: {
      punctuality: resultSheet.punctuality,
      neatness: resultSheet.neatness,
      honesty: resultSheet.honesty,
      cooperation: resultSheet.cooperation,
      attentiveness: resultSheet.attentiveness,
      politeness: resultSheet.politeness,
    },
    attendance: {
      daysPresent: resultSheet.days_present,
      daysAbsent: resultSheet.days_absent,
      totalDays: resultSheet.total_school_days,
    },
    comments: {
      teacher: resultSheet.teacher_comment,
      principal: resultSheet.principal_comment,
    },
    nextTerm: {
      begins: resultSheet.next_term_begins,
      fees: resultSheet.next_term_fees,
    },
    schoolName: SCHOOL_NAME,
    schoolAddress: `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`,
  } : null;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Results</h2>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Select Term</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-500 mb-1">Term</label>
            <div className="relative">
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loadingResult ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : !resultSheet ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No published result for {selectedTerm} · {academicYear}</p>
          <p className="text-xs mt-1">Results will appear here once your teacher publishes them.</p>
        </div>
      ) : cardData ? (
        <>
          <ResultCard
            data={cardData}
            onPrint={() => printResultCard(`${profile.first_name} ${profile.last_name}`)}
          />
          {subjects.length > 0 && (
            <PerformanceChart
              subjects={subjects}
              title={`${selectedTerm} · ${academicYear} — Subject Performance`}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
