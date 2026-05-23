import { useState, useRef, useEffect } from 'react';
import { Download, Printer, ChevronDown, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ResultCard, {
  printResultCard,
  buildBasicSubjects,
  buildNurserySubjects,
  preKgTotalToRating,
  type ResultCardData,
  type BasicScores,
  type NurseryScores,
} from '../dashboards/admin/ResultCard';
import {
  SCHOOL_NAME,
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_LOGO_PATH,
} from '../../config/schoolBrand';
import { TERMS, getAcademicYearOptions } from '../../lib/academicConfig';

/* ── Types returned by the Supabase RPC ─────────────────────────── */
interface PortalStudent {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  class_level: string;
  gender: string;
  date_of_birth: string;
}

interface PortalGrade {
  subject: string;
  assessment_type: string;
  score: number;
  max_score: number;
}

interface PortalSheet {
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
  grades: PortalGrade[] | null;
}

interface PortalData {
  student: PortalStudent;
  sheets: PortalSheet[] | null;
}

/* ── Helper: build ResultCardData from portal sheet ─────────────── */
function buildCardData(student: PortalStudent, sheet: PortalSheet): ResultCardData {
  const level = student.class_level;
  const grades = sheet.grades || [];

  let subjects: ReturnType<typeof buildBasicSubjects> = [];

  if (level === 'basic') {
    const scores: BasicScores = {};
    grades.filter(g => g.assessment_type !== 'pre_kg').forEach(g => {
      if (!scores[g.subject]) scores[g.subject] = { ca1: 0, ca2: 0, exam: 0 };
      const s = scores[g.subject]!;
      if (g.assessment_type === '1st CA')    s.ca1      = g.score;
      if (g.assessment_type === '2nd CA')    s.ca2      = g.score;
      if (g.assessment_type === 'Exam')      s.exam     = g.score;
      if (g.assessment_type === 'Project')   s.project  = g.score;
      if (g.assessment_type === 'Home Work') s.homework = g.score;
    });
    subjects = buildBasicSubjects(scores);
  } else if (level === 'nursery' || level === 'kg') {
    const scores: NurseryScores = {};
    grades.filter(g => g.assessment_type !== 'pre_kg').forEach(g => {
      if (!scores[g.subject]) scores[g.subject] = { ca1: 0, ca2: 0, exam: 0 };
      const s = scores[g.subject]!;
      if (g.assessment_type === '1st CA')    s.ca1      = g.score;
      if (g.assessment_type === '2nd CA')    s.ca2      = g.score;
      if (g.assessment_type === 'Exam')      s.exam     = g.score;
      if (g.assessment_type === 'Project')   s.project  = g.score;
      if (g.assessment_type === 'Home Work') s.homework = g.score;
    });
    subjects = buildNurserySubjects(scores);
  } else {
    // Toddler / creche — word-based skill ratings
    const pkGrades = grades.filter(g => g.assessment_type === 'pre_kg');
    const bySkill: Record<string, number[]> = {};
    pkGrades.forEach(g => {
      if (!bySkill[g.subject]) bySkill[g.subject] = [];
      bySkill[g.subject].push(g.score);
    });
    subjects = Object.entries(bySkill).map(([subject, vals]) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return {
        subject,
        ca1: 0, ca2: 0, exam: 0,
        total: avg,
        grade: String(preKgTotalToRating(avg)),
        remark: '',
      };
    });
  }

  const scored = subjects.filter(s => s.total > 0);
  const grandTotal = scored.reduce((s, r) => s + r.total, 0);
  const classAvg = scored.length > 0 ? grandTotal / scored.length : 0;

  return {
    student: {
      name: `${student.first_name} ${student.last_name}`,
      studentId: student.student_id,
      className: student.class_name,
      classLevel: student.class_level,
      gender: student.gender,
      dob: student.date_of_birth,
    },
    term: sheet.term,
    academicYear: sheet.academic_year,
    subjects,
    classStats: {
      position: 0,
      totalStudents: 0,
      grandTotal,
      highestInClass: 0,
      lowestInClass: 0,
      classAverage: classAvg,
    },
    behavior: {
      punctuality:   sheet.punctuality   ?? 3,
      neatness:      sheet.neatness      ?? 3,
      honesty:       sheet.honesty       ?? 3,
      cooperation:   sheet.cooperation   ?? 3,
      attentiveness: sheet.attentiveness ?? 3,
      politeness:    sheet.politeness    ?? 3,
    },
    attendance: {
      daysPresent: sheet.days_present      ?? 0,
      daysAbsent:  sheet.days_absent       ?? 0,
      totalDays:   sheet.total_school_days ?? 0,
    },
    comments: {
      teacher:   sheet.teacher_comment   ?? '',
      principal: sheet.principal_comment ?? '',
    },
    nextTerm: {
      begins: sheet.next_term_begins ?? '',
      fees:   sheet.next_term_fees   ?? '',
    },
    schoolName:    SCHOOL_NAME,
    schoolAddress: SCHOOL_ADDRESS_SINGLE,
  };
}

/* ── Term ordering helper ────────────────────────────────────────── */
const TERM_ORDER: Record<string, number> = {
  'First Term': 1, 'Second Term': 2, 'Third Term': 3,
};
function sortSheets(sheets: PortalSheet[]) {
  return [...sheets].sort((a, b) => {
    const yearCmp = b.academic_year.localeCompare(a.academic_year);
    if (yearCmp !== 0) return yearCmp;
    return (TERM_ORDER[b.term] ?? 0) - (TERM_ORDER[a.term] ?? 0);
  });
}

/* ── Main component ─────────────────────────────────────────────── */
export default function ReportPortal() {
  const [studentDisplayId, setStudentDisplayId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  const idRef  = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  // Auto-focus Student ID on mount
  useEffect(() => { idRef.current?.focus(); }, []);

  // Fade-in when results arrive
  useEffect(() => {
    if (portalData) setTimeout(() => setVisible(true), 30);
  }, [portalData]);

  const handleVerify = async () => {
    if (!studentDisplayId.trim() || !pin.trim()) {
      setError('Enter your Student ID and PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_student_portal_data', {
        p_student_display_id: studentDisplayId.trim().toUpperCase(),
        p_pin: pin.trim(),
      });
      if (rpcErr) throw rpcErr;
      if (!data) {
        setError('Invalid Student ID or PIN. Please check and try again.');
        pinRef.current?.focus();
        return;
      }
      const pd = data as PortalData;
      if (!pd.sheets || pd.sheets.length === 0) {
        setError('No published results found for this student yet. Check back later or contact the school.');
        return;
      }
      setVisible(false);
      setPortalData(pd);
      setSelectedSheetIdx(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Entry form ──────────────────────────────────────────────── */
  if (!portalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
          <div className="text-center mb-7">
            <img src={SCHOOL_LOGO_PATH} alt={SCHOOL_NAME}
              className="w-16 h-16 object-contain mx-auto mb-3 rounded-xl" />
            <h1 className="text-xl font-bold text-gray-900">{SCHOOL_NAME}</h1>
            <p className="text-sm text-gray-500 mt-1">Student Result Portal</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student ID</label>
              <input
                ref={idRef}
                type="text"
                value={studentDisplayId}
                onChange={e => { setStudentDisplayId(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); pinRef.current?.focus(); }
                }}
                placeholder="e.g. GMS-2024-001"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono tracking-wide"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Portal PIN</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={pinRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '');
                    setPin(v);
                    setError('');
                    // Auto-verify as soon as 6 digits are entered
                    if (v.length === 6 && studentDisplayId.trim()) {
                      setTimeout(handleVerify, 0);
                    }
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  placeholder="6-digit PIN"
                  className="w-full pl-10 pr-10 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono tracking-[0.4em]"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 rounded-xl px-4 py-2 border border-red-100">{error}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading results…
                </span>
              ) : 'View Results'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Contact the school office to get your child&apos;s Portal PIN.
          </p>
        </div>
      </div>
    );
  }

  /* ── Results view ─────────────────────────────────────────────── */
  const sorted = sortSheets(portalData.sheets!);
  const sheet = sorted[selectedSheetIdx];
  const cardData = buildCardData(portalData.student, sheet);
  const isLandscape = ['toddler', 'creche'].includes(portalData.student.class_level);
  const studentName = `${portalData.student.first_name} ${portalData.student.last_name}`;

  return (
    <div
      className="min-h-screen bg-gray-50 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setVisible(false); setPortalData(null); setPin(''); setStudentDisplayId(''); setError(''); setTimeout(() => idRef.current?.focus(), 50); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="font-bold text-gray-900 text-sm">{studentName}</p>
            <p className="text-xs text-gray-500">{portalData.student.class_name} · {portalData.student.student_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Term selector */}
          {sorted.length > 1 && (
            <div className="relative">
              <select
                value={selectedSheetIdx}
                onChange={e => setSelectedSheetIdx(Number(e.target.value))}
                className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {sorted.map((s, i) => (
                  <option key={i} value={i}>{s.term} {s.academic_year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => printResultCard(studentName, isLandscape)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={() => {
              printResultCard(studentName, isLandscape);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-semibold hover:bg-green-800"
          >
            <Download className="w-3.5 h-3.5" /> Save PDF
          </button>
        </div>
      </div>

      {/* ── Mobile-native result view ── */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* Term chips */}
        {sorted.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {sorted.map((s, i) => (
              <button key={i} onClick={() => setSelectedSheetIdx(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  i === selectedSheetIdx
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                }`}>
                {s.term} {s.academic_year}
              </button>
            ))}
          </div>
        )}

        {/* Scores table */}
        {cardData.subjects.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm">Academic Performance</h2>
              <span className="text-xs text-gray-400">{sheet.term} · {sheet.academic_year}</span>
            </div>
            {/* Basic/Nursery/KG: show score columns */}
            {portalData.student.class_level !== 'toddler' && portalData.student.class_level !== 'creche' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[340px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-center">
                      <th className="py-2 px-3 text-left font-semibold">Subject</th>
                      <th className="py-2 px-2">CA1</th>
                      <th className="py-2 px-2">CA2</th>
                      <th className="py-2 px-2">Exam</th>
                      <th className="py-2 px-2 bg-gray-100 font-bold">Total</th>
                      <th className="py-2 px-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardData.subjects.filter(s => s.total > 0).map((s, i) => {
                      const gradeColor = s.grade.startsWith('A') ? 'text-green-700 bg-green-50'
                        : s.grade.startsWith('B') ? 'text-blue-700 bg-blue-50'
                        : s.grade.startsWith('C') ? 'text-yellow-700 bg-yellow-50'
                        : 'text-red-700 bg-red-50';
                      return (
                        <tr key={s.subject} className={`border-t border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 text-xs uppercase">{s.subject}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums text-gray-600">{s.ca1 > 0 ? s.ca1 : '—'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums text-gray-600">{s.ca2 > 0 ? s.ca2 : '—'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums text-gray-600">{s.exam > 0 ? s.exam : '—'}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-gray-800 bg-gray-100 tabular-nums">{s.total}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${gradeColor}`}>{s.grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Toddler/Creche: word-based skill ratings */
              <div className="divide-y divide-gray-50">
                {cardData.subjects.map(s => (
                  <div key={s.subject} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">{s.subject}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      s.grade === 'E' ? 'bg-green-100 text-green-700' :
                      s.grade === 'VG' ? 'bg-blue-100 text-blue-700' :
                      s.grade === 'G' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{s.grade}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Grand total row */}
            {cardData.classStats.grandTotal > 0 && (
              <div className="px-4 py-3 bg-green-50 border-t border-green-100 flex justify-between items-center">
                <span className="text-sm font-bold text-green-800">Total Score</span>
                <span className="text-lg font-bold text-green-700">{cardData.classStats.grandTotal}</span>
              </div>
            )}
          </div>
        )}

        {/* Attendance */}
        {(cardData.attendance.totalDays > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-bold text-gray-700 text-sm mb-3">Attendance</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'School Days', value: cardData.attendance.totalDays, color: 'text-gray-700' },
                { label: 'Present', value: cardData.attendance.daysPresent, color: 'text-green-700' },
                { label: 'Absent', value: cardData.attendance.daysAbsent, color: 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl py-3">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behavior */}
        {cardData.behavior && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-bold text-gray-700 text-sm mb-3">Character Assessment</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(cardData.behavior).map(([key, val]) => {
                const stars = typeof val === 'number' ? val : 0;
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600">{label}</span>
                    <span className="text-yellow-500 text-sm">{'★'.repeat(stars)}{'☆'.repeat(Math.max(0, 5 - stars))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments */}
        {(cardData.comments.teacher || cardData.comments.principal) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm">Remarks</h3>
            {cardData.comments.teacher && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Class Teacher</p>
                <p className="text-sm text-gray-700 italic bg-gray-50 rounded-lg px-3 py-2">{cardData.comments.teacher}</p>
              </div>
            )}
            {cardData.comments.principal && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Proprietress</p>
                <p className="text-sm text-gray-700 italic bg-gray-50 rounded-lg px-3 py-2">{cardData.comments.principal}</p>
              </div>
            )}
          </div>
        )}

        {/* Next term */}
        {(cardData.nextTerm.begins || cardData.nextTerm.fees) && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <h3 className="font-bold text-green-800 text-sm mb-2">Next Term</h3>
            {cardData.nextTerm.begins && (
              <p className="text-sm text-green-700">Resumes: <span className="font-semibold">{cardData.nextTerm.begins}</span></p>
            )}
            {cardData.nextTerm.fees && (
              <p className="text-sm text-green-700 mt-1">Fees: <span className="font-semibold">{cardData.nextTerm.fees}</span></p>
            )}
          </div>
        )}

        {/* Print hint */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Tap <strong>Print / Save PDF</strong> above to get a printable copy.
        </p>
      </div>

      {/* Hidden ResultCard used only for printing — not visible on screen */}
      <div className="hidden">
        <ResultCard data={cardData} onPrint={() => printResultCard(studentName, isLandscape)} />
      </div>
    </div>
  );
}
