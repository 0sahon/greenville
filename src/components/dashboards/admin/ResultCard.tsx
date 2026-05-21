import React from 'react';
import { Printer } from 'lucide-react';
import {
  DATE_LOCALE,
  RESULT_CARD_PRINT_DOM_ID,
  SCHOOL_ADDRESS_LINE1,
  SCHOOL_ADDRESS_LINE2,
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_CITY_TAGLINE,
  SCHOOL_LOGO_PATH,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
} from '../../../config/schoolBrand';
export { getNigerianGrade, GRADING_KEY } from '../../../lib/grading';

function gradeColor(grade: string): React.CSSProperties {
  if (grade === 'A+') return { background: '#bbf7d0', color: '#14532d', fontWeight: 'bold' };
  if (grade === 'A')  return { background: '#bfdbfe', color: '#1e3a8a', fontWeight: 'bold' };
  if (grade === 'B')  return { background: '#d1fae5', color: '#065f46', fontWeight: 'bold' };
  if (grade === 'C')  return { background: '#fef08a', color: '#713f12', fontWeight: 'bold' };
  if (grade === 'D')  return { background: '#fed7aa', color: '#7c2d12', fontWeight: 'bold' };
  if (grade === 'E')  return { background: '#fecaca', color: '#7f1d1d', fontWeight: 'bold' };
  return { background: '#fee2e2', color: '#450a0a', fontWeight: 'bold' };
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Types ─────────────────────────────────────────────────── */
export interface SubjectResult {
  subject: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
  homework?: number;
  project?: number;
}

export interface ResultCardData {
  student: {
    name: string;
    studentId: string;
    className: string;
    classLevel?: string;
    gender: string;
    dob: string;
  };
  term: string;
  academicYear: string;
  subjects: SubjectResult[];
  classStats: {
    position: number;
    totalStudents: number;
    grandTotal: number;
    highestInClass: number;
    lowestInClass: number;
    classAverage: number;
  };
  behavior: {
    punctuality: number;
    neatness: number;
    honesty: number;
    cooperation: number;
    attentiveness: number;
    politeness: number;
  };
  attendance: {
    daysPresent: number;
    daysAbsent: number;
    totalDays: number;
  };
  comments: { teacher: string; principal: string };
  nextTerm: { begins: string; fees: string };
  schoolName: string;
  schoolAddress: string;
  visibleSubjects?: string[];
}

/* ─── Print helper ──────────────────────────────────────────── */
export function printResultCard(studentName: string, landscape = false) {
  const el = document.getElementById(RESULT_CARD_PRINT_DOM_ID);
  if (!el) return;
  const win = window.open('', '_blank', 'width=1050,height=750');
  if (!win) return;
  const pageSize = landscape ? 'A4 landscape' : 'A4 portrait';
  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Result Sheet – ${studentName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&display=swap" rel="stylesheet">
<style>
  @page { size: ${pageSize}; margin: 6mm 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Fredoka', Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; }
  img { max-width: 100%; }
</style>
</head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

/* ─── PRIMARY / BASIC Result Card — matches physical "LOWER AND MIDDLE BASIC REPORT SHEET" ── */
function PrimaryResultCard({ data }: { data: ResultCardData }) {
  const { student, term, academicYear, subjects, behavior, attendance, comments, nextTerm, schoolName, visibleSubjects } = data;
  const displayedBasicSubjects = visibleSubjects
    ? (BASIC_SUBJECTS as readonly string[]).filter(n => visibleSubjects.includes(n))
    : BASIC_SUBJECTS as readonly string[];
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;

  const scoredSubjects = subjects.filter(s => s.total > 0);
  const avgScore = scoredSubjects.length > 0
    ? Math.round(scoredSubjects.reduce((s, r) => s + r.total, 0) / scoredSubjects.length)
    : 0;
  const grandTotal = scoredSubjects.reduce((s, r) => s + r.total, 0);

  const ageYears = student.dob
    ? new Date().getFullYear() - new Date(student.dob).getFullYear()
    : null;

  const getSubject = (name: string) =>
    subjects.find(s => s.subject.toLowerCase().trim() === name.toLowerCase().trim());

  const BORDER = '1px solid #555';
  const TH: React.CSSProperties = {
    border: BORDER, padding: '4px 3px', textAlign: 'center',
    fontWeight: 'bold', fontSize: '8pt', background: '#e8e8e8', lineHeight: 1.2,
  };
  const TD: React.CSSProperties = {
    border: BORDER, padding: '3px 4px', textAlign: 'center', fontSize: '8.5pt',
  };

  /* Behaviour → Practical Life mapping (a–h from the physical card) */
  function bScore(val: number): string {
    if (val >= 5) return 'A+';
    if (val >= 4) return 'A';
    if (val >= 3) return 'B';
    if (val >= 2) return 'C';
    if (val >= 1) return 'D';
    return '';
  }
  const practicalLife = [
    { id: 'a', label: 'Tolerance',                                  score: bScore(behavior.honesty) },
    { id: 'b', label: 'Responsibility',                             score: bScore(behavior.cooperation) },
    { id: 'c', label: 'Skills Mastering',                           score: bScore(behavior.attentiveness) },
    { id: 'd', label: 'Concentration',                              score: bScore(behavior.attentiveness) },
    { id: 'e', label: 'Personal Appearance (Care of Self)',         score: bScore(behavior.neatness) },
    { id: 'f', label: 'Domestic (Home) Chores',                     score: '' },
    { id: 'g', label: 'Courtesy (Greeting and Respect) and Grace', score: bScore(behavior.politeness) },
    { id: 'h', label: 'Level of Independence',                      score: '' },
  ];

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9pt', color: '#000', background: '#fff', border: '2px solid #333' }}>

      {/* ── HEADER: logo left · school info centre · address right ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px 6px', borderBottom: '2px solid #333' }}>
        {/* Single logo — left only */}
        <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
          style={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0, marginTop: '2px' }} />

        {/* School name + subtitle + email */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#000', lineHeight: 1.1, letterSpacing: '0.3px' }}>
            {displaySchool.toUpperCase()}
          </div>
          <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#333', marginTop: '2px', letterSpacing: '0.3px' }}>
            &#9679;DAY CARE &#9679;PRE-SCHOOL &#9679;NURSERY &#9679;PRIMARY
          </div>
          <div style={{ fontSize: '7.5pt', color: '#555', marginTop: '3px' }}>
            Email: greenvillemontessoriesschools@yahoo.com
          </div>
        </div>

        {/* Address block — top right */}
        <div style={{ textAlign: 'right', fontSize: '7.5pt', color: '#333', lineHeight: 1.5, flexShrink: 0, maxWidth: '160px' }}>
          <div>{SCHOOL_ADDRESS_LINE1},</div>
          <div>{SCHOOL_ADDRESS_LINE2}</div>
          <div>Tel: {SCHOOL_PHONE_DISPLAY}</div>
        </div>
      </div>

      {/* ── TITLE STRIP ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid #333', background: '#f5f5f5' }}>
        <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Lower and Middle Basic Report Sheet
        </div>
        <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
          No.&nbsp;{student.studentId || ''}
        </div>
      </div>

      {/* ── STUDENT INFO ── */}
      <div style={{ padding: '5px 12px 4px', borderBottom: '1px solid #999', fontSize: '8.5pt' }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name of Pupil:</span>
          <span style={{ flex: 2, borderBottom: '1px solid #555', minWidth: '160px', paddingLeft: '3px' }}>{student.name}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '10px' }}>Class:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{student.className}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '10px' }}>Term</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{term}</span>
        </div>
        {/* Row 2 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Academic Session:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{academicYear}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Attended Class:</span>
          <span style={{ width: '40px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{attendance.daysPresent || ''}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Times Out of</span>
          <span style={{ width: '40px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{attendance.totalDays || ''}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Age:</span>
          <span style={{ width: '40px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{ageYears !== null ? `${ageYears}` : ''}</span>
        </div>
        {/* Row 3 */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Average:</span>
          <span style={{ width: '80px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{subjects.length > 0 ? `${avgScore}%` : ''}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '16px' }}>Scores:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{subjects.length > 0 ? grandTotal : ''}</span>
        </div>
      </div>

      {/* ── SUBJECTS TABLE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: 'left', width: '27%', fontSize: '9pt', padding: '5px 6px' }}>SUBJECTS</th>
            <th style={{ ...TH, width: '8%' }}>1st<br />CAT<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>15%</span></th>
            <th style={{ ...TH, width: '8%' }}>2nd<br />CAT<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>15%</span></th>
            <th style={{ ...TH, width: '8%' }}>Project<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>10%</span></th>
            <th style={{ ...TH, width: '10%' }}>HW/<br />Assignment<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>10%</span></th>
            <th style={{ ...TH, width: '8%' }}>Exam<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>50%</span></th>
            <th style={{ ...TH, width: '8%', background: '#d0d0d0' }}>Total<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>100%</span></th>
            <th style={{ ...TH, width: '7%', background: '#d0d0d0' }}>Grade</th>
            <th style={{ ...TH, width: '16%', textAlign: 'left', padding: '5px 5px' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {displayedBasicSubjects
            .map(name => ({ name, s: getSubject(name) }))
            .filter(({ s }) => s && s.total > 0)
            .map(({ name, s }, i) => {
              const { grade, remark } = getNigerianGrade(s!.total);
              const gc = gradeColor(grade);
              return (
                <tr key={name} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...TD, textAlign: 'left', fontWeight: 'bold', fontSize: '8pt', padding: '3px 6px', textTransform: 'uppercase' }}>
                    {name}
                  </td>
                  <td style={TD}>{s!.ca1 > 0 ? s!.ca1 : ''}</td>
                  <td style={TD}>{s!.ca2 > 0 ? s!.ca2 : ''}</td>
                  <td style={TD}>{(s!.project ?? 0) > 0 ? s!.project : ''}</td>
                  <td style={TD}>{(s!.homework ?? 0) > 0 ? s!.homework : ''}</td>
                  <td style={TD}>{s!.exam > 0 ? s!.exam : ''}</td>
                  <td style={{ ...TD, fontWeight: 'bold', background: '#f0f0f0' }}>{s!.total}</td>
                  <td style={{ ...TD, ...gc, padding: '3px 2px' }}>{grade}</td>
                  <td style={{ ...TD, textAlign: 'left', fontSize: '7.5pt', padding: '3px 5px' }}>{remark}</td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {/* ── PRACTICAL LIFE section ── */}
      <div style={{ borderTop: BORDER, borderBottom: BORDER }}>
        <div style={{ background: '#e8e8e8', fontWeight: 'bold', fontSize: '8pt', padding: '3px 8px', borderBottom: BORDER }}>
          PRACTICAL LIFE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '7.5pt' }}>
          {[
            [practicalLife[0], practicalLife[3]],
            [practicalLife[1], practicalLife[4]],
            [practicalLife[2], practicalLife[5]],
          ].map((pair, col) => (
            <div key={col} style={{ borderRight: col < 2 ? BORDER : 'none' }}>
              {pair.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #ccc' }}>
                  <span style={{ fontWeight: 'bold', marginRight: '4px', minWidth: '10px' }}>{item.id}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ fontWeight: 'bold', minWidth: '22px', textAlign: 'center', ...( item.score ? gradeColor(item.score) : {}) }}>
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* g and h — span full width */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #ccc', fontSize: '7.5pt' }}>
          {[practicalLife[6], practicalLife[7]].map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRight: i === 0 ? BORDER : 'none' }}>
              <span style={{ fontWeight: 'bold', marginRight: '4px', minWidth: '10px' }}>{item.id}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ fontWeight: 'bold', minWidth: '22px', textAlign: 'center', ...(item.score ? gradeColor(item.score) : {}) }}>
                {item.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER: comments left | grading key right ── */}
      <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>

        {/* Left — comments & signatures */}
        <div style={{ flex: 1, padding: '8px 12px', fontSize: '8.5pt', borderRight: BORDER }}>

          {/* Next term */}
          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>School Re-opens for Next Term on:</span>
            <span style={{ flex: 1, borderBottom: '1px solid #555', minHeight: '14px', paddingLeft: '4px' }}>
              {nextTerm.begins ? fmtDate(nextTerm.begins) : ''}
            </span>
          </div>

          {/* Class teacher */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Class Teacher&apos;s Comment:</div>
            <div style={{ borderBottom: '1px solid #555', minHeight: '18px', paddingLeft: '4px', fontStyle: 'italic' }}>
              {comments.teacher}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ minHeight: '28px' }} />
              <div style={{ borderTop: '1px solid #333', paddingTop: '2px', fontSize: '7.5pt' }}>— Signature &amp; Date —</div>
            </div>
          </div>

          {/* Head of school */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Head of School&apos;s Comment:</div>
            <div style={{ borderBottom: '1px solid #555', minHeight: '18px', paddingLeft: '4px', fontStyle: 'italic' }}>
              {comments.principal}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ minHeight: '28px' }} />
              <div style={{ borderTop: '1px solid #333', paddingTop: '2px', fontSize: '7.5pt' }}>— Signature &amp; Date —</div>
            </div>
          </div>
        </div>

        {/* Right — INTERPRETING OF GRADING SYSTEM */}
        <div style={{ width: '170px', flexShrink: 0, padding: '8px 10px', fontSize: '8pt' }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '8.5pt', marginBottom: '6px', lineHeight: 1.3, textTransform: 'uppercase' }}>
            Interpreting of<br />Grading System
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {GRADING_KEY.map(({ grade, range, remark }) => (
                <tr key={grade}>
                  <td style={{ border: BORDER, padding: '2px 5px', fontWeight: 'bold', textAlign: 'center', width: '24px', ...gradeColor(grade) }}>
                    {grade}
                  </td>
                  <td style={{ border: BORDER, padding: '2px 5px', fontSize: '7.5pt' }}>
                    {range} : {remark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '8px', fontSize: '6.5pt', color: '#777', fontStyle: 'italic', textAlign: 'center' }}>
            Computer-generated · {SCHOOL_CITY_TAGLINE}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── KG class colour names — shown on nursery & toddler cards ── */
const KG_CLASS_COLORS: Record<string, string> = {
  'KG 1':   'Blue Class',
  'KG 2':   'Pink Class',
  'KG 3':   'Peach Class',
  'Pre-KG': 'Yellow Class',
};
function kgColorName(className: string): string | null {
  return KG_CLASS_COLORS[className.trim()] ?? null;
}

/* ─── Nursery subject list — exported for grade-entry forms ─────── */
export const NURSERY_SUBJECTS = [
  'Numeracy Skills',
  'Literacy Development',
  'Phonic Skills',
  'Writing Skills',
  'Social Habit',
  'Music',
  'Cultural Subject',
  'Bible Knowledge',
  'Practice Life Exercise',
  'Sensorial',
  'General Science',
  'French',
  'Coding',
] as const;

/* ─── Basic subject list — fixed order matching physical report card ── */
export const BASIC_SUBJECTS = [
  'English Language/Verbal Reasoning',
  'Mathematics/Quantitative',
  'Basic Science',
  'Religion & National Values',
  'Agricultural Science',
  'Phonics',
  'Home Economics',
  'Cultural Subject',
  'Entrepreneurship Development',
  'Computer Science',
  'Handwriting',
  'French',
  'Music',
  'Physical and Health Education',
  'Coding',
] as const;

export const BASIC_CA_MAX   = 15;
export const BASIC_EXAM_MAX = 50;

export type BasicScores = Partial<Record<string, { ca1: number; ca2: number; exam: number; project?: number; homework?: number }>>;

export function buildBasicSubjects(scores: BasicScores): SubjectResult[] {
  // Direct raw system: scores are stored at face value (ca1 out of 15, exam out of 50, etc.)
  // No proportional scaling — 15 is 15, 10 is 10, 50 is 50. Caps prevent over-entry.
  return (BASIC_SUBJECTS as readonly string[])
    .filter(name => {
      const s = scores[name];
      return s && (s.ca1 > 0 || s.ca2 > 0 || s.exam > 0 || (s.project && s.project > 0) || (s.homework && s.homework > 0));
    })
    .map(name => {
      const s = scores[name]!;
      const ca1      = Math.min(Math.round(s.ca1  ?? 0), 15);
      const ca2      = Math.min(Math.round(s.ca2  ?? 0), 15);
      const exam     = Math.min(Math.round(s.exam ?? 0), 50);
      const project  = Math.min(Math.round(s.project  ?? 0), 10);
      const homework = Math.min(Math.round(s.homework ?? 0), 10);
      const total = ca1 + ca2 + project + homework + exam;
      return { subject: name, ca1, ca2, project, homework, exam, total, ...getNigerianGrade(total) };
    });
}

/* ─── Nursery grade helpers — exported for grade-entry forms ─────── */
export const NURSERY_CA_MAX   = 15;
export const NURSERY_EXAM_MAX = 50;

export type NurseryScores = Partial<Record<string, { ca1: number; ca2: number; exam: number; project?: number; homework?: number }>>;

export function buildNurserySubjects(scores: NurseryScores): SubjectResult[] {
  // Direct raw system: scores are stored at face value (ca1 out of 15, exam out of 50, etc.)
  // No proportional scaling — 15 is 15, 10 is 10, 50 is 50. Caps prevent over-entry.
  return (NURSERY_SUBJECTS as readonly string[])
    .filter(name => {
      const s = scores[name];
      return s && (s.ca1 > 0 || s.ca2 > 0 || s.exam > 0 || (s.project && s.project > 0) || (s.homework && s.homework > 0));
    })
    .map(name => {
      const s = scores[name]!;
      const ca1      = Math.min(Math.round(s.ca1  ?? 0), 15);
      const ca2      = Math.min(Math.round(s.ca2  ?? 0), 15);
      const exam     = Math.min(Math.round(s.exam ?? 0), 50);
      const project  = Math.min(Math.round(s.project  ?? 0), 10);
      const homework = Math.min(Math.round(s.homework ?? 0), 10);
      const total = ca1 + ca2 + project + homework + exam;
      return { subject: name, ca1, ca2, project, homework, exam, total, ...getNigerianGrade(total) };
    });
}

/* ─── NURSERY / CRECHE Result Card — "Individual Students Assessment Sheet" ── */
function NurseryResultCard({ data }: { data: ResultCardData }) {
  const { student, term, academicYear, subjects, comments, attendance, nextTerm, schoolName, visibleSubjects } = data;
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;

  const displayedNurserySubjects = visibleSubjects
    ? (NURSERY_SUBJECTS as readonly string[]).filter(n => visibleSubjects.includes(n))
    : NURSERY_SUBJECTS as readonly string[];

  const ageYears = student.dob
    ? new Date().getFullYear() - new Date(student.dob).getFullYear()
    : null;

  const scoredSubjectsForAvg = subjects.filter(s => s.total > 0);
  const avgScore = scoredSubjectsForAvg.length > 0
    ? Math.round(scoredSubjectsForAvg.reduce((s, r) => s + r.total, 0) / scoredSubjectsForAvg.length)
    : 0;

  const BORDER = '1px solid #555';
  const TH: React.CSSProperties = {
    border: BORDER, padding: '4px 3px', textAlign: 'center',
    fontWeight: 'bold', fontSize: '7.5pt', background: '#e8e8e8', lineHeight: 1.3,
  };
  const TD: React.CSSProperties = {
    border: BORDER, padding: '3px 3px', textAlign: 'center', fontSize: '8pt',
  };

  const getSubject = (name: string) =>
    subjects.find(s => s.subject.toLowerCase().trim() === name.toLowerCase().trim());

  const scoredNurserySubjects = displayedNurserySubjects.filter(n => {
    const s = getSubject(n);
    return s && s.total > 0;
  });

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9pt', color: '#000', background: '#fff', border: '2px solid #333' }}>

      {/* ── HEADER — same style as basic card ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px 6px', borderBottom: '2px solid #333' }}>
        <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
          style={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#000', lineHeight: 1.1, letterSpacing: '0.3px' }}>
            {displaySchool.toUpperCase()}
          </div>
          <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#333', marginTop: '2px' }}>
            &#9679;DAY CARE &#9679;PRE-SCHOOL &#9679;NURSERY &#9679;PRIMARY
          </div>
          <div style={{ fontSize: '7.5pt', color: '#555', marginTop: '3px' }}>
            Email: greenvillemontessoriesschools@yahoo.com
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '7.5pt', color: '#333', lineHeight: 1.5, flexShrink: 0, maxWidth: '160px' }}>
          <div>{SCHOOL_ADDRESS_LINE1},</div>
          <div>{SCHOOL_ADDRESS_LINE2}</div>
          <div>Tel: {SCHOOL_PHONE_DISPLAY}</div>
        </div>
      </div>

      {/* ── TITLE STRIP ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid #333', background: '#f5f5f5' }}>
        <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Individual Students Assessment Sheet
        </div>
        <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
          No.&nbsp;{student.studentId || ''}
        </div>
      </div>

      {/* ── STUDENT INFO ── */}
      <div style={{ padding: '5px 12px 4px', borderBottom: '1px solid #999', fontSize: '8.5pt' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name:</span>
          <span style={{ flex: 2, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{student.name}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Age:</span>
          <span style={{ width: '40px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{ageYears !== null ? `${ageYears}` : ''}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Class:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>
            {student.className}{kgColorName(student.className) ? ` · ${kgColorName(student.className)}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>No. of Times School Opened:</span>
          <span style={{ width: '40px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{attendance.totalDays || ''}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>No. of Times Present:</span>
          <span style={{ width: '40px', borderBottom: '1px solid #555', paddingLeft: '3px' }}>{attendance.daysPresent || ''}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Average Percentage:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{subjects.length > 0 ? `${avgScore}%` : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Admission No.:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{student.studentId}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Academic Session:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{academicYear}</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px' }}>Resumption Date:</span>
          <span style={{ flex: 1, borderBottom: '1px solid #555', paddingLeft: '3px' }}>{nextTerm.begins ? fmtDate(nextTerm.begins) : ''}</span>
        </div>
      </div>

      {/* ── SUBJECTS TABLE — Nursery-appropriate headers (CA1/CA2 instead of 1st CAT/2nd CAT) ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: 'left', width: '27%', padding: '5px 6px', fontSize: '9pt' }}>SUBJECTS</th>
            <th style={{ ...TH, width: '8%' }}>CA1<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>15%</span></th>
            <th style={{ ...TH, width: '8%' }}>CA2<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>15%</span></th>
            <th style={{ ...TH, width: '8%' }}>Project<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>10%</span></th>
            <th style={{ ...TH, width: '10%' }}>HW/<br />Assignment<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>10%</span></th>
            <th style={{ ...TH, width: '8%' }}>Exam<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>50%</span></th>
            <th style={{ ...TH, width: '8%', background: '#d0d0d0' }}>Total<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>100%</span></th>
            <th style={{ ...TH, width: '7%', background: '#d0d0d0' }}>Grade</th>
            <th style={{ ...TH, textAlign: 'left', padding: '5px 5px' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {scoredNurserySubjects.map((name, i) => {
            const s = getSubject(name)!;
            const { grade, remark } = getNigerianGrade(s.total);
            const gc = gradeColor(grade);
            return (
              <tr key={name} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...TD, textAlign: 'left', fontWeight: 'bold', fontSize: '8.5pt', padding: '4px 6px', textTransform: 'uppercase' }}>
                  {name}
                </td>
                <td style={TD}>{s.ca1 > 0 ? s.ca1 : ''}</td>
                <td style={TD}>{s.ca2 > 0 ? s.ca2 : ''}</td>
                <td style={TD}>{(s.project ?? 0) > 0 ? s.project : ''}</td>
                <td style={TD}>{(s.homework ?? 0) > 0 ? s.homework : ''}</td>
                <td style={TD}>{s.exam > 0 ? s.exam : ''}</td>
                <td style={{ ...TD, fontWeight: 'bold', background: '#f0f0f0' }}>{s.total}</td>
                <td style={{ ...TD, ...gc, padding: '3px 2px' }}>{grade}</td>
                <td style={{ ...TD, textAlign: 'left', fontSize: '7.5pt', padding: '3px 5px' }}>{remark}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── FOOTER — teacher remarks left | grading key right ── */}
      <div style={{ display: 'flex', borderTop: '1px solid #555' }}>
        <div style={{ flex: 1, padding: '8px 12px', fontSize: '8.5pt', borderRight: '1px solid #555' }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Class Teacher&apos;s Remarks:</div>
            <div style={{ borderBottom: '1px solid #555', minHeight: '18px', fontStyle: 'italic', paddingLeft: '4px' }}>{comments.teacher}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '2px', fontSize: '7.5pt' }}>— Class Teacher&apos;s Signature —</div>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Proprietress Remarks:</div>
            <div style={{ borderBottom: '1px solid #555', minHeight: '18px', fontStyle: 'italic', paddingLeft: '4px' }}>{comments.principal}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '2px', fontSize: '7.5pt' }}>— Proprietress Signature —</div>
            </div>
          </div>
        </div>
        <div style={{ width: '170px', flexShrink: 0, padding: '8px 10px', fontSize: '8pt' }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '8.5pt', marginBottom: '6px', lineHeight: 1.3, textTransform: 'uppercase' }}>
            Interpreting of<br />Grading System
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {GRADING_KEY.map(({ grade, range, remark }) => (
                <tr key={grade}>
                  <td style={{ border: BORDER, padding: '2px 5px', fontWeight: 'bold', textAlign: 'center', width: '24px', ...gradeColor(grade) }}>
                    {grade}
                  </td>
                  <td style={{ border: BORDER, padding: '2px 5px', fontSize: '7.5pt' }}>
                    {range} : {remark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '8px', fontSize: '6.5pt', color: '#777', fontStyle: 'italic', textAlign: 'center' }}>
            Computer-generated · {SCHOOL_CITY_TAGLINE}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PRE-KG Skills Data (shared with entry forms) ─────────── */
export const PRE_KG_SKILLS = [
  { name: 'Literacy',             col: 'left'   },
  { name: 'Understanding',        col: 'center' },
  { name: 'Obedience',            col: 'center' },
  { name: 'Care of Self',         col: 'right'  },
  { name: 'Individual Behaviour', col: 'right'  },
  { name: 'Punctuality',          col: 'left'   },
  { name: 'Numeracy',             col: 'center' },
  { name: 'Bible Studies',        col: 'right'  },
  { name: 'Creative Play',        col: 'right'  },
  { name: 'Phonics',              col: 'left'   },
  { name: 'Scribbling',           col: 'right'  },
  { name: 'Social Habit',         col: 'right'  },
] as const;

export const PRE_KG_COMMENTS: Record<string, Record<number, string>> = {
  'Literacy':             { 5: 'Reads and writes confidently', 4: 'Shows good reading skills', 3: 'Making progress in reading', 2: 'Needs more reading practice', 1: 'Struggles with basic literacy' },
  'Understanding':        { 5: 'Grasps new concepts quickly', 4: 'Understands lessons very well', 3: 'Shows fair understanding', 2: 'Needs concept reinforcement', 1: 'Finds comprehension difficult' },
  'Obedience':            { 5: 'Always follows instructions well', 4: 'Usually obeys class rules', 3: 'Generally obedient in class', 2: 'Sometimes needs correction', 1: 'Needs discipline improvement' },
  'Care of Self':         { 5: 'Excellent personal hygiene always', 4: 'Keeps self neat and tidy', 3: 'Manages self-care fairly well', 2: 'Needs reminders for hygiene', 1: 'Requires help with self-care' },
  'Individual Behaviour': { 5: 'Outstanding conduct at all times', 4: 'Behaves very well in class', 3: 'Generally good behaviour shown', 2: 'Behaviour needs improvement', 1: 'Conduct requires close attention' },
  'Punctuality':          { 5: 'Always arrives on time', 4: 'Mostly punctual and ready', 3: 'Usually arrives on time', 2: 'Occasionally late to school', 1: 'Frequently late to school' },
  'Numeracy':             { 5: 'Counts and solves with ease', 4: 'Good number recognition shown', 3: 'Developing number concepts', 2: 'Needs more numeracy practice', 1: 'Struggles with basic numbers' },
  'Bible Studies':        { 5: 'Excellent knowledge of Bible', 4: 'Good understanding of Bible', 3: 'Learning Bible stories well', 2: 'Needs more Bible engagement', 1: 'Limited Bible knowledge shown' },
  'Creative Play':        { 5: 'Highly creative and imaginative', 4: 'Engages creatively in play', 3: 'Participates in creative play', 2: 'Needs more creative engagement', 1: 'Limited creative participation' },
  'Phonics':              { 5: 'Excellent phonics and sounds', 4: 'Good phonics understanding', 3: 'Developing phonics knowledge', 2: 'Needs phonics reinforcement', 1: 'Struggles with letter sounds' },
  'Scribbling':           { 5: 'Excellent pencil control shown', 4: 'Good hand-eye coordination', 3: 'Developing fine motor skills', 2: 'Needs more writing practice', 1: 'Limited pencil grip control' },
  'Social Habit':         { 5: 'Excellent social interactions', 4: 'Interacts very well with peers', 3: 'Good social skills developing', 2: 'Needs social skills improvement', 1: 'Struggles to interact socially' },
};

export function preKgTotalToRating(total: number): number {
  if (total >= 18) return 5;
  if (total >= 14) return 4;
  if (total >= 10) return 3;
  if (total >= 6)  return 2;
  if (total > 0)   return 1;
  return 0;
}

/* ─── TODDLER PRE-KG Result Card — A4 Landscape, soft balloon design matching Yellow Class physical card ── */
function ToddlerPreKGResultCard({ data }: { data: ResultCardData }) {
  const { student, term, academicYear, comments, attendance, schoolName, schoolAddress } = data;
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;
  const displayAddr = (schoolAddress || '').trim() || `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`;

  const NAVY = '#1a237e';
  const GOLD = '#f9a825';

  const getRating = (skillName: string): string => {
    const match = data.subjects.find(s => s.subject.trim() === skillName);
    if (!match || match.total === 0) return '';
    const rating = preKgTotalToRating(match.total);
    return PRE_KG_COMMENTS[skillName]?.[rating] || '';
  };

  const attendancePct = attendance.totalDays > 0
    ? Math.round((attendance.daysPresent / attendance.totalDays) * 100)
    : null;

  const ageYears = student.dob
    ? new Date().getFullYear() - new Date(student.dob).getFullYear()
    : null;

  // Soft pastel balloon colors — matching the physical Yellow Class card [highlight, mid, dark]
  const BALLOON_COLORS: [string, string, string][] = [
    ['#FFD0E5', '#FF80B3', '#CC1166'],  // 0 Rose Pink      — Literacy
    ['#C8E4FF', '#5B9BD5', '#1A4488'],  // 1 Sky Blue       — Understanding
    ['#FFD5C5', '#FF8866', '#CC3300'],  // 2 Soft Coral     — Obedience
    ['#C0EAFF', '#44BBEE', '#0055AA'],  // 3 Light Blue     — Care of Self
    ['#FFF5C0', '#FFCC44', '#AA8800'],  // 4 Pale Yellow    — Individual Behaviour
    ['#FFDDEF', '#FF99CC', '#CC3377'],  // 5 Blush Pink     — Punctuality
    ['#D5E0FF', '#7788CC', '#2233AA'],  // 6 Periwinkle     — Numeracy
    ['#FFD0DC', '#FF9999', '#CC2244'],  // 7 Soft Rose      — Bible Studies
    ['#FFE8C8', '#FFBB66', '#BB6600'],  // 8 Soft Peach     — Creative Play
    ['#FFCCEC', '#FF88CC', '#BB0077'],  // 9 Soft Magenta   — Phonics
    ['#BCEAEA', '#44AAAA', '#006677'],  // 10 Soft Teal     — Scribbling
    ['#FFD8E8', '#FF99BB', '#BB2255'],  // 11 Soft Pink     — Social Habit
  ];

  const SKILL_EMOJIS: Record<string, string> = {
    'Literacy':             '📚',
    'Understanding':        '🧠',
    'Obedience':            '🤝',
    'Care of Self':         '🧼',
    'Individual Behaviour': '🌟',
    'Punctuality':          '⏰',
    'Numeracy':             '🔢',
    'Bible Studies':        '⛪',
    'Creative Play':        '🎨',
    'Phonics':              '🗣️',
    'Scribbling':           '✏️',
    'Social Habit':         '🤗',
  };

  const Balloon = ({ skillName, colorIdx }: { skillName: string; colorIdx: number }) => {
    const [hi, mid, dark] = BALLOON_COLORS[colorIdx % BALLOON_COLORS.length];
    const comment = getRating(skillName);
    const emoji = SKILL_EMOJIS[skillName] || '🎈';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Balloon body — teardrop oval taller than wide */}
        <div style={{
          position: 'relative',
          width: '90px',
          height: '110px',
          borderRadius: '50% 50% 45% 45% / 55% 55% 48% 48%',
          background: `radial-gradient(ellipse at 36% 26%, ${hi} 0%, ${mid} 50%, ${dark} 100%)`,
          boxShadow: `2px 5px 12px rgba(0,0,0,0.18), inset -3px -4px 8px rgba(0,0,0,0.09)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 6px 16px',
          overflow: 'hidden',
        }}>
          {/* Primary shine spot */}
          <div style={{
            position: 'absolute', top: '10px', left: '16px',
            width: '24px', height: '15px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.75)',
            transform: 'rotate(-22deg)',
            pointerEvents: 'none',
          }} />
          {/* Secondary shine dot */}
          <div style={{
            position: 'absolute', top: '21px', left: '25px',
            width: '9px', height: '6px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.45)',
            pointerEvents: 'none',
          }} />

          {/* Emoji */}
          <div style={{ fontSize: '15pt', marginBottom: '2px', zIndex: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}>
            {emoji}
          </div>

          {/* Skill label */}
          <div style={{
            fontWeight: 'bold', fontSize: '7.5pt', color: '#fff',
            fontFamily: "'Fredoka', sans-serif",
            textAlign: 'center', lineHeight: 1.2, zIndex: 1,
            textShadow: '0 1px 3px rgba(0,0,0,0.55)',
            marginBottom: comment ? '2px' : 0,
          }}>
            {skillName}
          </div>
          {comment && (
            <div style={{
              fontSize: '5.5pt', color: 'rgba(255,255,255,0.95)',
              fontFamily: "'Fredoka', sans-serif",
              textAlign: 'center', fontStyle: 'italic',
              lineHeight: 1.15, zIndex: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            }}>
              {comment}
            </div>
          )}
        </div>
        {/* Knot — small triangle at balloon tip */}
        <div style={{
          width: 0, height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `7px solid ${dark}`,
        }} />
        {/* Curvy string using SVG */}
        <svg width="16" height="22" viewBox="0 0 16 22" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M8,0 Q3,7 8,14 Q13,21 8,22" stroke={dark} strokeWidth="1.3" fill="none" opacity="0.55" />
        </svg>
      </div>
    );
  };

  // 3-row layout matching physical card: 5 top | 2+child+2 middle | 1+2 bottom
  // Soft pastel rainbow
  const RAINBOW = ['#ffaad4', '#ffbb88', '#ffee88', '#aaddaa', '#99bbee', '#cc99ee'];

  return (
    <div style={{
      fontFamily: "'Fredoka', 'Arial', sans-serif",
      fontSize: '10pt',
      color: '#000',
      background: '#fff',
      border: `3px solid ${NAVY}`,
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background clouds and sun */}
      <div style={{ position: 'absolute', top: '10px', right: '110px', opacity: 0.12, pointerEvents: 'none' }}>
        <svg width="70" height="70" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="25" fill="#FFD700" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="15"
              x2="50"
              y2="5"
              stroke="#FFD700"
              strokeWidth="6"
              strokeLinecap="round"
              transform={`rotate(${i * 45} 50 50)`}
            />
          ))}
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '160px', left: '40px', opacity: 0.08, pointerEvents: 'none' }}>
        <svg width="85" height="50" viewBox="0 0 120 80">
          <path d="M 20 60 A 20 20 0 0 1 30 20 A 25 25 0 0 1 70 10 A 25 25 0 0 1 95 35 A 20 20 0 0 1 100 60 Z" fill="#0288d1" />
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '220px', right: '60px', opacity: 0.08, pointerEvents: 'none' }}>
        <svg width="95" height="55" viewBox="0 0 120 80">
          <path d="M 20 60 A 20 20 0 0 1 30 20 A 25 25 0 0 1 70 10 A 25 25 0 0 1 95 35 A 20 20 0 0 1 100 60 Z" fill="#0288d1" />
        </svg>
      </div>

      {/* Header — white background matching the original physical card */}
      <div style={{ background: '#fff', padding: '10px 14px 6px', borderBottom: `1px solid #ddd` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo — LEFT only, as on the original card */}
          <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
            style={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0 }} />

          {/* School info — centred */}
          <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontSize: '19pt', fontWeight: 'bold', color: NAVY, letterSpacing: '0.5px' }}>
              {displaySchool.toUpperCase()}
            </div>
            <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#444', marginTop: '2px', letterSpacing: '1px' }}>
              &#9670;DAY CARE &#9670;PRE-SCHOOL &#9670;NURSERY &#9670;PRIMARY
            </div>
            <div style={{ fontSize: '7.5pt', color: '#555', marginTop: '2px' }}>
              {displayAddr}
            </div>
          </div>

          {/* Card serial number — top-right, as on the physical card */}
          <div style={{
            border: `2px solid ${NAVY}`, borderRadius: '6px',
            padding: '3px 10px', fontSize: '11pt', fontWeight: 'bold',
            color: NAVY, minWidth: '55px', textAlign: 'center', flexShrink: 0,
            background: '#fff',
          }}>
            {student.studentId || ''}
          </div>
        </div>
      </div>

      {/* Rainbow stripe */}
      <div style={{ display: 'flex', height: '6px' }}>
        {RAINBOW.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>

      {/* Title Banner — matches "TODDLERS'S PRE-KG REPORT" on the physical card */}
      <div style={{
        background: 'linear-gradient(90deg, #fff0f8 0%, #fff9e6 50%, #f0f4ff 100%)',
        textAlign: 'center', padding: '6px 0',
        fontSize: '13pt', fontWeight: 'bold', letterSpacing: '3px',
        color: NAVY, borderBottom: `2px solid ${GOLD}`,
      }}>
        🎈 TODDLERS&apos;S PRE-KG REPORT 🎈
      </div>

      {/* Student Info — matches original: row 1: TERM | CLASS | RESUMPTION DATE | ADMISSION NO, row 2: NAME | AGE */}
      <div style={{ background: '#fffde7', padding: '6px 16px', borderBottom: `1px solid ${GOLD}` }}>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr', gap: '6px 16px', marginBottom: '5px' }}>
          {[
            ['TERM',            term],
            ['CLASS',           `${student.className}${kgColorName(student.className) ? ` · ${kgColorName(student.className)}` : ''}`],
            ['RESUMPTION DATE', nextTerm.begins ? fmtDate(nextTerm.begins) : ''],
            ['ADMISSION NO.',   student.studentId],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '6.5pt', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ flex: 1, borderBottom: `1px solid ${NAVY}`, fontSize: '9pt', fontWeight: 'bold', color: '#111', paddingLeft: '4px', minWidth: '40px' }}>{val}</span>
            </div>
          ))}
        </div>
        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '6px 16px' }}>
          {[
            ['NAME', student.name],
            ['AGE',  ageYears !== null ? `${ageYears} yr${ageYears !== 1 ? 's' : ''}` : ''],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '6.5pt', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ flex: 1, borderBottom: `1px solid ${NAVY}`, fontSize: '9pt', fontWeight: 'bold', color: '#111', paddingLeft: '4px', minWidth: '60px' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Balloon Section — 3 rows matching physical Yellow Class card ── */}
      <div style={{ background: 'linear-gradient(160deg, #FFF5F9 0%, #FFEBF4 50%, #FFF9FC 100%)', padding: '10px 16px 6px' }}>

        {/* Row 1 — 5 balloons across the top: Literacy, Understanding, Obedience, Care of Self, Individual Behaviour */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: '4px' }}>
          <Balloon skillName={PRE_KG_SKILLS[0].name} colorIdx={0} />
          <Balloon skillName={PRE_KG_SKILLS[1].name} colorIdx={1} />
          <Balloon skillName={PRE_KG_SKILLS[2].name} colorIdx={2} />
          <Balloon skillName={PRE_KG_SKILLS[3].name} colorIdx={3} />
          <Balloon skillName={PRE_KG_SKILLS[4].name} colorIdx={4} />
        </div>

        {/* Row 2 — Punctuality, Numeracy | child figure | Bible Studies, Creative Play */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: '4px' }}>
          <Balloon skillName={PRE_KG_SKILLS[5].name} colorIdx={5} />
          <Balloon skillName={PRE_KG_SKILLS[6].name} colorIdx={6} />

          {/* Cute cartoon child figure */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '4px', position: 'relative' }}>
            <svg width="70" height="85" viewBox="0 0 80 100" style={{ display: 'block', overflow: 'visible' }}>
              {/* Head */}
              <circle cx="40" cy="22" r="13" fill="#ffdbb5" />
              {/* Hair */}
              <path d="M 23 22 Q 40 5 57 22 Q 40 10 23 22" fill="#5c2e0b" />
              <circle cx="28" cy="14" r="5" fill="#5c2e0b" />
              <circle cx="52" cy="14" r="5" fill="#5c2e0b" />
              {/* Eyes */}
              <circle cx="35" cy="20" r="1.5" fill="#333" />
              <circle cx="45" cy="20" r="1.5" fill="#333" />
              {/* Smiling mouth */}
              <path d="M 36 26 Q 40 31 44 26" stroke="#cc3300" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Rosy cheeks */}
              <circle cx="31" cy="23" r="2.5" fill="#ff9999" opacity="0.75" />
              <circle cx="49" cy="23" r="2.5" fill="#ff9999" opacity="0.75" />
              {/* Dress */}
              <path d="M 32 35 L 18 70 L 62 70 L 48 35 Z" fill="#ff4081" />
              {/* White collar */}
              <path d="M 32 35 Q 40 40 48 35 Q 40 37 32 35" fill="#fff" />
              {/* Star emblem on dress */}
              <path d="M 40 46 L 42 51 L 47 51 L 43 54 L 45 59 L 40 56 L 35 59 L 37 54 L 33 51 L 38 51 Z" fill="#ffeb3b" />
              {/* Arms holding strings */}
              <line x1="28" y1="42" x2="6" y2="30" stroke="#ffdbb5" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="52" y1="42" x2="74" y2="30" stroke="#ffdbb5" strokeWidth="3.5" strokeLinecap="round" />
              {/* Legs and shoes */}
              <line x1="33" y1="70" x2="33" y2="88" stroke="#ffdbb5" strokeWidth="4" strokeLinecap="round" />
              <line x1="47" y1="70" x2="47" y2="88" stroke="#ffdbb5" strokeWidth="4" strokeLinecap="round" />
              {/* Shoes */}
              <path d="M 28 88 C 28 84, 38 84, 38 88 Z" fill="#c2185b" />
              <path d="M 42 88 C 42 84, 52 84, 52 88 Z" fill="#c2185b" />
            </svg>
            <div style={{ fontSize: '6.5pt', color: NAVY, fontWeight: 'bold', fontFamily: "'Fredoka', sans-serif", textAlign: 'center', marginTop: '3px', lineHeight: 1.2 }}>
              🌟 {SCHOOL_CITY_TAGLINE} 🌟
            </div>
          </div>

          <Balloon skillName={PRE_KG_SKILLS[7].name} colorIdx={7} />
          <Balloon skillName={PRE_KG_SKILLS[8].name} colorIdx={8} />
        </div>

        {/* Row 3 — Phonics (left) | space | Scribbling + Social Habit (right) */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Balloon skillName={PRE_KG_SKILLS[9].name} colorIdx={9} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            <Balloon skillName={PRE_KG_SKILLS[10].name} colorIdx={10} />
            <Balloon skillName={PRE_KG_SKILLS[11].name} colorIdx={11} />
          </div>
        </div>
      </div>

      {/* Rating Key */}
      <div style={{ background: '#fdf0f7', padding: '4px 16px', borderTop: `1px solid #e8d0e0`, borderBottom: `2px solid ${NAVY}`, display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '7pt', alignItems: 'center' }}>
        <strong style={{ color: NAVY, fontFamily: "'Fredoka', sans-serif" }}>RATING KEY:</strong>
        {[
          ['5 — Excellent',         '#FF80B3', '#fff'],
          ['4 — Very Good',         '#5B9BD5', '#fff'],
          ['3 — Good',              '#44AAAA', '#fff'],
          ['2 — Fair',              '#FFCC44', '#222'],
          ['1 — Needs Improvement', '#FF8866', '#fff'],
        ].map(([label, bg, color]) => (
          <span key={label} style={{ background: bg, color, padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold', fontFamily: "'Fredoka', sans-serif" }}>
            {label}
          </span>
        ))}
      </div>

      {/* Footer — matches physical card: Teacher | Attendance | Proprietress | Total/Average */}
      <div style={{ padding: '8px 16px 10px', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '16px', alignItems: 'start' }}>

          {/* Teacher Comment */}
          <div>
            <div style={{ fontWeight: 'bold', color: NAVY, fontSize: '8pt', marginBottom: '4px', fontFamily: "'Fredoka', sans-serif" }}>Class Teacher&apos;s Comment:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '22px', fontSize: '9pt', fontStyle: 'italic', paddingLeft: '4px', lineHeight: '22px' }}>
              {comments.teacher}
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ borderTop: `1px solid ${NAVY}`, paddingTop: '2px', fontSize: '7pt', fontWeight: 'bold', color: NAVY }}>Signature &amp; Date</div>
            </div>
          </div>

          {/* Attendance — labels matching physical card exactly */}
          <div style={{ fontSize: '7.5pt' }}>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>No. of times school opened:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '9pt', paddingLeft: '4px', fontWeight: 'bold' }}>
                {attendance.totalDays || ''}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>No. of times absent:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '9pt', paddingLeft: '4px', fontWeight: 'bold' }}>
                {attendance.daysAbsent || ''}
              </div>
            </div>
            {attendancePct !== null && (
              <div style={{ marginTop: '4px', fontSize: '7.5pt', color: '#555', fontWeight: 'bold' }}>Attendance: {attendancePct}%</div>
            )}
          </div>

          {/* Proprietress Comment */}
          <div>
            <div style={{ fontWeight: 'bold', color: NAVY, fontSize: '8pt', marginBottom: '4px', fontFamily: "'Fredoka', sans-serif" }}>Proprietress Comment:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '22px', fontSize: '9pt', fontStyle: 'italic', paddingLeft: '4px', lineHeight: '22px' }}>
              {comments.principal}
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ borderTop: `1px solid ${NAVY}`, paddingTop: '2px', fontSize: '7pt', fontWeight: 'bold', color: NAVY }}>Signature &amp; Date</div>
            </div>
          </div>

          {/* Total / Average — matches physical card right column */}
          <div style={{ fontSize: '7.5pt' }}>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>Total</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '9pt', paddingLeft: '4px', fontWeight: 'bold' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>Average</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '9pt', paddingLeft: '4px', fontWeight: 'bold' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom rainbow stripe */}
      <div style={{ display: 'flex', height: '5px' }}>
        {RAINBOW.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>
      <div style={{ background: '#fdf0f7', padding: '3px 16px', fontSize: '7pt', color: '#777', textAlign: 'right', fontStyle: 'italic' }}>
        Computer-generated — {displaySchool}, {SCHOOL_CITY_TAGLINE}
      </div>
    </div>
  );
}

/* ─── Bare card body — used for bulk printing (no preview wrapper) ── */
export function CardPrintContent({ data }: { data: ResultCardData }) {
  const level = data.student.classLevel ?? '';
  if (level === 'toddler') return <ToddlerPreKGResultCard data={data} />;
  if (level === 'creche')  return <NurseryResultCard data={data} />;
  return <PrimaryResultCard data={data} />;
}

/* ─── Main Export ────────────────────────────────────────────── */
interface Props {
  data: ResultCardData;
  onPrint: () => void;
}

function ResultCard({ data, onPrint }: Props) {
  const level = data.student.classLevel ?? '';
  const isToddler = level === 'toddler';
  const isNursery = level === 'creche';

  const handlePrint = () => {
    if (isToddler || isNursery) {
      printResultCard(data.student.name, true);
    } else {
      onPrint();
    }
  };

  const renderCard = () => {
    if (isToddler) return <ToddlerPreKGResultCard data={data} />;
    if (isNursery) return <NurseryResultCard data={data} />;
    return <PrimaryResultCard data={data} />;
  };

  return (
    <>
      <div className="flex justify-end mb-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* A4 preview wrapper — landscape for toddler, portrait for all others */}
      <div style={{ background: '#e0e0e0', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
        <div
          id={RESULT_CARD_PRINT_DOM_ID}
          style={{
            width: (isToddler || isNursery) ? '297mm' : '100%',
            maxWidth: (isToddler || isNursery) ? '297mm' : '210mm',
            minHeight: (isToddler || isNursery) ? '210mm' : '297mm',
            background: '#fff',
            margin: '0 auto',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          {renderCard()}
        </div>
      </div>
    </>
  );
}

export default React.memo(ResultCard);
