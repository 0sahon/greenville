/**
 * gmsPrint.ts — Official Greenville Montessori Schools Print Library
 * Generates fully-branded, print-ready HTML documents for:
 *   1. Promotion Certificate
 *   2. Result Analysis Report
 *   3. Class Timetable
 *
 * All documents use Forest Green (#1a5c38) / Gold (#c8960c) palette,
 * Google Fonts (Inter + Merriweather), and A4 page sizing.
 */

import {
  SCHOOL_NAME,
  SCHOOL_ADDRESS_LINE1,
  SCHOOL_ADDRESS_LINE2,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_EMAIL_INFO,
  SCHOOL_WEBSITE,
  SCHOOL_LOGO_PATH,
  SCHOOL_CITY_TAGLINE,
} from '../config/schoolBrand';

/* ─── Brand tokens ─────────────────────────────────────────────── */
const GMS_GREEN  = '#1a5c38';
const GMS_GOLD   = '#c8960c';
const GMS_LIGHT  = '#e8f5ee';
const GMS_BORDER = '#2e7d52';

/* ─── Shared helpers ───────────────────────────────────────────── */
function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso?: string | null): string {
  if (!iso) return new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function openPrint(html: string, _title: string): void {
  const w = window.open('', '_blank', 'width=1100,height=850,noopener,noreferrer');
  if (!w) { alert('Please allow pop-ups to print this document.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 700);
}

/** Shared branded letterhead HTML (inline styles for print safety) */
function letterhead(subtitle?: string): string {
  return `
  <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 28px 14px;border-bottom:3px solid ${GMS_GREEN};background:${GMS_LIGHT};">
    <img src="${SCHOOL_LOGO_PATH}" alt="GMS Logo"
      style="width:72px;height:72px;object-fit:contain;flex-shrink:0;border-radius:4px;" />
    <div style="flex:1;">
      <div style="font-size:19pt;font-weight:900;color:${GMS_GREEN};letter-spacing:0.5px;line-height:1.1;">
        ${esc(SCHOOL_NAME.toUpperCase())}
      </div>
      <div style="font-size:9pt;color:${GMS_GOLD};font-weight:700;margin-top:2px;letter-spacing:0.3px;">
        ●DAY CARE ●PRE-SCHOOL ●NURSERY ●PRIMARY
      </div>
      ${subtitle ? `<div style="font-size:10pt;font-weight:700;color:${GMS_GREEN};margin-top:4px;">${esc(subtitle)}</div>` : ''}
    </div>
    <div style="text-align:right;font-size:7.5pt;color:#333;line-height:1.7;flex-shrink:0;max-width:190px;">
      <div>${esc(SCHOOL_ADDRESS_LINE1)}</div>
      <div>${esc(SCHOOL_ADDRESS_LINE2)}</div>
      <div>Tel: ${esc(SCHOOL_PHONE_DISPLAY)}</div>
      <div>${esc(SCHOOL_EMAIL_INFO)}</div>
      <div>${esc(SCHOOL_WEBSITE)}</div>
    </div>
  </div>`;
}

/** Common <head> with fonts + print CSS */
function docHead(title: string, landscape = false): string {
  const size = landscape ? 'A4 landscape' : 'A4 portrait';
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Merriweather:ital,wght@0,700;1,400&display=swap" rel="stylesheet">
<style>
  @page { size: ${size}; margin: 8mm 10mm; }
  * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:'Inter',Arial,sans-serif; font-size:10pt; color:#111; background:#fff; }
  table { width:100%; border-collapse:collapse; }
  th,td { border:1px solid #ccc; padding:4px 6px; }
  .no-print { display:none !important; }
  @media screen {
    body { max-width:900px; margin:0 auto; padding:16px; background:#f0f0f0; }
    .page { background:#fff; box-shadow:0 2px 24px rgba(0,0,0,0.14); border-radius:4px; overflow:hidden; }
  }
</style>
</head><body><div class="page">`;
}

function docFoot(): string {
  return `<div style="text-align:center;font-size:7pt;color:#aaa;padding:6px 0;margin-top:8px;border-top:1px solid #eee;">
    Computer-generated document · ${esc(SCHOOL_NAME)} · ${esc(SCHOOL_CITY_TAGLINE)} · ${esc(SCHOOL_WEBSITE)}
  </div>
</div></body></html>`;
}

/* ══════════════════════════════════════════════════════════════════
   1. PROMOTION CERTIFICATE
══════════════════════════════════════════════════════════════════ */
export interface PromotionCertData {
  studentName: string;
  admissionNo: string;
  fromClass: string;
  toClass: string;
  academicYear: string;
  term?: string;
  position?: number;
  totalStudents?: number;
  average?: number;
  principalName?: string;
  issueDate?: string;
}

export function printPromotionCertificate(data: PromotionCertData): void {
  const issueDate = fmtDate(data.issueDate);
  const certNo = `GMS-PROM-${Date.now().toString(36).toUpperCase()}`;

  const html = docHead(`Promotion Certificate — ${data.studentName}`) + `
  ${letterhead('OFFICIAL PROMOTION CERTIFICATE')}

  <!-- Gold strip -->
  <div style="background:${GMS_GOLD};color:#fff;text-align:center;padding:6px;font-size:8.5pt;font-weight:700;letter-spacing:1px;">
    ACADEMIC ACHIEVEMENT & CLASS PROMOTION
  </div>

  <!-- Body -->
  <div style="padding:28px 36px;">

    <!-- Decorative border -->
    <div style="border:3px double ${GMS_GREEN};border-radius:6px;padding:28px 32px;position:relative;">
      <!-- Corner ornaments -->
      <div style="position:absolute;top:-1px;left:-1px;width:20px;height:20px;border-top:6px solid ${GMS_GOLD};border-left:6px solid ${GMS_GOLD};border-radius:3px 0;"></div>
      <div style="position:absolute;top:-1px;right:-1px;width:20px;height:20px;border-top:6px solid ${GMS_GOLD};border-right:6px solid ${GMS_GOLD};border-radius:0 3px;"></div>
      <div style="position:absolute;bottom:-1px;left:-1px;width:20px;height:20px;border-bottom:6px solid ${GMS_GOLD};border-left:6px solid ${GMS_GOLD};border-radius:0 0 0 3px;"></div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:20px;height:20px;border-bottom:6px solid ${GMS_GOLD};border-right:6px solid ${GMS_GOLD};border-radius:0 0 3px 0;"></div>

      <p style="text-align:center;font-family:'Merriweather',Georgia,serif;font-size:11pt;color:#555;font-style:italic;margin-bottom:18px;">
        This is to certify that
      </p>

      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-family:'Merriweather',Georgia,serif;font-size:26pt;font-weight:700;color:${GMS_GREEN};letter-spacing:1px;border-bottom:2px solid ${GMS_GOLD};display:inline-block;padding-bottom:4px;">
          ${esc(data.studentName)}
        </div>
        <div style="font-size:9pt;color:#666;margin-top:6px;">Admission No: <strong>${esc(data.admissionNo)}</strong></div>
      </div>

      <p style="text-align:center;font-size:12pt;color:#333;line-height:1.8;margin-bottom:20px;">
        having successfully completed the <strong style="color:${GMS_GREEN};">${esc(data.academicYear)}</strong> academic session
        ${data.term ? `(${esc(data.term)})` : ''}
        and met all the requirements for advancement, is hereby
        <br/><span style="font-size:13pt;font-weight:700;color:${GMS_GREEN};">PROMOTED</span>
      </p>

      <!-- From → To -->
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin:20px 0 24px;">
        <div style="text-align:center;background:${GMS_LIGHT};border:2px solid ${GMS_BORDER};border-radius:8px;padding:14px 28px;">
          <div style="font-size:8pt;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">From</div>
          <div style="font-size:16pt;font-weight:800;color:${GMS_GREEN};margin-top:4px;">${esc(data.fromClass)}</div>
        </div>
        <div style="font-size:28pt;color:${GMS_GOLD};font-weight:900;">→</div>
        <div style="text-align:center;background:${GMS_GREEN};border:2px solid ${GMS_BORDER};border-radius:8px;padding:14px 28px;">
          <div style="font-size:8pt;color:rgba(255,255,255,0.7);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">To</div>
          <div style="font-size:16pt;font-weight:800;color:#fff;margin-top:4px;">${esc(data.toClass)}</div>
        </div>
      </div>

      <!-- Stats row if available -->
      ${(data.position || data.average) ? `
      <div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px;">
        ${data.position ? `<div style="text-align:center;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:10px 20px;">
          <div style="font-size:8pt;color:#888;font-weight:600;text-transform:uppercase;">Class Position</div>
          <div style="font-size:18pt;font-weight:800;color:${GMS_GREEN};">${esc(data.position)}${ordinal(data.position)}</div>
          ${data.totalStudents ? `<div style="font-size:8pt;color:#999;">of ${esc(data.totalStudents)} students</div>` : ''}
        </div>` : ''}
        ${data.average ? `<div style="text-align:center;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:10px 20px;">
          <div style="font-size:8pt;color:#888;font-weight:600;text-transform:uppercase;">Average Score</div>
          <div style="font-size:18pt;font-weight:800;color:${GMS_GOLD};">${esc(Math.round(data.average))}%</div>
        </div>` : ''}
      </div>` : ''}

      <!-- Signatures -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:20px;border-top:1px solid #e0e0e0;">
        <div style="text-align:center;min-width:160px;">
          <div style="height:48px;"></div>
          <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">Class Teacher's Signature</div>
        </div>
        <div style="text-align:center;">
          <img src="${SCHOOL_LOGO_PATH}" alt="Stamp" style="width:64px;height:64px;object-fit:contain;opacity:0.18;" />
          <div style="font-size:7.5pt;color:#aaa;margin-top:2px;">Official Seal</div>
        </div>
        <div style="text-align:center;min-width:160px;">
          <div style="height:48px;"></div>
          <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">
            ${data.principalName ? esc(data.principalName) + '<br/>' : ''}Head of School / Proprietress
          </div>
        </div>
      </div>
    </div>

    <!-- Issue info -->
    <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:7.5pt;color:#999;">
      <span>Cert. No: ${esc(certNo)}</span>
      <span>Issued: ${esc(issueDate)}</span>
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Promotion Certificate — ${data.studentName}`);
}

function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ══════════════════════════════════════════════════════════════════
   2. RESULT ANALYSIS REPORT
══════════════════════════════════════════════════════════════════ */
export interface SubjectAnalysis {
  subject: string;
  highest: number;
  lowest: number;
  average: number;
  passCount: number;
  failCount: number;
  totalStudents: number;
}

export interface ResultAnalysisData {
  className: string;
  term: string;
  academicYear: string;
  totalStudents: number;
  passCount: number;
  failCount: number;
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  topStudents: Array<{ name: string; total: number; position: number }>;
  subjectAnalysis: SubjectAnalysis[];
  generatedBy?: string;
}

export function printResultAnalysis(data: ResultAnalysisData): void {
  const passRate = data.totalStudents > 0 ? Math.round((data.passCount / data.totalStudents) * 100) : 0;

  const subjectRows = data.subjectAnalysis.map((s, i) => {
    const subPassRate = s.totalStudents > 0 ? Math.round((s.passCount / s.totalStudents) * 100) : 0;
    const barW = Math.max(4, subPassRate);
    const barColor = subPassRate >= 70 ? GMS_GREEN : subPassRate >= 50 ? GMS_GOLD : '#dc2626';
    return `<tr style="background:${i % 2 === 0 ? '#fff' : GMS_LIGHT};">
      <td style="font-weight:600;padding:5px 8px;font-size:8.5pt;">${esc(s.subject)}</td>
      <td style="text-align:center;">${esc(Math.round(s.average))}</td>
      <td style="text-align:center;font-weight:700;color:${GMS_GREEN};">${esc(s.highest)}</td>
      <td style="text-align:center;color:#dc2626;">${esc(s.lowest)}</td>
      <td style="text-align:center;color:${GMS_GREEN};">${esc(s.passCount)}</td>
      <td style="text-align:center;color:#dc2626;">${esc(s.failCount)}</td>
      <td style="padding:5px 8px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="flex:1;height:10px;background:#eee;border-radius:5px;overflow:hidden;">
            <div style="width:${barW}%;height:100%;background:${barColor};border-radius:5px;"></div>
          </div>
          <span style="font-size:7.5pt;font-weight:700;color:${barColor};min-width:28px;">${subPassRate}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  const topRows = data.topStudents.slice(0, 10).map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : GMS_LIGHT};">
      <td style="text-align:center;font-weight:800;color:${i < 3 ? GMS_GOLD : GMS_GREEN};">${esc(s.position)}${ordinal(s.position)}</td>
      <td style="font-weight:600;padding:4px 8px;">${esc(s.name)}</td>
      <td style="text-align:center;font-weight:700;color:${GMS_GREEN};">${esc(Math.round(s.total))}</td>
    </tr>`).join('');

  const html = docHead(`Result Analysis — ${data.className} · ${data.term} ${data.academicYear}`) + `
  ${letterhead('RESULT ANALYSIS REPORT')}

  <div style="background:${GMS_GREEN};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:8px 20px;">
    <span style="font-size:11pt;font-weight:700;">${esc(data.className)} &nbsp;·&nbsp; ${esc(data.term)} &nbsp;·&nbsp; ${esc(data.academicYear)}</span>
    <span style="font-size:8pt;opacity:0.8;">Generated: ${fmtDate()}</span>
  </div>

  <!-- Summary KPIs -->
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0;border-bottom:2px solid ${GMS_GREEN};">
    ${[
      ['Total Students', data.totalStudents, '#fff'],
      ['Passed', data.passCount, '#f0fdf4'],
      ['Failed', data.failCount, '#fff5f5'],
      ['Pass Rate', passRate + '%', '#f0fdf4'],
      ['Class Avg', Math.round(data.classAverage) + '%', '#fff'],
      ['Highest', data.highestScore, GMS_LIGHT],
    ].map(([label, val, bg]) => `
    <div style="text-align:center;padding:14px 8px;background:${bg};border-right:1px solid #e0e0e0;">
      <div style="font-size:7pt;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:700;">${label}</div>
      <div style="font-size:18pt;font-weight:800;color:${GMS_GREEN};margin-top:2px;">${val}</div>
    </div>`).join('')}
  </div>

  <div style="display:grid;grid-template-columns:2fr 1fr;padding:16px 20px;gap:16px;">

    <!-- Subject Analysis Table -->
    <div>
      <div style="font-weight:800;font-size:9.5pt;color:${GMS_GREEN};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${GMS_GOLD};">
        Subject Performance Analysis
      </div>
      <table style="font-size:8pt;">
        <thead>
          <tr style="background:${GMS_GREEN};color:#fff;">
            <th style="text-align:left;padding:5px 8px;">Subject</th>
            <th>Avg</th>
            <th>High</th>
            <th>Low</th>
            <th>Pass</th>
            <th>Fail</th>
            <th style="text-align:left;padding:5px 8px;">Pass Rate</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
      </table>
    </div>

    <!-- Top Performers + Stats -->
    <div style="display:flex;flex-direction:column;gap:16px;">
      <!-- Top Performers -->
      <div>
        <div style="font-weight:800;font-size:9.5pt;color:${GMS_GREEN};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${GMS_GOLD};">
          🏆 Top Performers
        </div>
        <table style="font-size:8pt;">
          <thead>
            <tr style="background:${GMS_GREEN};color:#fff;">
              <th style="text-align:center;width:40px;">Pos</th>
              <th style="text-align:left;padding:4px 8px;">Student</th>
              <th style="text-align:center;">Total</th>
            </tr>
          </thead>
          <tbody>${topRows}</tbody>
        </table>
      </div>

      <!-- Grade Distribution -->
      <div>
        <div style="font-weight:800;font-size:9.5pt;color:${GMS_GREEN};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${GMS_GOLD};">
          Score Range
        </div>
        <div style="font-size:8pt;background:${GMS_LIGHT};border:1px solid ${GMS_BORDER};border-radius:6px;padding:12px;">
          ${[
            ['Highest Score', data.highestScore, GMS_GREEN],
            ['Class Average', Math.round(data.classAverage) + '%', GMS_GOLD],
            ['Lowest Score', data.lowestScore, '#dc2626'],
          ].map(([label, val, color]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #ddd;">
            <span style="color:#666;">${label}</span>
            <strong style="color:${color};">${val}</strong>
          </div>`).join('')}
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#666;">Pass / Fail Split</span>
            <span style="font-weight:700;">${data.passCount} / ${data.failCount}</span>
          </div>
        </div>
      </div>

      <!-- Remarks box -->
      <div>
        <div style="font-weight:800;font-size:9.5pt;color:${GMS_GREEN};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${GMS_GOLD};">
          Head of School's Remarks
        </div>
        <div style="border:1px solid #ccc;border-radius:6px;padding:10px;min-height:60px;font-size:8pt;color:#999;font-style:italic;">
          &nbsp;
        </div>
        <div style="margin-top:30px;border-top:1px solid #333;padding-top:3px;font-size:8pt;text-align:center;">
          — Signature & Date —
        </div>
      </div>
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Result Analysis — ${data.className}`);
}

/* ══════════════════════════════════════════════════════════════════
   3. CLASS TIMETABLE
══════════════════════════════════════════════════════════════════ */
export interface TimetableSlot {
  period: number;
  day: string;
  subject: string;
  teacherName?: string;
  startTime: string;
  endTime: string;
}

export interface TimetablePrintData {
  className: string;
  term: string;
  academicYear: string;
  slots: TimetableSlot[];
}

const PRINT_SCHEDULE = [
  { period: null, label: 'Assembly & Circle Time',   start: '07:45', end: '08:00', breakType: 'assembly' },
  { period: 1,    label: 'Period 1',                 start: '08:00', end: '08:45' },
  { period: 2,    label: 'Period 2',                 start: '08:45', end: '09:30' },
  { period: null, label: '☕ Morning Recess',         start: '09:30', end: '09:45', breakType: 'recess' },
  { period: 3,    label: 'Period 3',                 start: '09:45', end: '10:30' },
  { period: 4,    label: 'Period 4',                 start: '10:30', end: '11:15' },
  { period: 5,    label: 'Period 5',                 start: '11:15', end: '12:00' },
  { period: null, label: '🍽️ Lunch Break',           start: '12:00', end: '12:45', breakType: 'lunch' },
  { period: 6,    label: 'Period 6',                 start: '12:45', end: '13:30' },
  { period: 7,    label: 'Period 7',                 start: '13:30', end: '14:15' },
  { period: 8,    label: 'Period 8',                 start: '14:15', end: '15:00' },
  { period: null, label: '🔔 School Closing',        start: '15:00', end: '15:00', breakType: 'closing' },
] as const;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const PRINT_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { bg: '#ede9fe', border: '#c4b5fd', text: '#4c1d95' },
  { bg: '#fee2e2', border: '#fca5a5', text: '#7f1d1d' },
  { bg: '#ccfbf1', border: '#5eead4', text: '#134e4a' },
  { bg: '#ffedd5', border: '#fdba74', text: '#7c2d12' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
];

function slotColor(subject: string) {
  const idx = Math.abs([...subject].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % PRINT_COLORS.length;
  return PRINT_COLORS[idx];
}

export function printTimetable(data: TimetablePrintData): void {
  // Build grid
  const grid: Record<string, Record<number, TimetableSlot>> = {};
  DAYS.forEach(d => { grid[d] = {}; });
  data.slots.forEach(s => { if (grid[s.day]) grid[s.day][s.period] = s; });

  // Subject color map (consistent across the page)
  const subjectMap: Record<string, typeof PRINT_COLORS[0]> = {};
  data.slots.forEach(s => { if (!subjectMap[s.subject]) subjectMap[s.subject] = slotColor(s.subject); });

  const breakStyles: Record<string, string> = {
    assembly: `background:#fffbeb;border-left:5px solid #f59e0b;`,
    recess:   `background:#f0fdfa;border-left:5px solid #14b8a6;`,
    lunch:    `background:#fff7ed;border-left:5px solid #f97316;`,
    closing:  `background:${GMS_LIGHT};border-left:5px solid ${GMS_GREEN};`,
  };

  const rows = PRINT_SCHEDULE.map(sp => {
    if (sp.period === null) {
      const bt = (sp as { breakType?: string }).breakType ?? 'assembly';
      return `<tr>
        <td colspan="6" style="${breakStyles[bt]}padding:5px 10px;font-size:8.5pt;font-weight:700;">
          ${esc(sp.label)}
          ${bt !== 'closing' ? `<span style="font-weight:400;color:#666;margin-left:8px;font-size:7.5pt;">${esc(sp.start)} – ${esc(sp.end)}</span>` : `<span style="font-weight:700;color:${GMS_GREEN};margin-left:8px;">3:00 PM</span>`}
        </td>
      </tr>`;
    }
    const cells = DAYS.map(day => {
      const slot = grid[day]?.[sp.period!];
      if (!slot) return `<td style="border:1px solid #e0e0e0;height:52px;background:#fafafa;"></td>`;
      const c = subjectMap[slot.subject] ?? PRINT_COLORS[0];
      return `<td style="border:1px solid #e0e0e0;padding:4px 5px;vertical-align:top;background:${c.bg};">
        <div style="font-weight:700;font-size:8pt;color:${c.text};border-left:3px solid ${c.border};padding-left:4px;line-height:1.3;">${esc(slot.subject)}</div>
        ${slot.teacherName ? `<div style="font-size:6.5pt;color:#666;margin-top:2px;">👤 ${esc(slot.teacherName)}</div>` : ''}
        <div style="font-size:6.5pt;color:#999;margin-top:1px;">⏱ ${esc(slot.startTime.slice(0,5))}–${esc(slot.endTime.slice(0,5))}</div>
      </td>`;
    }).join('');

    return `<tr>
      <td style="border:1px solid #e0e0e0;text-align:center;background:${GMS_LIGHT};padding:4px;font-size:8pt;">
        <strong style="color:${GMS_GREEN};">P${sp.period}</strong><br/>
        <span style="font-size:6.5pt;color:#888;">${esc(sp.start)}</span>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  // Subject legend
  const legend = Object.entries(subjectMap).map(([sub, c]) =>
    `<div style="display:flex;align-items:center;gap:5px;">
      <div style="width:12px;height:12px;border-radius:3px;background:${c.bg};border:2px solid ${c.border};flex-shrink:0;"></div>
      <span style="font-size:7.5pt;color:${c.text};font-weight:600;">${esc(sub)}</span>
    </div>`
  ).join('');

  const html = docHead(`Timetable — ${data.className} · ${data.term}`, true) + `
  ${letterhead('OFFICIAL CLASS TIMETABLE')}

  <div style="background:${GMS_GREEN};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:7px 20px;">
    <span style="font-size:11pt;font-weight:700;">${esc(data.className)} &nbsp;·&nbsp; ${esc(data.term)} &nbsp;·&nbsp; ${esc(data.academicYear)}</span>
    <span style="font-size:8pt;opacity:0.8;">School Hours: 7:45 AM – 3:00 PM</span>
  </div>

  <div style="padding:12px 16px;">
    <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
      <thead>
        <tr style="background:${GMS_GREEN};">
          <th style="color:#fff;padding:7px 5px;font-size:8pt;text-align:center;width:52px;border:1px solid ${GMS_BORDER};">Time</th>
          ${DAYS.map(d => `<th style="color:#fff;padding:7px 5px;font-size:9pt;text-align:center;border:1px solid ${GMS_BORDER};font-weight:700;">${esc(d)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- Legend + signatures -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0 16px 12px;gap:20px;">
    <div style="flex:1;">
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:${GMS_GREEN};margin-bottom:6px;">Subject Key</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">${legend}</div>
    </div>
    <div style="display:flex;gap:32px;">
      <div style="text-align:center;">
        <div style="height:40px;"></div>
        <div style="border-top:1px solid #333;padding-top:3px;font-size:7.5pt;">Class Teacher</div>
      </div>
      <div style="text-align:center;">
        <div style="height:40px;"></div>
        <div style="border-top:1px solid #333;padding-top:3px;font-size:7.5pt;">Head of School</div>
      </div>
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Timetable — ${data.className}`);
}

/* ══════════════════════════════════════════════════════════════════
   4. ADMISSION OFFER LETTER
══════════════════════════════════════════════════════════════════ */
export interface AdmissionLetterData {
  refNo: string;
  childName: string;
  childDob?: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentAddress?: string | null;
  program: string;
  offerDate?: string | null;
  resumptionDate?: string | null;
  fees?: string | null;
  principalName?: string;
}

export function printAdmissionLetter(data: AdmissionLetterData): void {
  const ref = data.refNo || `GMS-ADM-${Date.now().toString(36).toUpperCase()}`;
  const offerDate = fmtDate(data.offerDate);
  const resumption = data.resumptionDate ? fmtDate(data.resumptionDate) : '________________';

  const html = docHead(`Admission Letter — ${data.childName}`) + `
  ${letterhead('OFFICE OF THE PROPRIETRESS')}

  <div style="background:${GMS_GREEN};color:#fff;text-align:center;padding:6px;font-size:8.5pt;font-weight:700;letter-spacing:1px;">
    OFFER OF ADMISSION — ${esc(data.program.toUpperCase())}
  </div>

  <div style="padding:24px 36px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div style="font-size:8.5pt;line-height:2;">
        <div><strong>Ref No:</strong> ${esc(ref)}</div>
        <div><strong>Date:</strong> ${esc(offerDate)}</div>
      </div>
      <div style="font-size:8.5pt;text-align:right;line-height:2;">
        <div><strong>${esc(data.parentName)}</strong></div>
        ${data.parentAddress ? `<div>${esc(data.parentAddress)}</div>` : ''}
        <div>${esc(data.parentEmail)}</div>
        <div>${esc(data.parentPhone)}</div>
      </div>
    </div>

    <div style="font-size:9pt;line-height:1.9;color:#333;">
      <p style="margin-bottom:14px;">Dear <strong>${esc(data.parentName)}</strong>,</p>

      <p style="margin-bottom:14px;">
        We are pleased to inform you that following a review of your ward's application,
        the Management of <strong style="color:${GMS_GREEN};">${esc(SCHOOL_NAME)}</strong>
        is delighted to offer a place of admission to:
      </p>

      <div style="background:${GMS_LIGHT};border:2px solid ${GMS_GREEN};border-radius:8px;padding:16px 24px;margin:16px 0;text-align:center;">
        <div style="font-size:18pt;font-weight:800;color:${GMS_GREEN};">${esc(data.childName)}</div>
        ${data.childDob ? `<div style="font-size:8.5pt;color:#666;margin-top:4px;">Date of Birth: ${fmtDate(data.childDob)}</div>` : ''}
        <div style="margin-top:10px;display:inline-block;background:${GMS_GOLD};color:#fff;padding:4px 20px;border-radius:20px;font-size:9pt;font-weight:700;">
          ${esc(data.program)}
        </div>
      </div>

      <p style="margin-bottom:14px;">
        This offer is subject to the following conditions being met before the resumption date:
      </p>

      <ol style="padding-left:20px;margin-bottom:16px;line-height:2;">
        <li>Payment of all required school fees and levies.</li>
        <li>Submission of complete medical and immunisation records.</li>
        <li>Presentation of original birth certificate and two passport photographs.</li>
        <li>Completion and return of the Enrollment/Registration form.</li>
        ${data.fees ? `<li>Fees payable: <strong>${esc(data.fees)}</strong></li>` : ''}
      </ol>

      <div style="background:#fffbeb;border-left:4px solid ${GMS_GOLD};padding:10px 16px;margin-bottom:16px;border-radius:0 6px 6px 0;">
        <strong>Resumption Date:</strong> <span style="color:${GMS_GREEN};font-weight:700;">${resumption}</span><br/>
        Please ensure your ward reports on or before this date, fully kitted in the school uniform.
      </div>

      <p style="margin-bottom:14px;">
        We look forward to welcoming <strong>${esc(data.childName)}</strong> to the
        ${esc(SCHOOL_NAME)} family, where we are committed to providing a rich
        Montessori education that nurtures the whole child.
      </p>

      <p>Yours faithfully,</p>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:36px;">
      <div style="text-align:center;">
        <div style="height:52px;"></div>
        <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">
          ${data.principalName ? esc(data.principalName) + '<br/>' : ''}
          <strong>Proprietress / Head of School</strong><br/>
          ${esc(SCHOOL_NAME)}
        </div>
      </div>
      <div style="text-align:center;">
        <img src="${SCHOOL_LOGO_PATH}" alt="Seal" style="width:60px;height:60px;object-fit:contain;opacity:0.15;" />
        <div style="font-size:7pt;color:#aaa;">School Seal</div>
      </div>
    </div>

    <div style="margin-top:20px;padding:10px;background:#f9f9f9;border:1px dashed #ccc;border-radius:6px;font-size:7.5pt;color:#666;text-align:center;">
      This letter is computer-generated. Ref: ${esc(ref)} · ${esc(SCHOOL_NAME)} · ${esc(SCHOOL_ADDRESS_LINE1)}, ${esc(SCHOOL_ADDRESS_LINE2)}
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Admission Letter — ${data.childName}`);
}

/* ══════════════════════════════════════════════════════════════════
   5. STUDENT ID CARD (Batch print — up to 8 per A4 sheet)
══════════════════════════════════════════════════════════════════ */
export interface StudentIdData {
  studentName: string;
  admissionNo: string;
  className: string;
  level: string;
  academicYear: string;
  gender?: string | null;
  dob?: string | null;
  bloodGroup?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  emergencyPhone?: string | null;
}

export function printStudentIdCards(students: StudentIdData[]): void {
  const cards = students.map(s => `
  <div style="
    width:85mm;height:54mm;border:2px solid ${GMS_GREEN};border-radius:8px;
    overflow:hidden;display:inline-flex;flex-direction:column;
    font-family:'Inter',Arial,sans-serif;box-shadow:0 1px 6px rgba(0,0,0,0.12);
    margin:3mm;vertical-align:top;background:#fff;
  ">
    <!-- Top green bar -->
    <div style="background:${GMS_GREEN};padding:4px 8px;display:flex;align-items:center;gap:6px;">
      <img src="${SCHOOL_LOGO_PATH}" alt="GMS" style="width:22px;height:22px;object-fit:contain;border-radius:2px;background:#fff;padding:1px;" />
      <div>
        <div style="color:#fff;font-size:6.5pt;font-weight:800;letter-spacing:0.3px;line-height:1.2;">${esc(SCHOOL_NAME.toUpperCase())}</div>
        <div style="color:${GMS_GOLD};font-size:5.5pt;font-weight:600;">STUDENT IDENTITY CARD</div>
      </div>
    </div>
    <!-- Body -->
    <div style="flex:1;display:flex;padding:5px 8px;gap:8px;">
      <!-- Photo placeholder -->
      <div style="width:32mm;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="width:28mm;height:28mm;border:1.5px solid ${GMS_BORDER};border-radius:4px;background:${GMS_LIGHT};display:flex;align-items:center;justify-content:center;">
          <div style="font-size:22pt;opacity:0.3;">👤</div>
        </div>
        <div style="font-size:5pt;color:#aaa;margin-top:2px;">PHOTO</div>
      </div>
      <!-- Info -->
      <div style="flex:1;font-size:7pt;line-height:1.6;color:#222;">
        <div style="font-size:8.5pt;font-weight:800;color:${GMS_GREEN};line-height:1.2;margin-bottom:2px;">${esc(s.studentName)}</div>
        <div><span style="color:#888;font-size:6.5pt;">ADMISSION NO</span><br/><strong>${esc(s.admissionNo)}</strong></div>
        <div><span style="color:#888;font-size:6.5pt;">CLASS</span><br/><strong>${esc(s.className)}</strong></div>
        ${s.gender ? `<div><span style="color:#888;font-size:6.5pt;">GENDER</span><br/><strong>${esc(s.gender)}</strong></div>` : ''}
        ${s.bloodGroup ? `<div><span style="color:#888;font-size:6.5pt;">BLOOD GROUP</span><br/><strong style="color:#dc2626;">${esc(s.bloodGroup)}</strong></div>` : ''}
      </div>
    </div>
    <!-- Bottom bar -->
    <div style="background:${GMS_LIGHT};border-top:1px solid ${GMS_BORDER};padding:3px 8px;font-size:5.5pt;color:#555;display:flex;justify-content:space-between;align-items:center;">
      <span>${esc(s.academicYear)}</span>
      ${s.emergencyPhone ? `<span>📞 Emerg: ${esc(s.emergencyPhone)}</span>` : s.parentPhone ? `<span>📞 ${esc(s.parentPhone)}</span>` : ''}
    </div>
  </div>`).join('');

  const html = docHead(`Student ID Cards — Batch of ${students.length}`) + `
  ${letterhead('STUDENT IDENTITY CARDS — BATCH PRINT')}
  <div style="background:${GMS_GREEN};color:#fff;text-align:center;padding:5px;font-size:8pt;font-weight:700;">
    ${students.length} CARD${students.length !== 1 ? 'S' : ''} — CUT ALONG DOTTED LINES AFTER PRINTING · LAMINATE FOR DURABILITY
  </div>
  <div style="padding:8px;text-align:center;">${cards}</div>
  ${docFoot()}`;

  openPrint(html, `Student ID Cards — Batch of ${students.length}`);
}

/* ══════════════════════════════════════════════════════════════════
   6. FEE RECEIPT / PAYMENT CONFIRMATION
══════════════════════════════════════════════════════════════════ */
export interface FeeReceiptData {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  className?: string | null;
  parentName?: string | null;
  feeType: string;
  amount: number;
  amountPaid: number;
  balance: number;
  status: string;
  term: string;
  academicYear: string;
  paymentDate?: string | null;
  description?: string | null;
  receivedBy?: string | null;
}

export function printFeeReceipt(data: FeeReceiptData): void {
  const paidDate = fmtDate(data.paymentDate);
  const statusColor = data.status === 'paid' ? GMS_GREEN : data.status === 'partial' ? GMS_GOLD : '#dc2626';

  const html = docHead(`Fee Receipt — ${data.receiptNo}`) + `
  ${letterhead('SCHOOL FEES RECEIPT')}

  <div style="background:${GMS_GREEN};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:7px 20px;">
    <span style="font-size:11pt;font-weight:700;">OFFICIAL RECEIPT</span>
    <span style="font-size:10pt;font-weight:700;font-family:monospace;">Ref: ${esc(data.receiptNo)}</span>
  </div>

  <div style="padding:20px 28px;">
    <!-- Two-column info -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div style="background:${GMS_LIGHT};border:1px solid ${GMS_BORDER};border-radius:8px;padding:14px;">
        <div style="font-size:7pt;text-transform:uppercase;color:#888;font-weight:700;margin-bottom:6px;">Student Details</div>
        <div style="font-size:11pt;font-weight:800;color:${GMS_GREEN};margin-bottom:4px;">${esc(data.studentName)}</div>
        <div style="font-size:8pt;line-height:1.8;">
          <div><strong>Admission No:</strong> ${esc(data.admissionNo)}</div>
          ${data.className ? `<div><strong>Class:</strong> ${esc(data.className)}</div>` : ''}
          ${data.parentName ? `<div><strong>Parent/Guardian:</strong> ${esc(data.parentName)}</div>` : ''}
        </div>
      </div>
      <div style="background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:14px;">
        <div style="font-size:7pt;text-transform:uppercase;color:#888;font-weight:700;margin-bottom:6px;">Payment Details</div>
        <div style="font-size:8pt;line-height:1.9;">
          <div><strong>Date:</strong> ${esc(paidDate)}</div>
          <div><strong>Term:</strong> ${esc(data.term)}</div>
          <div><strong>Session:</strong> ${esc(data.academicYear)}</div>
          <div><strong>Fee Type:</strong> ${esc(data.feeType)}</div>
          ${data.receivedBy ? `<div><strong>Received by:</strong> ${esc(data.receivedBy)}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Amount summary table -->
    <table style="border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:${GMS_GREEN};color:#fff;">
          <th style="text-align:left;padding:8px 14px;font-size:9pt;">Description</th>
          <th style="text-align:right;padding:8px 14px;font-size:9pt;width:140px;">Amount (₦)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#fff;">
          <td style="padding:8px 14px;font-size:9pt;">${esc(data.feeType)}${data.description ? ` — ${esc(data.description)}` : ''}</td>
          <td style="text-align:right;padding:8px 14px;font-size:9pt;font-weight:600;">${Number(data.amount).toLocaleString('en-NG', {minimumFractionDigits:2})}</td>
        </tr>
        <tr style="background:${GMS_LIGHT};border-top:2px solid ${GMS_GREEN};">
          <td style="padding:8px 14px;font-size:9pt;font-weight:700;">Amount Paid</td>
          <td style="text-align:right;padding:8px 14px;font-size:11pt;font-weight:800;color:${GMS_GREEN};">₦${Number(data.amountPaid).toLocaleString('en-NG', {minimumFractionDigits:2})}</td>
        </tr>
        <tr style="background:${data.balance > 0 ? '#fff5f5' : '#f0fdf4'};">
          <td style="padding:8px 14px;font-size:9pt;font-weight:700;">Balance Outstanding</td>
          <td style="text-align:right;padding:8px 14px;font-size:10pt;font-weight:700;color:${data.balance > 0 ? '#dc2626' : GMS_GREEN};">
            ₦${Number(data.balance).toLocaleString('en-NG', {minimumFractionDigits:2})}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Status badge -->
    <div style="text-align:center;margin-bottom:20px;">
      <span style="display:inline-block;padding:6px 28px;border-radius:24px;background:${statusColor};color:#fff;font-size:11pt;font-weight:800;letter-spacing:1px;text-transform:uppercase;">
        ${esc(data.status)}
      </span>
    </div>

    <!-- Signatures -->
    <div style="display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:20px;margin-top:8px;">
      <div style="text-align:center;min-width:140px;">
        <div style="height:44px;"></div>
        <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">Cashier / Accounts Officer</div>
      </div>
      <div style="text-align:center;">
        <img src="${SCHOOL_LOGO_PATH}" alt="Seal" style="width:52px;height:52px;object-fit:contain;opacity:0.15;" />
        <div style="font-size:7pt;color:#aaa;">Official Seal</div>
      </div>
      <div style="text-align:center;min-width:140px;">
        <div style="height:44px;"></div>
        <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">Parent / Guardian Signature</div>
      </div>
    </div>

    <div style="margin-top:14px;text-align:center;font-size:7pt;color:#aaa;border:1px dashed #ddd;padding:6px;border-radius:4px;">
      This is an official receipt from ${esc(SCHOOL_NAME)}. Please keep for your records.<br/>
      Receipt No: ${esc(data.receiptNo)} · ${esc(SCHOOL_ADDRESS_LINE1)}, ${esc(SCHOOL_ADDRESS_LINE2)} · Tel: ${esc(SCHOOL_PHONE_DISPLAY)}
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Fee Receipt — ${data.receiptNo}`);
}

/* ══════════════════════════════════════════════════════════════════
   7. ATTENDANCE REGISTER SHEET (Printable class register)
══════════════════════════════════════════════════════════════════ */
export interface AttendanceRegisterData {
  className: string;
  classTeacher?: string | null;
  term: string;
  academicYear: string;
  month: string;          // e.g. "May 2026"
  schoolDays: number;     // working days in the month
  students: Array<{
    sn: number;
    name: string;
    admissionNo: string;
    gender?: string | null;
  }>;
}

export function printAttendanceRegister(data: AttendanceRegisterData): void {
  // Create day columns (1–schoolDays)
  const dayCols = Array.from({ length: data.schoolDays }, (_, i) => i + 1);

  const studentRows = data.students.map((s, i) => `
  <tr style="background:${i % 2 === 0 ? '#fff' : GMS_LIGHT};">
    <td style="border:1px solid #ccc;padding:3px 5px;text-align:center;font-size:7pt;">${s.sn}</td>
    <td style="border:1px solid #ccc;padding:3px 6px;font-size:7.5pt;font-weight:600;">${esc(s.name)}</td>
    <td style="border:1px solid #ccc;padding:3px 5px;text-align:center;font-size:7pt;font-family:monospace;">${esc(s.admissionNo)}</td>
    ${dayCols.map(() => `<td style="border:1px solid #ccc;width:16px;height:20px;"></td>`).join('')}
    <td style="border:1px solid #ccc;padding:3px 5px;text-align:center;font-size:7pt;background:#f5f5f5;"></td>
    <td style="border:1px solid #ccc;padding:3px 5px;text-align:center;font-size:7pt;background:#f5f5f5;"></td>
  </tr>`).join('');

  const html = docHead(`Attendance Register — ${data.className} · ${data.month}`, true) + `
  ${letterhead('CLASS ATTENDANCE REGISTER')}

  <div style="background:${GMS_GREEN};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:7px 20px;">
    <span style="font-size:10pt;font-weight:700;">${esc(data.className)} — ${esc(data.month)} — ${esc(data.term)} ${esc(data.academicYear)}</span>
    ${data.classTeacher ? `<span style="font-size:8.5pt;">Class Teacher: ${esc(data.classTeacher)}</span>` : ''}
  </div>

  <div style="padding:8px 12px;">
    <table style="border-collapse:collapse;width:100%;font-size:7pt;">
      <thead>
        <tr style="background:${GMS_GREEN};color:#fff;">
          <th style="border:1px solid ${GMS_BORDER};padding:4px 5px;min-width:22px;">#</th>
          <th style="border:1px solid ${GMS_BORDER};padding:4px 8px;text-align:left;min-width:120px;">Student Name</th>
          <th style="border:1px solid ${GMS_BORDER};padding:4px 5px;min-width:60px;">Adm. No</th>
          ${dayCols.map(d => `<th style="border:1px solid ${GMS_BORDER};padding:3px;width:16px;text-align:center;">${d}</th>`).join('')}
          <th style="border:1px solid ${GMS_BORDER};padding:4px 5px;min-width:28px;background:rgba(255,255,255,0.2);">Pres.</th>
          <th style="border:1px solid ${GMS_BORDER};padding:4px 5px;min-width:28px;background:rgba(255,255,255,0.2);">Abs.</th>
        </tr>
        <tr style="background:#f0f0f0;">
          <td colspan="3" style="border:1px solid #ccc;padding:2px 6px;font-size:6.5pt;font-weight:600;">DAY OF WEEK →</td>
          ${dayCols.map(() => `<td style="border:1px solid #ccc;height:14px;"></td>`).join('')}
          <td style="border:1px solid #ccc;"></td><td style="border:1px solid #ccc;"></td>
        </tr>
      </thead>
      <tbody>${studentRows}</tbody>
      <tfoot>
        <tr style="background:${GMS_LIGHT};font-weight:700;">
          <td colspan="3" style="border:1px solid #ccc;padding:4px 6px;font-size:7.5pt;">DAILY TOTAL PRESENT</td>
          ${dayCols.map(() => `<td style="border:1px solid #ccc;height:18px;"></td>`).join('')}
          <td style="border:1px solid #ccc;"></td><td style="border:1px solid #ccc;"></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Key + Signature -->
  <div style="padding:8px 14px 4px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div style="font-size:7.5pt;color:#555;">
      <strong>Key:</strong> &nbsp;P = Present &nbsp; A = Absent &nbsp; L = Late &nbsp; E = Excused<br/>
      <span style="color:#888;">Total school days this month: <strong>${data.schoolDays}</strong> · Class: <strong>${esc(data.className)}</strong></span>
    </div>
    <div style="display:flex;gap:32px;">
      <div style="text-align:center;">
        <div style="height:32px;"></div>
        <div style="border-top:1px solid #333;padding-top:2px;font-size:7.5pt;">Class Teacher's Signature</div>
      </div>
      <div style="text-align:center;">
        <div style="height:32px;"></div>
        <div style="border-top:1px solid #333;padding-top:2px;font-size:7.5pt;">Head of School</div>
      </div>
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Attendance Register — ${data.className}`);
}

/* ══════════════════════════════════════════════════════════════════
   8. SCHOOL LEAVING / TRANSFER CERTIFICATE
══════════════════════════════════════════════════════════════════ */
export interface LeavingCertData {
  studentName: string;
  admissionNo: string;
  className: string;
  gender?: string | null;
  dob?: string | null;
  dateOfAdmission?: string | null;
  dateOfLeaving?: string | null;
  conduct?: string;
  reason?: string;
  principalName?: string;
}

export function printLeavingCertificate(data: LeavingCertData): void {
  const certNo = `GMS-LC-${Date.now().toString(36).toUpperCase()}`;

  const html = docHead(`School Leaving Certificate — ${data.studentName}`) + `
  ${letterhead('SCHOOL LEAVING / TRANSFER CERTIFICATE')}

  <div style="background:${GMS_GOLD};color:#fff;text-align:center;padding:6px;font-size:8.5pt;font-weight:700;letter-spacing:1px;">
    OFFICIAL SCHOOL LEAVING CERTIFICATE
  </div>

  <div style="padding:28px 40px;">
    <div style="border:3px double ${GMS_GREEN};border-radius:6px;padding:28px 32px;position:relative;">
      <!-- Corner ornaments -->
      <div style="position:absolute;top:-1px;left:-1px;width:18px;height:18px;border-top:5px solid ${GMS_GOLD};border-left:5px solid ${GMS_GOLD};"></div>
      <div style="position:absolute;top:-1px;right:-1px;width:18px;height:18px;border-top:5px solid ${GMS_GOLD};border-right:5px solid ${GMS_GOLD};"></div>
      <div style="position:absolute;bottom:-1px;left:-1px;width:18px;height:18px;border-bottom:5px solid ${GMS_GOLD};border-left:5px solid ${GMS_GOLD};"></div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:18px;height:18px;border-bottom:5px solid ${GMS_GOLD};border-right:5px solid ${GMS_GOLD};"></div>

      <p style="text-align:center;font-family:'Merriweather',Georgia,serif;font-size:10pt;color:#555;font-style:italic;margin-bottom:20px;">
        This is to certify that
      </p>

      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-family:'Merriweather',Georgia,serif;font-size:22pt;font-weight:700;color:${GMS_GREEN};border-bottom:2px solid ${GMS_GOLD};display:inline-block;padding-bottom:4px;">
          ${esc(data.studentName)}
        </div>
      </div>

      <!-- Details table -->
      <table style="border-collapse:collapse;margin-bottom:20px;">
        ${[
          ['Admission Number', data.admissionNo],
          ['Class / Year of Study', data.className],
          data.gender ? ['Gender', data.gender] : null,
          data.dob ? ['Date of Birth', fmtDate(data.dob)] : null,
          data.dateOfAdmission ? ['Date of First Admission', fmtDate(data.dateOfAdmission)] : null,
          data.dateOfLeaving ? ['Date of Leaving', fmtDate(data.dateOfLeaving)] : null,
          ['Conduct', data.conduct || 'Good'],
          data.reason ? ['Reason for Leaving', data.reason] : null,
        ].filter((row): row is string[] => row !== null).map(([label, val]) => `
        <tr>
          <td style="padding:6px 10px;font-weight:700;font-size:8.5pt;width:180px;color:#555;border-bottom:1px dotted #ccc;">${esc(label as string)}:</td>
          <td style="padding:6px 10px;font-size:9pt;font-weight:600;border-bottom:1px dotted #ccc;">${esc(val as string)}</td>
        </tr>`).join('')}
      </table>

      <p style="font-size:9pt;color:#333;line-height:1.8;margin-bottom:20px;">
        was a <em>bonafide</em> student of <strong style="color:${GMS_GREEN};">${esc(SCHOOL_NAME)}</strong>
        and has left the school on the date stated above. During the period of study, the student's
        conduct and character were found to be <strong>${esc(data.conduct || 'Good')}</strong>.
        We wish the student the very best in future endeavours.
      </p>

      <!-- Signatures -->
      <div style="display:flex;justify-content:space-between;padding-top:20px;border-top:1px solid #e0e0e0;">
        <div style="text-align:center;min-width:150px;">
          <div style="height:48px;"></div>
          <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">Class Teacher</div>
        </div>
        <div style="text-align:center;">
          <img src="${SCHOOL_LOGO_PATH}" alt="Seal" style="width:60px;height:60px;object-fit:contain;opacity:0.16;" />
          <div style="font-size:7pt;color:#aaa;">Official Seal</div>
        </div>
        <div style="text-align:center;min-width:150px;">
          <div style="height:48px;"></div>
          <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;">
            ${data.principalName ? esc(data.principalName) + '<br/>' : ''}
            Proprietress / Head of School
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:7pt;color:#999;">
      <span>Cert. No: ${esc(certNo)}</span>
      <span>Issued: ${fmtDate()}</span>
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `School Leaving Certificate — ${data.studentName}`);
}

/* ══════════════════════════════════════════════════════════════════
   9. PARENT / SCHOOL CIRCULAR / NOTICE LETTER
══════════════════════════════════════════════════════════════════ */
export interface CircularData {
  circularNo: string;
  title: string;
  body: string;           // plain text (will be wrapped in paragraphs)
  targetAudience: string; // e.g. "All Parents & Guardians"
  issueDate?: string | null;
  actionRequired?: string | null;
  deadline?: string | null;
  principalName?: string;
}

export function printCircular(data: CircularData): void {
  const issueDate = fmtDate(data.issueDate);
  const paragraphs = data.body.split('\n').filter(p => p.trim()).map(p =>
    `<p style="margin-bottom:12px;line-height:1.8;">${esc(p)}</p>`
  ).join('');

  const html = docHead(`Circular — ${data.circularNo}`) + `
  ${letterhead('CIRCULAR / NOTICE')}

  <div style="background:${GMS_GREEN};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:7px 20px;">
    <span style="font-size:10pt;font-weight:700;">SCHOOL CIRCULAR</span>
    <span style="font-size:8.5pt;font-family:monospace;font-weight:700;">No: ${esc(data.circularNo)}</span>
  </div>

  <div style="padding:24px 36px;">
    <!-- Header line -->
    <div style="display:flex;justify-content:space-between;font-size:8.5pt;margin-bottom:14px;line-height:1.9;">
      <div>
        <div><strong>To:</strong> ${esc(data.targetAudience)}</div>
        <div><strong>Date:</strong> ${esc(issueDate)}</div>
      </div>
      <div style="text-align:right;">
        <div><strong>From:</strong> The Management</div>
        <div><strong>School:</strong> ${esc(SCHOOL_NAME)}</div>
      </div>
    </div>

    <!-- Subject line -->
    <div style="background:${GMS_LIGHT};border-left:5px solid ${GMS_GREEN};padding:10px 16px;margin-bottom:18px;border-radius:0 6px 6px 0;">
      <div style="font-size:8pt;text-transform:uppercase;color:#888;font-weight:700;letter-spacing:0.5px;">Subject / Re:</div>
      <div style="font-size:12pt;font-weight:800;color:${GMS_GREEN};margin-top:2px;">${esc(data.title)}</div>
    </div>

    <!-- Body -->
    <div style="font-size:9.5pt;color:#222;">${paragraphs}</div>

    <!-- Action required box -->
    ${data.actionRequired ? `
    <div style="background:#fffbeb;border:2px solid ${GMS_GOLD};border-radius:6px;padding:12px 16px;margin-top:16px;margin-bottom:16px;">
      <div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:${GMS_GOLD};margin-bottom:4px;">⚠️ Action Required</div>
      <div style="font-size:9pt;">${esc(data.actionRequired)}</div>
      ${data.deadline ? `<div style="font-size:8.5pt;color:#dc2626;font-weight:700;margin-top:4px;">Deadline: ${fmtDate(data.deadline)}</div>` : ''}
    </div>` : ''}

    <!-- Closing + Signature -->
    <div style="margin-top:24px;font-size:9.5pt;">
      <p style="margin-bottom:8px;">Thank you for your continued support and cooperation.</p>
      <p>Yours faithfully,</p>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:32px;">
      <div>
        <div style="height:48px;"></div>
        <div style="border-top:1px solid #333;padding-top:4px;font-size:8pt;min-width:160px;">
          ${data.principalName ? esc(data.principalName) + '<br/>' : ''}
          <strong>Proprietress / Head of School</strong><br/>
          ${esc(SCHOOL_NAME)}
        </div>
      </div>
      <div style="text-align:right;font-size:8pt;color:#888;">
        <img src="${SCHOOL_LOGO_PATH}" alt="Seal" style="width:52px;height:52px;object-fit:contain;opacity:0.14;display:block;margin:0 0 2px auto;" />
        Official Seal
      </div>
    </div>

    <!-- Tear-off acknowledgement -->
    <div style="margin-top:20px;border:1px dashed #ccc;border-radius:4px;padding:10px 14px;">
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:8px;">
        ✂ — DETACH AND RETURN TO SCHOOL — ✂
      </div>
      <div style="font-size:8pt;line-height:2;">
        I, _________________________________, Parent/Guardian of _________________________________ in Class _______
        have read and understood the circular titled: <strong>${esc(data.title)}</strong>
      </div>
      <div style="display:flex;gap:20px;margin-top:10px;">
        <div>Parent Signature: ________________________</div>
        <div>Date: ____________________</div>
      </div>
    </div>
  </div>
  ${docFoot()}`;

  openPrint(html, `Circular — ${data.title}`);
}
