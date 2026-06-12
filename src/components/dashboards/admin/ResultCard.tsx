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
import { getNigerianGrade, GRADING_KEY } from '../../../lib/grading';
export { getNigerianGrade, GRADING_KEY };
import { PRE_KG_SKILLS } from '../../../lib/gradeCompute';
export { PRE_KG_SKILLS } from '../../../lib/gradeCompute';

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
  nextTerm: { begins: string; fees: string; outstandingFees?: string };
  schoolName: string;
  schoolAddress: string;
  visibleSubjects?: string[];
  /** Toddler only: per-skill comment option index (0-4), overrides name-hash default */
  preKgCommentChoices?: Record<string, number>;
}

/* ─── Print helper ──────────────────────────────────────────── */
export function printResultCard(studentName: string, landscape = false) {
  const el = document.getElementById(RESULT_CARD_PRINT_DOM_ID);
  if (!el) return;
  // Open at correct proportions so the preview matches the page orientation
  const [w, h] = landscape ? [1280, 920] : [900, 1100];
  const win = window.open('', '_blank', `width=${w},height=${h}`);
  if (!win) return;
  // Explicit mm dimensions beat keyword-only @page in most engines
  const pageDecl = landscape
    ? '297mm 210mm'  // A4 landscape: wider than tall
    : '210mm 297mm'; // A4 portrait
  const bodyW   = landscape ? '277mm' : '190mm'; // page width minus margins
  const bodyMH  = landscape ? '196mm' : '277mm';
  const banner  = landscape
    ? `<div id="ls-banner" style="font-family:Arial,sans-serif;font-size:12px;color:#555;background:#fffbe6;border:1px solid #f59e0b;border-radius:6px;padding:6px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
         <span style="font-size:16px;">⚠️</span>
         <span>In the print dialog, set <strong>Orientation → Landscape</strong> (or "Landscape" under Page Setup) if it shows Portrait.</span>
       </div>`
    : '';
  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Result Sheet – ${studentName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&display=swap" rel="stylesheet">
<style>
  /* Primary @page — explicit mm overrides keyword-only in Chrome/Firefox */
  @page { size: ${pageDecl}; margin: 6mm 8mm; }
  /* Extra hint for browsers that only read the keyword */
  @media print {
    @page { size: ${landscape ? 'landscape' : 'portrait'}; margin: 6mm 8mm; }
    #ls-banner { display: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: ${bodyW}; min-height: ${bodyMH}; }
  body { font-family: 'Fredoka', Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; }
  img { max-width: 100%; }
</style>
</head><body>${banner}${el.innerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 600);
}

/* ── B&W-safe grade badge style — shared by Primary and Nursery cards ── */
const GB: React.CSSProperties = {
  display: 'inline-block', border: '1.5px solid #000', fontWeight: 'bold',
  padding: '1px 4px', textAlign: 'center', minWidth: '22px', fontSize: '8pt',
};

/* ─── PRIMARY / BASIC Result Card — matches physical "LOWER AND MIDDLE BASIC REPORT SHEET" ── */
function PrimaryResultCard({ data }: { data: ResultCardData }) {
  const { student, term, academicYear, subjects, behavior, attendance, comments, nextTerm, schoolName, visibleSubjects } = data;
  const displayedBasicSubjects = visibleSubjects
    ? (BASIC_SUBJECTS as readonly string[]).filter(n => visibleSubjects.includes(n))
    : BASIC_SUBJECTS as readonly string[];
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;

  const scoredSubjects = subjects.filter(s => s.total > 0);
  const avgScore = scoredSubjects.length > 0
    ? (scoredSubjects.reduce((s, r) => s + r.total, 0) / scoredSubjects.length).toFixed(2)
    : '0.00';
  const grandTotal = scoredSubjects.reduce((s, r) => s + r.total, 0);

  const ageYears = student.dob
    ? new Date().getFullYear() - new Date(student.dob).getFullYear()
    : null;

  const getSubject = (name: string) =>
    subjects.find(s => (s.subject || '').toLowerCase().trim() === (name || '').toLowerCase().trim());

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

  const scoredRows = displayedBasicSubjects
    .map(name => ({ name, s: getSubject(name) }))
    .filter(({ s }) => s && s.total > 0);

  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9pt',
      color: '#1e293b',
      background: '#fff',
      border: '3px solid #1a2433',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      height: '277mm',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>

      {/* ══ HEADER — dark band ══ */}
      <div style={{ background: '#1a2433', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', flexShrink: 0 }}>
        <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
          style={{ width: 60, height: 60, objectFit: 'contain', flexShrink: 0, borderRadius: '6px', border: '2px solid rgba(255,255,255,0.3)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.5px', lineHeight: 1.1 }}>
            {displaySchool.toUpperCase()}
          </div>
          <div style={{ fontSize: '7.5pt', opacity: 0.8, marginTop: '2px', letterSpacing: '0.3px' }}>
            Day Care &nbsp;·&nbsp; Pre-School &nbsp;·&nbsp; Nursery &nbsp;·&nbsp; Primary School
          </div>
          <div style={{ fontSize: '6.5pt', opacity: 0.65, marginTop: '1px' }}>
            {SCHOOL_ADDRESS_LINE1}, {SCHOOL_ADDRESS_LINE2} &nbsp;·&nbsp; Tel: {SCHOOL_PHONE_DISPLAY}
          </div>
        </div>
        {/* Adm No box */}
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.25)', paddingLeft: '14px', flexShrink: 0 }}>
          <div style={{ fontSize: '6pt', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adm. No.</div>
          <div style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '1px', letterSpacing: '0.5px' }}>{student.studentId || '—'}</div>
        </div>
      </div>

      {/* ══ TITLE BAR ══ */}
      <div style={{ background: '#2d3748', color: '#fff', padding: '3px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '9pt', fontWeight: 'bold', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Academic Report Card — Lower &amp; Middle Basic
        </span>
        <span style={{ fontSize: '7.5pt', background: 'rgba(255,255,255,0.12)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.3px' }}>
          {term} &nbsp;·&nbsp; {academicYear}
        </span>
      </div>

      {/* ══ STUDENT NAME — hero row ══ */}
      <div style={{ background: '#f8fafc', borderBottom: '2px solid #1a2433', padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '5.5pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Student Name</div>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.5px', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
            {student.name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexShrink: 0, textAlign: 'center' }}>
          {([
            { label: 'Class',        value: student.className },
            { label: 'Gender',       value: student.gender || '—' },
            { label: 'Age',          value: ageYears !== null ? `${ageYears} yrs` : '—' },
            { label: 'Days Present', value: String(attendance.daysPresent || '—') },
            { label: 'Days Opened',  value: String(attendance.totalDays  || '—') },
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '5.5pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>{label}</div>
              <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ SUBJECTS TABLE ══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', flexShrink: 0 }}>
        <thead>
          <tr style={{ background: '#374151', color: '#fff', height: '31px' }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '8.5pt', width: '30%', borderRight: '1px solid #4b5563' }}>SUBJECTS</th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '7.5pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>1<sup>ST</sup> CA<br /><span style={{ fontSize: '6.5pt', fontWeight: 'normal', opacity: 0.8 }}>/ 15</span></th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '7.5pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>2<sup>ND</sup> CA<br /><span style={{ fontSize: '6.5pt', fontWeight: 'normal', opacity: 0.8 }}>/ 15</span></th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '7.5pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>H/Work<br /><span style={{ fontSize: '6.5pt', fontWeight: 'normal', opacity: 0.8 }}>/ 10</span></th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '7.5pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>Project<br /><span style={{ fontSize: '6.5pt', fontWeight: 'normal', opacity: 0.8 }}>/ 10</span></th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '7.5pt', width: '9%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>Exam<br /><span style={{ fontSize: '6.5pt', fontWeight: 'normal', opacity: 0.8 }}>/ 50</span></th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '8pt', fontWeight: 'bold', width: '9%', borderRight: '1px solid #4b5563', background: '#1e293b', lineHeight: 1.2 }}>Total<br /><span style={{ fontSize: '6.5pt', fontWeight: 'normal', opacity: 0.8 }}>/ 100</span></th>
            <th style={{ padding: '4px 4px', textAlign: 'center', fontSize: '7.5pt', width: '7%', borderRight: '1px solid #4b5563', background: '#1e293b' }}>Grade</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: '7pt', background: '#1e293b' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {scoredRows.map(({ name, s }, i) => {
            const { grade, remark } = getNigerianGrade(s!.total);
            return (
              <tr key={name} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '31px' }}>
                <td style={{ padding: '3px 8px', fontWeight: '600', fontSize: '8pt', borderRight: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.2px' }}>{name}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '10pt', fontWeight: 'bold' }}>{s!.ca1 > 0 ? s!.ca1 : ''}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '10pt', fontWeight: 'bold' }}>{s!.ca2 > 0 ? s!.ca2 : ''}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '10pt', fontWeight: 'bold' }}>{(s!.homework ?? 0) > 0 ? s!.homework : ''}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '10pt', fontWeight: 'bold' }}>{(s!.project ?? 0) > 0 ? s!.project : ''}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '10pt', fontWeight: 'bold' }}>{s!.exam > 0 ? s!.exam : ''}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', borderRight: '1px solid #f1f5f9', background: '#f1f5f9' }}>{s!.total}</td>
                <td style={{ padding: '3px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}><span style={{ ...GB, ...gradeColor(grade), fontSize: '7.5pt', minWidth: '20px', padding: '0px 3px' }}>{grade}</span></td>
                <td style={{ padding: '3px 6px', fontSize: '7.5pt', color: '#374151' }}>{remark}</td>
              </tr>
            );
          })}
          {/* Empty filler rows */}
          {Array.from({ length: Math.max(0, BASIC_SUBJECTS.length - scoredRows.length) }).map((_, i) => (
            <tr key={`filler-${i}`} style={{ background: (scoredRows.length + i) % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '31px' }}>
              {[...Array(9)].map((__, ci) => (
                <td key={ci} style={{ borderRight: ci < 8 ? '1px solid #e2e8f0' : undefined }} />
              ))}
            </tr>
          ))}
          {/* Summary row */}
          {scoredRows.length > 0 && (
            <tr style={{ background: '#1a2433', color: '#fff', borderTop: '2px solid #111', height: '31px' }}>
              <td colSpan={4} style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '8pt', letterSpacing: '0.5px', opacity: 0.8 }}>
                {scoredRows.length} subject{scoredRows.length !== 1 ? 's' : ''} &nbsp;|&nbsp; Average
              </td>
              <td colSpan={2} style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '9.5pt' }}>
                {avgScore}%
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', background: '#0f172a', letterSpacing: '-0.5px' }}>{grandTotal}</td>
              <td colSpan={2} style={{ padding: '3px 6px', fontSize: '7.5pt', opacity: 0.7 }}>Grand Total</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ══ BOTTOM SECTION ══ */}
      <div style={{ display: 'flex', borderTop: '2px solid #1a2433', flex: 1, minHeight: 0 }}>

        {/* LEFT: Practical Life + Comments */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* Practical Life Section */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Practical Life header */}
            <div style={{ background: '#374151', color: '#fff', padding: '3px 10px', fontSize: '7.5pt', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Practical Life Assessment
            </div>
            {/* Compact 4 rows × 2 cols */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, auto)', gridAutoFlow: 'column' }}>
              {practicalLife.map((item, i) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2.5px 8px',
                  borderBottom: '1px solid #f1f5f9',
                  borderRight: i < 4 ? '1px solid #cbd5e1' : 'none',
                  fontSize: '6.5pt',
                }}>
                  <span style={{ fontWeight: 'bold', color: '#64748b', marginRight: '4px', width: '10px' }}>{item.id}.</span>
                  <span style={{ flex: 1, color: '#374151', fontWeight: '500' }}>{item.label}</span>
                  <span style={{
                    ...GB,
                    fontSize: '6.5pt',
                    minWidth: '16px',
                    padding: '0px 2px',
                    borderRadius: '3px',
                    borderColor: '#94a3b8',
                    background: item.score ? '#f1f5f9' : 'transparent'
                  }}>{item.score || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Section — takes remaining space */}
          <div style={{ padding: '4px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '4px' }}>
            {/* Class Teacher's Comment Box */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#1a2433', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Class Teacher&apos;s Comment:</div>
                <div style={{ fontSize: '8pt', fontStyle: 'italic', color: '#1e293b', lineHeight: 1.2, paddingLeft: '2px' }}>
                  {comments.teacher || 'No comment recorded.'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                  <div style={{ width: '100%', borderBottom: '1px solid #475569' }} />
                  <div style={{ fontSize: '5.5pt', color: '#64748b', marginTop: '1px', textTransform: 'uppercase' }}>Signature &amp; Date</div>
                </div>
              </div>
            </div>

            {/* Head of School's Comment Box */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#1a2433', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Head of School&apos;s Comment:</div>
                <div style={{ fontSize: '8pt', fontStyle: 'italic', color: '#1e293b', lineHeight: 1.2, paddingLeft: '2px' }}>
                  {comments.principal || 'No comment recorded.'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                  <div style={{ width: '100%', borderBottom: '1px solid #475569' }} />
                  <div style={{ fontSize: '5.5pt', color: '#64748b', marginTop: '1px', textTransform: 'uppercase' }}>Signature &amp; Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Grading Scale — single-column list */}
        <div style={{ width: '190px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '2px solid #1a2433' }}>
          <div style={{ background: '#374151', color: '#fff', padding: '4px 8px', fontSize: '7.5pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
            Grading System
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f8fafc' }}>
            {GRADING_KEY.map(({ grade, range, remark }, i) => (
              <div key={grade} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '2.5px 8px',
                borderBottom: i < GRADING_KEY.length - 1 ? '1px solid #e2e8f0' : 'none',
                flex: 1,
              }}>
                <span style={{
                  ...GB,
                  ...gradeColor(grade),
                  fontSize: '8pt',
                  minWidth: '26px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  border: '1px solid #475569',
                }}>{grade}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ fontSize: '7.5pt', color: '#1e293b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{remark}</div>
                  <div style={{ fontSize: '6.5pt', color: '#64748b' }}>{range}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '6px 6px', fontSize: '6pt', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', borderTop: '1px solid #cbd5e1', background: '#f8fafc' }}>
            Computer-generated · {SCHOOL_CITY_TAGLINE}
          </div>
        </div>
      </div>

      {/* ══ FOOTER BAR ══ */}
      <div style={{ background: '#1a2433', color: '#fff', padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7.5pt', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
        <span>
          <span style={{ opacity: 0.65, marginRight: '4px' }}>School Re-opens:</span>
          <span style={{ fontWeight: 'bold' }}>{nextTerm.begins ? fmtDate(nextTerm.begins) : '—'}</span>
        </span>
        {nextTerm.fees && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>Next Term Fees:</span>
            <span style={{ fontWeight: 'bold' }}>{nextTerm.fees}</span>
          </span>
        )}
        {nextTerm.outstandingFees && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>Outstanding Balance:</span>
            <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{nextTerm.outstandingFees}</span>
          </span>
        )}
        <span style={{ opacity: 0.5, fontSize: '6.5pt' }}>{displaySchool}</span>
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
    ? (scoredSubjectsForAvg.reduce((s, r) => s + r.total, 0) / scoredSubjectsForAvg.length).toFixed(2)
    : '0.00';

  const getSubject = (name: string) =>
    subjects.find(s => (s.subject || '').toLowerCase().trim() === (name || '').toLowerCase().trim());

  const scoredNurserySubjects = displayedNurserySubjects.filter(n => {
    const s = getSubject(n);
    return s && s.total > 0;
  });

  const grandTotal = scoredNurserySubjects.reduce((sum, n) => sum + (getSubject(n)?.total ?? 0), 0);

  return (
    /* Landscape A4: 297mm × 210mm — content area ~196mm tall after 7mm margins each side */
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9pt', color: '#000',
      background: '#fff', border: '2px solid #111',
      display: 'flex', flexDirection: 'column',
      height: '190mm',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>

      {/* ══ DARK HEADER BAND ══ */}
      <div style={{ background: '#1a2433', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', flexShrink: 0 }}>
        <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
          style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0, borderRadius: '5px', border: '2px solid rgba(255,255,255,0.3)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.5px', lineHeight: 1.1 }}>
            {displaySchool.toUpperCase()}
          </div>
          <div style={{ fontSize: '7.5pt', opacity: 0.8, marginTop: '2px', letterSpacing: '0.3px' }}>
            Day Care &nbsp;·&nbsp; Pre-School &nbsp;·&nbsp; Nursery &nbsp;·&nbsp; Primary School
          </div>
          <div style={{ fontSize: '6.5pt', opacity: 0.65, marginTop: '1px' }}>
            {SCHOOL_ADDRESS_LINE1}, {SCHOOL_ADDRESS_LINE2} &nbsp;·&nbsp; Tel: {SCHOOL_PHONE_DISPLAY}
          </div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.25)', paddingLeft: '14px', flexShrink: 0 }}>
          <div style={{ fontSize: '6pt', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adm. No.</div>
          <div style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '1px', letterSpacing: '1px' }}>{student.studentId || '—'}</div>
        </div>
      </div>

      {/* ══ TITLE BAR ══ */}
      <div style={{ background: '#2d3748', color: '#fff', padding: '3px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '9pt', fontWeight: 'bold', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Individual Students Assessment Sheet
        </span>
        <span style={{ fontSize: '7.5pt', background: 'rgba(255,255,255,0.12)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.3px' }}>
          {term} &nbsp;·&nbsp; {academicYear}
        </span>
      </div>

      {/* ══ STUDENT NAME — hero row ══ */}
      <div style={{ background: '#f8fafc', borderBottom: '2px solid #1a2433', padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '5.5pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Student Name</div>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.5px', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
            {student.name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexShrink: 0, textAlign: 'center' }}>
          {([
            { label: 'Class',        value: `${student.className}${kgColorName(student.className) ? ` · ${kgColorName(student.className)}` : ''}` },
            { label: 'Age',          value: ageYears !== null ? `${ageYears} yrs` : '—' },
            { label: 'Average',      value: scoredNurserySubjects.length > 0 ? `${avgScore}%` : '—' },
            { label: 'Days Present', value: String(attendance.daysPresent || '—') },
            { label: 'Days Opened',  value: String(attendance.totalDays  || '—') },
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '5.5pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>{label}</div>
              <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ SUBJECTS TABLE ══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', flexShrink: 0 }}>
        <thead>
          <tr style={{ background: '#374151', color: '#fff', height: '26px' }}>
            <th style={{ padding: '3px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '8pt', width: '30%', borderRight: '1px solid #4b5563' }}>SUBJECTS</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>1<sup>ST</sup> CA<br /><span style={{ fontSize: '6pt', fontWeight: 'normal', opacity: 0.8 }}>/ 15</span></th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>2<sup>ND</sup> CA<br /><span style={{ fontSize: '6pt', fontWeight: 'normal', opacity: 0.8 }}>/ 15</span></th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>H/Work<br /><span style={{ fontSize: '6pt', fontWeight: 'normal', opacity: 0.8 }}>/ 10</span></th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7pt', width: '8%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>Project<br /><span style={{ fontSize: '6pt', fontWeight: 'normal', opacity: 0.8 }}>/ 10</span></th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7pt', width: '9%', borderRight: '1px solid #4b5563', lineHeight: 1.2 }}>Exam<br /><span style={{ fontSize: '6pt', fontWeight: 'normal', opacity: 0.8 }}>/ 50</span></th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7.5pt', fontWeight: 'bold', width: '9%', borderRight: '1px solid #4b5563', background: '#1e293b', lineHeight: 1.2 }}>Total<br /><span style={{ fontSize: '6pt', fontWeight: 'normal', opacity: 0.8 }}>/ 100</span></th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontSize: '7pt', width: '7%', borderRight: '1px solid #4b5563', background: '#1e293b' }}>Grade</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', fontSize: '7pt', background: '#1e293b' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {scoredNurserySubjects.map((name, i) => {
            const s = getSubject(name)!;
            const { grade, remark } = getNigerianGrade(s.total);
            return (
              <tr key={name} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '21px' }}>
                <td style={{ padding: '2px 8px', fontWeight: '600', fontSize: '7.5pt', borderRight: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.2px' }}>{name}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '9pt', fontWeight: 'bold' }}>{s.ca1 > 0 ? s.ca1 : ''}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '9pt', fontWeight: 'bold' }}>{s.ca2 > 0 ? s.ca2 : ''}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '9pt', fontWeight: 'bold' }}>{(s.homework ?? 0) > 0 ? s.homework : ''}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '9pt', fontWeight: 'bold' }}>{(s.project ?? 0) > 0 ? s.project : ''}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontSize: '9pt', fontWeight: 'bold' }}>{s.exam > 0 ? s.exam : ''}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', borderRight: '1px solid #e2e8f0', background: '#f1f5f9' }}>{s.total}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}><span style={{ ...GB, ...gradeColor(grade), fontSize: '7pt', minWidth: '18px', padding: '0px 2px' }}>{grade}</span></td>
                <td style={{ padding: '2px 6px', fontSize: '7pt', color: '#475569' }}>{remark}</td>
              </tr>
            );
          })}
          {/* Empty filler rows */}
          {Array.from({ length: Math.max(0, NURSERY_SUBJECTS.length - scoredNurserySubjects.length) }).map((_, i) => (
            <tr key={`filler-${i}`} style={{ background: (scoredNurserySubjects.length + i) % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '18px' }}>
              {[...Array(9)].map((__, ci) => (
                <td key={ci} style={{ borderRight: ci < 8 ? '1px solid #e2e8f0' : undefined }} />
              ))}
            </tr>
          ))}
          {scoredNurserySubjects.length > 0 && (
            <tr style={{ background: '#1a2433', color: '#fff', borderTop: '2px solid #111', height: '21px' }}>
              <td colSpan={4} style={{ padding: '2px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '7.5pt', letterSpacing: '0.5px', opacity: 0.8 }}>
                {scoredNurserySubjects.length} subject{scoredNurserySubjects.length !== 1 ? 's' : ''} &nbsp;|&nbsp; Average
              </td>
              <td colSpan={2} style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '9pt' }}>
                {avgScore}%
              </td>
              <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', background: '#0f172a', letterSpacing: '-0.5px' }}>{grandTotal}</td>
              <td colSpan={2} style={{ padding: '2px 6px', fontSize: '7pt', opacity: 0.7 }}>Grand Total</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ══ BOTTOM SECTION ══ */}
      <div style={{ display: 'flex', borderTop: '2px solid #1a2433', flex: 1, minHeight: 0 }}>

        {/* LEFT: Comments */}
        <div style={{ flex: 1, borderRight: '1px solid #cbd5e1', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'space-around' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '7pt', fontWeight: 'bold', color: '#1a2433', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Class Teacher&apos;s Comment:</div>
            <div style={{ minHeight: '18px', borderBottom: '1px solid #94a3b8', fontSize: '8.5pt', fontStyle: 'italic', paddingLeft: '4px', paddingBottom: '2px', color: '#1e293b' }}>{comments.teacher}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', paddingRight: '16px' }}>
              <div style={{ borderTop: '1px solid #1a2433', paddingTop: '2px', fontSize: '6pt', color: '#475569', textAlign: 'center', width: '90px' }}>Signature &amp; Date</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '7pt', fontWeight: 'bold', color: '#1a2433', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Head of School&apos;s Comment:</div>
            <div style={{ minHeight: '18px', borderBottom: '1px solid #94a3b8', fontSize: '8.5pt', fontStyle: 'italic', paddingLeft: '4px', paddingBottom: '2px', color: '#1e293b' }}>{comments.principal}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', paddingRight: '16px' }}>
              <div style={{ borderTop: '1px solid #1a2433', paddingTop: '2px', fontSize: '6pt', color: '#475569', textAlign: 'center', width: '90px' }}>Signature &amp; Date</div>
            </div>
          </div>
        </div>

        {/* RIGHT: Grading Scale — single-column compact list */}
        <div style={{ width: '190px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #cbd5e1' }}>
          <div style={{ background: '#374151', color: '#fff', padding: '3px 8px', fontSize: '7pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
            Grading Scale
          </div>
          {GRADING_KEY.map(({ grade, range, remark }, i) => (
            <div key={grade} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '2px 8px',
              borderBottom: '1px solid #f1f5f9',
              background: i % 2 === 0 ? '#fff' : '#f8fafc',
              flex: 1,
            }}>
              <span style={{ ...GB, ...gradeColor(grade), fontSize: '7.5pt', minWidth: '22px', textAlign: 'center', flexShrink: 0 }}>{grade}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '6.5pt', color: '#1e293b', fontWeight: 600, lineHeight: 1.2 }}>{remark}</div>
                <div style={{ fontSize: '6pt', color: '#64748b', lineHeight: 1.2 }}>{range}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '4px 6px 3px', fontSize: '5.5pt', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.3, borderTop: '1px solid #cbd5e1' }}>
            Computer-generated · {SCHOOL_CITY_TAGLINE}
          </div>
        </div>
      </div>

      {/* ══ FOOTER BAR ══ */}
      <div style={{ background: '#1a2433', color: '#fff', padding: '3px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7pt', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
        <span>
          <span style={{ opacity: 0.65, marginRight: '4px' }}>School Re-opens:</span>
          <span style={{ fontWeight: 'bold' }}>{nextTerm.begins ? fmtDate(nextTerm.begins) : '—'}</span>
        </span>
        {nextTerm.fees && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>Next Term Fees:</span>
            <span style={{ fontWeight: 'bold' }}>{nextTerm.fees}</span>
          </span>
        )}
        {nextTerm.outstandingFees && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>Outstanding Balance:</span>
            <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{nextTerm.outstandingFees}</span>
          </span>
        )}
        <span style={{ opacity: 0.5, fontSize: '6pt' }}>{displaySchool}</span>
      </div>
    </div>
  );
}

/* ─── PRE-KG Skills Data — defined in gradeCompute.ts, re-exported above ─── */

// Multiple comment options per skill per rating — card picks one based on student name (deterministic)
export const PRE_KG_COMMENTS: Record<string, Record<number, string[]>> = {
  'Literacy': {
    5: ['Reads & writes with great confidence', 'Outstanding literacy — far exceeds expectations', 'Reads fluently and writes independently', 'Exceptional reader with strong writing skills', 'Literacy skills are truly impressive'],
    4: ['Recognises words & letters very well', 'Good reading progress, writes neatly', 'Reads simple texts with confidence', 'Shows strong letter and word recognition', 'Reading and writing developing excellently'],
    3: ['Progressing steadily in reading', 'Making good strides in literacy', 'Learning to read with teacher support', 'Showing improvement in letter recognition', 'Literacy skills are developing well'],
    2: ['Needs more reading practice daily', 'Still learning to identify letters', 'Requires extra literacy support', 'Literacy needs consistent reinforcement', 'Keep practising reading at home'],
    1: ['Beginning to recognise letters', 'Just starting the literacy journey', 'Needs one-on-one literacy support', 'Requires intensive reading guidance', 'Literacy skills need significant work'],
  },
  'Understanding': {
    5: ['Grasps new ideas exceptionally fast', 'Comprehension is outstanding in class', 'Understands and applies concepts brilliantly', 'Incredible ability to absorb new lessons', 'Demonstrates deep understanding always'],
    4: ['Follows and applies lessons very well', 'Good comprehension of new concepts', 'Understands most lessons with ease', 'Applies learned concepts effectively', 'Shows very good class understanding'],
    3: ['Shows satisfactory comprehension', 'Generally understands class lessons', 'Developing understanding with support', 'Grasps concepts with teacher guidance', 'Learning to follow classroom instructions'],
    2: ['Needs concept reinforcement often', 'Requires repeated explanation of topics', 'Understanding improving with extra help', 'Needs more guided learning support', 'Comprehension requires more attention'],
    1: ['Requires guided concept support', 'Needs intensive one-on-one teaching', 'Still learning to follow instructions', 'Comprehension is at an early stage', 'Requires patient and consistent support'],
  },
  'Obedience': {
    5: ['Follows every instruction promptly', 'Models excellent obedience for peers', 'Always respectful and rule-abiding', 'Exemplary in following class rules', 'Obedient, cooperative and well-mannered'],
    4: ['Respects rules consistently in class', 'Usually follows instructions well', 'Cooperative and attentive to rules', 'Mostly obedient with positive attitude', 'Listens and responds well to guidance'],
    3: ['Generally cooperative in class', 'Follows rules with occasional reminders', 'Usually obedient when guided properly', 'Respectful with some teacher prompting', 'Developing good obedience habits'],
    2: ['Needs reminders to follow rules', 'Obedience is still developing slowly', 'Sometimes struggles to obey instructions', 'Requires regular redirection in class', 'Needs consistent boundaries and support'],
    1: ['Requires consistent redirection', 'Struggles to follow class rules', 'Needs patient and firm guidance', 'Obedience requires urgent attention', 'Still learning to respect boundaries'],
  },
  'Care of Self': {
    5: ['Impeccably neat and well-groomed always', 'Excellent personal hygiene every day', 'Models outstanding care of self', 'Always arrives clean, tidy and smart', 'Self-care standards are exceptional'],
    4: ['Keeps self clean and tidy daily', 'Good personal hygiene maintained well', 'Arrives neat and well-dressed always', 'Shows great awareness of self-care', 'Personal grooming is commendable'],
    3: ['Manages personal care fairly well', 'Generally tidy with minor reminders', 'Usually maintains good hygiene habits', 'Self-care is developing positively', 'Mostly neat with occasional guidance'],
    2: ['Needs reminders for cleanliness', 'Personal hygiene needs improvement', 'Self-care habits are still developing', 'Requires daily hygiene reminders', 'Needs support maintaining tidiness'],
    1: ['Requires support with hygiene', 'Personal care needs close attention', 'Still learning basic self-care habits', 'Needs intensive hygiene support', 'Self-care is at a very early stage'],
  },
  'Individual Behaviour': {
    5: ['Exemplary conduct every single day', 'A role model for good behaviour', 'Outstanding behaviour in all settings', 'Conducts self with maturity and grace', 'Behaviour is beyond expectations always'],
    4: ['Displays very commendable behaviour', 'Consistently good conduct in class', 'Behaves well and sets good example', 'Positive behaviour noted throughout term', 'Conduct is very pleasing and consistent'],
    3: ['Mostly well-behaved in class', 'Good behaviour with occasional lapses', 'Generally conducts self appropriately', 'Behaves well most of the time', 'Developing positive behavioural habits'],
    2: ['Behaviour improving with support', 'Conduct needs consistent monitoring', 'Still working on appropriate behaviour', 'Behaviour can be disruptive at times', 'Needs regular behavioural guidance'],
    1: ['Needs closer behavioural guidance', 'Conduct requires immediate attention', 'Behaviour is a significant concern', 'Needs firm and consistent boundaries', 'Still learning classroom behavioural norms'],
  },
  'Punctuality': {
    5: ['Always early and ready to learn', 'Never late — outstanding punctuality', 'Arrives early and fully prepared', 'A shining example of punctuality', 'Consistently on time every day'],
    4: ['Consistently prompt and prepared', 'Almost always arrives on time', 'Very good time-keeping this term', 'Punctuality is very commendable', 'Rarely late and always ready'],
    3: ['Usually arrives on time', 'Punctuality is generally satisfactory', 'Mostly prompt with few exceptions', 'Arrives on time most school days', 'Time-keeping is improving well'],
    2: ['Occasionally comes in late', 'Punctuality needs more consistency', 'Lateness has been noted several times', 'Needs improvement in time-keeping', 'Please ensure timely arrival daily'],
    1: ['Punctuality needs urgent improvement', 'Frequently arrives late to school', 'Lateness is affecting learning progress', 'Time-keeping is a serious concern', 'Must arrive on time consistently'],
  },
  'Numeracy': {
    5: ['Counts, sorts & adds brilliantly', 'Outstanding number skills for age group', 'Exceptional numeracy — loves numbers', 'Solves number problems with great ease', 'Numeracy skills far exceed expectations'],
    4: ['Recognises numbers with great ease', 'Counts confidently and correctly', 'Very good number concept development', 'Adds and sorts objects very well', 'Numeracy is a clear strength'],
    3: ['Developing good number sense', 'Making steady numeracy progress', 'Counts and recognises basic numbers', 'Number work is coming along well', 'Numeracy improving at good pace'],
    2: ['Needs extra numeracy practice', 'Number recognition still developing', 'Requires support with basic counting', 'Numeracy needs regular reinforcement', 'Practise counting at home daily'],
    1: ['Beginning to identify numbers', 'Still learning to count to ten', 'Needs one-on-one numeracy support', 'Numeracy skills need extra focus', 'Number concepts are at early stage'],
  },
  'Bible Studies': {
    5: ['Recalls Bible verses & stories eagerly', 'Outstanding knowledge of Bible lessons', 'Participates brilliantly in Bible time', 'Loves and memorises scripture with joy', 'Bible knowledge is truly remarkable'],
    4: ['Participates actively in Bible time', 'Good knowledge of Bible stories shown', 'Recalls Bible lessons with confidence', 'Engages enthusiastically with scripture', 'Very good Bible study participation'],
    3: ['Learning Bible lessons steadily', 'Shows interest in Bible stories', 'Generally participates in Bible time', 'Bible knowledge is developing well', 'Engages with scripture when guided'],
    2: ['Needs more engagement in Bible', 'Bible studies participation is limited', 'Should participate more in scripture', 'Needs encouragement during Bible time', 'Bible knowledge needs reinforcement'],
    1: ['Beginning to engage with Bible', 'Still warming up to Bible studies', 'Needs more support in scripture time', 'Bible engagement is at early stage', 'Requires patient scripture guidance'],
  },
  'Creative Play': {
    5: ['Imaginative, inventive & enthusiastic', 'Creativity is a remarkable strength', 'Leads creative play with great flair', 'Brings wonderful ideas to every activity', 'Outstanding imagination and creativity'],
    4: ['Engages creatively with great joy', 'Very creative in play activities', 'Shows strong imagination in class', 'Brings enthusiasm to all creative tasks', 'Creative skills are well developed'],
    3: ['Participates well in creative play', 'Enjoys creative activities with peers', 'Imagination is developing positively', 'Shows willingness to explore creativity', 'Creative engagement is satisfactory'],
    2: ['Needs more creative exploration', 'Creative participation is limited', 'Should engage more in art activities', 'Needs encouragement to be creative', 'Creativity developing with more support'],
    1: ['Beginning to explore creative play', 'Still warming up to creative tasks', 'Needs more exposure to creative work', 'Creative skills are at an early stage', 'Requires gentle creativity encouragement'],
  },
  'Phonics': {
    5: ['Blends sounds & reads fluently', 'Exceptional phonics skills for age', 'Identifies all letter sounds perfectly', 'Phonics mastery is truly impressive', 'Outstanding sound blending and reading'],
    4: ['Identifies letter sounds accurately', 'Very good phonics understanding shown', 'Blends sounds with good confidence', 'Strong phonics progress this term', 'Reads simple words using good phonics'],
    3: ['Building phonics skills steadily', 'Learning letter sounds progressively', 'Phonics is developing at good pace', 'Making steady progress with sounds', 'Recognises most basic letter sounds'],
    2: ['Needs phonics reinforcement daily', 'Letter sounds still being mastered', 'Phonics requires extra practice', 'Needs more support with sound blending', 'Encourage phonics practice at home'],
    1: ['Beginning to learn letter sounds', 'Still learning to identify sounds', 'Needs intensive phonics support', 'Phonics skills at very early stage', 'Requires patient one-on-one phonics help'],
  },
  'Scribbling': {
    5: ['Excellent pencil grip & control', 'Fine motor skills are outstanding', 'Draws and traces with precision', 'Pencil control far exceeds expectations', 'Exceptional hand-eye coordination shown'],
    4: ['Traces and draws with confidence', 'Good pencil grip and neat strokes', 'Fine motor skills well developed', 'Hand control is very commendable', 'Scribbling shows great coordination'],
    3: ['Developing fine motor skills well', 'Making good progress with pencil work', 'Pencil grip improving noticeably', 'Scribbling and drawing developing well', 'Fine motor skills on a positive track'],
    2: ['Needs more pencil practice', 'Pencil grip still being developed', 'Fine motor skills need more work', 'Encourage drawing and colouring at home', 'Needs support to improve pencil control'],
    1: ['Still developing pencil grip', 'Pencil control at very early stage', 'Needs intensive fine motor support', 'Hand-eye coordination needs attention', 'Requires patient fine motor guidance'],
  },
  'Social Habit': {
    5: ['Shares, cooperates & leads peers', 'Outstanding social skills for age group', 'A joy to have — loved by all peers', 'Models excellent social behaviour always', 'Socially confident, kind and helpful'],
    4: ['Relates very well with classmates', 'Very sociable and cooperative child', 'Makes friends easily and plays well', 'Good sharing and teamwork shown', 'Socially engaging and well-adjusted'],
    3: ['Gets along well with others', 'Generally good with peers in class', 'Social habits are developing nicely', 'Plays cooperatively most of the time', 'Making good social progress this term'],
    2: ['Needs support in peer relations', 'Social skills still being developed', 'Occasionally struggles to share', 'Needs guidance in group activities', 'Social habits need more encouragement'],
    1: ['Still adjusting to group play', 'Social interaction is at early stage', 'Needs patient social skills support', 'Struggles to engage well with peers', 'Requires gentle social development help'],
  },
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
  const { student, term, academicYear, comments, attendance, nextTerm, schoolName, schoolAddress } = data;
  const displaySchool = (schoolName || '').trim() || SCHOOL_NAME;
  const displayAddr = (schoolAddress || '').trim() || `${SCHOOL_ADDRESS_SINGLE} · TEL: ${SCHOOL_PHONE_DISPLAY}`;

  const NAVY = '#1a237e';
  const GOLD = '#f9a825';

  const activeRatings = data.subjects
    .filter(s => PRE_KG_SKILLS.some(ps => ps.name === (s.subject || '').trim()))
    .map(s => preKgTotalToRating(s.total))
    .filter(r => r > 0);

  const preKgTotal = activeRatings.length > 0 ? activeRatings.reduce((a, b) => a + b, 0) : null;
  const preKgAverage = activeRatings.length > 0 
    ? (preKgTotal! / activeRatings.length).toFixed(1) 
    : null;

  // Deterministic pick unless a manual override is supplied via data.preKgCommentChoices
  const nameHash = student.name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0);

  const getRatingNum = (skillName: string): number => {
    const match = data.subjects.find(s => (s.subject || '').trim() === skillName);
    if (!match || match.total === 0) return 0;
    return preKgTotalToRating(match.total);
  };

  const getRating = (skillName: string): string => {
    const rating = getRatingNum(skillName);
    if (rating === 0) return '';
    const options = PRE_KG_COMMENTS[skillName]?.[rating];
    if (!options || options.length === 0) return '';
    const choiceIdx = data.preKgCommentChoices?.[skillName];
    const idx = choiceIdx !== undefined ? choiceIdx % options.length : nameHash % options.length;
    return options[idx];
  };

  const attendancePct = attendance.totalDays > 0
    ? Math.round((attendance.daysPresent / attendance.totalDays) * 100)
    : null;

  const ageYears = student.dob
    ? new Date().getFullYear() - new Date(student.dob).getFullYear()
    : null;

  // Vivid modern balloon colors [highlight, main, dark-accent]
  const BALLOON_COLORS: [string, string, string][] = [
    ['#FFB3D9', '#FF3399', '#99004D'],  // 0 Hot Pink        — Literacy
    ['#99CCFF', '#1177EE', '#003A99'],  // 1 Electric Blue   — Understanding
    ['#FFAA88', '#FF5500', '#993300'],  // 2 Vivid Coral     — Obedience
    ['#66DDFF', '#00AADD', '#005577'],  // 3 Cyan            — Care of Self
    ['#FFE566', '#FFCC00', '#886600'],  // 4 Golden Yellow   — Individual Behaviour
    ['#FF99DD', '#EE44AA', '#880055'],  // 5 Magenta         — Punctuality
    ['#AABBFF', '#4455DD', '#111A88'],  // 6 Indigo          — Numeracy
    ['#FF9999', '#EE2222', '#880000'],  // 7 Red             — Bible Studies
    ['#FFCC77', '#FF9900', '#885500'],  // 8 Amber           — Creative Play
    ['#CC99FF', '#9933EE', '#550099'],  // 9 Purple          — Phonics
    ['#66DDBB', '#00BB88', '#006644'],  // 10 Emerald        — Scribbling
    ['#FF99AA', '#FF2255', '#880022'],  // 11 Crimson        — Social Habit
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

  const Balloon = ({ skillName, colorIdx, tilt = 0 }: { skillName: string; colorIdx: number; tilt?: number }) => {
    const [hi, mid, dark] = BALLOON_COLORS[colorIdx % BALLOON_COLORS.length];
    const comment = getRating(skillName);
    const emoji = SKILL_EMOJIS[skillName] || '🎈';
    const ratingNum = getRatingNum(skillName);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `rotate(${tilt}deg)`, transformOrigin: 'bottom center' }}>
        {/* Balloon body — large modern teardrop */}
        <div style={{
          position: 'relative',
          width: '104px',
          height: '116px',
          borderRadius: '50% 50% 44% 44% / 56% 56% 46% 46%',
          background: `radial-gradient(ellipse at 32% 22%, #fff 0%, ${hi} 10%, ${mid} 44%, ${dark} 100%)`,
          boxShadow: `0 10px 28px rgba(0,0,0,0.32), 0 3px 7px rgba(0,0,0,0.18), inset 0 -6px 12px rgba(0,0,0,0.14)`,
          border: `1.5px solid ${dark}30`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 6px 14px',
          overflow: 'hidden',
        }}>
          {/* Primary specular highlight */}
          <div style={{ position: 'absolute', top: '8px', left: '14px', width: '30px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.92)', transform: 'rotate(-22deg)', filter: 'blur(1.5px)', pointerEvents: 'none' }} />
          {/* Secondary glint */}
          <div style={{ position: 'absolute', top: '22px', left: '26px', width: '13px', height: '9px', borderRadius: '50%', background: 'rgba(255,255,255,0.62)', pointerEvents: 'none' }} />

          {/* Star rating row at top */}
          {ratingNum > 0 && (
            <div style={{ position: 'absolute', top: '5px', right: '6px', display: 'flex', gap: '1.5px', zIndex: 1 }}>
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{ fontSize: '6.5pt', color: i <= ratingNum ? '#FFD700' : 'rgba(255,255,255,0.28)', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>★</span>
              ))}
            </div>
          )}

          {/* Emoji */}
          <div style={{ fontSize: '16pt', marginBottom: '2px', zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.28))' }}>
            {emoji}
          </div>

          {/* Skill label */}
          <div style={{
            background: 'rgba(255,255,255,0.90)',
            borderRadius: '9px',
            padding: '2px 6px',
            fontWeight: 'bold', fontSize: '7pt', color: dark,
            fontFamily: "'Fredoka', sans-serif",
            textAlign: 'center', lineHeight: 1.2, zIndex: 1,
            maxWidth: '94px',
            marginBottom: comment ? '4px' : 0,
          }}>
            {skillName}
          </div>

          {/* Comment */}
          {comment && (
            <div style={{
              fontSize: '6pt', color: 'rgba(255,255,255,0.97)',
              fontFamily: "'Fredoka', sans-serif",
              textAlign: 'center', fontStyle: 'italic',
              fontWeight: '600',
              lineHeight: 1.15, zIndex: 1,
              textShadow: '0 1px 3px rgba(0,0,0,0.55)',
              maxWidth: '94px',
            }}>
              {comment}
            </div>
          )}
        </div>
        {/* Knot */}
        <div style={{ width: 0, height: 0, borderLeft: '4.5px solid transparent', borderRight: '4.5px solid transparent', borderTop: `8px solid ${dark}` }} />
        {/* Long wavy string — trajectory of take-off */}
        <svg width="22" height="16" viewBox="0 0 22 16" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M11,0 Q3,4 11,8 Q19,12 11,16" stroke={dark} strokeWidth="1.6" fill="none" opacity="0.6" />
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
      border: `2px solid ${NAVY}`,
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '190mm',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
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
      <div style={{ background: '#fff', padding: '5px 12px 3px', borderBottom: `1px solid #ddd`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo — LEFT only, as on the original card */}
          <img src={SCHOOL_LOGO_PATH} alt={displaySchool}
            style={{ width: 50, height: 50, objectFit: 'contain', flexShrink: 0 }} />

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
      <div style={{ display: 'flex', height: '6px', flexShrink: 0 }}>
        {RAINBOW.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>

      {/* Title Banner — matches "TODDLERS'S PRE-KG REPORT" on the physical card */}
      <div style={{
        background: 'linear-gradient(90deg, #fff0f8 0%, #fff9e6 50%, #f0f4ff 100%)',
        textAlign: 'center', padding: '3px 0',
        fontSize: '11pt', fontWeight: 'bold', letterSpacing: '3px',
        color: NAVY, borderBottom: `2px solid ${GOLD}`,
        flexShrink: 0,
      }}>
        🎈 TODDLER&apos;S PRE-KG REPORT 🎈
      </div>

      {/* Student Info */}
      <div style={{ background: '#fffde7', padding: '3px 12px', borderBottom: `1px solid ${GOLD}`, flexShrink: 0 }}>
        {/* Row 1 — Name, Academic Year, Age */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 0.8fr', gap: '2px 10px', marginBottom: '2px' }}>
          {[
            ['NAME', student.name.toUpperCase()],
            ['YEAR', academicYear || ''],
            ['AGE',  ageYears !== null ? `${ageYears} yr${ageYears !== 1 ? 's' : ''}` : ''],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '6.5pt', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ flex: 1, borderBottom: `1px solid ${NAVY}`, fontSize: '9pt', fontWeight: 'bold', color: '#111', paddingLeft: '4px', minWidth: '60px' }}>{val}</span>
            </div>
          ))}
        </div>
        {/* Row 2 — Term, Class, Gender, Resumption */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1.4fr', gap: '2px 6px' }}>
          {[
            ['TERM',            term],
            ['CLASS',           `${student.className}${kgColorName(student.className) ? ` · ${kgColorName(student.className)}` : ''}`],
            ['GENDER',          student.gender || ''],
            ['RESUMPTION DATE', nextTerm.begins ? fmtDate(nextTerm.begins) : ''],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '6.5pt', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ flex: 1, borderBottom: `1px solid ${NAVY}`, fontSize: '9pt', fontWeight: 'bold', color: '#111', paddingLeft: '4px', minWidth: '40px' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Balloon Section ── */}
      <div style={{ background: 'linear-gradient(160deg, #FFF5F9 0%, #FFEBF4 50%, #FFF9FC 100%)', padding: '4px 12px 2px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: 0 }}>

        {/* Row 1 — slight alternating tilts for natural float effect */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: '1px' }}>
          <Balloon skillName={PRE_KG_SKILLS[0].name} colorIdx={0} tilt={-6} />
          <Balloon skillName={PRE_KG_SKILLS[1].name} colorIdx={1} tilt={4} />
          <Balloon skillName={PRE_KG_SKILLS[2].name} colorIdx={2} tilt={-3} />
          <Balloon skillName={PRE_KG_SKILLS[3].name} colorIdx={3} tilt={5} />
          <Balloon skillName={PRE_KG_SKILLS[4].name} colorIdx={4} tilt={-5} />
        </div>

        {/* Row 2 */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: '1px' }}>
          <Balloon skillName={PRE_KG_SKILLS[5].name} colorIdx={5} tilt={4} />
          <Balloon skillName={PRE_KG_SKILLS[6].name} colorIdx={6} tilt={-4} />
          <Balloon skillName={PRE_KG_SKILLS[7].name} colorIdx={7} tilt={5} />
          <Balloon skillName={PRE_KG_SKILLS[8].name} colorIdx={8} tilt={-6} />
          <Balloon skillName={PRE_KG_SKILLS[9].name} colorIdx={9} tilt={3} />
        </div>

        {/* Row 3 — last 2 skills + child figure centred */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
          <Balloon skillName={PRE_KG_SKILLS[10].name} colorIdx={10} tilt={-5} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '2px', position: 'relative', flex: '0 0 auto' }}>
            {/* Child figure — centred in row 3 */}
            <svg width="60" height="73" viewBox="0 0 80 100" style={{ display: 'block', overflow: 'visible' }}>
              <circle cx="40" cy="22" r="13" fill="#ffdbb5" />
              <path d="M 23 22 Q 40 5 57 22 Q 40 10 23 22" fill="#5c2e0b" />
              <circle cx="28" cy="14" r="5" fill="#5c2e0b" />
              <circle cx="52" cy="14" r="5" fill="#5c2e0b" />
              <circle cx="35" cy="20" r="1.5" fill="#333" />
              <circle cx="45" cy="20" r="1.5" fill="#333" />
              <path d="M 36 26 Q 40 31 44 26" stroke="#cc3300" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle cx="31" cy="23" r="2.5" fill="#ff9999" opacity="0.75" />
              <circle cx="49" cy="23" r="2.5" fill="#ff9999" opacity="0.75" />
              <path d="M 32 35 L 18 70 L 62 70 L 48 35 Z" fill="#ff4081" />
              <path d="M 32 35 Q 40 40 48 35 Q 40 37 32 35" fill="#fff" />
              <path d="M 40 46 L 42 51 L 47 51 L 43 54 L 45 59 L 40 56 L 35 59 L 37 54 L 33 51 L 38 51 Z" fill="#ffeb3b" />
              <line x1="28" y1="42" x2="6" y2="30" stroke="#ffdbb5" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="52" y1="42" x2="74" y2="30" stroke="#ffdbb5" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="33" y1="70" x2="33" y2="88" stroke="#ffdbb5" strokeWidth="4" strokeLinecap="round" />
              <line x1="47" y1="70" x2="47" y2="88" stroke="#ffdbb5" strokeWidth="4" strokeLinecap="round" />
              <path d="M 28 88 C 28 84, 38 84, 38 88 Z" fill="#c2185b" />
              <path d="M 42 88 C 42 84, 52 84, 52 88 Z" fill="#c2185b" />
            </svg>
            <div style={{ fontSize: '6.5pt', color: NAVY, fontWeight: 'bold', fontFamily: "'Fredoka', sans-serif", textAlign: 'center', marginTop: '3px', lineHeight: 1.2 }}>
              🌟 {SCHOOL_CITY_TAGLINE} 🌟
            </div>
          </div>
          <Balloon skillName={PRE_KG_SKILLS[11].name} colorIdx={11} tilt={5} />
        </div>
      </div>

      {/* Rating Key */}
      <div style={{ background: '#fdf0f7', padding: '2px 12px', borderTop: `1px solid #e8d0e0`, borderBottom: `2px solid ${NAVY}`, display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '6.5pt', alignItems: 'center', flexShrink: 0 }}>
        <strong style={{ color: NAVY, fontFamily: "'Fredoka', sans-serif" }}>RATING KEY:</strong>
        {[
          ['5 — Excellent',         '#FF80B3', '#fff'],
          ['4 — Very Good',         '#5B9BD5', '#fff'],
          ['3 — Good',              '#44AAAA', '#fff'],
          ['2 — Fair',              '#FFCC44', '#222'],
          ['1 — Needs Improvement', '#FF8866', '#fff'],
        ].map(([label, bg, color]) => (
          <span key={label} style={{ background: bg, color, padding: '1px 8px', borderRadius: '12px', fontWeight: 'bold', fontFamily: "'Fredoka', sans-serif" }}>
            {label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '5.5pt', color: '#aaa', fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>
          Computer-generated · {SCHOOL_CITY_TAGLINE}
        </span>
      </div>

      {/* Footer */}
      <div style={{ padding: '4px 12px 4px', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '12px', alignItems: 'start' }}>

          {/* Teacher Comment */}
          <div>
            <div style={{ fontWeight: 'bold', color: NAVY, fontSize: '7.5pt', marginBottom: '2px', fontFamily: "'Fredoka', sans-serif" }}>Class Teacher&apos;s Comment:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '18px', fontSize: '8pt', fontStyle: 'italic', fontWeight: '600', paddingLeft: '4px', lineHeight: '18px' }}>
              {comments.teacher}
            </div>
            <div style={{ marginTop: '4px' }}>
              <div style={{ borderTop: `1px solid ${NAVY}`, paddingTop: '2px', fontSize: '6.5pt', fontWeight: 'bold', color: NAVY }}>Signature &amp; Date</div>
            </div>
          </div>

          {/* Attendance */}
          <div style={{ fontSize: '7pt' }}>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '1px' }}>No. of times opened:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '13px', fontSize: '8pt', paddingLeft: '4px', fontWeight: 'bold' }}>
                {attendance.totalDays || ''}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '1px' }}>No. of times absent:</div>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: '13px', fontSize: '8pt', paddingLeft: '4px', fontWeight: 'bold' }}>
                {attendance.daysAbsent || ''}
              </div>
            </div>
            {attendancePct !== null && (
              <div style={{ marginTop: '2px', fontSize: '7pt', color: '#555', fontWeight: 'bold' }}>Attendance: {attendancePct}%</div>
            )}
          </div>

          {/* Proprietress Comment */}
          <div>
            <div style={{ fontWeight: 'bold', color: NAVY, fontSize: '7.5pt', marginBottom: '2px', fontFamily: "'Fredoka', sans-serif" }}>Proprietress Comment:</div>
            <div style={{ borderBottom: '1px dotted #888', minHeight: '18px', fontSize: '8pt', fontStyle: 'italic', fontWeight: '600', paddingLeft: '4px', lineHeight: '18px' }}>
              {comments.principal}
            </div>
            <div style={{ marginTop: '4px' }}>
              <div style={{ borderTop: `1px solid ${NAVY}`, paddingTop: '2px', fontSize: '6.5pt', fontWeight: 'bold', color: NAVY }}>Signature &amp; Date</div>
            </div>
          </div>

          {/* Overall Evaluation */}
          <div style={{ fontSize: '7pt', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '2px', textAlign: 'center' }}>Overall Evaluation</div>
            {preKgAverage !== null ? (() => {
              const r = Math.round(parseFloat(preKgAverage));
              const wordMap: Record<number, string> = { 5: 'Excellent', 4: 'Very Good', 3: 'Good', 2: 'Fair', 1: 'Needs Improvement' };
              const colorMap: Record<number, [string, string]> = {
                5: ['#16a34a', '#dcfce7'], 4: ['#1d4ed8', '#dbeafe'],
                3: ['#0f766e', '#ccfbf1'], 2: ['#a16207', '#fef9c3'],
                1: ['#b91c1c', '#fee2e2'],
              };
              const [fg, bg] = colorMap[r] ?? ['#555', '#f1f5f9'];
              return (
                <div style={{ background: bg, color: fg, border: `1.5px solid ${fg}`, borderRadius: '6px', padding: '2px 8px', fontWeight: 'bold', fontSize: '7.5pt', textAlign: 'center', fontFamily: "'Fredoka', sans-serif" }}>
                  {wordMap[r] ?? '—'}
                </div>
              );
            })() : null}
            {preKgAverage !== null && (
              <div style={{ color: '#666', fontSize: '6.5pt', textAlign: 'center' }}>
                Avg: {preKgAverage} / 5.0
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom rainbow stripe */}
      <div style={{ display: 'flex', height: '4px', flexShrink: 0 }}>
        {RAINBOW.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>

      {/* ══ FEES FOOTER BAR ══ */}
      <div style={{ background: NAVY, color: '#fff', padding: '3px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7pt', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
        {nextTerm.begins && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>School Re-opens:</span>
            <span style={{ fontWeight: 'bold' }}>{fmtDate(nextTerm.begins)}</span>
          </span>
        )}
        {nextTerm.fees && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>Next Term Fees:</span>
            <span style={{ fontWeight: 'bold' }}>{nextTerm.fees}</span>
          </span>
        )}
        {nextTerm.outstandingFees && (
          <span>
            <span style={{ opacity: 0.65, marginRight: '4px' }}>Outstanding Balance:</span>
            <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{nextTerm.outstandingFees}</span>
          </span>
        )}
        <span style={{ opacity: 0.5, fontSize: '6pt' }}>{displaySchool}</span>
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
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
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
