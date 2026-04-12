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
export function printResultCard(studentName: string) {
  const el = document.getElementById(RESULT_CARD_PRINT_DOM_ID);
  if (!el) return;
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Result Sheet – ${studentName}</title>
<style>
  @page { size: A4 portrait; margin: 8mm 10mm; }
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

/* ─── Bare card body — used for bulk printing (no preview wrapper) ── */
export function CardPrintContent({ data }: { data: ResultCardData }) {
  const level = data.student.classLevel ?? '';
  const isNursery = level === 'creche' || level === 'nursery1' || level === 'nursery2';
  return isNursery ? <NurseryResultCard data={data} /> : <PrimaryResultCard data={data} />;
}

/* ─── Main Export ────────────────────────────────────────────── */
interface Props {
  data: ResultCardData;
  onPrint: () => void;
}

export default function ResultCard({ data, onPrint }: Props) {
  const level = data.student.classLevel ?? '';
  const isNursery = level === 'creche' || level === 'nursery1' || level === 'nursery2';

  return (
    <>
      <div className="flex justify-end mb-3 print:hidden">
        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* A4 preview wrapper */}
      <div style={{ background: '#e0e0e0', padding: '16px', borderRadius: '8px' }}>
        <div
          id={RESULT_CARD_PRINT_DOM_ID}
          style={{
            width: '100%',
            maxWidth: '210mm',
            minHeight: '297mm',
            background: '#fff',
            margin: '0 auto',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          {isNursery
            ? <NurseryResultCard data={data} />
            : <PrimaryResultCard data={data} />
          }
        </div>
      </div>
    </>
  );
}
