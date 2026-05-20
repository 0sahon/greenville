import React from 'react';
import { Printer } from 'lucide-react';
import {
  DATE_LOCALE,
  RESULT_CARD_PRINT_DOM_ID,
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_CITY_TAGLINE,
  SCHOOL_LOGO_PATH,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
} from '../../../config/schoolBrand';

/* ─── Nigerian Grading Scale ────────────────────────────────── */
export function getNigerianGrade(total: number): { grade: string; remark: string } {
  if (total >= 75) return { grade: 'A1', remark: 'Excellent' };
  if (total >= 70) return { grade: 'B2', remark: 'Very Good' };
  if (total >= 65) return { grade: 'B3', remark: 'Good' };
  if (total >= 60) return { grade: 'C4', remark: 'Credit' };
  if (total >= 55) return { grade: 'C5', remark: 'Credit' };
  if (total >= 50) return { grade: 'C6', remark: 'Credit' };
  if (total >= 45) return { grade: 'D7', remark: 'Pass' };
  if (total >= 40) return { grade: 'E8', remark: 'Pass' };
  return { grade: 'F9', remark: 'Failure' };
}

function gradeColor(grade: string): React.CSSProperties {
  if (grade.startsWith('A')) return { background: '#bbf7d0', color: '#14532d', fontWeight: 'bold' };
  if (grade.startsWith('B')) return { background: '#bfdbfe', color: '#1e3a8a', fontWeight: 'bold' };
  if (grade.startsWith('C')) return { background: '#fef08a', color: '#713f12', fontWeight: 'bold' };
  if (grade.startsWith('D')) return { background: '#fed7aa', color: '#7c2d12', fontWeight: 'bold' };
  return { background: '#fecaca', color: '#7f1d1d', fontWeight: 'bold' };
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
<style>
  @page { size: ${pageSize}; margin: 6mm 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; }
  img { max-width: 100%; }
</style>
</head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

/* ─── PRIMARY / BASIC Result Card ───────────────────────────── */
function PrimaryResultCard({ data }: { data: ResultCardData }) {
  const { student, term, academicYear, subjects, classStats, attendance, comments, nextTerm, schoolName, schoolAddress } = data;
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;
  const displayAddr =
    (schoolAddress || '').trim() || `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`;

  const grandTotal = subjects.reduce((s, r) => s + r.total, 0);
  const maxPossible = subjects.length * 100;
  const avgPercent = subjects.length > 0
    ? ((grandTotal / maxPossible) * 100).toFixed(1)
    : '0.0';
  const overallGrade = subjects.length > 0
    ? getNigerianGrade(Math.round(grandTotal / subjects.length))
    : { grade: '—', remark: '—' };

  const attendancePct = attendance.totalDays > 0
    ? Math.round((attendance.daysPresent / attendance.totalDays) * 100)
    : null;

  const MIN_ROWS = 12;
  const emptyRows = Math.max(0, MIN_ROWS - subjects.length);

  // Colour palette — neutrals used for fills so B&W printing looks clean
  const NAVY   = '#1a237e';
  const GOLD   = '#f59e0b';   // kept only for accent lines/borders
  const LGOLD  = '#f3f4f6';   // was #fef3c7 — now neutral light gray
  const LNAVY  = '#eeeef2';   // was #e8eaf6 — now neutral near-white

  return (
    /* ── Outer frame: single navy border ties everything together ── */
    <div style={{
      fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#000', background: '#fff',
      border: `2px solid ${NAVY}`,
    }}>

      {/* ── Header ── */}
      <div style={{ background: NAVY, color: '#fff', padding: '10px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
            style={{ width: 60, height: 60, objectFit: 'contain', background: '#fff', borderRadius: '6px', padding: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '18pt', fontWeight: 'bold', letterSpacing: '0.5px', lineHeight: 1.2 }}>
              {displaySchool.toUpperCase()}
            </div>
            <div style={{ fontSize: '8.5pt', color: '#fff', marginTop: '2px' }}>
              {displayAddr.toUpperCase()}
            </div>
          </div>
          <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
            style={{ width: 60, height: 60, objectFit: 'contain', background: '#fff', borderRadius: '6px', padding: '2px', flexShrink: 0 }} />
        </div>
      </div>

      {/* ── Title Banner — white bg, navy text, bold borders (B&W safe) ── */}
      <div style={{
        background: '#fff', textAlign: 'center', padding: '5px 0',
        fontSize: '11pt', fontWeight: 'bold', letterSpacing: '2px', color: NAVY,
        borderTop: `3px solid ${GOLD}`, borderBottom: `3px solid ${GOLD}`,
      }}>
        ★ &nbsp; STUDENT REPORT CARD / RESULT SHEET &nbsp; ★
      </div>

      {/* ── Student Info Block ── */}
      <div style={{ background: LNAVY, padding: '8px 14px', borderBottom: `2px solid ${NAVY}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
          {[
            ['Student Name', student.name],
            ['Class', student.className],
            ['Sex', student.gender ? (student.gender.charAt(0).toUpperCase() + student.gender.slice(1)) : '—'],
            ['Academic Session', academicYear],
            ['Term', term],
            ['Attendance',
              attendancePct !== null
                ? `${attendance.daysPresent}/${attendance.totalDays} days (${attendancePct}%)`
                : (classStats.totalStudents > 0 ? `Class of ${classStats.totalStudents}` : '—')
            ],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '3px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9pt', minWidth: '110px', flexShrink: 0, color: NAVY }}>{label}:</span>
              <span style={{ flex: 1, borderBottom: `1px solid #9fa8da`, paddingLeft: '3px', fontSize: '10pt' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Academic Performance section label ── */}
      <div style={{
        background: NAVY, color: '#fff', padding: '5px 14px',
        fontSize: '9.5pt', fontWeight: 'bold', letterSpacing: '0.5px',
      }}>
        ACADEMIC PERFORMANCE
      </div>

      {/* ── Academic Table — full width, no side padding ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#3949ab', color: '#fff', fontSize: '8.5pt' }}>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 6px', textAlign: 'left', width: '26%' }}>SUBJECTS</th>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 4px', textAlign: 'center', width: '9%' }}>
              HOME WORK<br /><span style={{ fontSize: '7.5pt', opacity: 0.8 }}>/20</span>
            </th>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 4px', textAlign: 'center', width: '9%' }}>
              1 C.A<br /><span style={{ fontSize: '7.5pt', opacity: 0.8 }}>/20</span>
            </th>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 4px', textAlign: 'center', width: '9%' }}>
              2nd C.A<br /><span style={{ fontSize: '7.5pt', opacity: 0.8 }}>/20</span>
            </th>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 4px', textAlign: 'center', width: '12%' }}>
              EXAMINATION<br /><span style={{ fontSize: '7.5pt', opacity: 0.8 }}>/60</span>
            </th>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 4px', textAlign: 'center', width: '10%', background: NAVY }}>
              TOTAL<br /><span style={{ fontSize: '7.5pt', opacity: 0.8 }}>/100</span>
            </th>
            <th style={{ border: `1px solid #5c6bc0`, padding: '5px 4px', textAlign: 'center', width: '10%', background: NAVY }}>
              GRADE
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s, i) => {
            const { grade } = getNigerianGrade(s.total);
            const gc = gradeColor(grade);
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f5f7ff' }}>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px 6px', textTransform: 'uppercase', fontWeight: 600, fontSize: '9pt' }}>
                  {s.subject}
                </td>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px', textAlign: 'center', fontSize: '9.5pt' }}>
                  {s.homework !== undefined ? s.homework : ''}
                </td>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px', textAlign: 'center', fontSize: '9.5pt' }}>
                  {s.ca1 > 0 ? s.ca1 : ''}
                </td>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px', textAlign: 'center', fontSize: '9.5pt' }}>
                  {s.ca2 > 0 ? s.ca2 : ''}
                </td>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px', textAlign: 'center', fontSize: '9.5pt' }}>
                  {s.exam > 0 ? s.exam : ''}
                </td>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', background: s.total > 0 ? LGOLD : '#fff' }}>
                  {s.total > 0 ? s.total : ''}
                </td>
                <td style={{ border: '1px solid #d0d0d0', padding: '4px', textAlign: 'center', fontSize: '9pt', ...gc }}>
                  {s.total > 0 ? grade : ''}
                </td>
              </tr>
            );
          })}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`e${i}`} style={{ background: (subjects.length + i) % 2 === 0 ? '#fff' : '#f5f7ff' }}>
              <td style={{ border: '1px solid #d0d0d0', padding: '4px 6px' }}>&nbsp;</td>
              {Array(6).fill(0).map((__, j) => <td key={j} style={{ border: '1px solid #d0d0d0', padding: '4px' }}>&nbsp;</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Grand Total row — flush right, no padding wrapper ── */}
      <div style={{ borderTop: `2px solid ${NAVY}`, display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ borderCollapse: 'collapse', width: '260px' }}>
          <tbody>
            <tr>
              <td style={{ border: `1px solid ${NAVY}`, padding: '4px 10px', background: LNAVY, fontWeight: 'bold', fontSize: '9.5pt', color: NAVY }}>
                Grand Total
              </td>
              <td style={{ border: `1px solid ${NAVY}`, padding: '4px 10px', background: LGOLD, fontWeight: 'bold', fontSize: '11pt', color: NAVY, textAlign: 'center', width: '70px' }}>
                {grandTotal}
              </td>
            </tr>
            <tr>
              <td style={{ border: `1px solid ${NAVY}`, padding: '4px 10px', background: '#f9fafb', fontWeight: 'bold', fontSize: '9.5pt' }}>
                Average Score
              </td>
              <td style={{ border: `1px solid ${NAVY}`, padding: '4px 10px', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', color: NAVY }}>
                {avgPercent}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: `2px solid ${NAVY}`, padding: '10px 14px 8px', background: '#fff' }}>

        {/* Overall Result — neutral border, no yellow fill */}
        <div style={{ marginBottom: '10px', fontSize: '9.5pt' }}>
          <span style={{ padding: '4px 12px', background: LGOLD, border: `1px solid #bbb`, borderRadius: '4px', display: 'inline-block' }}>
            <strong>Overall Result:</strong>{' '}
            {avgPercent}%{' '}—{' '}
            <span style={{ ...gradeColor(overallGrade.grade), padding: '2px 7px', borderRadius: '4px' }}>{overallGrade.grade}</span>
            {' '}—{' '}{overallGrade.remark}
          </span>
        </div>

        {/* Next Term Resumption — neutral fill */}
        {nextTerm.begins && (
          <div style={{ marginBottom: '12px', padding: '5px 12px', background: LNAVY, border: `1px solid #bbb`, borderRadius: '4px', fontSize: '9.5pt', display: 'inline-block' }}>
            <strong style={{ color: NAVY }}>Next Term Resumption:</strong>{' '}
            <span style={{ color: '#333', fontWeight: 'bold' }}>{fmtDate(nextTerm.begins)}</span>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: `1px solid #d0d0d0`, margin: '8px 0' }} />

        {/* Remarks */}
        <div style={{ fontSize: '9.5pt' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '5px' }}>Class Teacher's Remark:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '26px', paddingLeft: '6px', fontStyle: 'italic', lineHeight: '26px' }}>
              {comments.teacher}
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '5px' }}>Proprietress Remark:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '26px', paddingLeft: '6px', fontStyle: 'italic', lineHeight: '26px' }}>
              {comments.principal}
            </div>
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{ minHeight: '36px' }} />
            <div style={{ borderTop: `2px solid ${NAVY}`, paddingTop: '4px', fontSize: '9pt', fontWeight: 'bold', color: NAVY }}>
              Proprietress' Signature &amp; Date
            </div>
          </div>
        </div>
      </div>

      {/* ── Grading Key ── */}
      <div style={{
        padding: '5px 14px', background: '#f1f5f9',
        borderTop: `2px solid ${NAVY}`,
        display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '7.5pt', alignItems: 'center',
      }}>
        <strong style={{ color: NAVY, marginRight: '4px' }}>KEY:</strong>
        {[
          { g: 'A1', label: '75–100: Excellent', style: { background: '#bbf7d0', color: '#14532d' } },
          { g: 'B2/B3', label: '65–74: Good', style: { background: '#bfdbfe', color: '#1e3a8a' } },
          { g: 'C4–C6', label: '50–64: Credit', style: { background: '#fef08a', color: '#713f12' } },
          { g: 'D7/E8', label: '40–49: Pass', style: { background: '#fed7aa', color: '#7c2d12' } },
          { g: 'F9', label: 'Below 40: Failure', style: { background: '#fecaca', color: '#7f1d1d' } },
        ].map(k => (
          <span key={k.g} style={{ ...k.style, padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
            {k.g}: {k.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: '#999', fontStyle: 'italic' }}>
          Computer-generated — {displaySchool}, {SCHOOL_CITY_TAGLINE}
        </span>
      </div>
    </div>
  );
}

/* ─── NURSERY / CRECHE Result Card ──────────────────────────── */
function NurseryResultCard({ data }: { data: ResultCardData }) {
  const { student, term, academicYear, behavior, comments, attendance, schoolName, schoolAddress } = data;
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;
  const displayAddr =
    (schoolAddress || '').trim() || `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`;

  const SKILL_COMMENT: Record<number, string> = {
    5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Fair', 1: 'Needs Improvement',
  };

  const attendancePct = attendance.totalDays > 0
    ? Math.round((attendance.daysPresent / attendance.totalDays) * 100)
    : null;

  const nurserySkills = [
    'NUMERACY', 'LITERACY', 'SOCIAL SKILLS', 'SCIENCE',
    'SENSORIAL', 'PRACTICAL LIFE', 'CREATIVE ART', 'C.R.S',
  ];

  const personalityTraits = [
    { trait: 'Friendly and courteous',                  value: behavior.politeness },
    { trait: 'Punctual',                                value: behavior.punctuality },
    { trait: 'Says "Please", "Thank you", "Sorry"',     value: behavior.honesty },
    { trait: 'Shares and takes turns',                  value: behavior.cooperation },
    { trait: 'Cooperates with others in the classroom', value: behavior.attentiveness },
    { trait: 'Interacts with a smile, wave, a nod',     value: behavior.neatness },
  ];

  const NAVY  = '#1a237e';
  const GOLD  = '#f59e0b';
  const LGOLD = '#fffde7';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#000', background: '#fff' }}>

      {/* Header */}
      <div style={{ border: `2px solid ${NAVY}`, background: LGOLD, marginBottom: '10px', padding: '6px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={SCHOOL_LOGO_PATH} alt={displaySchool} style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '18pt', fontWeight: 'bold', color: NAVY, letterSpacing: '1px' }}>{displaySchool.toUpperCase()}</div>
            <div style={{ fontSize: '9pt', color: '#c62828', fontWeight: 'bold', marginTop: '2px' }}>RESULT SHEET</div>
            <div style={{ fontSize: '8.5pt', color: '#555', marginTop: '2px' }}>{displayAddr}</div>
          </div>
        </div>
        {/* Gold stripe */}
        <div style={{ height: '4px', background: GOLD, marginTop: '6px', borderRadius: '2px' }} />
      </div>

      {/* Student info */}
      <div style={{ marginBottom: '12px', padding: '0 4px' }}>
        {([
          ['NAME OF STUDENT', student.name],
          ['CLASS', student.className],
          ['SESSION', academicYear],
          ['TERM', term],
          ...(attendancePct !== null ? [['ATTENDANCE', `${attendance.daysPresent}/${attendance.totalDays} days (${attendancePct}%)`]] : []),
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '6px', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', minWidth: '160px', fontSize: '9.5pt', flexShrink: 0, color: NAVY }}>{label}:</span>
            <span style={{ flex: 1, borderBottom: `1px solid ${NAVY}`, minHeight: '16px', paddingLeft: '4px' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Skills & Abilities */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <th style={{ background: NAVY, color: '#fff', border: `1px solid ${NAVY}`, padding: '6px 8px', textAlign: 'left', width: '60%' }}>
              SKILLS &amp; ABILITIES
            </th>
            <th style={{ background: GOLD, color: NAVY, border: `1px solid ${NAVY}`, padding: '6px 8px', fontWeight: 'bold' }}>
              COMMENTS
            </th>
          </tr>
        </thead>
        <tbody>
          {nurserySkills.map((skill, i) => {
            const match = data.subjects.find(s =>
              s.subject.toUpperCase().replace(/\s/g, '') === skill.replace(/\s/g, '') ||
              s.subject.toUpperCase().includes(skill.split(' ')[0])
            );
            const comment = match ? getNigerianGrade(match.total).remark : '';
            return (
              <tr key={skill} style={{ background: i % 2 === 0 ? '#fff' : LGOLD }}>
                <td style={{ border: '1px solid #ccc', padding: '7px 8px', fontWeight: 600 }}>{skill}</td>
                <td style={{ border: '1px solid #ccc', padding: '7px 8px' }}>{comment}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Personality & Character */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <th style={{ background: NAVY, color: '#fff', border: `1px solid ${NAVY}`, padding: '6px 8px', textAlign: 'left', width: '65%' }}>
              PERSONALITY AND CHARACTER
            </th>
            <th style={{ background: GOLD, color: NAVY, border: `1px solid ${NAVY}`, padding: '6px 8px', fontWeight: 'bold' }}>
              COMMENTS
            </th>
          </tr>
        </thead>
        <tbody>
          {personalityTraits.map(({ trait, value }, i) => (
            <tr key={trait} style={{ background: i % 2 === 0 ? '#fff' : LGOLD }}>
              <td style={{ border: '1px solid #ccc', padding: '7px 8px' }}>{trait}</td>
              <td style={{ border: '1px solid #ccc', padding: '7px 8px' }}>{value ? SKILL_COMMENT[value] || '' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks */}
      <div style={{ fontSize: '10pt', marginBottom: '10px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', color: NAVY, minWidth: '160px' }}>Class teachers remark:</span>
          <span style={{ flex: 1, borderBottom: '1px dotted #555', minHeight: '16px', paddingLeft: '4px', fontStyle: 'italic' }}>
            {comments.teacher}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', color: NAVY, minWidth: '160px' }}>Proprietress Remark:</span>
          <span style={{ flex: 1, borderBottom: '1px dotted #555', minHeight: '16px', paddingLeft: '4px', fontStyle: 'italic' }}>
            {comments.principal}
          </span>
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

/* ─── TODDLER PRE-KG Result Card — A4 Landscape, vibrant balloon design ── */
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

  // 12 vivid balloon colors: [highlight, mid, dark]
  const BALLOON_COLORS: [string, string, string][] = [
    ['#ffb3d9', '#ff1493', '#8b0057'],  // 0 Hot Pink        — Literacy
    ['#80c8ff', '#1565c0', '#003c8f'],  // 1 Royal Blue      — Understanding
    ['#ffb380', '#e64a00', '#9f2c00'],  // 2 Tangerine       — Obedience
    ['#80ffbc', '#00c853', '#007a29'],  // 3 Vivid Green     — Care of Self
    ['#d4b0ff', '#7b1fa2', '#4a0072'],  // 4 Deep Purple     — Individual Behaviour
    ['#ffe57a', '#f9a825', '#a06000'],  // 5 Sunny Yellow    — Punctuality
    ['#80e5ff', '#00838f', '#005662'],  // 6 Ocean Teal      — Numeracy
    ['#ff8080', '#d32f2f', '#8b0000'],  // 7 Ruby Red        — Bible Studies
    ['#a0f0a0', '#388e3c', '#1b5e20'],  // 8 Emerald         — Creative Play
    ['#ffb3e0', '#c2185b', '#880e4f'],  // 9 Rose            — Phonics
    ['#9fb3ff', '#3949ab', '#1a237e'],  // 10 Indigo         — Scribbling
    ['#ffc880', '#f57c00', '#bf360c'],  // 11 Warm Orange    — Social Habit
  ];

  const Balloon = ({ skillName, colorIdx }: { skillName: string; colorIdx: number }) => {
    const [hi, mid, dark] = BALLOON_COLORS[colorIdx % BALLOON_COLORS.length];
    const comment = getRating(skillName);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Balloon body — teardrop oval taller than wide */}
        <div style={{
          position: 'relative',
          width: '86px',
          height: '104px',
          borderRadius: '50% 50% 45% 45% / 55% 55% 48% 48%',
          background: `radial-gradient(ellipse at 36% 26%, ${hi} 0%, ${mid} 50%, ${dark} 100%)`,
          boxShadow: `3px 6px 16px rgba(0,0,0,0.30), inset -4px -5px 10px rgba(0,0,0,0.14)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 8px 18px',
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
          {/* Skill label */}
          <div style={{
            fontWeight: 'bold', fontSize: '7.5pt', color: '#fff',
            textAlign: 'center', lineHeight: 1.25, zIndex: 1,
            textShadow: '0 1px 3px rgba(0,0,0,0.55)',
            marginBottom: comment ? '4px' : 0,
          }}>
            {skillName}
          </div>
          {comment && (
            <div style={{
              fontSize: '5.5pt', color: 'rgba(255,255,255,0.93)',
              textAlign: 'center', fontStyle: 'italic',
              lineHeight: 1.25, zIndex: 1,
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

  // 4 columns of 3 balloons each — landscape layout
  // Uses PRE_KG_SKILLS indices: Literacy=0, Understanding=1, Obedience=2, Care of Self=3,
  // Individual Behaviour=4, Punctuality=5, Numeracy=6, Bible Studies=7, Creative Play=8,
  // Phonics=9, Scribbling=10, Social Habit=11
  const col1 = [PRE_KG_SKILLS[0], PRE_KG_SKILLS[5], PRE_KG_SKILLS[9]];   // Literacy, Punctuality, Phonics
  const col2 = [PRE_KG_SKILLS[1], PRE_KG_SKILLS[2], PRE_KG_SKILLS[6]];   // Understanding, Obedience, Numeracy
  const col3 = [PRE_KG_SKILLS[3], PRE_KG_SKILLS[4], PRE_KG_SKILLS[7]];   // Care of Self, Individual Behaviour, Bible Studies
  const col4 = [PRE_KG_SKILLS[8], PRE_KG_SKILLS[10], PRE_KG_SKILLS[11]]; // Creative Play, Scribbling, Social Habit
  const skillIdx = (name: string) => PRE_KG_SKILLS.findIndex(s => s.name === name);

  const RAINBOW = ['#ff1a8c', '#ff6b35', '#ffd700', '#00c853', '#2979ff', '#7c4dff'];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#000', background: '#fff', border: `2px solid ${NAVY}` }}>

      {/* Header — white background matching the original physical card */}
      <div style={{ background: '#fff', padding: '6px 12px 4px', borderBottom: `1px solid #ddd` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo — LEFT only, as on the original card */}
          <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
            style={{ width: 62, height: 62, objectFit: 'contain', flexShrink: 0 }} />

          {/* School info — centred */}
          <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.25 }}>
            <div style={{ fontSize: '17pt', fontWeight: 'bold', color: NAVY, letterSpacing: '0.5px' }}>
              {displaySchool.toUpperCase()}
            </div>
            <div style={{ fontSize: '8pt', color: '#333', marginTop: '1px', letterSpacing: '0.5px' }}>
              &#9670;DAY CARE &#9670;PRE-SCHOOL &#9670;NURSERY &#9670;PRIMARY
            </div>
            <div style={{ fontSize: '7pt', color: '#555', marginTop: '2px' }}>
              {displayAddr}
            </div>
          </div>

          {/* Card serial number — top-right, as on the physical card */}
          <div style={{
            border: `1px solid #bbb`, borderRadius: '3px',
            padding: '2px 8px', fontSize: '10pt', fontWeight: 'bold',
            color: NAVY, minWidth: '48px', textAlign: 'center', flexShrink: 0,
          }}>
            {student.studentId || ''}
          </div>
        </div>
      </div>

      {/* Rainbow stripe */}
      <div style={{ display: 'flex', height: '5px' }}>
        {RAINBOW.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>

      {/* Title Banner — matches "TODDLERS'S PRE-KG REPORT" on the physical card */}
      <div style={{
        background: 'linear-gradient(90deg, #fff0f8 0%, #fff9e6 50%, #f0f4ff 100%)',
        textAlign: 'center', padding: '4px 0',
        fontSize: '12pt', fontWeight: 'bold', letterSpacing: '3px',
        color: NAVY, borderBottom: `2px solid ${GOLD}`,
      }}>
        &#127880; TODDLERS&apos;S PRE-KG REPORT &#127880;
      </div>

      {/* Student Info — matches original: row 1: TERM | CLASS | RESUMPTION DATE | ADMISSION NO, row 2: NAME | AGE */}
      <div style={{ background: '#fffde7', padding: '5px 14px', borderBottom: `1px solid ${GOLD}` }}>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr', gap: '4px 14px', marginBottom: '4px' }}>
          {([
            ['TERM',            term],
            ['CLASS',           student.className],
            ['RESUMPTION DATE', ''],
            ['ADMISSION NO.',   student.studentId],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <span style={{ fontSize: '6pt', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase' }}>{label} </span>
              <span style={{ borderBottom: `1px solid ${NAVY}`, fontSize: '8.5pt', fontWeight: 600, paddingLeft: '2px', display: 'inline-block', minWidth: '60px' }}>{val}</span>
            </div>
          ))}
        </div>
        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '4px 14px' }}>
          {([
            ['NAME', student.name],
            ['AGE',  ageYears !== null ? `${ageYears} yr${ageYears !== 1 ? 's' : ''}` : ''],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <span style={{ fontSize: '6pt', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase' }}>{label} </span>
              <span style={{ borderBottom: `1px solid ${NAVY}`, fontSize: '8.5pt', fontWeight: 600, paddingLeft: '2px', display: 'inline-block', minWidth: '80px' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Balloon Section — 4 columns + decorative centre, landscape spread */}
      <div style={{
        background: 'linear-gradient(135deg, #fff0fb 0%, #f0f4ff 28%, #f0fff8 56%, #fffde0 100%)',
        padding: '8px 12px 2px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '4px',
      }}>
        {/* Column 1: Literacy, Punctuality, Phonics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          {col1.map(s => <Balloon key={s.name} skillName={s.name} colorIdx={skillIdx(s.name)} />)}
        </div>

        {/* Decorative separator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', padding: '0 2px' }}>
          <div style={{ fontSize: '15pt' }}>&#127882;</div>
        </div>

        {/* Column 2: Understanding, Obedience, Numeracy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          {col2.map(s => <Balloon key={s.name} skillName={s.name} colorIdx={skillIdx(s.name)} />)}
        </div>

        {/* Centre — child character + school tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', textAlign: 'center', padding: '4px 8px', minWidth: '80px' }}>
          <div style={{ fontSize: '30pt', lineHeight: 1 }}>&#129333;&#127995;</div>
          <div style={{ fontSize: '6pt', color: '#7c4dff', fontWeight: 'bold', marginTop: '4px', fontStyle: 'italic', lineHeight: 1.3 }}>
            {SCHOOL_CITY_TAGLINE}
          </div>
          <div style={{ fontSize: '14pt', lineHeight: 1, marginTop: '4px', letterSpacing: '2px' }}>&#11088;&#127775;&#11088;</div>
        </div>

        {/* Column 3: Care of Self, Individual Behaviour, Bible Studies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          {col3.map(s => <Balloon key={s.name} skillName={s.name} colorIdx={skillIdx(s.name)} />)}
        </div>

        {/* Decorative separator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', padding: '0 2px' }}>
          <div style={{ fontSize: '15pt' }}>&#127881;</div>
        </div>

        {/* Column 4: Creative Play, Scribbling, Social Habit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          {col4.map(s => <Balloon key={s.name} skillName={s.name} colorIdx={skillIdx(s.name)} />)}
        </div>
      </div>

      {/* Rating Key */}
      <div style={{
        background: '#f5f5f5', padding: '3px 14px',
        borderTop: `1px solid #ddd`, borderBottom: `2px solid ${NAVY}`,
        display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '6.5pt', alignItems: 'center',
      }}>
        <strong style={{ color: NAVY }}>RATING KEY:</strong>
        {([
          ['5 — Excellent',         '#ff1493', '#fff'],
          ['4 — Very Good',         '#1565c0', '#fff'],
          ['3 — Good',              '#00838f', '#fff'],
          ['2 — Fair',              '#f9a825', '#000'],
          ['1 — Needs Improvement', '#d32f2f', '#fff'],
        ] as [string, string, string][]).map(([label, bg, color]) => (
          <span key={label} style={{ background: bg, color, padding: '1px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
            {label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '7px 14px 8px', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '14px', alignItems: 'start' }}>

          {/* Teacher Comment */}
          <div>
            <div style={{ fontWeight: 'bold', color: NAVY, fontSize: '7.5pt', marginBottom: '3px' }}>Class Teacher&apos;s Comment:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '20px', fontSize: '8.5pt', fontStyle: 'italic', paddingLeft: '4px', lineHeight: '20px' }}>
              {comments.teacher}
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ borderTop: `1px solid ${NAVY}`, paddingTop: '2px', fontSize: '7pt', fontWeight: 'bold', color: NAVY }}>Signature &amp; Date</div>
            </div>
          </div>

          {/* Attendance */}
          <div style={{ fontSize: '7.5pt' }}>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>School days opened:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '8.5pt', paddingLeft: '4px' }}>
                {attendance.totalDays || ''}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>Times absent:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '8.5pt', paddingLeft: '4px' }}>
                {attendance.daysAbsent || ''}
              </div>
            </div>
            {attendancePct !== null && (
              <div style={{ marginTop: '4px', fontSize: '7pt', color: '#555' }}>Attendance: {attendancePct}%</div>
            )}
          </div>

          {/* Proprietress Comment */}
          <div>
            <div style={{ fontWeight: 'bold', color: NAVY, fontSize: '7.5pt', marginBottom: '3px' }}>Proprietress Comment:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '20px', fontSize: '8.5pt', fontStyle: 'italic', paddingLeft: '4px', lineHeight: '20px' }}>
              {comments.principal}
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ borderTop: `1px solid ${NAVY}`, paddingTop: '2px', fontSize: '7pt', fontWeight: 'bold', color: NAVY }}>Signature &amp; Date</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ fontSize: '7.5pt' }}>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>No. of Skills Assessed:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '8.5pt', paddingLeft: '4px' }}>12</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px' }}>Next Term Begins:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '15px', fontSize: '8.5pt', paddingLeft: '4px' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom rainbow stripe */}
      <div style={{ display: 'flex', height: '4px' }}>
        {RAINBOW.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>
      <div style={{ background: '#f1f5f9', padding: '2px 14px', fontSize: '6.5pt', color: '#888', textAlign: 'right', fontStyle: 'italic' }}>
        Computer-generated — {displaySchool}, {SCHOOL_CITY_TAGLINE}
      </div>
    </div>
  );
}

/* ─── Bare card body — used for bulk printing (no preview wrapper) ── */
export function CardPrintContent({ data }: { data: ResultCardData }) {
  const level = data.student.classLevel ?? '';
  const isToddler = level === 'toddler';
  const isNursery = level === 'creche' || level === 'nursery1' || level === 'nursery2';
  if (isToddler) return <ToddlerPreKGResultCard data={data} />;
  return isNursery ? <NurseryResultCard data={data} /> : <PrimaryResultCard data={data} />;
}

/* ─── Main Export ────────────────────────────────────────────── */
interface Props {
  data: ResultCardData;
  onPrint: () => void;
}

export default function ResultCard({ data, onPrint }: Props) {
  const level = data.student.classLevel ?? '';
  const isToddler = level === 'toddler';
  const isNursery = level === 'creche' || level === 'nursery1' || level === 'nursery2';

  const handlePrint = () => {
    if (isToddler) {
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
            width: isToddler ? '297mm' : '100%',
            maxWidth: isToddler ? '297mm' : '210mm',
            minHeight: isToddler ? '210mm' : '297mm',
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
